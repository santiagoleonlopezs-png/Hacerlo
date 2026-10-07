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
    body={'model':os.getenv('GROQ_MODEL','openai/gpt-oss-120b'),
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
        # Diagnostic only: expose Groq's error message, never the API key.
        try:
            raw = exc.read().decode('utf-8', errors='replace')
            parsed = json.loads(raw)
            groq_message = str(parsed.get('error', {}).get('message') or parsed.get('message') or raw)
        except Exception:
            groq_message = ''
        groq_message = groq_message[:700]
        if exc.code == 429:
            raise HTTPException(429, f'Groq alcanzó su límite temporal. {groq_message}'.strip())
        if exc.code == 401:
            raise HTTPException(502, f'Groq devolvió 401 (credencial no válida). {groq_message}'.strip())
        if exc.code == 403:
            raise HTTPException(502, f'Groq devolvió 403 (permiso/modelo restringido). {groq_message}'.strip())
        raise HTTPException(502, f'Groq devolvió HTTP {exc.code}. {groq_message}'.strip())
    except (URLError,TimeoutError):
        raise HTTPException(504,'Groq no respondió a tiempo.')
    except (ValueError,KeyError,IndexError,TypeError):
        raise HTTPException(502,'La IA no devolvió una interpretación válida.')
