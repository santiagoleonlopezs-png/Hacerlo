/* HACERLO · Investigación ABM v1.1. Se integra con la pantalla existente. */
function renderABMResearchPanel(x, behaviorIndex) {
  const key = String(behaviorIndex);
  const savedCSV = (x.abmObservationCsv || {})[key] || '';
  const cal = x.abmCalibration && x.abmCalibration.behaviorKey === key ? x.abmCalibration.result : null;
  const sens = x.abmSensitivity && x.abmSensitivity.behaviorKey === key ? x.abmSensitivity.result : null;
  const calibrated = cal && cal.parameters;
  return '<section class="panel" style="margin-top:15px">' +
    '<h2>4. Contrastar con evidencia · Laboratorio científico</h2>' +
    '<p class="muted">Calibración retrospectiva y análisis de sensibilidad. Puedes explorar escenarios sin datos, pero <strong>no se consideran pronósticos validados</strong>.</p>' +
    '<details style="margin:12px 0" open><summary style="font-weight:700;cursor:pointer">A. Observaciones y calibración temporal</summary>' +
    '<p class="notice">Registra adopción acumulada de una misma cohorte, entre 6 y 16 mediciones consecutivas, sin cambios en el denominador. La trayectoria histórica debe corresponder a la etapa sin intervención del modelo. Para adopción decreciente se necesita modelar abandono, no forzar estos datos.</p>' +
    '<p class="muted">CSV: periodo,adoptados,poblacion_elegible,fuente. Incluye el periodo 0. Usa únicamente cifras agregadas y referencias de fuente sin nombres personales.</p>' +
    '<div class="grid"><label>Importar CSV de mediciones<input type="file" accept=".csv,text/csv" onchange="importABMObservationCSV(this)"></label>' +
    '<label>Comportamiento evaluado<input value="' + safe((x.behaviors||[])[behaviorIndex]?.name||'Sin comportamiento') + '" disabled></label></div>' +
    '<textarea id="abm-observation-csv" rows="7" spellcheck="false" placeholder="periodo,adoptados,poblacion_elegible,fuente&#10;0,12,100,Medición base&#10;1,16,100,Seguimiento 1&#10;2,23,100,Seguimiento 2&#10;... (mínimo 6 periodos)">' + safe(savedCSV) + '</textarea>' +
    '<div class="flex"><button type="button" class="primary" id="abm-calibrate-button" onclick="calibrateAgentModel()">Calibrar y validar con periodos reservados</button>' +
    '<span class="muted" id="abm-calibrate-status">Se comparan 16 combinaciones paramétricas y se retienen dos periodos para evaluación.</span></div>' +
    '<div id="abm-calibration-result">' + (cal?renderABMCalibrationResult(cal):'<div class="empty">Aún no hay calibración para este comportamiento.</div>') + '</div>' +
    '</details>' +
    '<details style="margin:12px 0" open><summary style="font-weight:700;cursor:pointer">B. Sensibilidad y robustez de la decisión</summary>' +
    '<p class="muted">Varía el umbral de adopción y el peso de la red, manteniendo constantes los demás supuestos. El porcentaje de configuraciones que cumple un objetivo NO es la probabilidad de éxito real.</p>' +
    '<label>Ganancia mínima de adopción deseada (puntos porcentuales)<input id="abm-target-effect" type="number" min="0" max="100" step="0.5" value="' + safe(x.abmTargetEffect ?? 5) + '"></label>' +
    '<div class="flex"><button type="button" class="primary" id="abm-sensitivity-button" onclick="evaluateABMSensitivity()">Evaluar 9 configuraciones</button>' +
    '<span class="muted" id="abm-sensitivity-status">' + (calibrated?'Usará parámetros del ajuste retrospectivo.':'Usará parámetros exploratorios por defecto hasta contar con calibración.') + '</span></div>' +
    '<div id="abm-sensitivity-result">' + (sens?renderABMSensitivityResult(sens):'<div class="empty">Ejecuta el análisis para comparar escenarios.</div>') + '</div>' +
    '</details></section>';
}

/* Contrato de comparabilidad: cambios en red, audiencia o condiciones requieren recalibración. */
function abmInputFingerprint(payload) {
  return JSON.stringify({
    behavior:payload.behavior,mode:payload.mode,seed:payload.seed,
    sample_size:payload.sample_size,audiences:payload.audiences,
    agents:payload.agents,edges:payload.edges
  });
}

