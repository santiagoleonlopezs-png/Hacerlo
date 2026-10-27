/* HACERLO V2 · Adaptador de evidencia de adopción.
   Solo agrega registros existentes; no genera identidades, puntuaciones ni predicciones.
   Se mantiene separado del motor ABM y de Gestión de audiencias. */
function abmV2BehaviorKey(b,i) {
  return String(b?.id ?? 'legacy-'+i);
}
function abmV2AudienceId(x,node,index) {
  const chosen=(x.abmAudienceMap||{})[index];
  if(chosen !== undefined && chosen !== null && String(chosen)!=='')return String(chosen);
  if(node?.sourceKind==='audiencia' && node.sourceId != null &&
     (x.audiences||[]).some(a=>String(a.id)===String(node.sourceId)))
    return String(node.sourceId);
  return String(node?.audienceId??'');
}

/* Grafo V2: conserva únicamente influencias explícitas con evidencia registrada.
   Enlaces declarados/hipotéticos nunca se disfrazan de red observada.
   La fuerza es 1–5 para measureType "influence" (V2); falta de medida = 0,5 hipotética. */
function abmV2NetworkEdges(x,indices) {
  const selected=new Set(indices.map(String));
  const result={edges:[],candidate:0,excludedUnverified:0,unmeasured:0};
  for(const e of (x.edges||[])){
    if(String(e.relation||e.label||'').trim().toLowerCase()!=='influye en')continue;
    if(!selected.has(String(e.s))||!selected.has(String(e.t))||String(e.s)===String(e.t))continue;
    result.candidate++;
    const evidence=String(e.evidence||'').trim().toLowerCase();
    if(!['observada','registrada'].includes(evidence)){
      result.excludedUnverified++;
      continue;
    }
    const raw=Number(e.measureValue);
    const measured=['influence','scale'].includes(String(e.measureType)) &&
      e.measureValue!==null && e.measureValue!==undefined && e.measureValue!=='' &&
      Number.isInteger(raw) && raw>=1 && raw<=5;
    if(!measured)result.unmeasured++;
    result.edges.push({source:String(e.s),target:String(e.t),
      weight:measured?raw/5:0.5});
  }
  return result;
}

function abmV2EvidenceSummary(x,behavior) {
  const all=(x.audiencePeople||[]);
  const auds=x.audiences||[];
  const eligibleAudienceIds=new Set(auds.filter(a=>
    behavior?.scope!=='specific'||
    (behavior?.audienceIds||[]).map(String).includes(String(a.id))
  ).map(a=>String(a.id)));
  const eligible=behavior?all.filter(p=>eligibleAudienceIds.has(String(p.audienceId))):[];
  const statuses=['unknown','understands','tries','performs','sustains'];
  const byStatus=Object.fromEntries(statuses.map(s=>[s,0]));
  const byAudience={};
  let measured=0,latestDate='';
  for(const p of eligible) {
    let history=(p.adoptionHistory||[]).filter(row=>
      String(row.behaviorId)===String(behavior.id) &&
      statuses.includes(row.stage) &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(row.observedOn||'')));
    history=history.slice().sort((a,b)=>
      String(a.observedOn).localeCompare(String(b.observedOn))||
      String(a.recordedAt||'').localeCompare(String(b.recordedAt||'')));
    const row=history.at(-1);
    const state=row?.stage||'unknown';
    if(!byAudience[String(p.audienceId)])
      byAudience[String(p.audienceId)]={eligible:0,measured:0,confirmed:0};
    const a=byAudience[String(p.audienceId)];
    a.eligible++;
    byStatus[state]++;
    if(row && state!=='unknown'){measured++;a.measured++;if(row.observedOn>latestDate)latestDate=row.observedOn}
    if(state==='performs'||state==='sustains')a.confirmed++;
  }
  const eligibleCount=eligible.length;
  const confirmed=byStatus.performs+byStatus.sustains;
  return {
    kind:'recorded_adoption_coverage',behaviorId:String(behavior?.id??''),
    behaviorName:String(behavior?.name||''),eligible:eligibleCount,
    measured,unknown:eligibleCount-measured,confirmed,
    observedPct:eligibleCount?100*confirmed/eligibleCount:null,
    coveragePct:eligibleCount?100*measured/eligibleCount:null,
    stages:byStatus,byAudience,latestDate,
    source:'Gestión de audiencias · historial de adopción',
    definition:'Realiza o Sostiene en el registro más reciente por persona y comportamiento',
    restrictions:[
      'Este dato describe el estado registrado más reciente, no el número acumulado de primeras adopciones.',
      'Sin evidencia, una persona permanece en el denominador pero no se cuenta como confirmada.',
      'No se infiere una serie temporal ni se construyen observaciones para calibración automáticamente.',
      'Solo agregar a nivel de iniciativa autorizada; no enviar historiales personales al backend.'
    ]
  };
}

/* Diagnóstico y Pensamiento sistémico aportan hipótesis, nunca coeficientes
   automáticos: ninguna barrera equivale por sí sola a -0,18 de oportunidad. */
