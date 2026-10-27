/* HACERLO · Laboratorio ABM v1. Solo explora escenarios; no predice resultados reales. */
function renderAgentSimulationPage(x) {
  const behaviors = x.behaviors || [], audiences = x.audiences || [];
  const personNodes = (x.nodes || []).map((n, i) => ({...n, idx: i})).filter(n => n.type === 'Persona');
  const settings = x.abmSettings || {};
  const count = Number(settings.behaviorIndex ?? 0);
  const bi = count >= 0 && count < behaviors.length ? count : 0;
  const behavior = behaviors[bi];
  const target = behavior ? audiences.filter(a => behavior.scope !== 'specific' || (behavior.audienceIds || []).map(String).includes(String(a.id))) : [];
  const last = (x.modelRuns || []).filter(r => r.engine === 'abm-v1' && behavior && (r.behaviorId === abmV2BehaviorKey(behavior,bi) || (!r.behaviorId && r.behavior === behavior.name))).slice(-1)[0];
  const val = (v, fallback) => v === undefined || v === null ? fallback : v;
  const controls = (audiences.length ? audiences : []).map((a, i) => {
    const d = (settings.dimensions || {})[String(a.id)] || {};
    return '<tr><td>' + safe(a.name) + '</td><td>' + Number(a.population || 0) +
      '</td>' + ['capability','opportunity','motivation'].map(k =>
      '<td><input style="min-width:85px" name="' + k + '_' + i +
      '" type="number" min="0" max="1" step="0.05" value="' + safe(val(d[k],0.5)) + '" aria-label="' + k + ' de ' + safe(a.name) + '"></td>'
      ).join('') + '</tr>';
  }).join('');
  const mappings = personNodes.map(n => '<label style="display:flex;align-items:center;gap:10px;justify-content:space-between;border-top:1px solid #24455a;padding:4px 0"><span>' + safe(n.name || 'Persona ' + n.idx) +
    '</span><select style="max-width:230px;margin:3px 0" onchange="setABMAudienceMapping(' + n.idx + ',this.value)"><option value="">Sin asignar</option>' +
    audiences.map(a => '<option value="' + safe(a.id) + '"' + (abmV2AudienceId(x,n,n.idx) === String(a.id) ? ' selected' : '') + '>' + safe(a.name) + '</option>').join('') +
    '</select></label>').join('');
  return '<div class="hero"><div class="subtle">ANÁLISIS · EXPERIMENTACIÓN COMPUTACIONAL</div><h1>Laboratorio de agentes</h1><p>Experimenta con decisiones sobre adopción conductual. Simula mecanismos hipotéticos y contrástalos después con evidencia observada.</p></div>' +
    '<section class="panel"><div class="flex" style="justify-content:space-between"><div><h2>1. Modelo conectado con Diseño y Grafo</h2><p class="muted">Se reutilizan audiencias y comportamientos. Solo las relaciones explícitas «Influye en» se usan como influencia social.</p></div><button class="secondary" onclick="go(&quot;Grafo de adopción&quot;)">Revisar Grafo</button></div>' +
    '<div class="triple"><div><div class="metric">' + audiences.length + '</div><small>Audiencias registradas</small></div><div><div class="metric">' + behaviors.length + '</div><small>Comportamientos</small></div><div><div class="metric">' + personNodes.length + '</div><small>Nodos de tipo Persona</small></div></div></section>' +
    (behavior ? renderABMV2Evidence(x,behavior) + renderABMV2Hypotheses(x,behavior) : '') +
    (!behaviors.length || !audiences.length ? '<section class="panel"><p class="notice">Primero registra audiencias y comportamientos en Diseño.</p><button class="primary" onclick="phase=1;go(\'RDAIM\')">Abrir Diseño</button></section>' :
    '<form id="abm-form" class="panel" onsubmit="runAgentSimulation(event)"><h2>2. Diseñar experimento</h2>' +
    '<div class="grid"><label>Comportamiento a simular<select name="behaviorIndex" onchange="setABMBehavior(this.value)">' +
    behaviors.map((b,i) => '<option value="' + i + '"' + (i === bi ? ' selected' : '') + '>' + safe(b.name) + '</option>').join('') + '</select></label>' +
    '<label>Escenario de intervención<select name="scenario">' +
    [['training','Formación · mejora capacidad'],['friction','Reducir fricciones · mejora oportunidad'],['incentives','Incentivos · mejora motivación'],['ambassadors','Embajadores · activar nodos conectados']].map(([v,txt]) => '<option value="' + v + '"' + (settings.scenario === v ? ' selected' : '') + '>' + txt + '</option>').join('') + '</select></label>' +
    '<label>Origen de red<select name="mode" onchange="switchABMMode(this.value)"><option value="synthetic"' + (settings.mode !== 'observed' ? ' selected' : '') + '>Exploratorio · red sintética</option><option value="observed"' + (settings.mode === 'observed' ? ' selected' : '') + '>Grafo registrado · solo personas</option></select></label>' +
    '<label>Adopción inicial estimada (%)<input name="initialPct" type="number" min="0" max="100" step="1" value="' + safe(val(settings.initialPct,10)) + '" oninput="this.dataset.source=\'manual_hypothesis\'"></label>' +
    '<label>Periodos<input name="periods" type="number" min="1" max="24" value="' + safe(val(settings.periods,12)) + '"></label>' +
    '<label>Repeticiones Monte Carlo<input name="runs" type="number" min="5" max="80" value="' + safe(val(settings.runs,40)) + '"></label>' +
    '<label>Muestra de agentes (modo sintético)<input name="sampleSize" type="number" min="2" max="500" value="' + safe(val(settings.sampleSize,150)) + '"></label>' +
    '<label>Semilla de reproducción<input name="seed" type="number" min="0" max="2147483647" value="' + safe(val(settings.seed,2026)) + '"></label></div>' +
    '<details style="margin:8px 0"><summary style="cursor:pointer;font-weight:700">Condiciones COM-B por audiencia · hipótesis editables</summary><p class="notice">0 = muy desfavorable · 1 = muy favorable. El valor 0,5 es neutral hipotético, NO una medición del diagnóstico.</p><div style="overflow-x:auto"><table><thead><tr><th>Audiencia</th><th>Población</th><th>Capacidad</th><th>Oportunidad</th><th>Motivación</th></tr></thead><tbody>' + controls + '</tbody></table></div></details>' +
    '<details id="abm-mapping" ' + (settings.mode === 'observed' ? '' : 'hidden ') + 'style="margin:10px 0"><summary style="cursor:pointer;font-weight:700">Asignación de personas del Grafo a audiencias</summary>' +
    '<p class="notice">La clasificación no se infiere del nombre. Debes asociar cada persona a su audiencia; no se utilizan equipos, barreras ni otros nodos como si fueran personas.</p>' +
    '<div style="max-height:230px;overflow:auto">' + (mappings || '<p class="muted">Sin nodos de Persona. Regístralos en Grafo o utiliza el modo sintético.</p>') + '</div></details>' +
    '<p class="muted">Modo de red registrada: solo influencias con evidencia Registrada u Observada. Fuerza medida 1–5; sin medida se usa 0,5 hipotético. Las relaciones declaradas/hipotéticas no entran en este modo.</p>' +
    '<p class="muted">Audiencias aplicables al comportamiento: ' + (target.map(a=>safe(a.name)).join(', ') || 'ninguna') + '.</p>' +
    '<p class="notice">Mecanismo v1: COM-B + umbrales + contagio social. Los coeficientes no están calibrados; los resultados NO son pronósticos. Se comparan dos escenarios con la misma semilla.</p>' +
    '<label style="display:flex;align-items:center;gap:8px"><input name="useCalibrated" type="checkbox" style="width:auto" ' +
    (x.abmCalibration?.behaviorKey === String(bi) ? (settings.useCalibrated ? 'checked' : '') : 'disabled') +
    '>Usar parámetros calibrados en esta comparación (si hay calibración del comportamiento)</label>' +
    '<div class="flex"><button class="primary" id="abm-start">Ejecutar y comparar escenarios</button><span class="muted" id="abm-status">Sin experimento en ejecución.</span></div></form>') +
    '<section class="panel"><h2>3. Resultados experimentales</h2><div id="abm-output">' +
    (last ? renderABMResult(last.result) : '<div class="empty">Configura y ejecuta un experimento. Aquí aparecerán las trayectorias y diferencias entre escenarios.</div>') +
    '</div></section>' + renderABMResearchPanel(x, bi);
}
function setABMBehavior(index) {
  const x=current(); x.abmSettings={...(x.abmSettings||{}),behaviorIndex:Number(index)}; save();render();
}
function setABMAudienceMapping(index, audience) {
  const x=current();x.abmAudienceMap=x.abmAudienceMap||{};
  x.abmAudienceMap[index]=audience;save();
}
function switchABMMode(value) {
  const section=document.getElementById('abm-mapping');
  if(section)section.hidden=value!=='observed';
}
async function runAgentSimulation(e) {
  e.preventDefault();
  const x=current(), f=e.target, submit=document.getElementById('abm-start'),status=document.getElementById('abm-status');
  const bi=Number(f.elements.behaviorIndex.value);
  const behavior=x.behaviors[bi];
  const selected=abmSelectedAudiences(x,behavior,bi);
  if(!selected.length){status.textContent='Este comportamiento no tiene audiencias asignadas.';return}
  const allAud = x.audiences || [];
  const dims={};
  for(const [i,a] of allAud.entries()) {
    dims[String(a.id)] = {};
    for(const k of ['capability','opportunity','motivation']) dims[String(a.id)][k]=Number(f.elements[k+'_'+i].value);
  }
  const settings={behaviorIndex:bi,scenario:f.elements.scenario.value,mode:f.elements.mode.value,
    initialPct:Number(f.elements.initialPct.value),periods:Number(f.elements.periods.value),
    runs:Number(f.elements.runs.value),sampleSize:Number(f.elements.sampleSize.value),
    seed:Number(f.elements.seed.value),dimensions:dims,useCalibrated:!!f.elements.useCalibrated?.checked,
    initialSource:f.elements.initialPct.dataset?.source||'manual_hypothesis'};
  const audiences=selected.map(a=>({
    id:String(a.id),name:String(a.name),population:Number(a.population)||0,...dims[String(a.id)]
  }));
  const payload={behavior:behavior.name,audiences,scenario:settings.scenario,mode:settings.mode,
    initial_adoption:settings.initialPct/100,periods:settings.periods,runs:settings.runs,
    sample_size:settings.sampleSize,seed:settings.seed,agents:[],edges:[]};
  if(settings.mode==='observed') {
    const people=(x.nodes||[]).map((n,i)=>({...n,index:i})).filter(n=>n.type==='Persona');
    const selectedIds=new Set(selected.map(a=>String(a.id)));
    const missing=people.filter(n=>!abmV2AudienceId(x,n,n.index));
    if(missing.length) {status.textContent='Asigna una audiencia a las '+missing.length+' personas del Grafo (abre el panel de asignación).';return}
    const relevant=people.filter(n=>selectedIds.has(abmV2AudienceId(x,n,n.index)));
    const personIds=new Set(relevant.map(n=>String(n.index)));
    payload.agents=relevant.map(n=>({id:String(n.index),
      audience_id:abmV2AudienceId(x,n,n.index)}));
    const graphInput=abmV2NetworkEdges(x,[...personIds]);
    payload.edges=graphInput.edges;
    if(relevant.length<2){status.textContent='Registra al menos 2 personas en Grafo o usa el modo sintético.';return}
    if(!payload.edges.length){status.textContent='No hay conexiones «Influye en» con evidencia Registrada u Observada entre las personas seleccionadas. Verifica el Grafo o utiliza red sintética.';return}
    if(graphInput.unmeasured)status.textContent='Aviso: '+graphInput.unmeasured+' vínculos sin fuerza medida usan 0,5 hipotético.';
  }
  if(settings.useCalibrated) {
    const cal=x.abmCalibration;
    if(cal?.behaviorKey!==String(bi)||cal.fingerprint!==abmInputFingerprint(payload)||!cal.result?.parameters) {
      status.textContent='La configuración cambió desde la calibración. Vuelve a calibrar con los nuevos datos o desactiva «Usar parámetros calibrados».';
      return;
    }
    payload.parameters=cal.result.parameters;
  }
  submit.disabled=true;status.textContent='Simulando comparaciones apareadas…';
  try {
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)throw new Error('Inicia sesión en HACERLO.');
    const response=await fetch(HACERLO_ENGINE_URL+'/api/simulation/adoption',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,
      'X-Supabase-Apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(payload)});
    if(!response.ok){let e={};try{e=await response.json()}catch(_){}throw new Error(typeof e.detail==='string'?e.detail:'Error HTTP '+response.status)}
    const result=await response.json();
    x.abmSettings=settings;
    x.modelRuns=x.modelRuns||[];
    x.modelRuns.push({engine:'abm-v1',date:new Date().toISOString(),modelFingerprint:abmScenarioFingerprint(payload),behaviorId:abmV2BehaviorKey(behavior,bi),behavior:behavior.name,
      scenario:settings.scenario,mode:settings.mode,settings,result});
    if(x.modelRuns.length>40)x.modelRuns=x.modelRuns.slice(-40);
    save();
    document.getElementById('abm-output').innerHTML=renderABMVisualResult(result)+renderABMScenarioComparison(x,x.modelRuns.at(-1));
    status.textContent='Simulación ejecutada y guardada en la iniciativa.';
  }catch(err){console.error(err);status.textContent='No fue posible simular: '+err.message}
  finally{submit.disabled=false}
}
function renderABMResult(r) {
  if(!r||!Array.isArray(r.series))return '<p class="notice">Resultado no disponible.</p>';
  const pct=n=>(100*Number(n||0)).toFixed(1)+'%';
  const f=r.final||{}, b=f.baseline||{}, t=f.intervention||{}, d=f.difference||{};
  const w=730,h=215, left=45, right=18, top=12,bottom=32;
  const xy=(i,value)=> (left+i*(w-left-right)/Math.max(1,r.series.length-1)).toFixed(1)+','+
    (top+(1-Number(value))*(h-top-bottom)).toFixed(1);
  const line=k=>r.series.map((v,i)=>xy(i,(v[k]||{}).mean)).join(' ');
  const band=k=>{
    const upper=r.series.map((v,i)=>xy(i,(v[k]||{}).p90));
    const lower=r.series.map((v,i)=>xy(i,(v[k]||{}).p10)).reverse();
    return upper.concat(lower).join(' ');
  };
  return '<p class="notice">' + (r.parameter_origin==='provided_unvalidated'?'PARÁMETROS PROPORCIONADOS O AJUSTADOS, AÚN NO VALIDADOS':'MODELO EXPERIMENTAL SIN CALIBRACIÓN') + ' · ' + (r.mode==='synthetic'?'Red sintética hipotética':'Grafo registrado, efectos aún hipotéticos') + '</p>' +
    '<div class="triple"><div class="panel"><small>Sin intervención</small><div class="metric">'+pct(b.mean)+'</div><small>p10–p90: '+pct(b.p10)+'–'+pct(b.p90)+'</small></div>' +
    '<div class="panel"><small>Con intervención</small><div class="metric">'+pct(t.mean)+'</div><small>p10–p90: '+pct(t.p10)+'–'+pct(t.p90)+'</small></div>' +
    '<div class="panel"><small>Diferencia media (puntos porcentuales)</small><div class="metric">'+(100*Number(d.mean||0)).toFixed(1)+'</div><small>p10–p90: '+(100*Number(d.p10||0)).toFixed(1)+' a '+(100*Number(d.p90||0)).toFixed(1)+' pp</small></div></div>' +
    '<div style="overflow-x:auto"><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Trayectorias comparadas de adopción simulada" style="max-width:950px">' +
    [0,.25,.5,.75,1].map(v=>'<line x1="'+left+'" x2="'+(w-right)+'" y1="'+(top+(1-v)*(h-top-bottom))+'" y2="'+(top+(1-v)*(h-top-bottom))+'" stroke="#30516a" stroke-width="1"/><text x="5" y="'+(top+(1-v)*(h-top-bottom)+4)+'" fill="#a6c9d9" font-size="12">'+Math.round(v*100)+'%</text>').join('') +
    '<polygon points="'+band('baseline')+'" fill="#ffc475" fill-opacity=".15"/><polygon points="'+band('intervention')+'" fill="#28d6bd" fill-opacity=".13"/>' +
    '<polyline fill="none" stroke="#ffc475" stroke-width="3" points="'+line('baseline')+'"/>' +
    '<polyline fill="none" stroke="#28d6bd" stroke-width="3" points="'+line('intervention')+'"/>' +
    '<text x="'+left+'" y="'+(h-6)+'" fill="#bad0de" font-size="12">Periodo 0</text><text x="'+(w-110)+'" y="'+(h-6)+'" fill="#bad0de" font-size="12">Periodo '+r.periods+'</text></svg></div>' +
    '<p><span style="color:#ffc475">━</span> Sin intervención &nbsp; <span style="color:#28d6bd">━</span> Con intervención · bandas p10–p90 de simulación</p>' +
    '<p class="muted">'+r.agent_count+' agentes · '+r.edge_count+' relaciones dirigidas · '+r.runs+' repeticiones · semilla '+r.seed+'</p>' +
    '<details><summary style="cursor:pointer;font-weight:700">Resultados por audiencia</summary><div style="overflow-x:auto"><table><tr><th>Audiencia</th><th>Agentes</th><th>Sin intervención</th><th>Con intervención</th></tr>'+
    (r.audiences||[]).map(a=>'<tr><td>'+safe(a.name)+'</td><td>'+a.agents+'</td><td>'+pct(a.baseline)+'</td><td>'+pct(a.intervention)+'</td></tr>').join('')+'</table></div></details>' +
    '<details><summary style="cursor:pointer;font-weight:700">Trazabilidad y límites científicos</summary><ul>' +
    (r.limitations||[]).map(l=>'<li>'+safe(l)+'</li>').join('')+'</ul><p>Comparar curvas orienta hipótesis; no demuestra que una intervención cause un resultado en la población real.</p></details>';
}
