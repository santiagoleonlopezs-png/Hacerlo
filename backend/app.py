import os
import json
import re
import time
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import FastAPI, HTTPException, Header, Request as FastRequest
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from engine import analyze_network

app = FastAPI(title='HACERLO Computational Engine', version='1.3.4')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://santiagoleonlopezs-png.github.io'],
    allow_methods=['*'],
    allow_headers=['*']
)

class NetworkRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    mode: str = 'layer'
    relation_filter: Optional[str] = None

class AIRequest(BaseModel):
    initiative: Dict[str, Any] = Field(default_factory=dict)
    network_analysis: Dict[str, Any] = Field(default_factory=dict)
    methodological_rules: List[str] = Field(default_factory=list)

@app.get('/')
def root():
    return {'service': 'HACERLO Computational Engine', 'status': 'online', 'version': '1.3.4'}

@app.get('/api/health')
def health():
    return {
        'status': 'ok',
        'engine': 'HACERLO',
        'networkx': 'ready-v1.1',
        'ai': 'openrouter-configured' if os.getenv('OPENROUTER_API_KEY') else 'not-configured',
        'mesa': 'pending',
        'pysd': 'pending'
    }

@app.post('/api/network/analyze')
def network_analysis(payload: NetworkRequest):
    return analyze_network(
        nodes=payload.nodes,
        edges=payload.edges,
        mode=payload.mode,
        relation_filter=payload.relation_filter
    )

# Pilot limits. Per-process limits are not a substitute for an API gateway in production.
_requests = defaultdict(deque)

def post_json(url, body, headers, timeout=45):
    req = Request(url, data=json.dumps(body, ensure_ascii=False).encode('utf-8'), headers=headers, method='POST')
    with urlopen(req, timeout=timeout) as response:
        return json.load(response)

def get_json(url, headers, timeout=12):
    req = Request(url, headers=headers, method='GET')
    with urlopen(req, timeout=timeout) as response:
        return json.load(response)

