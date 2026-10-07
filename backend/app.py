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
