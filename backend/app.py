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

app = FastAPI(title='HACERLO Computational Engine', version='1.5.0')
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
    return {'service': 'HACERLO Computational Engine', 'status': 'online', 'version': '1.5.0'}

@app.get('/api/health')
def health():
    return {
        'status': 'ok',
        'engine': 'HACERLO',
        'networkx': 'ready-v1.1',
        'ai': 'openrouter-configured' if os.getenv('OPENROUTER_API_KEY') else 'not-configured',
        'abm': 'experimental-v1.1-calibration-and-sensitivity',
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
        '4) Dinámica relacional y redes de influencia (actores puente, líderes informales y silos) al servicio de la estrategia. '
        'ESTRUCTURA DE RESPUESTA EN JSON: '
        '- system_reading: Síntesis ejecutiva de alto impacto (2 a 3 párrafos fluidos). Explica el estado real de la transformación: qué comportamientos están arraigando, qué barreras humanas/organizacionales frenan el avance y cómo el tejido relacional facilita o bloquea el resultado esperado. '
        '- structural_findings: Máximo 5 hallazgos clave redactados en lenguaje de gestión humana y cambio: al menos 2 sobre brechas o comportamientos críticos del diagnóstico; 1 sobre intervenciones/encuestas; y máximo 2 sobre estructura relacional (traduciendo métricas como centralidad o intermediación a "referentes clave", "puentes de comunicación" o "riesgos de sobrecarga/silos"). '
        '- hypotheses: 3 a 5 hipótesis sistémicas (title, rationale, evidence_limit) que expliquen por qué las personas actúan como lo hacen (factores de motivación, contexto, liderazgo o incentivos), siempre presentadas como premisas a validar en terreno y no como verdades absolutas. '
        '- interventions: 3 recomendaciones de acción directivas y humanas (name, why, measure), enfocadas en diseño de entornos de decisión (nudges), habilitación de líderes puente, reducción de fricciones y acompañamiento al cambio. '
        '- what_to_measure: 4 a 5 indicadores clave de adopción de hábitos, pulso cultural y tracción organizacional para el tablero.'
    )
    if len(encoded) > 35000:
        raise HTTPException(413, 'El contexto supera el límite del motor de IA.')
    try:
        answer = post_json(
            'https://openrouter.ai/api/v1/chat/completions',
            {'model': os.getenv('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
             'messages': [{'role': 'system', 'content': system},
                          {'role': 'user', 'content': encoded}],
             'response_format': {'type': 'json_object'}},
            {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
            timeout=45
        )
        raw = answer['choices'][0]['message']['content']
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            raise ValueError('La respuesta no es un objeto JSON.')
        return parsed
    except (HTTPError, URLError, KeyError, ValueError, TimeoutError) as exc:
        raise HTTPException(502, 'La interpretación de IA no pudo completarse.') from exc


# Motor experimental de adopción: requiere sesión HACERLO.
# Los límites por proceso no sustituyen el control de cuota global en producción.
from simulation import simulate_adoption

class SimulationRequest(BaseModel):
    audiences: List[Dict[str, Any]] = Field(min_length=1, max_length=50)
    agents: List[Dict[str, Any]] = Field(default_factory=list, max_length=500)
    edges: List[Dict[str, Any]] = Field(default_factory=list, max_length=5000)
    mode: str = 'synthetic'
    scenario: str = 'training'
    behavior: str = Field(default='Comportamiento objetivo', max_length=160)
    initial_adoption: float = Field(default=0.10, ge=0, le=1)
    periods: int = Field(default=12, ge=1, le=24)
    runs: int = Field(default=40, ge=5, le=80)
    sample_size: int = Field(default=150, ge=2, le=500)
    seed: int = Field(default=2026, ge=0, le=2147483647)
    parameters: Dict[str, float] = Field(default_factory=dict)

_simulation_requests = defaultdict(deque)

@app.post('/api/simulation/adoption')
def adoption_simulation(
    payload: SimulationRequest,
    authorization: Optional[str] = Header(None),
    x_supabase_apikey: Optional[str] = Header(None)
):
    if not authorization or not authorization.startswith('Bearer ') or not x_supabase_apikey:
        raise HTTPException(401, 'Se requiere una sesión de HACERLO válida.')
    try:
        user = get_json(
            'https://mflakxgdkpuhemgslgsa.supabase.co/auth/v1/user',
            {'Authorization': authorization, 'apikey': x_supabase_apikey}
        )
        user_id = user.get('id')
        if not user_id:
            raise ValueError('Sesión inválida')
    except Exception as exc:
        raise HTTPException(401, 'La sesión de Supabase no pudo verificarse.') from exc

    now = time.monotonic()
    calls = _simulation_requests[user_id]
    while calls and now - calls[0] > 3600:
        calls.popleft()
    if len(calls) >= 20:
        raise HTTPException(429, 'Límite experimental de 20 simulaciones por hora.')
    calls.append(now)
    try:
        return simulate_adoption(payload.model_dump())
    except (ValueError, TypeError, OverflowError) as exc:
        raise HTTPException(422, str(exc)) from exc


# La calibración y sensibilidad comparten límites de sesión con la simulación.
# El acceso a iniciativas sigue gobernado por Supabase; ningún endpoint recibe
# identificadores de organización ni puede leer filas protegidas de la base.
from calibration import calibrate_adoption, sensitivity_adoption

class CalibrationRequest(SimulationRequest):
    observations: List[Dict[str, Any]] = Field(min_length=6, max_length=16)

class SensitivityRequest(SimulationRequest):
    target_effect_pp: float = Field(default=5, ge=0, le=100)


def check_abm_session_and_quota(authorization, x_supabase_apikey):
    if not authorization or not authorization.startswith('Bearer ') or not x_supabase_apikey:
        raise HTTPException(401, 'Se requiere una sesión válida de HACERLO.')
    try:
        user = get_json('https://mflakxgdkpuhemgslgsa.supabase.co/auth/v1/user',
                        {'Authorization': authorization, 'apikey': x_supabase_apikey})
        user_id = user.get('id')
        if not user_id:
            raise ValueError('Sin usuario')
    except Exception as exc:
        raise HTTPException(401, 'No se pudo verificar la sesión de Supabase.') from exc
    now = time.monotonic()
    calls = _simulation_requests[user_id]
    while calls and now - calls[0] > 3600:
        calls.popleft()
    if len(calls) >= 20:
        raise HTTPException(429, 'Límite experimental de 20 solicitudes por hora.')
    calls.append(now)


@app.post('/api/simulation/calibrate')
def adoption_calibration(
    payload: CalibrationRequest,
    authorization: Optional[str] = Header(None),
    x_supabase_apikey: Optional[str] = Header(None),
):
    check_abm_session_and_quota(authorization, x_supabase_apikey)
    try:
        return calibrate_adoption(payload.model_dump())
    except (ValueError, TypeError, OverflowError) as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post('/api/simulation/sensitivity')
def adoption_sensitivity(
    payload: SensitivityRequest,
    authorization: Optional[str] = Header(None),
    x_supabase_apikey: Optional[str] = Header(None),
):
    check_abm_session_and_quota(authorization, x_supabase_apikey)
    try:
        return sensitivity_adoption(payload.model_dump())
    except (ValueError, TypeError, OverflowError) as exc:
        raise HTTPException(422, str(exc)) from exc