@app.post('/api/ai/interpret')
def ai_interpret(
    payload: AIRequest,
    request: FastRequest,
    authorization: Optional[str] = Header(None),
    x_supabase_apikey: Optional[str] = Header(None)
):
    # Verify session against this HACERLO Supabase project's Auth endpoint.
    if not authorization or not authorization.startswith('Bearer ') or not x_supabase_apikey:
        raise HTTPException(401, 'Se requiere una sesión de HACERLO válida.')
    try:
        user = get_json(
            'https://mflakxgdkpuhemgslgsa.supabase.co/auth/v1/user',
            {'Authorization': authorization, 'apikey': x_supabase_apikey}
        )
        user_id = user.get('id')
        if not user_id:
            raise ValueError('No valid user')
    except Exception:
        raise HTTPException(401, 'La sesión de Supabase no pudo verificarse.')

    now = time.monotonic()
    recent = _requests[user_id]
    while recent and now - recent[0] > 3600:
        recent.popleft()
    if len(recent) >= 15:
        raise HTTPException(429, 'Límite de 15 interpretaciones por hora alcanzado. Intenta más tarde.')
    recent.append(now)

    key = os.getenv('OPENROUTER_API_KEY')
    if not key:
        raise HTTPException(503, 'OPENROUTER_API_KEY no está configurada en Render.')
        
    context = {
        'initiative': payload.initiative,
        'network_analysis': payload.network_analysis,
        'methodological_rules': payload.methodological_rules
    }
    encoded = json.dumps(context, ensure_ascii=False, default=str)
    if len(encoded) > 35000:
        raise HTTPException(413, 'El contexto es demasiado extenso. Reduce el tamaño de la red o los indicadores.')

    system = (
        'Eres el Director de Estrategia, Gestión del Cambio y Cultura de HACERLO. '
        'Tu audiencia principal son Gerentes de Gestión Humana, Líderes de Transformación, Directores de Operaciones y Consultores Estratégicos. '
        'Tu misión es ofrecer una lectura integral, ejecutiva y pragmática sobre la adopción cultural y conductual de la iniciativa, traduciendo diagnósticos, métricas y relaciones en decisiones de negocio y bienestar humano. '
        'REGLA ESTRATÉGICA DE EQUILIBRIO: '
        'No satures el reporte con análisis matemático de grafos. La red social/organizacional es solo un canal habilitador del cambio, no el cambio en sí mismo. '
        'Distribuye tu análisis integrando cuatro pilares: '
        '1) Adopción de comportamientos clave y habilitadores culturales; '
        '2) Barreras, sesgos, cargas cognitivas o fricciones encontradas en el diagnóstico y encuestas; '
        '3) Efectividad y ritmo de las intervenciones o acciones implementadas; '
        '4) Dinámica relacional y redes de influencia (actores puente, líderes informales, canales periféricos y silos) al servicio de la estrategia. '
        'PRECISIÓN EN DATOS Y PERSONAS: '
        'No asumas que la cantidad de registros o hallazgos del diagnóstico equivale al número de personas o empleados. Si el contexto reporta 320 hallazgos o comentarios, refiérete estrictamente a "entradas cualitativas", "observaciones" o "comentarios analizados", nunca a 300 o 320 personas, a menos que el número de personas o muestra esté explícitamente declarado. '
        'ANÁLISIS DE ENLACES CRÍTICOS Y BARRERAS RELACIONALES: '
        'Al analizar la red, no te limites a los nodos más centrales (como Administrador o Koyag). '
        'Es mandatorio identificar y visibilizar los enlaces frágiles, proyectados o marcados con alerta/fricción (líneas punteadas o con advertencia). '
        'Específicamente, examina con prioridad la relación entre Invitado y Miembro de Equipo: el acompañamiento, acogida e integración de roles periféricos hacia el equipo base es una palanca crítica de adopción que debe ser fortalecida explícitamente en los hallazgos y alternativas de intervención. '
        'ESTRUCTURA DE RESPUESTA EN JSON: '
        '- system_reading: Síntesis ejecutiva de alto impacto (2 a 3 párrafos fluidos). Explica el estado real de la transformación: qué comportamientos están arraigando, qué barreras humanas/organizacionales frenan el avance y cómo el tejido relacional facilita o bloquea el resultado esperado. '
        '- structural_findings: Máximo 5 hallazgos clave redactados en lenguaje de gestión humana y cambio: al menos 2 sobre brechas o comportamientos críticos del diagnóstico; 1 sobre intervenciones/encuestas; y máximo 2 sobre estructura relacional (traduciendo métricas a "referentes clave", "puentes de comunicación", "canales frágiles por fortalecer como Invitado - Miembro de Equipo" o "riesgos de sobrecarga/silos"). '
        '- hypotheses: 3 a 5 hipótesis sistémicas (title, rationale, evidence_limit) que expliquen por qué las personas actúan como lo hacen (factores de motivación, contexto, liderazgo o incentivos), siempre presentadas como premisas a validar en terreno y no como verdades absolutas. '
        '- interventions: 3 recomendaciones de acción directivas y humanas (name, why, measure), enfocadas en diseño de entornos de decisión (nudges), habilitación de líderes puente, fortalecimiento de conexiones débiles y acompañamiento al cambio. '
        '- what_to_measure: 4 a 5 indicadores clave de adopción de hábitos, pulso cultural y tracción organizacional para el tablero directivo. '
        '- traceability: Breve párrafo declarando las fuentes corporativas consultadas (diagnóstico, comportamientos, encuestas y red) y sus límites metodológicos. '
        'Escribe con tono empático, riguroso, estratégico y sin jerga matemática innecesaria. '
        'Responde exclusivamente un objeto JSON válido con los campos solicitados.'
    )

    model = 'openrouter/free'

    hacerlo_schema = {
        'name': 'hacerlo_network_interpretation',
        'strict': True,
        'schema': {
            'type': 'object',
            'properties': {
                'system_reading': {'type': 'string'},
                'structural_findings': {
                    'type': 'array',
                    'items': {'type': 'string'}
                },
                'hypotheses': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'title': {'type': 'string'},
                            'rationale': {'type': 'string'},
                            'evidence_limit': {'type': 'string'}
                        },
                        'required': ['title', 'rationale', 'evidence_limit'],
                        'additionalProperties': False
                    }
                },
                'interventions': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'name': {'type': 'string'},
                            'why': {'type': 'string'},
                            'measure': {'type': 'string'}
                        },
                        'required': ['name', 'why', 'measure'],
                        'additionalProperties': False
                    }
                },
                'what_to_measure': {
                    'type': 'array',
                    'items': {'type': 'string'}
                },
                'traceability': {'type': 'string'}
            },
            'required': [
                'system_reading', 'structural_findings', 'hypotheses',
                'interventions', 'what_to_measure', 'traceability'
            ],
            'additionalProperties': False
        }
    }

    body = {
        'model': model,
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': encoded}],
        'temperature': 0.2,
        'max_tokens': 5000,
        'response_format': {
            'type': 'json_schema',
            'json_schema': hacerlo_schema
        },
        'provider': {'require_parameters': True}
    }

    try:
        data = post_json(
            'https://openrouter.ai/api/v1/chat/completions',
            body,
            {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://santiagoleonlopezs-png.github.io/Hacerlo/',
                'X-Title': 'HACERLO'
            },
            timeout=65
        )
        choices = data.get('choices') or []
        if not choices:
            print('HACERLO OPENROUTER PARSE: no_choices keys=' + ','.join(sorted(data.keys())), flush=True)
            raise ValueError('OpenRouter no devolvió choices')

        message = choices[0].get('message') or {}
        content = message.get('content')

        if isinstance(content, list):
            parts = []
            for part in content:
                if isinstance(part, dict):
                    txt = part.get('text') or part.get('content')
                    if txt:
                        parts.append(str(txt))
                elif part is not None:
                    parts.append(str(part))
            content = '\n'.join(parts)
        elif content is None:
            content = ''
        else:
            content = str(content)

        cleaned = content.strip()

        # 1. Quitar bloques markdown de delimitación
        if '```' in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if match:
                cleaned = match.group(1).strip()
            else:
                cleaned = cleaned.replace('```json', '').replace('```', '').strip()

        # 2. Intentar decodificar JSON directamente
        result = None
        try:
            result = json.loads(cleaned)
        except Exception:
            # Si falla, buscar la sección delimitada por llaves
            first = cleaned.find('{')
            last = cleaned.rfind('}')
            if first != -1 and last > first:
                candidate = cleaned[first:last+1]
                try:
                    result = json.loads(candidate)
                except Exception:
                    # Intento de autoreparación de JSON truncado (llaves sin cerrar)
                    stack = []
                    for ch in candidate:
                        if ch in '{[':
                            stack.append('}' if ch == '{' else ']')
                        elif ch in '}]':
                            if stack and stack[-1] == ch:
                                stack.pop()
                    repaired = candidate + ''.join(reversed(stack))
                    try:
                        result = json.loads(repaired)
                    except Exception:
                        pass

        # 3. Respaldo de contingencia si el modelo devolvió solo texto narrativo
        if not isinstance(result, dict):
            preview = ' '.join(cleaned.replace('\r', ' ').replace('\n', ' ').split())[:500]
            print(
                'HACERLO OPENROUTER PARSE: invalid_json '
                f'model={data.get("model", body["model"])} '
                f'finish_reason={choices[0].get("finish_reason")} '
                f'preview={preview!r}',
                flush=True
            )
            if len(cleaned) > 50:
                result = {
                    'system_reading': cleaned,
                    'structural_findings': ['Interpretación generada en formato narrativo por el modelo de IA.'],
                    'hypotheses': [],
                    'interventions': [],
                    'what_to_measure': [],
                    'traceability': 'Generado mediante modelo OpenRouter (formato adaptado).'
                }
            else:
                raise ValueError('La respuesta del modelo no contiene una estructura interpretable')

        # Normalizar claves para garantizar renderizado en el Frontend
        result.setdefault('system_reading', '')
        result.setdefault('structural_findings', [])
        result.setdefault('hypotheses', [])
        result.setdefault('interventions', [])
        result.setdefault('what_to_measure', [])
        result.setdefault('traceability', '')
        result['model'] = data.get('model', body['model'])
        result['provider'] = 'OpenRouter'

        print(
            'HACERLO OPENROUTER OK: '
            f'model={result["model"]} finish_reason={choices[0].get("finish_reason")} '
            f'content_length={len(content)}',
            flush=True
        )
        return result

    except HTTPError as exc:
        try:
            raw = exc.read().decode('utf-8', errors='replace')
            parsed = json.loads(raw)
            err = parsed.get('error', {}) if isinstance(parsed, dict) else {}
            provider_message = str(err.get('message') or parsed.get('message') or raw)
            provider_code = str(err.get('code') or '')
        except Exception:
            provider_message = ''
            provider_code = ''
        provider_message = provider_message[:700]
        diagnostic = f'OpenRouter HTTP {exc.code}'
        if provider_code:
            diagnostic += f' code={provider_code}'
        if provider_message:
            diagnostic += f' · {provider_message}'
        print('HACERLO OPENROUTER DIAGNOSTIC:', diagnostic, flush=True)
        if exc.code == 429:
            raise HTTPException(429, f'OpenRouter alcanzó su límite temporal. {provider_message}'.strip())
        if exc.code in (401, 403):
            raise HTTPException(502, f'OpenRouter rechazó el acceso (HTTP {exc.code}). {provider_message}'.strip())
        raise HTTPException(502, diagnostic)

    except (URLError, TimeoutError):
        raise HTTPException(504, 'OpenRouter no respondió a tiempo.')

    except (ValueError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        print('HACERLO OPENROUTER PARSE ERROR: ' + type(exc).__name__ + ' · ' + str(exc)[:500], flush=True)
        raise HTTPException(502, 'OpenRouter respondió, pero HACERLO no pudo estructurar la interpretación. Revisa Render Logs: HACERLO OPENROUTER PARSE.')
