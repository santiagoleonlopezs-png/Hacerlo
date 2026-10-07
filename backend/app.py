import os
import json
import time
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import FastAPI, HTTPException, Header, Request as FastRequest
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from engine import analyze_network

app = FastAPI(title='HACERLO Computational Engine', version='1.2.0')
app.add_middleware(CORSMiddleware, allow_origins=['https://santiagoleonlopezs-png.github.io'], allow_methods=['*'], allow_headers=['*'])

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
    return {'service':'HACERLO Computational Engine','status':'online','version':'1.2.0'}

@app.get('/api/health')
def health():
    return {'status':'ok','engine':'HACERLO','networkx':'ready-v1.1','ai':'groq-configured' if os.getenv('GROQ_API_KEY') else 'not-configured','mesa':'pending','pysd':'pending'}

@app.post('/api/network/analyze')
def network_analysis(payload: NetworkRequest):
    return analyze_network(nodes=payload.nodes,edges=payload.edges,mode=payload.mode,relation_filter=payload.relation_filter)

# Pilot limits. Per-process limits are not a substitute for an API gateway in production.
_requests = defaultdict(deque)

def post_json(url, body, headers, timeout=45):
    req=Request(url,data=json.dumps(body,ensure_ascii=False).encode('utf-8'),headers=headers,method='POST')
    with urlopen(req,timeout=timeout) as response:
        return json.load(response)

def get_json(url, headers, timeout=12):
    req=Request(url,headers=headers,method='GET')
    with urlopen(req,timeout=timeout) as response:
        return json.load(response)

@app.post('/api/ai/interpret')
def ai_interpret(payload: AIRequest, request: FastRequest, authorization: Optional[str]=Header(None), x_supabase_apikey: Optional[str]=Header(None)):
    # Verify session against this HACERLO Supabase project's Auth endpoint.
    if not authorization or not authorization.startswith('Bearer ') or not x_supabase_apikey:
        raise HTTPException(401,'Se requiere una sesión de HACERLO válida.')
    try:
        user=get_json('https://mflakxgdkpuhemgslgsa.supabase.co/auth/v1/user',{
            'Authorization':authorization,'apikey':x_supabase_apikey})
        user_id=user.get('id')
        if not user_id:
            raise ValueError('No valid user')
    except Exception:
        raise HTTPException(401,'La sesión de Supabase no pudo verificarse.')

    now=time.monotonic()
    recent=_requests[user_id]
    while recent and now-recent[0]>3600:
        recent.popleft()
    if len(recent)>=15:
        raise HTTPException(429,'Límite de 15 interpretaciones por hora alcanzado. Intenta más tarde.')
    recent.append(now)

    key=os.getenv('GROQ_API_KEY')
    if not key:
        raise HTTPException(503,'GROQ_API_KEY no está configurada en Render.')
    context={'initiative':payload.initiative,'network_analysis':payload.network_analysis,'methodological_rules':payload.methodological_rules}
    encoded=json.dumps(context,ensure_ascii=False,default=str)
    if len(encoded)>35000:
        raise HTTPException(413,'El contexto es demasiado extenso. Reduce el tamaño de la red o los indicadores.')

    system=('Eres Inteligencia HACERLO, analista de redes y sistemas organizacionales. Responde exclusivamente un objeto JSON válido en español con claves: '
      'system_reading (string), structural_findings (array de strings), hypotheses (array de objetos title,rationale,evidence_limit), '
      'interventions (array de objetos name,why,measure), what_to_measure (array de strings), traceability (string). '
      'Usa solo los datos recibidos. No inventes métricas ni causalidad; PageRank no equivale a influencia causal. '
      'No mezcles capas semánticamente diferentes. Separa observación, interpretación e hipótesis. '
      'Da hasta 3 alternativas de intervención, no órdenes. Identifica límites de evidencia. No incluyas datos personales innecesarios.')
    body={'model':os.getenv('GROQ_MODEL','llama-3.3-70b-versatile'),
          'messages':[{'role':'system','content':system},{'role':'user','content':encoded}],
          'temperature':0.2,'max_tokens':1800,'response_format':{'type':'json_object'}}
    try:
        data=post_json('https://api.groq.com/openai/v1/chat/completions',body,
                       {'Authorization':'Bearer '+key,'Content-Type':'application/json'},timeout=65)
        result=json.loads(data['choices'][0]['message']['content'])
        if not isinstance(result,dict): raise ValueError('La respuesta no es un objeto JSON')
        result['model']=data.get('model',body['model'])
        result['provider']='Groq'
        return result
    except HTTPError as exc:
        if exc.code==429: raise HTTPException(429,'Groq alcanzó su límite temporal. Intenta más tarde.')
        if exc.code in (401,403): raise HTTPException(502,'Groq rechazó la configuración de acceso; revisa la clave en Render.')
        raise HTTPException(502,f'Groq devolvió un error HTTP {exc.code}.')
    except (URLError,TimeoutError):
        raise HTTPException(504,'Groq no respondió a tiempo.')
    except (ValueError,KeyError,IndexError,TypeError):
        raise HTTPException(502,'La IA no devolvió una interpretación válida.')
