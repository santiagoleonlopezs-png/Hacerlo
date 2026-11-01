const phases=[['R','Resultados','#098cd2'],['D','Diseño','#0ba987'],['A','Análisis','#8855ce'],['I','Implementación','#d88b1e'],['M','Medición','#b94d9b']];
const dims=['Entendimiento','Disposición','Aprendizaje','Habilitación','Apropiación','Institucionalización'];
let db={initiatives:[],selected:null};let page='Inicio',phase=0;
const SUPABASE_URL='https://mflakxgdkpuhemgslgsa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_LK085bNiIRbeQ0uuMOozWw_jYrAiXuk';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const HACERLO_ENGINE_URL='https://hacerlo-engine.onrender.com';
let cloudOrgId=null, cloudReady=false, syncTimer=null, syncing=false;
const $=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localBackup(){localStorage.setItem('hacerlo_v15_backup',JSON.stringify(db))}
function save(){localBackup(); if(!cloudReady)return; clearTimeout(syncTimer); syncTimer=setTimeout(syncAll,450)}
function evidenceToDb(v){return ({'Registrada':'registered','Observada':'observed','Declarada':'declared','Estimada':'estimated','Hipotética':'hypothesis','Hipotesis':'hypothesis','Hipótesis':'hypothesis'})[v]||'declared'}
async function syncGraphForInitiative(i){if(!i._cloudId)return;i.nodes=i.nodes||[];i.edges=i.edges||[];
  for(const n of i.nodes){if(!n._cloudNodeId)n._cloudNodeId=crypto.randomUUID()}
  for(const e of i.edges){if(!e._cloudEdgeId)e._cloudEdgeId=crypto.randomUUID()}
  let {error:de}=await sb.from('graph_edges').delete().eq('initiative_id',i._cloudId);if(de)throw de;
  let {error:dn}=await sb.from('graph_nodes').delete().eq('initiative_id',i._cloudId);if(dn)throw dn;
  if(i.nodes.length){let rows=i.nodes.map((n,idx)=>({id:n._cloudNodeId,initiative_id:i._cloudId,label:n.name||'Sin nombre',node_type:n.type||'Otro',attributes:{local_index:idx}}));let {error}=await sb.from('graph_nodes').insert(rows);if(error)throw error}
  if(i.edges.length){let rows=i.edges.filter(e=>i.nodes[Number(e.s)]&&i.nodes[Number(e.t)]).map(e=>({id:e._cloudEdgeId,initiative_id:i._cloudId,source_node_id:i.nodes[Number(e.s)]._cloudNodeId,target_node_id:i.nodes[Number(e.t)]._cloudNodeId,relation_type:edgeRelation(e),measure_type:e.measureType||null,measure_value:e.measureValue===undefined||e.measureValue===null||e.measureValue===''?null:Number(e.measureValue),measure_unit:e.measureUnit||null,evidence_kind:evidenceToDb(e.evidence),evidence_notes:e.evidenceNotes||null,attributes:{relation_key:e.relationKey||normalizeRelation(edgeRelation(e))}}));if(rows.length){let {error}=await sb.from('graph_edges').insert(rows);if(error)throw error}}
}
async function syncAll(){if(syncing||!cloudReady||!cloudOrgId)return;syncing=true;setCloudStatus('Guardando…');try{for(const i of db.initiatives){for(const n of (i.nodes||[])){if(!n._cloudNodeId)n._cloudNodeId=crypto.randomUUID()}for(const e of (i.edges||[])){if(!e._cloudEdgeId)e._cloudEdgeId=crypto.randomUUID()}const payload={organization_id:cloudOrgId,name:i.name||'Sin nombre',description:i.description||null,population:Number(i.population)||0,entry_date:i.createdAt||new Date().toISOString().slice(0,10),impact:i.impact||null,effort:i.effort||null,phase:phases[i.phase||0]?.[0]||'R',scope:i.scope||'inside',app_state:i};if(i._cloudId){let {error}=await sb.from('initiatives').update(payload).eq('id',i._cloudId);if(error)throw error}else{let {data,error}=await sb.from('initiatives').insert(payload).select('id').single();if(error)throw error;i._cloudId=data.id}await syncGraphForInitiative(i)}setCloudStatus('Guardado en Supabase ✓')}catch(e){console.error(e);setCloudStatus('Error de sincronización: '+e.message,true)}finally{syncing=false;localBackup()}}
function setCloudStatus(t,err=false){let el=document.getElementById('cloud-status');if(el){el.textContent='Centro de Inteligencia · '+t;el.style.color=err?'#f2a2a2':''}}
async function loadCloud(){let {data:m,error:me}=await sb.from('memberships').select('organization_id,role').limit(1);if(me)throw me;if(!m?.length)throw Error('Tu usuario no tiene una organización asignada.');cloudOrgId=m[0].organization_id;let {data,error}=await sb.from('initiatives').select('*').eq('organization_id',cloudOrgId).order('created_at');if(error)throw error;db={initiatives:(data||[]).map(r=>{let x=r.app_state||{};x.id=x.id||Date.now()+Math.random();x._cloudId=r.id;x.name=r.name;x.description=r.description||'';x.population=r.population||0;x.createdAt=r.entry_date;x.impact=r.impact;x.effort=r.effort;x.scope=r.scope||'inside';x.phase=Math.max(0,phases.findIndex(p=>p[0]===r.phase));return x}),selected:null};db.selected=db.initiatives[0]?.id||null;cloudReady=true;localBackup();setCloudStatus('Supabase conectado ✓');nav();render()}
let recoveryMode=false;
function showRecoveryForm(){recoveryMode=true;$('login-form').classList.add('hide');$('recovery-form').classList.remove('hide');$('auth-gate').style.display='flex'}
async function requestPasswordRecovery(){let email=$('login-email').value.trim(),msg=$('login-msg');if(!email){msg.textContent='Escribe primero tu correo.';return}msg.textContent='Enviando enlace…';let {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:'https://santiagoleonlopezs-png.github.io/Hacerlo/'});msg.textContent=error?error.message:'Revisa tu correo. Abre el enlace y HACERLO te pedirá crear una nueva contraseña.'}
async function bootAuth(){let hash=new URLSearchParams(location.hash.replace(/^#/,'')),query=new URLSearchParams(location.search),isRecovery=hash.get('type')==='recovery'||query.get('type')==='recovery';if(isRecovery)showRecoveryForm();let {data:{session}}=await sb.auth.getSession();if(session&&!recoveryMode){$('auth-gate').style.display='none';try{await loadCloud()}catch(e){setCloudStatus(e.message,true)}}}
document.addEventListener('DOMContentLoaded',()=>{sb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')showRecoveryForm()});$('login-form').addEventListener('submit',async e=>{e.preventDefault();let msg=$('login-msg');msg.textContent='Ingresando…';let {error}=await sb.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});if(error){msg.textContent=error.message;return}$('auth-gate').style.display='none';msg.textContent='';try{await loadCloud()}catch(x){setCloudStatus(x.message,true)}});$('recovery-form').addEventListener('submit',async e=>{e.preventDefault();let msg=$('recovery-msg'),p=$('new-password').value,c=$('confirm-password').value;if(p!==c){msg.textContent='Las contraseñas no coinciden.';return}if(p.length<8){msg.textContent='Usa al menos 8 caracteres.';return}msg.textContent='Guardando…';let {error}=await sb.auth.updateUser({password:p});if(error){msg.textContent=error.message;return}await sb.auth.signOut();history.replaceState({},document.title,location.pathname);recoveryMode=false;$('recovery-form').classList.add('hide');$('login-form').classList.remove('hide');$('login-password').value='';$('new-password').value='';$('confirm-password').value='';$('login-msg').textContent='Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.'});bootAuth()});
async function logoutHacerlo(){await syncAll();await sb.auth.signOut();cloudReady=false;cloudOrgId=null;db={initiatives:[],selected:null};document.getElementById('auth-gate').style.display='flex';setCloudStatus('Sesión cerrada')}
const current=()=>db.initiatives.find(x=>x.id===db.selected);
// Navegación jerárquica: RDAIM es un marco integrado, no una pantalla superpuesta.
const HACERLO_NAV_GROUPS=[
 {title:'Espacio de trabajo',items:[['Inicio','⌂'],['Iniciativas','▦']]},
 {title:'Resultados',step:0,items:[['Resultado global','◉'],['Comportamiento objetivo','◎'],['Diagnóstico','◈'],['Indicadores','▤']]},
 {title:'Diseño',step:1,items:[['Diseño de comportamientos','◈'],['Gestión de audiencias','♧']]},
 {title:'Análisis',step:2,items:[['Grafo de adopción','◎'],['Pensamiento sistémico','⟲'],['Simulación de agentes','♧'],['Inteligencia integrada','✧']]},
 {title:'Implementación',step:3,items:[['Intervenciones','▥']]},
 {title:'Medición',step:4,items:[['Analítica','▥']]}
];
const HACERLO_PAGE_PHASE={'Inicio de Resultados':0,'Resultado global':0,'Comportamiento objetivo':0,'Encuestas y experiencias':0,'Diseño de comportamientos':1,'Gestión de audiencias':1,'Diagnóstico':0,'Indicadores':0,'Grafo de adopción':2,'Pensamiento sistémico':2,'Simulación de agentes':2,'Inteligencia integrada':2,'Intervenciones':3,'Analítica':4};
// Solo una etapa desplegada. null permite cerrar todas sin cambiar la pantalla.
let expandedNavStep=null;
function toggleNavStep(step){
 phase=step; expandedNavStep=step; page='RDAIM'; nav();render();
}
function openNavStep(step){
 phase=step;
 expandedNavStep=step;
 nav();
}
function nav(){
 $('nav').innerHTML=`<div class="nav-workspace">${HACERLO_NAV_GROUPS[0].items.map(([n,icon])=>`<button type="button" class="nav nav-child ${page===n?'active':''}" onclick="go('${n}')"><span class="nav-symbol" aria-hidden="true">${icon}</span><span>${n}</span></button>`).join('')}</div><div class="nav-framework-label">Marco RDAIM</div>`+
 HACERLO_NAV_GROUPS.filter(g=>g.step!==undefined).map(group=>{
  const opened=expandedNavStep===group.step;
  const active=HACERLO_PAGE_PHASE[page]===group.step || (page==='RDAIM'&&phase===group.step);
  const id=`nav-stage-${group.step}`;
  return `<section class="nav-accordion ${opened?'is-open':''} ${active?'has-active':''}">
   <button type="button" class="nav-stage ${active?'is-current':''}" aria-expanded="${opened}" aria-controls="${id}" onclick="toggleNavStep(${group.step})"><span class="nav-stage-mark" style="--stage-color:${phases[group.step][2]}">${phases[group.step][0]}</span><span>${group.title}</span><span class="nav-chevron" aria-hidden="true">${opened?'⌄':'›'}</span></button>
   <div class="nav-stage-children" id="${id}" ${opened?'':'hidden'}>${group.items.map(([n,icon])=>`<button type="button" class="nav nav-child ${page===n?'active':''}" onclick="go('${n}')"><span class="nav-symbol" aria-hidden="true">${icon}</span><span>${n}</span></button>`).join('')}</div>
  </section>`;
 }).join('');
}
function go(n){
 if(n==='RDAIM')expandedNavStep=phase;
 if(Object.prototype.hasOwnProperty.call(HACERLO_PAGE_PHASE,n)){
  phase=HACERLO_PAGE_PHASE[n];expandedNavStep=phase;
 }
 page=n;nav();render();
}
function choose(id){db.selected=id;save();go('RDAIM')}
function createInitiative(e){e.preventDefault();let f=e.target;let o={id:Date.now(),name:f.name.value,description:f.description.value,population:Number(f.population.value)||0,scope:f.scope.value,createdAt:f.createdAt.value||new Date().toISOString().slice(0,10),impact:Number(f.impact.value)||null,effort:Number(f.effort.value)||null,phase:0,dimensions:Object.fromEntries(dims.map(d=>[d,null])),indicators:[],behaviors:[],audiences:[],actions:[],nodes:[],edges:[],causal:[],systemVariables:[],systemLinks:[]};db.initiatives.push(o);db.selected=o.id;save();go('RDAIM')}
function render(){let x=current(),a=$('app');if(x){x.behaviors=x.behaviors||[];x.audiences=x.audiences||[];x.indicators=x.indicators||[];x.actions=x.actions||[];x.metrics=x.metrics||{};x.metricHistory=x.metricHistory||{};x.measurements=x.measurements||[];x.notes=x.notes||{};x.systemVariables=x.systemVariables||[];x.systemLinks=x.systemLinks||[];x.evidenceRecords=x.evidenceRecords||[];x.modelRuns=x.modelRuns||[];x.scope=x.scope||'inside';}if(page==='Inteligencia integrada'){a.innerHTML=intelligencePage(x);return}if(page==='Inicio'){a.innerHTML=homeDashboard()+portfolioMetricSummary();return}if(page==='Iniciativas'){a.innerHTML=`<div class="grid"><section class="panel"><h2>Mis iniciativas</h2>${db.initiatives.length?db.initiatives.map(i=>`<div class="panel"><h3>${safe(i.name)}</h3><p class="muted">${safe(i.description)}</p><p>${i.population} personas · ${i.scope==='outside'?'Outside':'Inside'} · ${phases[i.phase][1]}</p>${priorityEditor(i)}<button class="primary" onclick="choose(${i.id})">Abrir iniciativa →</button></div>`).join(''):'<div class="empty">Aún no hay iniciativas. Crea la primera.</div>'}</section><section class="panel"><h2>Nueva iniciativa</h2><form onsubmit="createInitiative(event)"><label>Nombre<input name="name" required placeholder="Ej. Adopción de CRM"></label><label>Objetivo y contexto<textarea name="description" required></textarea></label><label>Ámbito<select name="scope"><option value="inside">Inside · Interno</option><option value="outside">Outside · Externo</option></select></label><label>Población estimada<input name="population" type="number" min="0"></label><label>Fecha de ingreso de la iniciativa<input name="createdAt" type="date" required></label><div class="grid"><label>Impacto (1–5)<select name="impact"><option value="">Sin evaluar</option>${[1,2,3,4,5].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label><label>Esfuerzo (1–5)<select name="effort"><option value="">Sin evaluar</option>${[1,2,3,4,5].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label></div><button class="primary">Crear iniciativa</button></form></section></div>`;return}
if(!x){a.innerHTML='<div class="panel">Primero crea una iniciativa desde Inicio.</div>';return}
let showStageSteps=page==='RDAIM';let head=`<section class="panel"><div class="flex" style="justify-content:space-between"><div><h2>${safe(x.name)}</h2><p class="muted">${safe(x.description)} · ${x.population} personas</p></div><select style="width:auto" onchange="choose(Number(this.value))">${db.initiatives.map(i=>`<option value="${i.id}" ${i.id===x.id?'selected':''}>${safe(i.name)}</option>`).join('')}</select></div>${showStageSteps?`<div class="steps">${phases.map((p,i)=>`<button class="step ${(page==='RDAIM'?phase:(HACERLO_PAGE_PHASE[page]??phase))===i?'selected':''}" style="--c:${p[2]}" onclick="openNavStep(${i});go('RDAIM')"><b>${p[0]}</b>${p[1]}</button>`).join('')}</div>`:''}</section>`;
if(page==='Diseño de comportamientos')head=hcxHero('Diseño de comportamientos',x,'Define las acciones observables que producirán el resultado esperado.','RDAIM · DISEÑO','◈');
 if(page==='RDAIM'||page==='Diseño de comportamientos'){
let p=phases[phase],body='';
if(phase===0)body=resultadosHome(x);
if(phase===1)body=`<div class="grid"><section class="panel"><h2>Diseño de comportamientos</h2><p class="muted">Define las acciones observables que deseas lograr.</p><button class="primary" onclick="go('Diseño de comportamientos')">Abrir diseño →</button></section><section class="panel"><h2>Gestión de audiencias</h2><p class="muted">Caracteriza personas y grupos, visualiza cuadrantes y define estrategias.</p><button class="primary" onclick="go('Gestión de audiencias')">Abrir audiencias →</button></section></div>`;
if(page==='Diseño de comportamientos')body=behaviorDesignPage(x);
if(phase===2)body=`<div class="analysis-grid">${[['Grafo de adopción','Relaciones entre personas, equipos y barreras','Grafo de adopción','network'],['Pensamiento sistémico','Variables y relaciones causales hipotéticas','Pensamiento sistémico','workflow'],['Simulación de agentes','Simulación de adopción y análisis científico','Simulación de agentes','users'],['Inteligencia integrada','Modelo organizacional, escenarios y aprendizaje','Inteligencia integrada','brain']].map(v=>`<section class="panel"><h2>${v[0]}</h2><p class="muted">${v[1]}</p><button class="primary" onclick="go('${v[2]}')">Abrir módulo →</button></section>`).join('')}</div><section class="panel"><h2>Indicadores para contrastar hipótesis</h2>${indicatorTable(x)}<button class="secondary" onclick="go('Indicadores')">Editar indicadores</button></section>`;
if(phase===3)body=`<section class="panel"><div class="flex" style="justify-content:space-between"><h2>Intervenciones, tablero y cronograma</h2><button class="primary" onclick="go('Intervenciones')">Gestionar acciones →</button></div>${gantt(x)}<p class="muted">Las fechas y barras se actualizan al registrar acciones.</p></section>`;
if(phase===4)body=`<div class="triple">${[['INS de personas','ins_personas'],['INS de proceso','ins_proceso'],['CNPS','cnps']].map(([label,key])=>metricCard(x,label,key)).join('')}</div><section class="panel"><h2>Analítica de la iniciativa</h2><p class="muted">Indicadores predictivos de comportamiento, indicadores de resultados, INS, CNPS y seguimiento de adopción.</p><div class="grid"><div>${indicatorTable(x,['Predictivos','Resultados'])}</div><div><h3>Avance por dimensión</h3>${dimensionBars(x)}</div></div><button class="primary" onclick="go('Analítica')">Abrir panel de analítica →</button></section>`;

a.innerHTML=head+body;return}
if(page==='Inicio de Resultados'){a.innerHTML=hcxHero('Resultados',x,'Define qué queremos transformar y observa cómo avanza la iniciativa.','RDAIM · RESULTADOS','◉')+resultadosHome(x);return}
if(page==='Resultado global'){a.innerHTML=hcxHero('Resultado global',x,'Define el cambio esperado y cómo medirlo.','RDAIM · RESULTADOS','◉')+resultGlobalPanel(x);return}
if(page==='Comportamiento objetivo'){a.innerHTML=hcxHero('Comportamiento objetivo',x,'Define la conducta observable y su hipótesis de valor.','RDAIM · RESULTADOS','◎')+objectivePanel(x);return}
if(page==='Gestión de audiencias'){a.innerHTML=audienceManagementPage(x);return}
if(page==='Diagnóstico'){a.innerHTML=diagnosisPage(x);return}
if(page==='Encuestas y experiencias'){a.innerHTML=eePage(x);return}
if(page==='Indicadores'){a.innerHTML=renderIndicatorsEditor(x,hcxHero('Indicadores',x,'Define cómo sabrás si los resultados están cambiando.','RDAIM · RESULTADOS','◉'));return}
if(page==='Intervenciones'){a.innerHTML=hcxHero('Gestionar intervenciones',x,'Convierte decisiones en acciones y acompaña su avance.','RDAIM · IMPLEMENTACIÓN','✦')+`<div class="hcx-summary-strip"><b>Seguimiento de acciones</b><span>Actualiza el estado en cada tarjeta para mantener el avance.</span></div><section class="panel"><h3 id="action-form-title">Nueva acción</h3><form id="action-form" onsubmit="addAction(event)"><input type="hidden" name="editIndex" value=""><div class="triple"><label>Acción<input name="name" required placeholder="¿Qué haremos?"></label><label>Dimensión<select name="dimension">${[...new Set([...dims,...x.actions.map(a=>a.dimension).filter(Boolean)])].map(d=>`<option value="${safe(d)}">${safe(d)}</option>`).join('')}</select></label><label>Responsable<input name="owner" placeholder="Responsable"></label><label>Inicio<input name="start" type="date"></label><label>Fin<input name="end" type="date"></label><label>Origen<select name="source">${[...new Set(['Manual','Inteligencia artificial','Diagnóstico',...x.actions.map(a=>a.source).filter(Boolean)])].map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('')}</select></label></div><label>Hipótesis<textarea name="hypothesis" class="action-hypothesis" placeholder="Dado que [situación identificada], esperamos que [acción propuesta] genere [cambio esperado]."></textarea></label><div class="flex"><button class="primary" id="action-submit">+ Crear acción</button><button type="button" class="secondary hide" id="action-cancel" onclick="cancelActionEdit()">Cancelar edición</button></div></form></section>${kanban(x)}<details class="hcx-fold"><summary><span class="hcx-fold-glyph">◷</span><span class="hcx-fold-titles"><strong>Ver cronograma de acciones</strong><small>Fechas y dependencias visualizadas en Gantt</small></span><span class="hcx-fold-chevron">⌄</span></summary><div class="hcx-fold-content"><section class="panel"><h2>Cronograma · Gantt</h2>${gantt(x)}</section></div></details>`;return}
if(page==='Grafo de adopción'){renderAdoptionGraphPage(a,hcxHero('Grafo de adopción',x,'Explora quién influye, cómo se relacionan los actores y dónde aparecen barreras.','RDAIM · ANÁLISIS','◎'),x);return}
if(page==='Pensamiento sistémico'){sysRender(a,head,x);return}
if(page==='Simulación de agentes'){a.innerHTML=renderABMExperiencePage(x);return}
if(page==='Analítica'){let vals=Object.values(x.dimensions).filter(v=>v!==null),avg=vals.length?Math.round(vals.reduce((a,b)=>a+Number(b),0)/vals.length):'—';a.innerHTML=hcxHero('Analítica y medición',x,'Observa el avance y contrasta los resultados a lo largo del tiempo.','RDAIM · MEDICIÓN','◷')+`<div class="triple">${[['INS personas','ins_personas'],['INS proceso','ins_proceso'],['CNPS','cnps']].map(([n,k])=>metricCard(x,n,k)).join('')}</div><div class="triple"><section class="panel"><p class="muted">Dimensiones medidas</p><div class="metric">${vals.length}/6</div></section><section class="panel"><p class="muted">Promedio descriptivo*</p><div class="metric">${avg}${vals.length?'%':''}</div></section><section class="panel"><p class="muted">Acciones completadas</p><div class="metric">${x.actions.filter(a=>a.status==='Completada').length}/${x.actions.length}</div></section></div><div class="grid"><section class="panel"><h2>Adopción por dimensión</h2>${dimensionBars(x)}<p class="notice">*Promedio descriptivo, no índice validado.</p></section><section class="panel"><h2>Indicadores predictivos y de resultados</h2>${indicatorTable(x,['Predictivos','Resultados'])}<button class="secondary" onclick="go('Indicadores')">Configurar indicadores</button></section></div><section class="panel"><h2>Evolución de indicadores</h2><p class="muted">Registra valores sucesivos desde Indicadores para visualizar su evolución.</p>${trendCharts(x)}</section>`;return}}


const RESULT_TYPES=['Porcentaje de adopción','Porcentaje de cumplimiento','Frecuencia de comportamiento','Nivel de participación','Calidad de las relaciones','Nivel de capacidades','Índice de percepción','Nivel de desempeño','Tiempo o eficiencia','Impacto en resultados'];
const RESULT_UNITS=['Porcentaje (%)','Puntos / índice','Escala','Número de personas','Frecuencia (veces)','Tiempo (minutos)','Tasa','Valor monetario (COP)'];
const OBS_FREQUENCIES=['Diaria','Semanal','Quincenal','Mensual','Trimestral','Semestral','Anual','Al iniciar una actividad','Al finalizar una actividad','Ante una situación específica','Otra'];
const resultSelect=(items,value)=>items.map(v=>`<option value="${safe(v)}" ${v===value?'selected':''}>${safe(v)}</option>`).join('');
let resultEditorInitiative=null;
let resultEditorsExpanded={global:null,objective:null};
function resultEditorIsOpen(x,kind,hasSavedRecord){
 if(resultEditorInitiative!==String(x.id)){
  resultEditorInitiative=String(x.id);
  resultEditorsExpanded={global:null,objective:null};
 }
 return resultEditorsExpanded[kind]===null?!hasSavedRecord:resultEditorsExpanded[kind];
}
function resultEditorToggle(kind,details){resultEditorsExpanded[kind]=!details.open}
function resultEditorOpen(kind){
 const x=current();if(!x)return;
 resultEditorIsOpen(x,kind,kind==='global'?!!x.globalResult:!!x.objectiveBehavior);
 resultEditorsExpanded[kind]=true;
 const el=document.getElementById('result-editor-'+kind);
 if(el){
  el.open=true;
  el.scrollIntoView({behavior:'smooth',block:'start'});
  el.querySelector(kind==='global'?'[name="complement"]':'[name="actor"]')?.focus({preventScroll:true});
 }else render();
}
function resultEditorClose(kind){
 resultEditorsExpanded[kind]=false;
 // Reconstruir desde los datos guardados para descartar cambios no enviados.
 render();
}
function resultDateLabel(value){
 const date=String(value||'');
 return /^\d{4}-\d{2}-\d{2}$/.test(date)?date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4):date||'Sin definir';
}
function resultEditorHeader(kind){
 const isGlobal=kind==='global';
 return `<summary onclick="resultEditorToggle('${kind}',this.parentElement)">
 <span class="hcx-result-editor-icon" aria-hidden="true">＋</span>
 <span class="hcx-result-editor-heading"><strong>Diseñar ${isGlobal?'resultado global':'comportamiento objetivo'}</strong>
 <small>${isGlobal?'Define el cambio esperado y cómo medirlo.':'Describe quién actuará, qué hará y en qué condiciones.'}</small></span>
 <span class="hcx-result-editor-chevron" aria-hidden="true">⌄</span></summary>`;
}
function resultEmptyCard(kind,legacy){
 return `<section class="panel hcx-result-read-card is-empty"><div class="hcx-result-read-head"><div>
 <span class="hcx-result-read-eyebrow">${kind==='global'?'RESULTADO GLOBAL':'COMPORTAMIENTO OBJETIVO'}</span>
 <h2>${legacy?'Registro anterior':'Aún sin definir'}</h2></div></div>
 ${legacy?`<p class="hcx-result-read-legacy">${safe(legacy)}</p><p class="muted">Esta formulación anterior se conserva. Utiliza el formulario superior para completar el diseño estructurado.</p>`:
 `<p class="muted">Completa el formulario desplegable de arriba para mostrar aquí el ${kind==='global'?'resultado que buscamos':'comportamiento que esperamos observar'}.</p>`}
 </section>`;
}
function resultNarrativeAmount(value,unit){
 const text=String(value??'—');
 const suffix={'Porcentaje (%)':' %','Número de personas':' personas','Tiempo (minutos)':' minutos','Frecuencia (veces)':' veces','Valor monetario (COP)':' COP'}[unit]||'';
 return text+suffix;
}
function resultNarrativeUnit(r){
 if(r.unit==='Escala')return ' en la escala '+(r.scale==='Personalizada'?String(r.scaleMin)+' a '+String(r.scaleMax):String(r.scale||'').replace('-',' a '));
 const explained=['Porcentaje (%)','Número de personas','Tiempo (minutos)','Frecuencia (veces)','Valor monetario (COP)'];
 return r.unit&&!explained.includes(r.unit)?' (unidad: '+r.unit+')':'';
}
function objectiveNarrativeFrequency(frequency){
 return ({
  'Diaria':'diariamente','Semanal':'cada semana','Quincenal':'cada quince días',
  'Mensual':'cada mes','Trimestral':'cada trimestre','Semestral':'cada semestre','Anual':'cada año',
  'Al iniciar una actividad':'al iniciar una actividad','Al finalizar una actividad':'al finalizar una actividad',
  'Ante una situación específica':'ante una situación específica','Otra':'según la condición definida'
 })[frequency]||String(frequency||'con la frecuencia definida').toLowerCase();
}
function resultGlobalPanel(x){
 const r=x.globalResult||{},saved=!!x.globalResult,legacy=!saved&&x.expected;
 const expanded=resultEditorIsOpen(x,'global',saved);
 return `<div class="hcx-result-design">
 <details id="result-editor-global" class="panel hcx-result-editor" ${expanded?'open':''}>
 ${resultEditorHeader('global')}
 <div class="hcx-result-editor-content">
 ${legacy?'<p class="notice">Se conserva el resultado esperado anterior. Completa la nueva plantilla cuando estés listo.</p>':''}
 <form onsubmit="saveGlobalResult(event)"><div class="grid"><label>Verbo<select name="verb">${resultSelect(['Incrementar','Mantener','Reducir','Mejorar','Fortalecer'],r.verb||'Incrementar')}</select></label><label>Complemento<input name="complement" required value="${safe(r.complement||'')}" placeholder="Ej. la colaboración entre equipos"></label></div>
 <div class="grid"><label>¿Cómo vamos a medirlo?<select name="measureType">${resultSelect(RESULT_TYPES,r.measureType||RESULT_TYPES[0])}</select></label><label>Unidad de medición<select name="unit" onchange="resultToggleScale(this.form)">${resultSelect(RESULT_UNITS,r.unit||RESULT_UNITS[0])}</select></label></div>
 <div data-scale-box style="display:${r.unit==='Escala'?'block':'none'}"><label>¿Qué escala vas a utilizar?<select name="scale" onchange="resultToggleScale(this.form)">${resultSelect(['1-5','1-10','1-100','Personalizada'],r.scale||'1-5')}</select></label><div class="grid" data-custom-scale style="display:${r.scale==='Personalizada'?'grid':'none'}"><label>Desde<input name="scaleMin" type="number" step="any" value="${safe(r.scaleMin??1)}"></label><label>Hasta<input name="scaleMax" type="number" step="any" value="${safe(r.scaleMax??5)}"></label></div></div>
 <div class="grid"><label>Línea base<input name="baseline" type="number" step="any" required value="${safe(r.baseline??'')}"></label><label>Meta esperada<input name="target" type="number" step="any" required value="${safe(r.target??'')}"></label><label>Fecha meta<input name="dueDate" type="date" required value="${safe(r.dueDate||'')}"></label></div>
 <div class="hcx-result-editor-actions"><button class="primary" type="submit">Guardar resultado global</button><button class="secondary" type="button" onclick="resultEditorClose('global')">Cancelar</button></div></form>
 </div></details>
 ${saved?`<section class="panel hcx-result-read-card hcx-result-read-hybrid"><div class="hcx-result-read-head"><div><span class="hcx-result-read-eyebrow">RESULTADO GLOBAL DEFINIDO</span><h2>${safe(r.verb||'')} ${safe(r.complement||'')}</h2></div><button type="button" class="secondary hcx-result-edit-btn" onclick="resultEditorOpen('global')">Editar resultado</button></div>
 <p class="hcx-result-hybrid-measure">Medición: <strong>${safe(r.measureType||'No definida')}${safe(resultNarrativeUnit(r))}</strong></p>
 <div class="hcx-result-hybrid-metrics" aria-label="Línea base, meta esperada y fecha meta">
 <div class="hcx-result-hybrid-metric"><span>Línea base</span><strong>${safe(resultNarrativeAmount(r.baseline,r.unit))}</strong></div>
 <div class="hcx-result-hybrid-metric"><span>Meta esperada</span><strong>${safe(resultNarrativeAmount(r.target,r.unit))}</strong></div>
 <div class="hcx-result-hybrid-metric"><span>Fecha meta</span><strong>${safe(resultDateLabel(r.dueDate))}</strong></div>
 </div></section>`:resultEmptyCard('global',legacy)}
 </div>`;
}
function resultToggleScale(f){const scale=f.elements.unit.value==='Escala';f.querySelector('[data-scale-box]').style.display=scale?'block':'none';f.querySelector('[data-custom-scale]').style.display=scale&&f.elements.scale.value==='Personalizada'?'grid':'none'}
function resultSentence(r){const scale=r.unit==='Escala'?` (escala ${r.scale==='Personalizada'?r.scaleMin+' a '+r.scaleMax:r.scale.replace('-',' a ')})`:'';return `${r.verb} ${r.complement}, medido mediante ${r.measureType.toLowerCase()}, en ${r.unit.toLowerCase()}${scale}, de ${r.baseline} a ${r.target} para el ${r.dueDate}.`}
function saveGlobalResult(e){e.preventDefault();const f=e.target,z=Object.fromEntries(new FormData(f));const baseline=Number(z.baseline),target=Number(z.target);let min=-Infinity,max=Infinity;if(z.unit==='Porcentaje (%)'){min=0;max=100}else if(z.unit==='Escala'){const b=z.scale==='Personalizada'?[Number(z.scaleMin),Number(z.scaleMax)]:z.scale.split('-').map(Number);[min,max]=b;if(!(min<max))return alert('La escala debe tener un mínimo menor al máximo.')}if(baseline<min||baseline>max||target<min||target>max)return alert('Línea base y meta deben estar dentro de la escala o rango seleccionado.');if(['Incrementar','Mejorar','Fortalecer'].includes(z.verb)&&target<baseline||z.verb==='Reducir'&&target>baseline||z.verb==='Mantener'&&target!==baseline)return alert('Revisa que la meta sea coherente con el verbo seleccionado.');const x=current();x.globalResult={...z,baseline,target,scaleMin:Number(z.scaleMin),scaleMax:Number(z.scaleMax)};x.expected=resultSentence(x.globalResult);resultEditorsExpanded.global=false;save();render()}
// Visualización RDAIM: conducta una vez, relación esperada y medición separadas.
function objectiveOverviewCard(b){
 const context=resultTextClean(b.context),evidence=resultTextClean(b.evidence),condition=resultTextClean(b.condition);
 return `<section class="panel hcx-objective-overview" aria-label="Comportamiento objetivo definido">
  <div class="hcx-objective-overview-top"><span class="hcx-result-read-eyebrow">COMPORTAMIENTO OBJETIVO DEFINIDO</span></div>
  <div class="hcx-objective-overview-content">
   <div class="hcx-objective-overview-actor"><span>¿Quién realiza la acción?</span><strong>${safe(resultTextClean(b.actor))}</strong></div>
   <div class="hcx-objective-overview-action"><span>¿Qué comportamiento esperamos?</span><p>${safe(resultTextClean(b.action))}</p></div>
  </div>
  <div class="hcx-objective-overview-footer">
   <div class="hcx-objective-overview-meta">
    <span><strong>Frecuencia</strong> ${safe(objectiveNarrativeFrequency(b.frequency))}${condition?' · '+safe(condition):''}</span>
    <span><strong>Desde</strong> ${safe(resultDateLabel(b.observeFrom))}</span>
   </div>
   <button type="button" class="hcx-result-objective-edit" onclick="resultEditorOpen('objective')">Editar comportamiento</button>
  </div>
  ${context||evidence?`<details class="hcx-objective-overview-support"><summary>Contexto y evidencia <span aria-hidden="true">⌄</span></summary>
   <div>${context?`<p><strong>Contexto</strong> ${safe(context)}</p>`:''}${evidence?`<p><strong>Evidencia observable</strong> ${safe(evidence)}</p>`:''}</div>
  </details>`:''}
 </section>`;
}

function objectiveValueFlow(x){
 const r=x.globalResult||{},b=x.objectiveBehavior||{};
 const result=[resultTextClean(r.verb),resultTextClean(r.complement)].filter(Boolean).join(' ');
 return `<section class="panel hcx-value-flow" aria-label="Hipótesis de valor">
  <h2>Hipótesis de valor</h2>
  <div class="hcx-value-flow-stages">
   <div class="hcx-value-flow-stage hcx-value-flow-behavior">
    <span class="hcx-value-flow-label">SI · CONDUCTA</span>
    <strong>El comportamiento objetivo se observa de forma sostenida</strong>
    <small>${safe(resultTextClean(b.actor))}</small>
   </div>
   <span class="hcx-value-flow-arrow" aria-label="Entonces">→</span>
   <div class="hcx-value-flow-stage hcx-value-flow-result">
    <span class="hcx-value-flow-label">ENTONCES · RESULTADO ESPERADO</span>
    <strong>${safe(result)}</strong>
   </div>
  </div>
  <div class="hcx-value-flow-metrics">
   <div class="hcx-value-flow-measure"><span>Indicador</span><strong>${safe(resultTextClean(r.measureType)||'No definido')}${safe(resultNarrativeUnit(r))}</strong></div>
   <div class="hcx-value-flow-progress">
    <div><span>Línea base</span><strong>${safe(resultNarrativeAmount(r.baseline,r.unit))}</strong></div>
    <span class="hcx-value-flow-progress-arrow" aria-hidden="true">→</span>
    <div><span>Meta</span><strong>${safe(resultNarrativeAmount(r.target,r.unit))}</strong></div>
   </div>
   <div class="hcx-value-flow-due"><span>Fecha meta</span><strong>${safe(resultDateLabel(r.dueDate))}</strong></div>
  </div>
 </section>`;
}
function objectivePanel(x){
 const b=x.objectiveBehavior||{},saved=!!x.objectiveBehavior,legacy=!saved&&x.objective;
 const conditional=['Al iniciar una actividad','Al finalizar una actividad','Ante una situación específica','Otra'];
 const details={'Al iniciar una actividad':'¿Qué actividad debe iniciar?','Al finalizar una actividad':'¿Qué actividad debe finalizar?','Ante una situación específica':'¿Qué situación específica debe ocurrir?','Otra':'Especifica la frecuencia o condición'};
 const expanded=resultEditorIsOpen(x,'objective',saved);
 return `<div class="hcx-result-design">
 <details id="result-editor-objective" class="panel hcx-result-editor" ${expanded?'open':''}>
 ${resultEditorHeader('objective')}
 <div class="hcx-result-editor-content">
 ${legacy?'<p class="notice">Tu descripción anterior se conserva en el campo de acción observable.</p>':''}
 <form onsubmit="saveObjectiveBehavior(event)"><label>¿Quién debe realizarlo?<input name="actor" required value="${safe(b.actor||'')}" placeholder="Ej. Los líderes de equipo"></label><label>¿Qué acción observable esperamos?<textarea name="action" required placeholder="Ej. compartir información y coordinar decisiones">${safe(b.action||x.objective||'')}</textarea></label><label>¿En qué situación o contexto?<input name="context" value="${safe(b.context||'')}" placeholder="Ej. durante la planificación de proyectos"></label>
 <label>¿Con qué frecuencia esperamos observarlo?<select name="frequency" onchange="objectiveToggleCondition(this.form)">${resultSelect(OBS_FREQUENCIES,b.frequency||'Semanal')}</select></label><label data-condition style="display:${conditional.includes(b.frequency)?'block':'none'}"><span data-condition-label>${details[b.frequency]||''}</span><input name="condition" value="${safe(b.condition||'')}" placeholder="Especifica la actividad o situación"></label>
 <details ${b.evidence?'open':''}><summary>¿Cómo sabremos que ocurrió? (opcional)</summary><label>Evidencia observable<textarea name="evidence" placeholder="Ej. acuerdos documentados">${safe(b.evidence||'')}</textarea></label></details><label>¿Desde cuándo esperamos observar este comportamiento?<input type="date" name="observeFrom" required value="${safe(b.observeFrom||'')}"></label>
 <div class="hcx-result-editor-actions"><button class="primary" type="submit">Guardar comportamiento objetivo</button><button class="secondary" type="button" onclick="resultEditorClose('objective')">Cancelar</button></div></form>
 </div></details>
 ${saved?objectiveOverviewCard(b):resultEmptyCard('objective',legacy)}
 ${x.globalResult&&saved?objectiveValueFlow(x):'<section class="panel hcx-result-hypothesis"><h2>Hipótesis de valor</h2><p class="muted">Se generará automáticamente cuando registres el resultado global y el comportamiento objetivo.</p></section>'}
 </div>`;
}
function objectiveToggleCondition(f){const frequency=f.elements.frequency.value,conditional=['Al iniciar una actividad','Al finalizar una actividad','Ante una situación específica','Otra'];const label=f.querySelector('[data-condition]');label.style.display=conditional.includes(frequency)?'block':'none';label.querySelector('[data-condition-label]').textContent=({'Al iniciar una actividad':'¿Qué actividad debe iniciar?','Al finalizar una actividad':'¿Qué actividad debe finalizar?','Ante una situación específica':'¿Qué situación específica debe ocurrir?','Otra':'Especifica la frecuencia o condición'})[frequency]||'';f.elements.condition.required=conditional.includes(frequency)}
function resultTextClean(value){
 return String(value??'').trim().replace(/[\s.,;:!?]+$/u,'');
}
// En la ficha, el actor inicia la formulación; se respetan las palabras introducidas.
function objectiveCoreStatement(b){
 return [resultTextClean(b.actor),resultTextClean(b.action)].filter(Boolean).join(' ').trim();
}
// Hipótesis resumida: evita duplicar el comportamiento largo y la fecha en la misma frase.
function resultValueHypothesis(x){
 const r=x.globalResult||{},b=x.objectiveBehavior||{};
 const action=resultTextClean(b.action),actor=resultTextClean(b.actor)
   .replace(/^(Los|Las|El|La|Un|Una|Todos|Todas)\b/u,word=>word.toLocaleLowerCase('es'));
 const result=[resultTextClean(r.verb).toLocaleLowerCase('es'),resultTextClean(r.complement)]
   .filter(Boolean).join(' ');
 const measure=resultTextClean(r.measureType);
 const from=resultNarrativeAmount(r.baseline,r.unit);
 const to=resultNarrativeAmount(r.target,r.unit);
 const unit=resultNarrativeUnit(r);
 const date=resultDateLabel(r.dueDate);
 return 'Si se observa de forma sostenida la conducta «'+action+'» por parte de '+actor+
  ', esperamos '+result+'. Lo mediremos mediante '+measure+unit+
  ', pasando de '+from+' a '+to+' para el '+date+'.';
}
function objectiveSentence(b){
 const core=objectiveCoreStatement(b);
 const context=resultTextClean(b.context);
 const frequency=objectiveNarrativeFrequency(b.frequency);
 const condition=resultTextClean(b.condition);
 const date=resultDateLabel(b.observeFrom);
 return core+(context?'. Contexto: '+context:'')+'. Frecuencia esperada: '+frequency+
   (condition?' ('+condition+')':'')+'. Desde el '+date+'.';
}
function saveObjectiveBehavior(e){e.preventDefault();const f=e.target,z=Object.fromEntries(new FormData(f)),conditional=['Al iniciar una actividad','Al finalizar una actividad','Ante una situación específica','Otra'];if(conditional.includes(z.frequency)&&!z.condition.trim())return alert('Especifica la actividad o situación que activa el comportamiento.');const x=current();x.objectiveBehavior=z;x.objective=objectiveSentence(z);resultEditorsExpanded.objective=false;save();render()}

function resultadosHome(x){
 const r=x.globalResult,b=x.objectiveBehavior;
 const findings=(x.diagnosisFindings||[]).length,indicators=(x.indicators||[]).length;
 const hasDiagnosis=Boolean(findings||(x.diagnosisFactors||[]).length||(x.diagnosisHypotheses||[]).length);
 const complete=Number(Boolean(r))+Number(Boolean(b))+Number(hasDiagnosis);
 const fmtDate=value=>{if(!value)return '';const date=new Date(value+'T00:00:00');return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric'}).format(date)};
 const globalDetail=r?`Meta: ${r.target??'—'}${r.dueDate?' · '+fmtDate(r.dueDate):''}`:'Sin definir';
 const behaviorDetail=b?`${b.frequency||'Frecuencia por definir'}${b.observeFrom?' · Desde '+fmtDate(b.observeFrom):''}`:'Sin definir';
 const diagnosisDetail=hasDiagnosis?`${findings} ${findings===1?'hallazgo registrado':'hallazgos registrados'}`:'Por explorar';
 const card=(number,title,subtitle,detail,ready,destination,action,tone)=>{
  const state=ready?(number==='03'?'Con evidencia':'Definido'):'Pendiente';
  return `<article class="results-home-card results-home-card--${tone}" aria-label="${safe(title)}: ${safe(state)}">
   <div class="results-home-card-top"><span class="results-home-card-index" aria-hidden="true">${number}</span><span class="results-home-state ${ready?'is-ready':''}">${ready?'✓ ':''}${state}</span></div>
   <div class="results-home-card-body"><h3>${safe(title)}</h3><p>${safe(subtitle)}</p></div>
   <div class="results-home-card-foot"><span class="results-home-card-detail" title="${safe(detail)}">${safe(detail)}</span><button type="button" class="results-home-card-action" onclick="go('${destination}')">${action}<span aria-hidden="true">↗</span></button></div>
  </article>`;
 };
 return `<div class="results-home results-stage-stack">
 <section class="results-home-hero" aria-labelledby="results-home-heading">
   <div class="results-home-hero-copy"><span class="results-home-eyebrow"><span class="results-home-eyebrow-dot" aria-hidden="true"></span> RDAIM / 01 · RESULTADOS</span><h1 id="results-home-heading">De la intención al impacto.</h1><p>Define qué quieres lograr, qué conducta necesitas movilizar y qué condiciones pueden influir.</p></div>
   <div class="results-home-progress"><span class="results-home-progress-label">Avance de la etapa</span><div class="results-home-progress-number">${complete}<span>/3</span></div><div class="results-home-progress-track" role="progressbar" aria-label="Espacios con información" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${complete}"><span style="width:${Math.round(complete/3*100)}%"></span></div><small>${complete===3?'Los tres espacios tienen información':complete===0?'Comienza por cualquiera de los espacios':complete===1?'1 espacio con información':complete+' espacios con información'}</small></div>
 </section>
 <section class="results-home-main" aria-label="Espacios de Resultados">
   ${card('01','Resultado global','Define el resultado esperado y cómo medirlo.',globalDetail,Boolean(r),'Resultado global',r?'Revisar':'Definir','goal')}
   ${card('02','Comportamiento objetivo','Establece la conducta observable y su hipótesis de valor.',behaviorDetail,Boolean(b),'Comportamiento objetivo',b?'Revisar':'Configurar','behavior')}
   ${card('03','Diagnóstico','Explora qué facilita o dificulta el cambio.',diagnosisDetail,hasDiagnosis,'Diagnóstico','Explorar','diagnosis')}
 </section>
 <section class="results-home-bottom" aria-label="Seguimiento y accesos relacionados"><div class="results-home-bottom-summary"><span class="results-home-bottom-label">EN ESTA INICIATIVA</span><span><strong>${indicators}</strong> ${indicators===1?'indicador':'indicadores'}</span><span class="results-home-separator" aria-hidden="true"></span><span><strong>${findings}</strong> ${findings===1?'hallazgo':'hallazgos'}</span></div><div class="results-home-bottom-actions"><button type="button" class="secondary" onclick="go('Indicadores')">Ver indicadores <span aria-hidden="true">↗</span></button><button type="button" class="secondary" onclick="go('Encuestas y experiencias')">Encuestas y experiencias <span aria-hidden="true">↗</span></button></div></section>
 </div>`;
}
