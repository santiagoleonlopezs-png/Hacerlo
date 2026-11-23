"""Validate complete AI reports and retry unusable replies within the gateway deadline."""
import asyncio
import io
import json
import time
from urllib.error import HTTPError, URLError


# Only free endpoints with schema support and optional reasoning. The general free
# router can choose mandatory-thinking models that never reach their final answer.
INTERPRETATION_MODELS = (
    'nvidia/nemotron-3.5-super-vl:free',
    'inclusionai/ling-3.2-flash:free',
)


def provider_error_details(error):
    """Separate upstream capacity limits from account-wide quotas without exposing raw errors."""
    cached = getattr(error, '_hacerlo_details', None)
    if cached is not None:
        return cached
    try:
        payload = json.loads(error.read())
    except (ValueError, TypeError):
        payload = {}
    raw_error = payload.get('error') if isinstance(payload, dict) else {}
    raw_error = raw_error if isinstance(raw_error, dict) else {}
    metadata = raw_error.get('metadata')
    metadata = metadata if isinstance(metadata, dict) else {}
    message = str(raw_error.get('message') or '')[:700]
    headers = {str(key).lower(): str(value) for key, value in (error.headers or {}).items()}
    platform_limit = any(key.startswith('x-ratelimit-') for key in headers)
    upstream_limit = (message.lower().startswith('provider returned error') or
                      bool(metadata.get('provider_name') or metadata.get('provider_code')))
    daily_limit = any(term in message.lower() for term in (
        'free-models-per-day', 'daily limit', 'daily quota', 'daily requests', 'requests per day',
    ))
    scope = ('openrouter' if platform_limit or daily_limit else
             'provider' if upstream_limit else 'unknown')
    details = {
        'message': message, 'code': str(raw_error.get('code') or error.code),
        'scope': scope, 'daily_limit': daily_limit,
        'provider_name': str(metadata.get('provider_name') or '')[:80],
        'error_type': str(metadata.get('error_type') or '')[:80],
        'retry_after': headers.get('retry-after', ''),
    }
    error._hacerlo_details = details
    return details


def post_interpretation_json(url, body, headers, timeout=35, transport=None):
    """Enforce an elapsed-time limit, including providers sending keep-alive bytes."""
    # Imported here so pure decoding tests also run without HTTP dependencies.
    import httpx

    async def send():
        async with httpx.AsyncClient(timeout=timeout, transport=transport) as client:
            return await asyncio.wait_for(
                client.post(url, json=body, headers=headers), timeout=timeout,
            )

    try:
        response = asyncio.run(send())
    except (TimeoutError, httpx.TimeoutException) as exc:
        raise TimeoutError('Interpretation request exceeded its time budget') from exc
    except httpx.RequestError as exc:
        raise URLError('No se pudo conectar con el proveedor de IA.') from exc
    if response.is_error:
        raise HTTPError(url, response.status_code, response.reason_phrase,
                        dict(response.headers), io.BytesIO(response.content))
    return response.json()


class InterpretationError(ValueError):
    def __init__(self, code, retryable=True):
        super().__init__(code)
        self.retryable = retryable


def decode_interpretation(data):
    if not isinstance(data, dict):
        raise InterpretationError('invalid_response')
    if data.get('error'):
        raise InterpretationError('provider_error', retryable=False)
    choices = data.get('choices')
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise InterpretationError('no_choices')
    choice = choices[0]
    message = choice.get('message')
    if not isinstance(message, dict):
        raise InterpretationError('no_message')
    if message.get('refusal') or choice.get('finish_reason') == 'content_filter':
        raise InterpretationError('refused', retryable=False)
    # A model may use the entire completion budget for reasoning, leaving content empty.
    # Even valid-looking JSON must not be presented as a complete report after truncation.
    if choice.get('finish_reason') == 'length':
        raise InterpretationError('output_limit')
    content = message.get('content')
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and part.get('type') in (None, 'text', 'output_text'):
                text = part.get('text') or part.get('content')
                if isinstance(text, str):
                    parts.append(text)
        content = '\n'.join(parts)
    if isinstance(content, dict):
        result = content
    elif isinstance(content, str) and content.strip():
        cleaned = content.strip()
        try:
            result = json.loads(cleaned)
        except ValueError:
            # Accept a complete object wrapped in Markdown or a short introduction.
            # raw_decode respects braces inside strings; never invent missing content.
            first = cleaned.find('{')
            if first < 0:
                raise InterpretationError('invalid_json') from None
            try:
                result, _ = json.JSONDecoder().raw_decode(cleaned[first:])
            except ValueError:
                raise InterpretationError('invalid_json') from None
    else:
        raise InterpretationError('empty_content')

    if not isinstance(result, dict):
        raise InterpretationError('invalid_structure')
    for field in ('system_reading', 'audience_reading', 'traceability'):
        if not isinstance(result.get(field), str):
            raise InterpretationError('invalid_structure')
    if not result['system_reading'].strip():
        raise InterpretationError('empty_reading')
    for field in ('structural_findings', 'what_to_measure'):
        if not isinstance(result.get(field), list) or any(
                not isinstance(item, str) for item in result[field]):
            raise InterpretationError('invalid_structure')
    for field, keys in (
        ('hypotheses', ('title', 'rationale', 'evidence_limit')),
        ('interventions', ('name', 'why', 'measure')),
    ):
        if not isinstance(result.get(field), list) or any(
                not isinstance(item, dict) or any(not isinstance(item.get(key), str) for key in keys)
                for item in result[field]):
            raise InterpretationError('invalid_structure')
    return {key: result[key] for key in (
        'system_reading', 'audience_reading', 'structural_findings', 'hypotheses',
        'interventions', 'what_to_measure', 'traceability'
    )}