function parseABMObservations(raw) {
  const lines=String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const rows=[];
  for (const [lineIdx,line] of lines.entries()) {
    const sep=line.includes(';')&&!line.includes(',')?';':',';
    const cells=line.split(sep).map(x=>x.trim());
    if (lineIdx===0 && /^periodo$|^period$/i.test(cells[0])) continue;
    if (cells.length<4)throw Error('Cada línea necesita periodo, adoptados, población y fuente.');
    const period=Number(cells[0]),count=Number(cells[1]),total=Number(cells[2]);
    if (!Number.isInteger(period)||!Number.isInteger(count)||!Number.isInteger(total))
      throw Error('Las tres primeras columnas deben ser números enteros.');
    const source=cells.slice(3).join(sep).trim();
    if(!source)throw Error('Todas las mediciones necesitan una fuente.');
    rows.push({period,adopted_count:count,eligible_count:total,source});
  }
  if(rows.length<6||rows.length>16)throw Error('Necesitas entre 6 y 16 mediciones consecutivas.');
  return rows;
}

function importABMObservationCSV(input) {
  const file=input.files&&input.files[0]; if(!file)return;
  if(file.size>20000){alert('El CSV supera el límite de 20 KB.');return}
  const reader=new FileReader();
  reader.onload=()=>{
    const field=document.getElementById('abm-observation-csv');
    if(field)field.value=String(reader.result||'').replace(/^\uFEFF/,'');
    const status=document.getElementById('abm-calibrate-status');
    if(status)status.textContent='Archivo cargado localmente. Revisa los conteos antes de calibrar.';
  };
  reader.readAsText(file,'UTF-8');
}

/* Regenera entradas desde el formulario del experimento. No estima identidades. */
function getABMResearchInputs() {
  const x=current(), f=document.getElementById('abm-form');
  if(!x||!f)throw Error('Selecciona una iniciativa y configura el experimento.');
  const bi=Number(f.elements.behaviorIndex.value),behavior=(x.behaviors||[])[bi];
  if(!behavior)throw Error('Selecciona un comportamiento en Diseño.');
  const audienceSet=(x.audiences||[]).filter(a=>
    behavior.scope!=='specific'||(behavior.audienceIds||[]).map(String).includes(String(a.id)));
  if(!audienceSet.length)throw Error('No hay audiencias aplicables al comportamiento.');
  const allAud=x.audiences||[];
  const dimensions={};
  allAud.forEach((a,i)=>{
    dimensions[String(a.id)]={};
    for (const k of ['capability','opportunity','motivation']){
      const v=Number(f.elements[k+'_'+i]?.value);
      if(!Number.isFinite(v)||v<0||v>1)throw Error('Las condiciones COM-B deben estar entre 0 y 1.');
      dimensions[String(a.id)][k]=v;
    }
  });
  const sample=Number(f.elements.sampleSize.value);
  const payload={
    audiences:audienceSet.map(a=>({id:String(a.id),name:String(a.name),
      population:Number(a.population)||0,...dimensions[String(a.id)]})),
    mode:f.elements.mode.value,behavior:behavior.name,
    scenario:f.elements.scenario.value,
    initial_adoption:Number(f.elements.initialPct.value)/100,
    periods:Number(f.elements.periods.value),
    runs:12,sample_size:sample,seed:Number(f.elements.seed.value),
    agents:[],edges:[]
  };
  if(payload.mode==='observed'){
    const persons=(x.nodes||[]).map((n,i)=>({...n,idx:i})).filter(n=>n.type==='Persona');
    const missing=persons.filter(n=>!String((x.abmAudienceMap||{})[n.idx]||n.audienceId||''));
    if(missing.length)throw Error('Asigna audiencias a todos los nodos de tipo Persona en el panel del Grafo.');
    const allowed=new Set(audienceSet.map(a=>String(a.id)));
    const included=persons.filter(n=>allowed.has(String((x.abmAudienceMap||{})[n.idx]||n.audienceId)));
    if(included.length<2)throw Error('Se necesitan al menos dos personas pertenecientes a las audiencias aplicables.');
    const includedIds=new Set(included.map(n=>String(n.idx)));
    payload.agents=included.map(n=>({id:String(n.idx),
      audience_id:String((x.abmAudienceMap||{})[n.idx]||n.audienceId)}));
    payload.edges=(x.edges||[]).filter(edge=>
      String(edge.relation||edge.label||'').trim().toLowerCase()==='influye en' &&
      includedIds.has(String(edge.s))&&includedIds.has(String(edge.t)))
      .map(edge=>({source:String(edge.s),target:String(edge.t),
        weight:edge.measureType==='scale'&&Number(edge.measureValue)>0
          ?Math.min(1,Number(edge.measureValue)/5):1}));
    if(!payload.edges.length)throw Error('No hay enlaces «Influye en» entre las personas seleccionadas.');
  }
  return {payload,behaviorIndex:String(bi)};
}

