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

app = FastAPI(title='HACERLO Computational Engine', version='1.3.1')
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
    return {'service':'HACERLO Computational Engine','status':'online','version':'1.3.1'}

@app.get('/api/health')
def health():
    return {'status':'ok','engine':'HACERLO','networkx':'ready-v1.1','ai':'openrouter-configured' if os.getenv('OPENROUTER_API_KEY') else 'not-configured','mesa':'pending','pysd':'pending'}

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

    key=os.getenv('OPENROUTER_API_KEY')
    if not key:
        raise HTTPException(503,'OPENROUTER_API_KEY no está configurada en Render.')
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
    body={'model':os.getenv('OPENROUTER_MODEL','openrouter/free'),
          'messages':[{'role':'system','content':system},{'role':'user','content':encoded}],
          'temperature':0.2,'max_tokens':1800}
    try:
        data=post_json('https://openrouter.ai/api/v1/chat/completions',body,
                       {'Authorization':'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':'https://santiagoleonlopezs-png.github.io/Hacerlo/','X-Title':'HACERLO'},timeout=65)
        choices=data.get('choices') or []
        if not choices:
            print('HACERLO OPENROUTER PARSE: no_choices keys='+','.join(sorted(data.keys())), flush=True)
            raise ValueError('OpenRouter no devolvió choices')

        message=choices[0].get('message') or {}
        content=message.get('content')

        # OpenAI-compatible providers normally return a string, but routed models
        # may return content parts. Normalize both forms.
        if isinstance(content,list):
            parts=[]
            for part in content:
                if isinstance(part,dict):
                    txt=part.get('text') or part.get('content')
                    if txt:
                        parts.append(str(txt))
                elif part is not None:
                    parts.append(str(part))
            content='\n'.join(parts)
        elif content is None:
            content=''
        else:
            content=str(content)

        cleaned=content.strip()

        # Remove markdown fences when a routed model ignores the JSON-only instruction.
        if cleaned.startswith('```'):
            lines=cleaned.splitlines()
            if lines and lines[0].strip().lower() in ('```json','```'):
                lines=lines[1:]
            if lines and lines[-1].strip()=='```':
                lines=lines[:-1]
            cleaned='\n'.join(lines).strip()

        # First try strict JSON. If the model added prose, extract the outer JSON object.
        try:
            result=json.loads(cleaned)
        except json.JSONDecodeError:
            first=cleaned.find('{')
            last=cleaned.rfind('}')
            if first>=0 and last>first:
                result=json.loads(cleaned[first:last+1])
            else:
                preview=' '.join(cleaned.replace('\r',' ').replace('\n',' ').split())[:500]
                print(
                    'HACERLO OPENROUTER PARSE: invalid_json '
                    f'model={data.get("model",body["model"])} '
                    f'finish_reason={choices[0].get("finish_reason")} '
                    f'content_length={len(content)} preview={preview!r}',
                    flush=True
                )
                raise ValueError('La respuesta no contiene JSON')

        if not isinstance(result,dict):
            print('HACERLO OPENROUTER PARSE: json_not_object type='+type(result).__name__, flush=True)
            raise ValueError('La respuesta no es un objeto JSON')

        # Normalize missing sections so the frontend can render a useful response
        # even if a free routed model omits a non-critical key.
        result.setdefault('system_reading','')
        result.setdefault('structural_findings',[])
        result.setdefault('hypotheses',[])
        result.setdefault('interventions',[])
        result.setdefault('what_to_measure',[])
        result.setdefault('traceability','')
        result['model']=data.get('model',body['model'])
        result['provider']='OpenRouter'

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
        if exc.code in (401,403):
            raise HTTPException(502, f'OpenRouter rechazó el acceso (HTTP {exc.code}). {provider_message}'.strip())
        raise HTTPException(502, diagnostic)
    except (URLError,TimeoutError):
        raise HTTPException(504,'OpenRouter no respondió a tiempo.')
    except (ValueError,KeyError,IndexError,TypeError,json.JSONDecodeError) as exc:
        print('HACERLO OPENROUTER PARSE ERROR: '+type(exc).__name__+' · '+str(exc)[:500], flush=True)
        raise HTTPException(502,'OpenRouter respondió, pero HACERLO no pudo estructurar la interpretación. Revisa Render Logs: HACERLO OPENROUTER PARSE.')
