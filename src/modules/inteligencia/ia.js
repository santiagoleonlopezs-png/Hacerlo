function integratedAIBlock(x){
 const a=x&&x.integratedAIAnalysis;
 return `<section class="panel" style="border-color:#267e79"><h2>5. Inteligencia artificial · HACERLO</h2><p class="muted">Interpreta los datos registrados en toda la iniciativa: resultados, diseño, redes, sistema, implementación y medición. Distingue evidencias de hipótesis; no prueba causalidad.</p><button class="primary" onclick="runIntegratedAI()">✦ ${a?'Actualizar interpretación':'Interpretar iniciativa con IA'}</button><div id="integrated-ai-status" class="notice" style="margin-top:10px">Solo se enviarán los datos de la iniciativa seleccionada al servicio de IA. Revisa la información sensible antes de continuar.</div>${a?renderLocalAIResult(a):''}</section>`;
}
function renderLocalAIResult(a){
 const arr=v=>Array.isArray(v)?v:[];
 return `<div style="margin-top:14px"><h3>Lectura del sistema</h3><p>${safe(a.system_reading||'')}</p>
 <h3>Hallazgos estructurales</h3>${arr(a.structural_findings).map(z=>`<p>• ${safe(z)}</p>`).join('')}
 <h3>Hipótesis</h3>${arr(a.hypotheses).map(z=>`<div class="dash-card"><b>${safe(z.title||'')}</b><p>${safe(z.rationale||'')}</p><small class="muted">${safe(z.evidence_limit||'')}</small></div>`).join('')}
 <h3>Opciones de intervención</h3>${arr(a.interventions).map((z,i)=>`<div class="dash-card"><b>${safe(z.name||'')}</b><p>${safe(z.why||'')}</p><small class="muted">Medir: ${safe(z.measure||'')}</small><p><button class="secondary" onclick="convertAIIntervention(${i})">Llevar a Intervenciones →</button></p></div>`).join('')}
 <h3>Qué medir</h3>${arr(a.what_to_measure).map(z=>`<p>• ${safe(z)}</p>`).join('')}
 <div class="notice">${safe(a.traceability||'Interpretación generativa; no demuestra causalidad.')} · Modelo: ${safe(a.model||'')}</div></div>`;
}
function initiativeAIPayload(x){
 const pick=(arr,max=60)=>Array.isArray(arr)?arr.slice(0,max):[];
 const compact=(value,max=1400)=>JSON.parse(JSON.stringify(value??null,(key,val)=>typeof val==='string'?val.slice(0,max):val));
 const initiative={name:x.name,description:x.description,scope:x.scope,population:x.population,
  objective:x.objective,expected:x.expected,phase:phases[x.phase||0]?.[1],
  results:{indicators:pick(x.indicators),dimensions:x.dimensions},
  diagnosis:pick(x.diagnosisRecords||x.diagnosis),
  design:{behaviors:pick(x.behaviors),audiences:pick(x.audiences)},
  analysis:{network:{nodes:pick(x.nodes),edges:pick(x.edges,120),computed:x.networkAnalysis||null},system:{variables:pick(x.systemVariables),links:pick(x.systemLinks)},scenarios:pick(x.experiments),evidence:pick(x.evidenceRecords)},
  implementation:{actions:pick(x.actions)},
  measurement:{metrics:x.metrics,metricHistory:x.metricHistory,observations:pick(x.observations)}
 };
 return {initiative:compact(initiative),network_analysis:compact(x.networkAnalysis||{}),methodological_rules:[
 'Separar evidencia observada, declarada, estimada e hipótesis.',
 'No inventar métricas ni resultados de simulación; no afirmar causalidad.',
 'No asumir que ausencia de datos implica ausencia de fenómeno.',
 'Diferenciar diagnóstico exploratorio, presente y posibles riesgos futuros.',
 'Ofrecer alternativas y qué medir para contrastarlas.',
 'La estructura de redes no demuestra influencia causal ni adopción.'
 ]};
}
async function runIntegratedAI(){
 const x=current(),status=document.getElementById('integrated-ai-status');if(!x)return;
 try{
  if(status)status.textContent='Interpretando la iniciativa…';
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Debes iniciar sesión.');
  const response=await fetch(HACERLO_ENGINE_URL+'/api/ai/interpret',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'X-Supabase-Apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(initiativeAIPayload(x))});
  if(!response.ok){let err={};try{err=await response.json()}catch(_){}throw Error(err.detail||'HTTP '+response.status)}
  x.integratedAIAnalysis={...await response.json(),generatedAt:new Date().toISOString()};save();render();
 }catch(e){console.error(e);const el=document.getElementById('integrated-ai-status');if(el)el.textContent='No se pudo interpretar: '+e.message}
}
function convertAIIntervention(index){prepareAIAction(index)}
