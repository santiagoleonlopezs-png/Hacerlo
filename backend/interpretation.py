"""Validate complete AI reports and retry unusable replies within the gateway deadline."""
import json
import time


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
    for attempt in range(2):
        remaining = deadline - clock()
        if remaining <= 0:
            raise TimeoutError('Interpretation deadline exceeded')
        request_body = {
            **body,
            'max_tokens': 10000 if attempt == 0 else 12000,
            'reasoning': {'effort': 'low' if attempt == 0 else 'minimal', 'exclude': True},
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
                timeout=min(40, remaining),
            )
            result = decode_interpretation(data)
        except (InterpretationError, json.JSONDecodeError) as exc:
            # Keep diagnostic metadata, never the initiative's content or model reasoning.
            envelope = data if isinstance(data, dict) else {}
            choices = envelope.get('choices')
            choice = choices[0] if isinstance(choices, list) and choices and isinstance(choices[0], dict) else {}
            usage = envelope.get('usage') or {}
            usage = usage if isinstance(usage, dict) else {}
            details = usage.get('completion_tokens_details') or {}
            details = details if isinstance(details, dict) else {}
            diagnostic = {
                'attempt': attempt + 1, 'reason': str(exc) if isinstance(exc, InterpretationError) else 'invalid_response',
                'model': envelope.get('model', body['model']), 'finish_reason': choice.get('finish_reason'),
                'completion_tokens': usage.get('completion_tokens'), 'reasoning_tokens': details.get('reasoning_tokens'),
            }
            retryable = not isinstance(exc, InterpretationError) or exc.retryable
            retry = attempt == 0 and retryable and deadline - clock() >= 5
            print('HACERLO OPENROUTER ' + ('RETRY: ' if retry else 'PARSE: ') + json.dumps(diagnostic), flush=True)
            if not retry:
                raise InterpretationError(diagnostic['reason'], retryable=retryable) from None
            continue

        result['model'] = data.get('model') or body['model']
        result['provider'] = 'OpenRouter'
        print('HACERLO OPENROUTER OK: ' + json.dumps({
            'model': result['model'], 'attempt': attempt + 1, 'status': 'complete',
        }), flush=True)
        return result