function abmV2HypothesisContext(x,behavior) {
  const factors=Object.values(x.behaviorDiagnosis||{})
    .filter(f=>f&&f.role==='Barrera')
    .slice(0,16)
    .map(f=>({name:String(f.factor||f.name||'Factor'),
              dimension:String(f.dimension||'Sin dimensión')}));
  const conditions=(x.systemV23?.conditions||[])
    .filter(c=>c&&c.orientation==='Dificulta'&&c.state!=='Resuelta' &&
      (!c.behaviorId||String(c.behaviorId)===String(behavior?.id)))
    .slice(0,16)
    .map(c=>({name:String(c.name||'Condición'),state:String(c.state||'Sin información')}));
  return {factors,conditions,
    scope:'Hipótesis registradas en la iniciativa. Sin vínculo individual validado, pueden ser contextuales y no exclusivas del comportamiento.'};
}
function renderABMV2Hypotheses(x,behavior){
  if(!behavior)return '';
  const context=abmV2HypothesisContext(x,behavior);
  const factorList=context.factors.map(f=>'<li>'+safe(f.dimension)+': '+safe(f.name)+'</li>').join('');
  const condList=context.conditions.map(c=>'<li>'+safe(c.name)+' · '+safe(c.state)+'</li>').join('');
  return '<details class="panel" style="margin:12px 0"><summary style="font-weight:700;cursor:pointer">'+
    'Hipótesis para interpretar escenarios · Diagnóstico y Pensamiento sistémico'+
    ' ('+(context.factors.length+context.conditions.length)+')</summary>'+
    '<p class="notice">Estas barreras y condiciones NO alteran automáticamente las probabilidades del ABM. Son evidencias contextuales para formular y contrastar supuestos.</p>'+
    '<div class="grid"><div><h3>Factores conductuales registrados</h3>'+
    (factorList?'<ul>'+factorList+'</ul>':'<p class="muted">No hay barreras conductuales registradas.</p>')+
    '</div><div><h3>Condiciones sistémicas activas</h3>'+
    (condList?'<ul>'+condList+'</ul>':'<p class="muted">No hay condiciones restrictivas activas registradas.</p>')+
    '</div></div><p class="muted">'+safe(context.scope)+'</p></details>';
}

function renderABMV2Evidence(x,behavior) {
  if(!behavior)return '';
  const r=abmV2EvidenceSummary(x,behavior);
  const format=n=>n===null?'—':Number(n).toFixed(1)+'%';
  const rows=Object.entries(r.byAudience).map(([id,a])=>{
    const label=(x.audiences||[]).find(o=>String(o.id)===id)?.name||id;
    return '<tr><td>'+safe(label)+'</td><td>'+a.eligible+'</td><td>'+a.measured+'</td><td>'+a.confirmed+'</td></tr>';
  }).join('');
  return '<section class="panel" style="margin:12px 0">'+
    '<div class="flex" style="justify-content:space-between"><div><h2>Evidencia conectada con Gestión de audiencias</h2>'+
    '<p class="muted">Consolidado del último estado registrado por persona para este comportamiento; no son predicciones.</p></div>'+
    '<button class="secondary" type="button" onclick="go(&quot;Gestión de audiencias&quot;)">Revisar evidencia</button></div>'+
    '<div class="triple"><div><small>Personas elegibles registradas</small><div class="metric">'+r.eligible+'</div></div>'+
    '<div><small>Cobertura de evidencia</small><div class="metric">'+format(r.coveragePct)+'</div></div>'+
    '<div><small>Realiza o Sostiene, documentadas</small><div class="metric">'+format(r.observedPct)+'</div></div></div>'+
    '<p class="muted">Distribución: Comprende '+r.stages.understands+
    ' · Prueba '+r.stages.tries+' · Realiza '+r.stages.performs+
    ' · Sostiene '+r.stages.sustains+' · Sin evidencia '+r.stages.unknown+
    (r.latestDate?' · Última fecha: '+safe(r.latestDate):'')+'</p>'+
    (r.eligible>0?'<div class="flex"><button type="button" class="secondary" '+(r.measured!==r.eligible?'disabled ':'')+
    'onclick="abmV2UseObservedBase()">Usar el porcentaje documentado como referencia inicial</button>'+
    '<small class="muted">'+(r.measured!==r.eligible?'Disponible solo cuando el 100% de la cohorte elegible tenga evidencia.':'Requiere decisión explícita; no calibra el modelo por sí mismo.')+'</small></div>':
    '<p class="notice">Aún no hay personas asociadas a este comportamiento en Gestión de audiencias.</p>')+
    '<details><summary>Auditar agregados por audiencia</summary><div style="overflow:auto"><table>'+
    '<tr><th>Audiencia</th><th>Elegibles</th><th>Con evidencia</th><th>Realiza o Sostiene</th></tr>'+
    rows+'</table></div><p class="muted">'+r.restrictions.map(safe).join(' ')+'</p></details></section>';
}
function abmV2UseObservedBase(){
  const x=current(),f=document.getElementById('abm-form');
  if(!x||!f)return;
  const bi=Number(f.elements.behaviorIndex.value),b=(x.behaviors||[])[bi];
  if(!b)return;
  const r=abmV2EvidenceSummary(x,b);
  if(!r.eligible||r.measured!==r.eligible){
    const status=document.getElementById('abm-status');
    if(status)status.textContent='No se puede usar como línea base: falta evidencia para algunas personas elegibles.';
    return;
  }
  const initial=f.elements.initialPct;
  if(!initial)return;
  initial.value=Math.round(r.observedPct);
  initial.dataset.source='audience-adoption-history';
  const status=document.getElementById('abm-status');
  if(status)status.textContent='Referencia inicial tomada de registros agregados. Revisa el porcentaje antes de ejecutar; no valida los coeficientes.';
}