async function postABMResearch(path,payload) {
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Inicia sesión en HACERLO.');
  const response=await fetch(HACERLO_ENGINE_URL+path,{
    method:'POST',headers:{'Content-Type':'application/json',
      Authorization:'Bearer '+session.access_token,
      'X-Supabase-Apikey':SUPABASE_PUBLISHABLE_KEY},
    body:JSON.stringify(payload)
  });
  if(!response.ok){let error={};try{error=await response.json()}catch(_){}
    throw Error(typeof error.detail==='string'?error.detail:'Error HTTP '+response.status)}
  return response.json();
}

async function calibrateAgentModel() {
  const button=document.getElementById('abm-calibrate-button');
  const status=document.getElementById('abm-calibrate-status');
  if(!button||button.disabled)return;
  button.disabled=true;status.textContent='Ajustando con datos de entrenamiento; la validación queda reservada…';
  try{
    const {payload,behaviorIndex}=getABMResearchInputs();
    const raw=document.getElementById('abm-observation-csv').value;
    const observations=parseABMObservations(raw);
    payload.observations=observations;
    payload.periods=observations.length-1;
    if(payload.mode==='synthetic')payload.sample_size=Math.min(300,Math.max(20,payload.sample_size));
    const result=await postABMResearch('/api/simulation/calibrate',payload);
    const x=current();
    x.abmObservationCsv=x.abmObservationCsv||{};
    x.abmObservationCsv[behaviorIndex]=raw;
    x.abmCalibration={behaviorKey:behaviorIndex,runAt:new Date().toISOString(),fingerprint:abmInputFingerprint(payload),result};
    const enable=document.querySelector('input[name="useCalibrated"]');
    if(enable)enable.disabled=false;
    save();
    document.getElementById('abm-calibration-result').innerHTML=renderABMCalibrationResult(result);
    status.textContent='Calibración retrospectiva terminada. Revisa el error reservado antes de usar los parámetros.';
  }catch(err){console.error(err);status.textContent='No se pudo calibrar: '+err.message}
  finally{button.disabled=false}
}

async function evaluateABMSensitivity() {
  const button=document.getElementById('abm-sensitivity-button');
  const status=document.getElementById('abm-sensitivity-status');
  if(!button||button.disabled)return;
  button.disabled=true;status.textContent='Evaluando variaciones del modelo…';
  try{
    const {payload,behaviorIndex}=getABMResearchInputs();
    const x=current(),cal=x.abmCalibration;
    const limit=Number(document.getElementById('abm-target-effect').value);
    if(!Number.isFinite(limit)||limit<0||limit>100)throw Error('El objetivo debe estar entre 0 y 100 pp.');
    payload.target_effect_pp=limit;
    payload.runs=12;
    payload.periods=Math.min(18,payload.periods);
    if(payload.mode==='synthetic')payload.sample_size=Math.min(300,payload.sample_size);
    if(cal?.behaviorKey===behaviorIndex && cal.fingerprint===abmInputFingerprint(payload) && cal.result?.parameters)
      payload.parameters=cal.result.parameters;
    else if(cal?.behaviorKey===behaviorIndex)
      status.textContent='Configuración modificada: sensibilidad con parámetros base; recalibra para reutilizar el ajuste.';
    const result=await postABMResearch('/api/simulation/sensitivity',payload);
    x.abmTargetEffect=limit;
    x.abmSensitivity={behaviorKey:behaviorIndex,runAt:new Date().toISOString(),result};
    save();
    document.getElementById('abm-sensitivity-result').innerHTML=renderABMSensitivityResult(result);
    status.textContent='Sensibilidad calculada. Resultado condicionado a las reglas y escenarios probados.';
  }catch(err){console.error(err);status.textContent='No se pudo calcular: '+err.message}
  finally{button.disabled=false}
}

