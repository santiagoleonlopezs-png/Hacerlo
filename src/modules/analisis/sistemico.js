/* HACERLO V2.7.3 · Pensamiento sistémico conectado con Diagnóstico, Audiencias y Grafo. */
const SYS_TYPES=['Política','Proceso','Incentivo','Recurso','Norma o práctica','Restricción','Contexto','Otra'];
const SYS_MECH=['Refuerzo','Compensación','Incentivos contradictorios','Dependencia histórica','Demora','Acumulación','Adaptación','Consecuencia no prevista','Otro'];
const SYS_STATES=['Presente','Persistente','Modificada','Resuelta','Nueva','Reaparecida','Sin información'];
let sysTab='mapa',sysSelected=null,sysMoment='Todos',sysCompare=false;

function sysBehaviorGo(id){const x=current();sysStore(x).selectedBehavior=id;save();render()}
function sysBehaviorList(x){return (x.behaviors||[]).map((b,i)=>({id:String(b.id??i),name:b.name||b.behavior||'Comportamiento sin nombre'}))}
function sysStore(x){if(!x.systemV23)x.systemV23={conditions:[],mechanisms:[],hypotheses:[],events:[]};return x.systemV23}
function sysId(){return 'sys-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function sysOptions(values,selected=''){return values.map(v=>`<option ${v===selected?'selected':''}>${safe(v)}</option>`).join('')}
function sysEvent(store,kind,id,detail,extra={}){store.events.push({id:sysId(),date:new Date().toISOString(),kind,target:id,detail,...extra})}

function sysCondFromExisting(x){
 const s=sysStore(x);
 const names=new Set(s.conditions.map(c=>c.name.toLocaleLowerCase('es')));
 const candidates=[];

 // 1. Factores conductuales del Diagnóstico (Capacidad, Motivación, Entorno)
 Object.entries(x.behaviorDiagnosis||{}).forEach(([key,f])=>{
  if(!f)return;
  const orientation=f.role==='Barrera'?'Dificulta':f.role==='Facilitador'?'Favorece':'Por explorar';
  const type=f.dimension==='Entorno'?'Contexto':f.dimension==='Motivación'?'Incentivo':'Recurso';
  candidates.push({
   name:`[${f.dimension}] ${f.factor}`,
   source:`Diagnóstico conductual (${f.role||'Por explorar'})`,
   orientation,
   type,
   evidence:`Factor de ${f.dimension} clasificado como ${f.role||'Por explorar'} en el Diagnóstico.`
  });
 });

 // 2. Audiencias (Barreras, Impactos y Posicionamiento Q1-Q4)
 (x.audiences||[]).forEach(a=>{
  const aName=a.name||a.nombre||'Audiencia';
  const q=typeof audQuadrant==='function'?audQuadrant(a):null;
  if(a.barriers){
   candidates.push({
    name:`Barrera en ${aName}: ${String(a.barriers).slice(0,100)}`,
    source:'Gestión de audiencias',
    orientation:'Dificulta',
    type:'Restricción',
    evidence:`Audiencia ${aName} (${q||'Sin cuadrante'} · Posición: ${a.position||'Sin clasificar'}).`
   });
  }
  if(a.impact||a.specificImpact){
   candidates.push({
    name:`Impacto en audiencia ${aName}${a.specificImpact?': '+String(a.specificImpact).slice(0,90):''}`,
    source:'Gestión de audiencias',
    orientation:a.position==='Promotor'?'Favorece':(['Probable Resistente','Saboteador Abierto','Saboteador Oculto'].includes(a.position)?'Dificulta':'Por explorar'),
    type:'Norma o práctica',
    evidence:`Impacto ${a.impact||'registrado'} en ${aName} (${a.population||1} personas).`
   });
  }
 });

 // 3. Alertas y factores en las conexiones del Grafo de Adopción
 const nodes=x.nodes||[];
 (x.edges||[]).forEach(e=>{
  const sName=nodes[e.s]?.name||'Origen',tName=nodes[e.t]?.name||'Destino',rel=e.relation||e.label||'Relación';
  (e.graphFactors||[]).forEach(gf=>{
   candidates.push({
    name:`Enlace ${sName} → ${tName} (${rel}): ${gf.name}`,
    source:'Grafo de adopción',
    orientation:gf.role==='Barrera'?'Dificulta':gf.role==='Facilitador'?'Favorece':'Por explorar',
    type:'Proceso',
    evidence:gf.description||`Alerta (${gf.role}) registrada sobre la conexión ${sName} → ${tName}.`
   });
  });
 });

 // 4. Hallazgos del Diagnóstico
 (x.diagnosisFindings||[]).forEach(v=>{
  const text=v.title||v.name||v.description||v.text||v.narrative;
  if(!text)return;
  const orientation=v.role==='Barrera'?'Dificulta':v.role==='Facilitador'?'Favorece':'Por explorar';
  candidates.push({
   name:String(text).slice(0,140),
   source:v.source?`Hallazgo (${v.source})`:'Hallazgos del diagnóstico',
   orientation,
   type:(v.categories&&SYS_TYPES.includes(v.categories[0]))?v.categories[0]:'Otra',
   evidence:`Evidencia ${v.evidenceType||'registrada'}${v.indicator?' · Indicador: '+v.indicator:''}`
  });
 });

 // 5. Variables del modelo sistémico anterior
 (x.systemVariables||[]).forEach(v=>candidates.push({
  name:v.name,
  source:'Modelo sistémico anterior',
  orientation:'Por explorar',
  type:'Otra',
  evidence:v.description||''
 }));

 return candidates.filter(v=>v.name&&!names.has(v.name.toLocaleLowerCase('es'))).slice(0,50);
}

function sysAddCondition(e){
 e.preventDefault();const x=current(),s=sysStore(x),f=e.target;
 const c={id:sysId(),name:f.elements.name.value.trim(),type:f.elements.type.value,orientation:f.elements.orientation.value,state:'Presente',evidence:f.elements.evidence.value.trim(),source:'Registro manual',behaviorId:s.selectedBehavior||'',createdAt:new Date().toISOString()};
 if(!c.name)return;
 s.conditions.push(c);sysEvent(s,'Condición',c.id,'Condición registrada',{state:c.state});sysSelected=c.id;save();render();
}

function sysImportCandidate(i){
 const x=current(),s=sysStore(x),v=sysCondFromExisting(x)[i];if(!v)return;
 const c={id:sysId(),name:v.name,type:SYS_TYPES.includes(v.type)?v.type:'Otra',orientation:v.orientation||'Por explorar',state:'Presente',evidence:v.evidence||'',source:v.source,behaviorId:s.selectedBehavior||'',createdAt:new Date().toISOString()};
 s.conditions.push(c);sysEvent(s,'Condición',c.id,'Incorporada desde '+v.source,{state:c.state});sysSelected=c.id;save();render();
}

function sysImportAllBarriers(){
 const x=current(),s=sysStore(x),cands=sysCondFromExisting(x).filter(c=>c.orientation==='Dificulta'||c.orientation==='Favorece');
 if(!cands.length)return alert('No hay barreras o facilitadores nuevos por incorporar.');
 cands.forEach(v=>{
  const c={id:sysId(),name:v.name,type:SYS_TYPES.includes(v.type)?v.type:'Otra',orientation:v.orientation,state:'Presente',evidence:v.evidence||'',source:v.source,behaviorId:s.selectedBehavior||'',createdAt:new Date().toISOString()};
  s.conditions.push(c);
  sysEvent(s,'Condición',c.id,'Incorporación automática desde '+v.source,{state:c.state});
 });
 save();render();
}

function sysAddMechanism(e){
 e.preventDefault();const s=sysStore(current()),f=e.target;
 const m={id:sysId(),name:f.elements.name.value.trim(),type:f.elements.type.value,conditionId:f.elements.condition.value,evidence:f.elements.evidence.value.trim(),certainty:f.elements.certainty.value,createdAt:new Date().toISOString()};
 if(!m.name)return;
 s.mechanisms.push(m);sysEvent(s,'Mecanismo',m.id,'Mecanismo registrado');sysSelected=m.conditionId;save();render();
}

function sysAddHypothesis(e){
 e.preventDefault();const s=sysStore(current()),f=e.target;
 const h={id:sysId(),conditionId:f.elements.condition.value,statement:f.elements.statement.value.trim(),evidence:f.elements.evidence.value.trim(),status:'Pendiente',decision:f.elements.decision.value.trim(),actionId:f.elements.action.value,learning:'',createdAt:new Date().toISOString()};
 if(!h.statement)return;
 s.hypotheses.push(h);sysEvent(s,'Hipótesis',h.id,'Hipótesis formulada');save();sysTab='hipotesis';render();
}

function sysUpdateCondition(e,id){
 e.preventDefault();const s=sysStore(current()),c=s.conditions.find(c=>c.id===id);if(!c)return;
 const f=e.target;const old=c.state;c.state=f.elements.state.value;c.evidence=f.elements.evidence.value.trim();
 const note=f.elements.note.value.trim();sysEvent(s,'Condición',id,note||`Estado: ${old} → ${c.state}`,{state:c.state});save();render();
}

function sysUpdateHypothesis(e,id){
 e.preventDefault();const s=sysStore(current()),h=s.hypotheses.find(h=>h.id===id);if(!h)return;
 const f=e.target;h.status=f.elements.status.value;h.decision=f.elements.decision.value.trim();h.learning=f.elements.learning.value.trim();
 sysEvent(s,'Hipótesis',id,'Revisión: '+h.status,{status:h.status});save();render();
}

function sysTabGo(v){sysTab=v;render()}
function sysChoose(v){sysSelected=v;render()}
function sysMomentGo(v){sysMoment=v;render()}
function sysCompareGo(){sysCompare=!sysCompare;render()}
function sysSnapshot(s,date){const states={};for(const e of s.events.filter(e=>e.kind==='Condición'&&e.state&&e.date.slice(0,10)<=date).sort((a,b)=>a.date.localeCompare(b.date)))states[e.target]=e.state;return states}

function sysRender(a,head,x){
 const s=sysStore(x),selected=s.conditions.find(c=>c.id===sysSelected),candidates=sysCondFromExisting(x),actions=x.actions||[];
 const filters=s.conditions;
 const behaviors=sysBehaviorList(x);if(!s.selectedBehavior&&behaviors.length)s.selectedBehavior=behaviors[0].id;const activeBehavior=behaviors.find(b=>b.id===s.selectedBehavior);
 const tabs=[['mapa','▤ Mapa sistémico'],['mecanismos','⚙ Explorar mecanismos'],['hipotesis','◈ Hipótesis y decisiones']];
 let content='';
 if(sysTab==='mapa'){
  const band=(label,orientation,cls)=>`<section class="sys-band ${cls}"><h3>${label}</h3><div class="sys-chips">${filters.filter(c=>c.orientation===orientation).map(c=>`<button class="sys-chip ${sysSelected===c.id?'picked':''}" onclick="sysChoose('${c.id}')"><small>${safe(c.type)} · ${safe(c.state)}</small><strong>${safe(c.name)}</strong></button>`).join('')||'<span class="sys-placeholder">Sin condiciones registradas · Añade una condición o incorpora un hallazgo</span>'}</div></section>`;
  content=`<div class="sys-layout"><div><div class="sys-map"><div class="sys-center"><span class="sys-eyebrow">◎ COMPORTAMIENTO CENTRAL</span><strong>${safe(activeBehavior?.name||'Selecciona un comportamiento desde Diseño')}</strong></div><div class="sys-map-label">CONDICIONES DEL SISTEMA <small>Selecciona una tarjeta para profundizar</small></div>${band('↑ Condiciones que favorecen','Favorece','sys-positive')}${band('↓ Condiciones que dificultan','Dificulta','sys-negative')}${band('↔ Condiciones por explorar','Por explorar','sys-neutral')}<section class="sys-band sys-purple"><h3>⟳ Mecanismos que podrían sostener la situación</h3><div class="sys-chips">${s.mechanisms.map(m=>`<button class="sys-chip" onclick="sysChoose('${m.conditionId}')"><small>${safe(m.type)} · ${safe(m.certainty)}</small><strong>${safe(m.name)}</strong></button>`).join('')||'<span class="muted">Los mecanismos se exploran y registran en la segunda pestaña.</span>'}</div></section><section class="sys-band sys-amber"><h3>◇ Puntos ciegos y oportunidades</h3><p class="muted">¿Qué perspectivas, incentivos o condiciones faltan por contrastar?</p><button class="secondary" onclick="sysTabGo('mecanismos')">Explorar mecanismos →</button></section></div><details class="sys-form"><summary>＋ Registrar condición</summary><form onsubmit="sysAddCondition(event)"><label>Condición<input name="name" required maxlength="160" placeholder="Ej. Duplicidad de procesos"></label><label>Tipo<select name="type">${sysOptions(SYS_TYPES)}</select></label><label>Efecto observado o posible<select name="orientation">${sysOptions(['Favorece','Dificulta','Por explorar'])}</select></label><label>Evidencia o fundamento<textarea name="evidence" placeholder="¿Qué sabemos y de dónde proviene?"></textarea></label><button class="primary">Guardar condición</button></form></details>${candidates.length?`<details class="sys-form" open><summary>↗ Incorporar desde Diagnóstico, Audiencias y Grafo (${candidates.length})</summary><p class="muted">Selecciona las condiciones relevantes o sincroniza automáticamente barreras y facilitadores.</p><div style="margin-bottom:10px"><button type="button" class="primary" onclick="sysImportAllBarriers()">⚡ Sincronizar barreras y facilitadores automáticamente</button></div>${candidates.map((c,i)=>`<div class="sys-import"><span>${safe(c.name)} <small>· ${safe(c.source)} · <b>${safe(c.orientation||'Por explorar')}</b></small></span><button class="secondary" onclick="sysImportCandidate(${i})">Incorporar</button></div>`).join('')}</details>`:''}</div><aside class="sys-detail">${selected?`<h3>${safe(selected.name)}</h3><p class="muted">${safe(selected.type)} · ${safe(selected.source)}</p><p>Interpretación: <b>${safe(selected.orientation)}</b></p><p>Estado: <b>${safe(selected.state)}</b></p><p class="muted">${safe(selected.evidence||'Evidencia pendiente de registrar.')}</p><h4>Mecanismos relacionados</h4>${s.mechanisms.filter(m=>m.conditionId===selected.id).map(m=>`<p>⟳ ${safe(m.name)} <small>(${safe(m.certainty)})</small></p>`).join('')||'<p class="muted">Sin mecanismos asociados.</p>'}<form onsubmit="sysUpdateCondition(event,'${selected.id}')"><label>Actualizar estado<select name="state">${sysOptions(SYS_STATES,selected.state)}</select></label><label>Evidencia<textarea name="evidence">${safe(selected.evidence)}</textarea></label><label>¿Qué cambió? <input name="note" placeholder="Nueva observación o aprendizaje"></label><button class="primary">Registrar nueva observación</button></form><button class="secondary" onclick="sysTabGo('mecanismos')">Explorar mecanismos →</button>`:'<h3>Explora el sistema</h3><p class="muted">Selecciona una condición del mapa para ver evidencia, mecanismos y evolución.</p><div class="sys-guide"><b>1.</b> Selecciona un comportamiento.<br><b>2.</b> Incorpora hallazgos o registra condiciones.<br><b>3.</b> Explora qué las mantiene.</div>'}</aside></div>`;
 }else if(sysTab==='mecanismos'){
  content=`<div class="sys-layout"><section class="panel"><h2>Explorador de mecanismos</h2><p class="muted">Distingue observaciones, hipótesis y supuestos. No atribuyas causalidad sin evidencia.</p>${s.mechanisms.map(m=>`<article class="sys-record"><strong>${safe(m.name)}</strong><p>${safe(m.type)} · ${safe(s.conditions.find(c=>c.id===m.conditionId)?.name||'Sin condición')} · ${safe(m.certainty)}</p><p class="muted">${safe(m.evidence||'Sin evidencia vinculada')}</p></article>`).join('')||'<div class="empty">Aún no hay mecanismos registrados.</div>'}</section><aside class="sys-detail"><h3>＋ Explorar un mecanismo</h3><form onsubmit="sysAddMechanism(event)"><label>Nombre<input name="name" required placeholder="Ej. Incentivos que refuerzan rutinas"></label><label>Tipo<select name="type">${sysOptions(SYS_MECH)}</select></label><label>Condición relacionada<select name="condition" required>${s.conditions.map(c=>`<option value="${c.id}">${safe(c.name)}</option>`).join('')}</select></label><label>Estado del conocimiento<select name="certainty">${sysOptions(['Hipótesis','Observación','Supuesto por contrastar'])}</select></label><label>Evidencia y perspectivas<textarea name="evidence" placeholder="Qué lo sostiene, contradicciones, actores y antecedentes"></textarea></label><button class="primary" ${!s.conditions.length?'disabled':''}>Registrar mecanismo</button></form></aside></div>`;
 }else{
  content=`<div class="sys-layout"><section class="panel"><h2>Hipótesis sistémicas y decisiones</h2><p class="muted">Vincula decisiones e intervenciones existentes. Ejecutar una acción no demuestra que el sistema cambió.</p>${s.hypotheses.map(h=>`<article class="sys-record"><strong>${safe(h.statement)}</strong><p class="muted">Condición: ${safe(s.conditions.find(c=>c.id===h.conditionId)?.name||'No vinculada')} · ${safe(h.status)}</p><p>Evidencia: ${safe(h.evidence||'Pendiente')}</p><p>Decisión: ${safe(h.decision||'Pendiente')}</p><p>Intervención: ${safe(actions.find(a=>String(a.id)===String(h.actionId))?.title||actions.find(a=>String(a.id)===String(h.actionId))?.name||'Sin vincular')}</p><form onsubmit="sysUpdateHypothesis(event,'${h.id}')"><label>Estado<select name="status">${sysOptions(['Pendiente','Respaldada parcialmente','Respaldada','Contradicha','Sin evidencia suficiente'],h.status)}</select></label><label>Decisión<input name="decision" value="${safe(h.decision)}"></label><label>Aprendizaje<textarea name="learning">${safe(h.learning)}</textarea></label><button class="secondary">Guardar revisión</button></form></article>`).join('')||'<div class="empty">Todavía no hay hipótesis registradas.</div>'}</section><aside class="sys-detail"><h3>＋ Formular hipótesis</h3><form onsubmit="sysAddHypothesis(event)"><label>Condición<select name="condition" required>${s.conditions.map(c=>`<option value="${c.id}">${safe(c.name)}</option>`).join('')}</select></label><label>Hipótesis<textarea name="statement" required placeholder="Si modificamos…, podría ocurrir…"></textarea></label><label>Evidencia y supuestos<textarea name="evidence"></textarea></label><label>Decisión propuesta<input name="decision"></label><label>Intervención existente<select name="action"><option value="">Sin vincular</option>${actions.map(a=>`<option value="${safe(a.id)}">${safe(a.title||a.name||'Intervención')}</option>`).join('')}</select></label><button class="primary" ${!s.conditions.length?'disabled':''}>Guardar hipótesis</button></form></aside></div>`;
 }
 const dates=[...new Set(s.events.map(e=>e.date.slice(0,10)))].sort();
 let compare='';if(sysCompare){compare=`<div class="sys-compare"><label>Momento A<select id="sys-date-a">${dates.map(d=>`<option>${d}</option>`).join('')}</select></label><label>Momento B<select id="sys-date-b">${dates.map(d=>`<option ${d===dates.at(-1)?'selected':''}>${d}</option>`).join('')}</select></label><button class="secondary" onclick="sysDoCompare()">Comparar</button><div id="sys-compare-result" class="muted">Selecciona dos fechas para contrastar las condiciones registradas.</div></div>`}
 a.innerHTML=`<section class="sys-shell"><header class="sys-heading"><div><p class="muted">Análisis / Pensamiento sistémico</p><h2>Mapa de funcionamiento sistémico</h2><p class="muted">Comprende qué sostiene los comportamientos, qué condiciones puedes transformar y qué está cambiando.</p></div><div class="sys-controls"><span>Momento de análisis:</span>${['Antes','Durante','Después','Todos'].map(v=>`<button class="secondary ${sysMoment===v?'sys-active':''}" onclick="sysMomentGo('${v}')">${v}</button>`).join('')}<button class="secondary" onclick="sysCompareGo()">⇄ Comparar momentos</button></div></header><div class="sys-behavior-picker"><label>Comportamiento que queremos comprender <select onchange="sysBehaviorGo(this.value)">${behaviors.length?behaviors.map(b=>`<option value="${safe(b.id)}" ${b.id===s.selectedBehavior?'selected':''}>${safe(b.name)}</option>`).join(''):'<option value="">No hay comportamientos registrados en Diseño</option>'}</select></label><span class="muted">${behaviors.length?'Analiza un comportamiento a la vez.':'Crea primero un comportamiento observable en Diseño.'}</span></div><div class="sys-metrics">${[['Condiciones',s.conditions.length],['Mecanismos',s.mechanisms.length],['Hipótesis',s.hypotheses.length],['Observaciones históricas',s.events.length]].map(([label,num])=>`<div class="sys-metric"><b>${num}</b><span>${label}</span></div>`).join('')}</div><div class="sys-tabs">${tabs.map(([id,label])=>`<button class="secondary ${sysTab===id?'sys-active':''}" onclick="sysTabGo('${id}')">${label}</button>`).join('')}</div>${content}<section class="sys-timeline"><h3>◷ Evolución del sistema</h3>${dates.length?`<div class="sys-events">${s.events.slice(-14).map(e=>`<div><small>${safe(e.date.slice(0,10))}</small><strong>${safe(e.kind)}</strong><span>${safe(e.detail)}</span></div>`).join('')}</div>`:'<p class="muted">Registra condiciones e hipótesis para comenzar la memoria histórica.</p>'}${compare}</section><p class="muted" style="font-size:12px">Las condiciones y mecanismos representan observaciones o hipótesis; no se interpretan automáticamente como relaciones causales demostradas. La IA permanece exclusivamente en Análisis → Inteligencia integrada.</p></section>`;
}

function sysDoCompare(){const s=sysStore(current()),a=document.getElementById('sys-date-a')?.value,b=document.getElementById('sys-date-b')?.value,el=document.getElementById('sys-compare-result');if(!a||!b||!el)return;const left=sysSnapshot(s,a),right=sysSnapshot(s,b);el.innerHTML=`<div class="sys-compare-grid">${s.conditions.map(c=>`<p><strong>${safe(c.name)}</strong><br>${safe(left[c.id]||'Sin información')} → ${safe(right[c.id]||'Sin información')}</p>`).join('')}</div>`}