def request_interpretation(body, headers, post_json, deadline, clock=time.monotonic):
    for attempt, model in enumerate(INTERPRETATION_MODELS):
        remaining = deadline - clock()
        if remaining <= 0:
            raise TimeoutError('Interpretation deadline exceeded')
        request_body = {
            **body,
            'model': model,
            'max_tokens': 6144,
            'reasoning': {'enabled': False, 'exclude': True},
            'plugins': [{'id': 'response-healing'}],
        }
        if attempt:
            request_body['messages'] = [
                *body['messages'],
                {'role': 'user', 'content': (
                    'Entrega ahora el objeto JSON completo, con todas las secciones solicitadas. '
                    'Usa frases breves y menos de 900 palabras en total. '
                    'Trabaja con los mismos datos de la iniciativa; no inventes información.'
                )},
            ]
        data = None
        try:
            data = post_json(
                'https://openrouter.ai/api/v1/chat/completions', request_body, headers,
                timeout=min(35, remaining),
            )
            result = decode_interpretation(data)
        except (InterpretationError, json.JSONDecodeError, TimeoutError, URLError) as exc:
            # Keep diagnostic metadata, never the initiative's content or model reasoning.
            envelope = data if isinstance(data, dict) else {}
            choices = envelope.get('choices')
            choice = choices[0] if isinstance(choices, list) and choices and isinstance(choices[0], dict) else {}
            usage = envelope.get('usage') or {}
            usage = usage if isinstance(usage, dict) else {}
            details = usage.get('completion_tokens_details') or {}
            details = details if isinstance(details, dict) else {}
            reason = (str(exc) if isinstance(exc, InterpretationError) else
                      'timeout' if isinstance(exc, TimeoutError) else
                      'http_' + str(exc.code) if isinstance(exc, HTTPError) else
                      'connection_error' if isinstance(exc, URLError) else 'invalid_response')
            diagnostic = {
                'attempt': attempt + 1, 'reason': reason,
                'model': envelope.get('model', model), 'finish_reason': choice.get('finish_reason'),
                'completion_tokens': usage.get('completion_tokens'), 'reasoning_tokens': details.get('reasoning_tokens'),
            }
            retryable = not isinstance(exc, InterpretationError) or exc.retryable
            if isinstance(exc, HTTPError):
                error_details = provider_error_details(exc)
                diagnostic['limit_scope'] = error_details['scope']
                diagnostic['provider_name'] = error_details['provider_name']
                retryable = (exc.code in (404, 408, 500, 502, 503, 504) or
                             (exc.code == 429 and error_details['scope'] == 'provider'))
            retry = attempt == 0 and retryable and deadline - clock() >= 5
            print('HACERLO OPENROUTER ' + ('RETRY: ' if retry else 'PARSE: ') + json.dumps(diagnostic), flush=True)
            if not retry:
                if isinstance(exc, (URLError, TimeoutError)):
                    raise
                raise InterpretationError(diagnostic['reason'], retryable=retryable) from None
            continue

        result['model'] = data.get('model') or model
        result['provider'] = 'OpenRouter'
        print('HACERLO OPENROUTER OK: ' + json.dumps({
            'model': result['model'], 'attempt': attempt + 1, 'status': 'complete',
        }), flush=True)
        return result