function renderABMCalibrationResult(r) {
  if(!r||!r.parameters)return '<p class="notice">Resultados no disponibles.</p>';
  const p=n=>(Number(n)*100).toFixed(1)+'%';
  const n=n=>Number(n).toFixed(2);
  const improvement=r.better_than_naive;
  const rows=(r.series||[]).map(v=>
    '<tr><td>'+v.period+'</td><td>'+p(v.observed)+'</td><td>'+p(v.calibrated)+
    '</td><td>'+(v.set==='holdout'?'Validación reservada':'Ajuste')+'</td></tr>').join('');
  return '<div class="panel" style="margin-top:12px"><h3>Resultado de calibración retrospectiva</h3>' +
    '<p class="notice">No es validación prospectiva. Los resultados dependen del modelo y de las mediciones agregadas.</p>' +
    '<div class="triple"><div><small>Error en ajuste</small><div class="metric">'+n(r.training_mae_pp)+' pp</div></div>' +
    '<div><small>Error reservado (holdout)</small><div class="metric">'+n(r.holdout_mae_pp)+' pp</div></div>' +
    '<div><small>Referencia ingenua (holdout)</small><div class="metric">'+n(r.naive_holdout_mae_pp)+' pp</div></div></div>' +
    '<p><strong>'+ (improvement?'Menor error que el modelo de persistencia.':'No mejoró el modelo de persistencia.') +'</strong> ' +
    'La comparación se limita a los dos periodos separados de esta misma serie.</p>' +
    '<p class="muted">Parámetros ajustados: umbral medio '+n(r.parameters.threshold_mean)+
    ' · peso social '+n(r.parameters.peer_weight)+' · tasa máxima fija '+n(r.parameters.adoption_rate)+
    '. Candidatos parecidos: '+Number(r.near_optimal_candidates)+' de '+Number(r.searched_candidates)+'.</p>' +
    '<details><summary style="cursor:pointer">Ver periodos y trazabilidad</summary><div style="overflow:auto"><table><tr><th>Periodo</th><th>Adopción observada</th><th>ABM ajustado</th><th>Conjunto</th></tr>'+rows+'</table></div>' +
    '<p>Repeticiones de ajuste: '+Number(r.fit_runs)+' · evaluación: '+Number(r.evaluation_runs)+' · agentes: '+Number(r.number_of_agents)+'.</p></details>' +
    '<details><summary style="cursor:pointer">Limitaciones científicas</summary><ul>'+
    (r.limitations||[]).map(v=>'<li>'+safe(v)+'</li>').join('')+'</ul></details></div>';
}

function renderABMSensitivityResult(r) {
  if(!r||!r.summary)return '<p class="notice">Resultados no disponibles.</p>';
  const s=r.summary;
  const rows=(r.configurations||[]).map(v=>
    '<tr><td>'+Number(v.parameters.threshold_mean).toFixed(2)+'</td><td>'+
    Number(v.parameters.peer_weight).toFixed(2)+'</td><td>'+
    Number(v.effect_pp).toFixed(2)+' pp</td><td>'+
    (v.meets_target?'Sí':'No')+'</td></tr>').join('');
  return '<div class="panel" style="margin-top:12px"><h3>Robustez condicionada a 9 configuraciones</h3>' +
    '<div class="triple"><div><small>Ganancia mínima</small><div class="metric">'+Number(s.min_effect_pp).toFixed(1)+' pp</div></div>' +
    '<div><small>Ganancia mediana</small><div class="metric">'+Number(s.median_effect_pp).toFixed(1)+' pp</div></div>' +
    '<div><small>Ganancia máxima</small><div class="metric">'+Number(s.max_effect_pp).toFixed(1)+' pp</div></div></div>' +
    '<p class="muted">El objetivo de '+Number(r.target_effect_pp).toFixed(1)+' pp se cumple en '+s.meeting_target+
    ' de '+s.total+' configuraciones ensayadas. NO representa una probabilidad de ocurrencia real.</p>' +
    '<details><summary style="cursor:pointer">Matriz de sensibilidad</summary><div style="overflow:auto"><table><tr><th>Umbral</th><th>Influencia social</th><th>Ganancia</th><th>Objetivo</th></tr>'+rows+
    '</table></div></details><p class="notice">'+(r.limitations||[]).map(safe).join(' ')+'</p></div>';
}
