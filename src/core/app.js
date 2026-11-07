const phases=[['R','Resultados','#098cd2'],['D','Diseño','#0ba987'],['A','Análisis','#8855ce'],['I','Implementación','#d88b1e'],['M','Medición','#b94d9b']];
const dims=['Entendimiento','Disposición','Aprendizaje','Habilitación','Apropiación','Institucionalización'];
let db={initiatives:[],selected:null};let page='Inicio',phase=0;
const SUPABASE_URL='https://mflakxgdkpuhemgslgsa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_LK085bNiIRbeQ0uuMOozWw_jYrAiXuk';
const HACERLO_INITIAL_AUTH_FLOW=new URLSearchParams(location.hash.replace(/^#/,''))?.get('type')||new URLSearchParams(location.search).get('type')||'';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const HACERLO_ENGINE_URL='https://hacerlo-engine.onrender.com';
let cloudOrgId=null, cloudReady=false, syncTimer=null, syncing=false, syncPending=false, initiativeDeleteBusy=false;
let cloudSaveVersion=0, cloudConfirmedVersion=0, cloudFailedVersion=0, cloudSaveError='';
const $=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function labSeparateState(i){const {labResults,...state}=i;return state}
function localBackup(){localStorage.setItem('hacerlo_v15_backup',JSON.stringify({...db,initiatives:db.initiatives.map(labSeparateState)}))}
function save(){cloudSaveVersion++;localBackup();if(!cloudReady)return;syncPending=true;if(initiativeDeleteBusy)return;clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,450)}
async function confirmCloudSave(version=cloudSaveVersion){
 if(!cloudReady||!cloudOrgId)return {ok:false,message:'No hay conexión con Supabase. Conservamos una copia local, pero el servidor no confirmó el guardado.'};
 if(cloudConfirmedVersion>=version&&!syncing&&!syncPending)return {ok:true};
 if(!syncing&&!initiativeDeleteBusy){clearTimeout(syncTimer);void syncAll();}
 const deadline=Date.now()+25000;
 while(Date.now()<deadline){
  if(cloudConfirmedVersion>=version&&!syncing)return {ok:true};
  if(!syncing&&!syncPending&&cloudFailedVersion>=version)return {ok:false,message:cloudSaveError||'Error de sincronización con Supabase.'};
  if(!syncing&&syncPending&&!initiativeDeleteBusy){clearTimeout(syncTimer);void syncAll();}
  await new Promise(resolve=>setTimeout(resolve,110));
 }
 return {ok:false,message:'Supabase no confirmó el guardado. Revisa tu conexión y usa Reintentar guardado.'};
}
function evidenceToDb(v){return ({'Registrada':'registered','Observada':'observed','Declarada':'declared','Estimada':'estimated','Hipotética':'hypothesis','Hipotesis':'hypothesis','Hipótesis':'hypothesis'})[v]||'declared'}
async function syncGraphForInitiative(i){
 if(!i._cloudId)return;
 i.nodes=i.nodes||[];i.edges=i.edges||[];
 for(const n of i.nodes)if(!n._cloudNodeId)n._cloudNodeId=crypto.randomUUID();
 for(const e of i.edges)if(!e._cloudEdgeId)e._cloudEdgeId=crypto.randomUUID();
 const nodes=i.nodes.map((n,idx)=>({id:n._cloudNodeId,label:n.name||'Sin nombre',node_type:n.type||'Otro',attributes:{local_index:idx}}));
 const edges=i.edges.filter(e=>i.nodes[Number(e.s)]&&i.nodes[Number(e.t)]).map(e=>({
  id:e._cloudEdgeId,source_node_id:i.nodes[Number(e.s)]._cloudNodeId,target_node_id:i.nodes[Number(e.t)]._cloudNodeId,
  relation_type:edgeRelation(e),measure_type:e.measureType||null,
  measure_value:e.measureValue===undefined||e.measureValue===null||e.measureValue===''?null:Number(e.measureValue),
  measure_unit:e.measureUnit||null,evidence_kind:evidenceToDb(e.evidence),evidence_notes:e.evidenceNotes||null,
  attributes:{relation_key:e.relationKey||normalizeRelation(edgeRelation(e))}
 }));
 const {error}=await sb.rpc('save_initiative_graph',{p_initiative:i._cloudId,p_nodes:nodes,p_edges:edges});
 if(error)throw error;
}
async function syncAll(){if(!cloudReady||!cloudOrgId)return false;if(syncing||initiativeDeleteBusy){syncPending=true;return false;}syncing=true;syncPending=false;const syncVersion=cloudSaveVersion;setCloudStatus('Guardando…');try{for(const i of db.initiatives){for(const n of (i.nodes||[])){if(!n._cloudNodeId)n._cloudNodeId=crypto.randomUUID()}for(const e of (i.edges||[])){if(!e._cloudEdgeId)e._cloudEdgeId=crypto.randomUUID()}const payload={organization_id:cloudOrgId,name:i.name||'Sin nombre',description:i.description||null,population:Number(i.population)||0,entry_date:i.createdAt||new Date().toISOString().slice(0,10),impact:i.impact||null,effort:i.effort||null,phase:phases[i.phase||0]?.[0]||'R',scope:i.scope||'inside',app_state:labSeparateState(i)};if(i._cloudId){let {data:updated,error}=await sb.from('initiatives').update(payload).eq('id',i._cloudId).select('id');if(error)throw error;if(!updated?.some(row=>String(row.id)===String(i._cloudId)))throw Error('Supabase no confirmó la actualización de '+(i.name||'la iniciativa'))}else{let {data,error}=await sb.from('initiatives').insert(payload).select('id').single();if(error)throw error;i._cloudId=data.id}await syncGraphForInitiative(i)}cloudConfirmedVersion=Math.max(cloudConfirmedVersion,syncVersion);cloudSaveError='';setCloudStatus('Guardado en Supabase ✓');return true}catch(e){console.error(e);cloudFailedVersion=Math.max(cloudFailedVersion,syncVersion);cloudSaveError=e.message;setCloudStatus('Error de sincronización: '+e.message,true);return false}finally{syncing=false;localBackup();if(syncPending&&!initiativeDeleteBusy){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,450)}}}
function setCloudStatus(t,err=false,allowRetry=err){const el=document.getElementById('cloud-status');if(el){el.textContent='Centro de Inteligencia · '+t;el.style.color=err?'#f2a2a2':'';el.classList.toggle('hcx-visually-hidden',!err);el.classList.toggle('hcx-cloud-sync-error',err)}const retry=document.getElementById('sync-retry');if(retry)retry.hidden=!allowRetry;}
async function loadCloud(){let {data:m,error:me}=await sb.from('memberships').select('organization_id,role').limit(1);if(me)throw me;if(!m?.length)throw Error('Tu usuario no tiene una organización asignada.');cloudOrgId=m[0].organization_id;let {data,error}=await sb.from('initiatives').select('*').eq('organization_id',cloudOrgId).order('created_at');if(error)throw error;db={initiatives:(data||[]).map(r=>{let x=r.app_state||{};x.id=x.id||Date.now()+Math.random();x._cloudId=r.id;x.name=r.name;x.description=r.description||'';x.population=r.population||0;x.createdAt=r.entry_date;x.impact=r.impact;x.effort=r.effort;x.scope=r.scope||'inside';x.phase=Math.max(0,phases.findIndex(p=>p[0]===r.phase));return x}),selected:null};db.selected=db.initiatives[0]?.id||null;cloudReady=true;localBackup();setCloudStatus('Supabase conectado ✓');nav();render();trackPlatformUsage('General','login')}
/* La eliminación se confirma también en Supabase ANTES de quitar la tarjeta.
   Un rechazo de permisos o restricciones deja intacta la iniciativa local. */
async function deleteInitiative(id){
 const item=db.initiatives.find(i=>String(i.id)===String(id));
 if(!item||initiativeDeleteBusy)return false;
 if(!cloudReady||!cloudOrgId){alert('Para eliminar una iniciativa primero necesitas conexión con Supabase. No se ha eliminado ningún dato.');return false;}
 initiativeDeleteBusy=true;clearTimeout(syncTimer);
 setCloudStatus('Eliminando iniciativa…');
 try{
  // No competir con el guardado anterior: evita que una escritura pendiente la recree.
  while(syncing)await new Promise(resolve=>setTimeout(resolve,60));
  if(item._cloudId){
   const {data,error}=await sb.from('initiatives').delete().eq('id',item._cloudId).eq('organization_id',cloudOrgId).select('id');
   if(error)throw error;
   if(!Array.isArray(data)||!data.some(row=>String(row.id)===String(item._cloudId))){
    throw Error('El servidor no confirmó el borrado. Revisa los permisos de eliminación.');
   }
  }
  const i=db.initiatives.findIndex(row=>String(row.id)===String(id));
  if(i>=0)db.initiatives.splice(i,1);
  if(String(db.selected)===String(id))db.selected=db.initiatives[0]?.id??null;
  localBackup();
  if(page==='Iniciativas')render();else go('Iniciativas');
  setCloudStatus('Iniciativa eliminada de Supabase ✓');
  return true;
 }catch(error){
  const message='No se pudo eliminar la iniciativa: '+(error?.message||'Error desconocido')+'. No se eliminó de tu portafolio.';
  setCloudStatus(message,true,false);alert(message);return false;
 }finally{
  initiativeDeleteBusy=false;
  if(syncPending){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,450);}
 }
}
let recoveryMode=false;
let inviteMode=false;
let loginPending=false;
function showRecoveryForm(flow='recovery'){
 const isInvite=flow==='invite';
 recoveryMode=true;inviteMode=isInvite;
 $('login-form').classList.add('hide');
 const form=$('recovery-form');form.classList.remove('hide');
 form.querySelector('h2').textContent=isInvite?'Activar invitación a HACERLO':'Crear nueva contraseña';
 form.querySelector('p').textContent=isInvite?
  'Tu empresa te invitó a HACERLO. Define una contraseña para poder ingresar también en futuras sesiones.':
  'Define una nueva contraseña para tu cuenta.';
 form.querySelector('button[type="submit"]').textContent=isInvite?'Crear contraseña y activar acceso':'Guardar nueva contraseña';
 $('auth-gate').style.display='flex';
}
async function requestPasswordRecovery(){
 const email=$('login-email').value.trim(),msg=$('login-msg');
 if(!email){msg.textContent='Escribe primero tu correo.';return}
 msg.textContent='Enviando enlace…';
 const {error}=await sb.auth.resetPasswordForEmail(email,{
  redirectTo:new URL('.',location.href).href
 });
 msg.textContent=error?error.message:'Revisa tu correo. Abre el enlace y HACERLO te pedirá crear una nueva contraseña.';
}
async function bootAuth(){
 const isInvite=HACERLO_INITIAL_AUTH_FLOW==='invite';
 const isRecovery=HACERLO_INITIAL_AUTH_FLOW==='recovery';
 if(isInvite||isRecovery)showRecoveryForm(isInvite?'invite':'recovery');
 const {data:{session},error}=await sb.auth.getSession();
 if(error)console.warn('No se pudo validar la sesión:',error.message);
 if(recoveryMode){
  if(!session)$('recovery-msg').textContent='Validando enlace de invitación o recuperación…';
  return;
 }
 if(session){
  $('auth-gate').style.display='none';
  try{await loadCloud()}catch(e){setCloudStatus(e.message,true)}
 }
}
document.addEventListener('DOMContentLoaded',()=>{
 sb.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY')showRecoveryForm('recovery');
  else if(HACERLO_INITIAL_AUTH_FLOW==='invite' && event==='SIGNED_IN')showRecoveryForm('invite');
 });
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  if(loginPending)return;
  loginPending=true;
  const form=e.target,buttons=Array.from(form.querySelectorAll('button'));
  form.setAttribute('aria-busy','true');
  buttons.forEach(button=>button.disabled=true);
  const msg=$('login-msg');msg.textContent='Ingresando…';
  try{
   const {error}=await sb.auth.signInWithPassword({
     email:$('login-email').value.trim(),password:$('login-password').value
   });
   if(error){msg.textContent=error.message;return}
   $('auth-gate').style.display='none';msg.textContent='';
   try{await loadCloud()}catch(x){setCloudStatus(x.message,true)}
  }catch(error){
   msg.textContent='No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.';
  }finally{
   loginPending=false;
   form.setAttribute('aria-busy','false');
   buttons.forEach(button=>button.disabled=false);
  }
 });
 $('recovery-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const msg=$('recovery-msg'),p=$('new-password').value,c=$('confirm-password').value;
  if(p!==c){msg.textContent='Las contraseñas no coinciden.';return}
  if(p.length<8){msg.textContent='Usa al menos 8 caracteres.';return}
  msg.textContent='Guardando…';
  const {data,error}=await sb.auth.updateUser({password:p});
  if(error){msg.textContent='No se pudo actualizar la contraseña: '+error.message;return}
  const wasInvite=inviteMode;
  const accountEmail=data?.user?.email||'';
  await sb.auth.signOut();
  history.replaceState({},document.title,location.pathname);
  recoveryMode=false;inviteMode=false;
  $('recovery-form').classList.add('hide');
  $('login-form').classList.remove('hide');
  $('auth-gate').style.display='flex';
  if(accountEmail)$('login-email').value=accountEmail;
  $('login-password').value='';$('new-password').value='';$('confirm-password').value='';
  $('recovery-msg').textContent='';
  $('login-msg').textContent=wasInvite?
    'Invitación activada. Ya puedes iniciar sesión con tu correo y la contraseña que acabas de crear.':
    'Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.';
 });
 bootAuth();
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')setMobileNav(false,true);
 });
});
let logoutPending=false;
async function logoutHacerlo(){
 if(logoutPending)return false;
 if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation())return false;
 logoutPending=true;
 try{
  if(cloudSaveVersion>cloudConfirmedVersion||syncing||syncPending){
   const result=await confirmCloudSave(cloudSaveVersion);
   if(!result.ok){setCloudStatus('No cerramos la sesión: hay cambios sin confirmar. '+result.message,true);return false;}
  }
  const {error}=await sb.auth.signOut();
  if(error)throw error;
  clearTimeout(syncTimer);cloudReady=false;cloudOrgId=null;syncPending=false;
  db={initiatives:[],selected:null};
  document.getElementById('auth-gate').style.display='flex';setCloudStatus('Sesión cerrada');
  return true;
 }catch(error){setCloudStatus('No se pudo cerrar la sesión: '+error.message,true);return false;}
 finally{logoutPending=false;}
}
const current=()=>db.initiatives.find(x=>x.id===db.selected);
// Navegación jerárquica: RDAIM es un marco integrado, no una pantalla superpuesta.
const HACERLO_NAV_GROUPS=[
 {title:'Espacio de trabajo',items:[['Inicio','⌂'],['Iniciativas','▦']]},
 {title:'Resultados',step:0,items:[['Resultado global','◉'],['Comportamiento objetivo','◎'],['Diagnóstico','◈'],['Indicadores','▤']]},
 {title:'Diseño',step:1,items:[['Diseño de comportamientos','◈'],['Gestión de audiencias','♧']]},
 {title:'Análisis',step:2,items:[['Grafo de adopción','◎'],['Pensamiento sistémico','⟲'],['Simulación de agentes','♧'],['Inteligencia integrada','✧']]},
 {title:'Implementación',step:3,items:[['Intervenciones','▥'],['Plan de cambio','▤'],['Centro de activación','✧'],['Laboratorio','◇']]},
 {title:'Medición',step:4,items:[['Analítica','▥']]}
];
const HACERLO_PAGE_PHASE={'Inicio de Resultados':0,'Resultado global':0,'Comportamiento objetivo':0,'Encuestas y experiencias':0,'Diseño de comportamientos':1,'Gestión de audiencias':1,'Diagnóstico':0,'Indicadores':0,'Grafo de adopción':2,'Pensamiento sistémico':2,'Simulación de agentes':2,'Inteligencia integrada':2,'Intervenciones':3,'Centro de activación':3,'Movilización y refuerzo':3,'Laboratorio':3,'Plan de cambio':3,'Analítica':4};
// Solo una etapa desplegada. null permite cerrar todas sin cambiar la pantalla.
let expandedNavStep=null;
function trackPlatformUsage(moduleName,eventType='view'){
 if(typeof cloudReady==='undefined'||!cloudReady||typeof cloudOrgId==='undefined'||!cloudOrgId||typeof sb==='undefined')return;
 void sb.rpc('platform_record_activity',{p_org:cloudOrgId,p_module:moduleName,p_event:eventType})
   .then(()=>{}).catch(()=>{});
}
function toggleNavStep(step){
 if(expandedNavStep!==step&&typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation())return;
 if(expandedNavStep!==step&&typeof cacPrepareNavigation==='function'&&!cacPrepareNavigation('RDAIM'))return;
 if(expandedNavStep===step){expandedNavStep=null;nav();return}
 phase=step; expandedNavStep=step; page='RDAIM'; nav();render();
 if(phases[step])trackPlatformUsage(phases[step][1]);
}
function openNavStep(step){
 if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation())return false;
 phase=step;
 expandedNavStep=step;
 nav();
}
function setMobileNav(open,restoreFocus=false){
 const button=$('nav-toggle'),sidebar=$('nav')?.closest?.('aside');
 if(!button||!sidebar)return;
 const wasOpen=button.getAttribute('aria-expanded')==='true';
 sidebar.classList.toggle('is-mobile-open',open);
 button.setAttribute('aria-expanded',String(open));
 button.setAttribute('aria-label',open?'Cerrar menú de navegación':'Abrir menú de navegación');
 if(!open&&wasOpen&&restoreFocus)button.focus();
}
function toggleMobileNav(){
 setMobileNav($('nav-toggle')?.getAttribute('aria-expanded')!=='true');
}
function nav(){
 $('nav').innerHTML=`<div class="nav-workspace">${HACERLO_NAV_GROUPS[0].items.map(([n,icon])=>`<button type="button" class="nav nav-child ${page===n?'active':''}" onclick="go('${n}')"><span class="nav-symbol" aria-hidden="true">${icon}</span><span>${n}</span></button>`).join('')}</div><div class="nav-framework-label">Marco RDAIM</div>`+
 HACERLO_NAV_GROUPS.filter(g=>g.step!==undefined).map(group=>{
  const opened=expandedNavStep===group.step;
  const active=HACERLO_PAGE_PHASE[page]===group.step || (page==='RDAIM'&&phase===group.step);
  const id=`nav-stage-${group.step}`;
  return `<section class="nav-accordion ${opened?'is-open':''} ${active?'has-active':''}">
   <button type="button" class="nav-stage ${active?'is-current':''}" aria-expanded="${opened}" aria-controls="${id}" onclick="toggleNavStep(${group.step})"><span class="nav-stage-mark" style="--stage-color:${phases[group.step][2]}">${phases[group.step][0]}</span><span>${group.title}</span><span class="nav-chevron" aria-hidden="true">${opened?'⌄':'›'}</span></button>
   <div class="nav-stage-children" id="${id}" ${opened?'':'hidden'}>${group.items.map(([n,icon])=>`<button type="button" class="nav nav-child ${(page===n||(n==='Diagnóstico'&&page==='Encuestas y experiencias'))?'active':''}" onclick="go('${n}')"><span class="nav-symbol" aria-hidden="true">${icon}</span><span>${n}</span></button>`).join('')}</div>
  </section>`;
 }).join('');
}
function go(n){
 if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation())return false;
 if(n==='Movilización y refuerzo')n='Centro de activación';
 if(typeof cacPrepareNavigation==='function'&&!cacPrepareNavigation(n))return false;
 if(n==='Pensamiento sistémico'&&typeof sysHubReset==='function')sysHubReset();
 if(n==='RDAIM')expandedNavStep=phase;
 if(Object.prototype.hasOwnProperty.call(HACERLO_PAGE_PHASE,n)){
  phase=HACERLO_PAGE_PHASE[n];expandedNavStep=phase;
 }
 page=n;nav();render();
 setMobileNav(false,true);
 if(typeof hcxAfterNavigation==='function')hcxAfterNavigation();
 if((n==='Laboratorio'||n==='Inteligencia integrada')&&typeof labBridgeLoad==='function')void labBridgeLoad(current(),true);
 if(n==='RDAIM'||Object.prototype.hasOwnProperty.call(HACERLO_PAGE_PHASE,n)){
   const stage=n==='RDAIM'?phase:HACERLO_PAGE_PHASE[n];
   if(phases[stage])trackPlatformUsage(phases[stage][1]);
 }
 if(n==='Iniciativas'&&typeof prioritySyncPublic==='function')void prioritySyncPublic();
}
function choose(id){if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation()){const picker=document.activeElement;if(picker?.tagName==='SELECT')picker.value=String(db.selected);return}db.selected=id;go('RDAIM')}
function createInitiative(e){
 e.preventDefault();
 const f=e.target;
 const o={id:Date.now(),name:f.name.value.trim(),description:'',population:Number(f.population.value)||0,scope:f.scope.value,
  createdAt:f.createdAt.value||new Date().toISOString().slice(0,10),impact:null,effort:null,phase:0,
  dimensions:Object.fromEntries(dims.map(d=>[d,null])),indicators:[],behaviors:[],audiences:[],actions:[],nodes:[],edges:[],causal:[],systemVariables:[],systemLinks:[]};
 if(typeof priorityEnsureSurvey==='function')priorityEnsureSurvey(o);
 if(typeof prioritySubmitFromCreation==='function'){
  const check=prioritySubmitFromCreation(f,o);
  if(!check.ok)return alert(check.message);
 }
 db.initiatives.push(o);db.selected=o.id;save();go('RDAIM');
}
function render(){let x=current(),a=$('app');if(x){x.behaviors=x.behaviors||[];x.audiences=x.audiences||[];x.indicators=x.indicators||[];x.actions=x.actions||[];x.metrics=x.metrics||{};x.metricHistory=x.metricHistory||{};x.measurements=x.measurements||[];x.notes=x.notes||{};x.systemVariables=x.systemVariables||[];x.systemLinks=x.systemLinks||[];x.evidenceRecords=x.evidenceRecords||[];x.modelRuns=x.modelRuns||[];x.scope=x.scope||'inside';}if(page==='Inteligencia integrada'){a.innerHTML=intelligencePage(x);return}if(page==='Inicio'){a.innerHTML=renderIntelligenceHome();return}if(page==='Iniciativas'){a.innerHTML=renderInitiativesHome();return}if(page==='Laboratorio'){a.innerHTML=renderLearningLabPage();return}if(page==='Centro de activación'){a.innerHTML=x?renderCentroActivacion(x):'<section class="panel"><h2>Centro de activación</h2><p>Selecciona una iniciativa para comenzar.</p></section>';return}if(page==='Movilización y refuerzo'){a.innerHTML=current()?renderMovilizacionEstudio(current()):'<section class="panel"><h2>Movilización y refuerzo</h2><p>Selecciona una iniciativa para continuar.</p></section>';return}
if(!x){a.innerHTML='<div class="panel">Selecciona o crea una iniciativa desde Iniciativas. <button type="button" class="secondary" onclick="go(\'Iniciativas\')">Ver iniciativas</button></div>';return}
let showStageSteps=page==='RDAIM';let head=`<section class="panel"><div class="flex" style="justify-content:space-between"><div><h2>${safe(x.name)}</h2><p class="muted">${safe(initiativeContextSummary(x))} · ${x.population} personas</p></div><select style="width:auto" onchange="choose(Number(this.value))">${db.initiatives.map(i=>`<option value="${i.id}" ${i.id===x.id?'selected':''}>${safe(i.name)}</option>`).join('')}</select></div>${showStageSteps?`<div class="steps">${phases.map((p,i)=>`<button class="step ${(page==='RDAIM'?phase:(HACERLO_PAGE_PHASE[page]??phase))===i?'selected':''}" style="--c:${p[2]}" onclick="if(openNavStep(${i})!==false)go('RDAIM')"><b>${p[0]}</b>${p[1]}</button>`).join('')}</div>`:''}</section>`;
if(page==='Diseño de comportamientos')head=hcxHero('Diseño de comportamientos',x,'Define las acciones observables que producirán el resultado esperado.','RDAIM · DISEÑO','◈');
 if(page==='RDAIM'||page==='Diseño de comportamientos'){
let p=phases[phase],body='';
if(phase===0)body=resultadosHome(x);
if(phase===1)body=`<div class="grid"><section class="panel"><h2>Diseño de comportamientos</h2><p class="muted">Define las acciones observables que deseas lograr.</p><button class="primary" onclick="go('Diseño de comportamientos')">Abrir diseño →</button></section><section class="panel"><h2>Gestión de audiencias</h2><p class="muted">Caracteriza personas y grupos, visualiza cuadrantes y define estrategias.</p><button class="primary" onclick="go('Gestión de audiencias')">Abrir audiencias →</button></section></div>`;
if(page==='Diseño de comportamientos')body=behaviorDesignPage(x);
if(phase===2)body=`<div class="analysis-grid">${[['Grafo de adopción','Relaciones entre personas, equipos y barreras','Grafo de adopción','network'],['Pensamiento sistémico','Variables y relaciones causales hipotéticas','Pensamiento sistémico','workflow'],['Simulación de agentes','Simulación de adopción y análisis científico','Simulación de agentes','users'],['Inteligencia integrada','Modelo organizacional, escenarios y aprendizaje','Inteligencia integrada','brain']].map(v=>`<section class="panel"><h2>${v[0]}</h2><p class="muted">${v[1]}</p><button class="primary" onclick="go('${v[2]}')">Abrir módulo →</button></section>`).join('')}</div><section class="panel"><h2>Indicadores para contrastar hipótesis</h2>${indicatorTable(x)}<button class="secondary" onclick="go('Indicadores')">Editar indicadores</button></section>`;
if(phase===3)body=`<section class="panel"><div class="flex" style="justify-content:space-between"><h2>Intervenciones</h2><button class="primary" onclick="go('Intervenciones')">Gestionar acciones →</button></div><p class="muted">Consulta la programación o actualiza las acciones de esta iniciativa.</p></section>`+(typeof atPanel==='function'?atPanel('initiative'):'')+renderLearningLabTile();
if(phase===4)body=`<div class="triple">${[['INS de personas','ins_personas'],['INS de proceso','ins_proceso'],['CNPS','cnps']].map(([label,key])=>metricCard(x,label,key)).join('')}</div><section class="panel"><h2>Analítica de la iniciativa</h2><p class="muted">Indicadores predictivos de comportamiento, indicadores de resultados, INS, CNPS y seguimiento de adopción.</p><div class="grid"><div>${indicatorTable(x,['Predictivos','Resultados'])}</div><div><h3>Avance por dimensión</h3>${dimensionBars(x)}</div></div><button class="primary" onclick="go('Analítica')">Abrir panel de analítica →</button></section>`;

a.innerHTML=head+body;return}
if(page==='Inicio de Resultados'){a.innerHTML=hcxHero('Resultados',x,'Define qué queremos transformar y observa cómo avanza la iniciativa.','RDAIM · RESULTADOS','◉')+resultadosHome(x);return}
if(page==='Resultado global'){a.innerHTML=hcxHero('Resultado global',x,'Define el cambio esperado y cómo medirlo.','RDAIM · RESULTADOS','◉')+resultGlobalPanel(x);return}
if(page==='Comportamiento objetivo'){a.innerHTML=hcxHero('Comportamiento objetivo',x,'Define la conducta observable y su hipótesis de valor.','RDAIM · RESULTADOS','◎')+objectivePanel(x);return}
if(page==='Gestión de audiencias'){a.innerHTML=audienceManagementPage(x);return}
if(page==='Diagnóstico'){a.innerHTML=diagnosisPage(x);return}
if(page==='Encuestas y experiencias'){a.innerHTML=eePage(x);return}
if(page==='Indicadores'){a.innerHTML=renderIndicatorsEditor(x,hcxHero('Indicadores',x,'Define cómo sabrás si los resultados están cambiando.','RDAIM · RESULTADOS','◉'));return}
if(page==='Plan de cambio'){a.innerHTML=planExecPreviewPage(x);return}
if(page==='Intervenciones'){a.innerHTML=hcxHero('Gestionar intervenciones',x,'Convierte decisiones en acciones y acompaña su avance.','RDAIM · IMPLEMENTACIÓN','✦')+`<div class="hcx-summary-strip"><b>Seguimiento de acciones</b><span>Actualiza el estado en cada tarjeta para mantener el avance.</span></div><details class="hcx-fold hcx-action-create" id="action-editor"><summary><span class="hcx-fold-glyph" aria-hidden="true">＋</span><span class="hcx-fold-titles"><strong>Agregar acción</strong><small>Define una acción, su responsable, fechas e hipótesis.</small></span><span class="hcx-fold-chevron" aria-hidden="true">⌄</span></summary><div class="hcx-fold-content"><section class="panel"><h3 id="action-form-title">Nueva acción</h3><form id="action-form" onsubmit="addAction(event)"><input type="hidden" name="editIndex" value=""><div class="triple"><label>Acción<input name="name" required placeholder="¿Qué haremos?"></label><label>Dimensión<select name="dimension">${[...new Set([...dims,...x.actions.map(a=>a.dimension).filter(Boolean)])].map(d=>`<option value="${safe(d)}">${safe(d)}</option>`).join('')}</select></label><label>Responsable<input name="owner" placeholder="Responsable"></label><label>Inicio<input name="start" type="date"></label><label>Fin<input name="end" type="date"></label><label>Origen<select name="source">${[...new Set(['Manual','Inteligencia artificial','Diagnóstico',...x.actions.map(a=>a.source).filter(Boolean)])].map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('')}</select></label></div><label>Hipótesis<textarea name="hypothesis" class="action-hypothesis" placeholder="Dado que [situación identificada], esperamos que [acción propuesta] genere [cambio esperado]."></textarea></label>${actionMechanismsEditor()}<div class="flex"><button class="primary" id="action-submit">+ Crear acción</button><button type="button" class="secondary hide" id="action-cancel" onclick="cancelActionEdit()">Cancelar edición</button></div></form></section></div></details>${kanban(x)}${(typeof atPanel==='function'?atPanel('initiative'):'')}`;return}
if(page==='Grafo de adopción'){renderAdoptionGraphPage(a,hcxHero('Grafo de adopción',x,'Explora quién influye, cómo se relacionan los actores y dónde aparecen barreras.','RDAIM · ANÁLISIS','◎'),x);return}
if(page==='Pensamiento sistémico'){sysHubRender(a,x);return}
if(page==='Simulación de agentes'){a.innerHTML=renderABMExperiencePage(x);return}
if(page==='Analítica'){let vals=Object.values(x.dimensions).filter(v=>v!==null),avg=vals.length?Math.round(vals.reduce((a,b)=>a+Number(b),0)/vals.length):'—';a.innerHTML=hcxHero('Analítica y medición',x,'Observa el avance y contrasta los resultados a lo largo del tiempo.','RDAIM · MEDICIÓN','◷')+portfolioMetricSummary()+`<div class="triple">${[['INS personas','ins_personas'],['INS proceso','ins_proceso'],['CNPS','cnps']].map(([n,k])=>metricCard(x,n,k)).join('')}</div><div class="triple"><section class="panel"><p class="muted">Dimensiones medidas</p><div class="metric">${vals.length}/6</div></section><section class="panel"><p class="muted">Promedio descriptivo*</p><div class="metric">${avg}${vals.length?'%':''}</div></section><section class="panel"><p class="muted">Acciones completadas</p><div class="metric">${x.actions.filter(a=>a.status==='Completada').length}/${x.actions.length}</div></section></div><div class="grid"><section class="panel"><h2>Adopción por dimensión</h2>${dimensionBars(x)}<p class="notice">*Promedio descriptivo, no índice validado.</p></section><section class="panel"><h2>Indicadores predictivos y de resultados</h2>${indicatorTable(x,['Predictivos','Resultados'])}<button class="secondary" onclick="go('Indicadores')">Configurar indicadores</button></section></div><section class="panel"><h2>Evolución de indicadores</h2><p class="muted">Registra valores sucesivos desde Indicadores para visualizar su evolución.</p>${trendCharts(x)}</section>`;return}}


const RESULT_TYPES=['Porcentaje de adopción','Porcentaje de cumplimiento','Frecuencia de comportamiento','Nivel de participación','Calidad de las relaciones','Nivel de capacidades','Índice de percepción','Nivel de desempeño','Tiempo o eficiencia','Impacto en resultados','Conteo de eventos o casos'];
const RESULT_UNITS=['Porcentaje (%)','Puntos / índice','Escala','Número de personas','Frecuencia (veces)','Tiempo (minutos)','Tasa','Valor monetario (COP)','Cantidad'];
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
 <div class="hcx-result-measure-grid"><div><small>¿Cómo vamos a medirlo?</small><strong>${safe(r.measureType||'No definido')}</strong></div><div><small>Unidad de medición</small><strong>${safe(r.unit||'No definida')}${r.unit==='Escala'?safe(resultNarrativeUnit(r)):''}</strong></div></div>
 <div class="hcx-result-hybrid-metrics" aria-label="Línea base, meta esperada y fecha meta">
 <div class="hcx-result-hybrid-metric"><span>Línea base</span><strong>${safe(resultNarrativeAmount(r.baseline,r.unit))}</strong></div>
 <div class="hcx-result-hybrid-metric"><span>Meta esperada</span><strong>${safe(resultNarrativeAmount(r.target,r.unit))}</strong></div>
 <div class="hcx-result-hybrid-metric"><span>Fecha meta</span><strong>${safe(resultDateLabel(r.dueDate))}</strong></div>
 </div></section>`:resultEmptyCard('global',legacy)}
 </div>`;
}
function resultToggleScale(f){const scale=f.elements.unit.value==='Escala';f.querySelector('[data-scale-box]').style.display=scale?'block':'none';f.querySelector('[data-custom-scale]').style.display=scale&&f.elements.scale.value==='Personalizada'?'grid':'none'}
function resultSentence(r){const scale=r.unit==='Escala'?` (escala ${r.scale==='Personalizada'?r.scaleMin+' a '+r.scaleMax:r.scale.replace('-',' a ')})`:'';return `${r.verb} ${r.complement}, medido mediante ${r.measureType.toLowerCase()}, en ${r.unit.toLowerCase()}${scale}, de ${r.baseline} a ${r.target} para el ${r.dueDate}.`}
function saveGlobalResult(e){e.preventDefault();const f=e.target,z=Object.fromEntries(new FormData(f));const baseline=Number(z.baseline),target=Number(z.target);let min=-Infinity,max=Infinity;if(z.unit==='Porcentaje (%)'){min=0;max=100}else if(z.unit==='Escala'){const b=z.scale==='Personalizada'?[Number(z.scaleMin),Number(z.scaleMax)]:z.scale.split('-').map(Number);[min,max]=b;if(!(min<max))return alert('La escala debe tener un mínimo menor al máximo.')}if(baseline<min||baseline>max||target<min||target>max)return alert('Línea base y meta deben estar dentro de la escala o rango seleccionado.');if(['Incrementar','Mejorar','Fortalecer'].includes(z.verb)&&target<baseline||z.verb==='Reducir'&&target>baseline||z.verb==='Mantener'&&target!==baseline)return alert('Revisa que la meta sea coherente con el verbo seleccionado.');const x=current();x.globalResult={...z,baseline,target,scaleMin:Number(z.scaleMin),scaleMax:Number(z.scaleMax)};x.expected=resultSentence(x.globalResult);syncInitiativeContextFromHypothesis(x);resultEditorsExpanded.global=false;save();render()}
// Visualización RDAIM: conducta una vez, relación esperada y medición separadas.
function objectiveIntegratedFlow(x){
 const b=x.objectiveBehavior||{},r=x.globalResult||{};
 const full=!!x.globalResult;
 const actor=resultTextClean(b.actor),action=resultTextClean(b.action);
 const ctx=resultTextClean(b.context),evidence=resultTextClean(b.evidence),cond=resultTextClean(b.condition);
 const outcome=[resultTextClean(r.verb),resultTextClean(r.complement)].filter(Boolean).join(' ');
 const dateMismatch=/^\d{4}-\d{2}-\d{2}$/.test(String(b.observeFrom||''))&&
 /^\d{4}-\d{2}-\d{2}$/.test(String(r.dueDate||''))&&String(r.dueDate)<String(b.observeFrom);
 return `<div class="hcx-hypothesis-triptych" aria-label="Relación entre comportamiento, hipótesis y resultado">
  <section class="hcx-hypothesis-side hcx-hypothesis-behavior">
   <span class="hcx-hypothesis-eyebrow">COMPORTAMIENTO OBJETIVO</span>
   <div class="hcx-hypothesis-side-group"><small>Quién realiza la acción</small><strong>${safe(actor)}</strong></div>
   <div class="hcx-hypothesis-side-group"><small>Comportamiento esperado</small><p class="hcx-hypothesis-action-preview" title="${safe(action)}">${safe(action)}</p></div>
   <div class="hcx-hypothesis-side-meta"><span>${safe(objectiveNarrativeFrequency(b.frequency))}${cond?' · '+safe(cond):''}</span><span>Desde ${safe(resultDateLabel(b.observeFrom))}</span></div>
   ${ctx||evidence?`<details class="hcx-hypothesis-more"><summary>Contexto y evidencia</summary><div>${ctx?'<p><b>Contexto:</b> '+safe(ctx)+'</p>':''}${evidence?'<p><b>Evidencia:</b> '+safe(evidence)+'</p>':''}</div></details>`:''}
   <button type="button" class="hcx-result-objective-edit" onclick="resultEditorOpen('objective')">Editar comportamiento</button>
  </section>
  <section class="hcx-hypothesis-central">
   <div class="hcx-hypothesis-central-head"><span class="hcx-hypothesis-eyebrow">HIPÓTESIS DE VALOR</span><span class="hcx-hypothesis-logic">SI → ENTONCES</span></div>
   ${full?`<p class="hcx-hypothesis-fulltext">${safe(resultValueHypothesis(x))}</p>`:
    '<p class="hcx-hypothesis-pending">Define el resultado global para construir la hipótesis de valor completa.</p>'}
   ${full&&dateMismatch?`<p class="hcx-hypothesis-date-alert">Revisa las fechas: la meta (${safe(resultDateLabel(r.dueDate))}) es anterior al inicio previsto del comportamiento (${safe(resultDateLabel(b.observeFrom))}).</p>`:''}
  </section>
  <section class="hcx-hypothesis-side hcx-hypothesis-result ${full?'':'is-pending'}">
   <span class="hcx-hypothesis-eyebrow">RESULTADO GLOBAL</span>
   ${full?`<h3>${safe(outcome)}</h3>
    <div class="hcx-hypothesis-side-group"><small>Cómo vamos a medirlo</small><strong>${safe(resultTextClean(r.measureType)||'No definido')}</strong></div><div class="hcx-hypothesis-side-group"><small>Unidad de medición</small><strong>${safe(r.unit||'No definida')}${r.unit==='Escala'?safe(resultNarrativeUnit(r)):''}</strong></div>
    <div class="hcx-hypothesis-target"><div><small>Línea base</small><strong>${safe(resultNarrativeAmount(r.baseline,r.unit))}</strong></div><span aria-hidden="true">→</span><div><small>Meta</small><strong>${safe(resultNarrativeAmount(r.target,r.unit))}</strong></div></div>
    <div class="hcx-hypothesis-side-meta"><span>Fecha meta: ${safe(resultDateLabel(r.dueDate))}</span></div>`:
    '<p class="hcx-hypothesis-pending">Aún no se ha definido un resultado global.</p>'}
  </section>
 </div>`;
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
 <div class="hcx-frequency-field"><span class="hcx-frequency-label">¿Con qué frecuencia esperamos observarlo?</span>
  <input type="hidden" name="frequency" value="${safe(b.frequency||'Semanal')}">
  <details class="hcx-frequency-picker"><summary aria-label="Seleccionar frecuencia: ${safe(b.frequency||'Semanal')}"><span data-frequency-selected>${safe(b.frequency||'Semanal')}</span><span class="hcx-frequency-arrow" aria-hidden="true">⌄</span></summary>
   <div class="hcx-frequency-options" role="group" aria-label="Opciones de frecuencia">
    ${OBS_FREQUENCIES.map(freq=>`<button type="button" data-frequency="${safe(freq)}" aria-pressed="${freq===(b.frequency||'Semanal')}" class="hcx-frequency-option ${freq===(b.frequency||'Semanal')?'is-selected':''}" onclick="objectiveChooseFrequency(this)">${safe(freq)}</button>`).join('')}
   </div>
  </details>
 </div><label data-condition style="display:${conditional.includes(b.frequency)?'block':'none'}"><span data-condition-label>${details[b.frequency]||''}</span><input name="condition" value="${safe(b.condition||'')}" placeholder="Especifica la actividad o situación"></label>
 <details ${b.evidence?'open':''}><summary>¿Cómo sabremos que ocurrió? (opcional)</summary><label>Evidencia observable<textarea name="evidence" placeholder="Ej. acuerdos documentados">${safe(b.evidence||'')}</textarea></label></details><label>¿Desde cuándo esperamos observar este comportamiento?<input type="date" name="observeFrom" required value="${safe(b.observeFrom||'')}"></label>
 <div class="hcx-result-editor-actions"><button class="primary" type="submit">Guardar comportamiento objetivo</button><button class="secondary" type="button" onclick="resultEditorClose('objective')">Cancelar</button></div></form>
 </div></details>
 ${saved?objectiveIntegratedFlow(x):resultEmptyCard('objective',legacy)}
 </div>`;
}
function objectiveChooseFrequency(button){
 const field=button.closest('.hcx-frequency-field'),form=button.closest('form');
 if(!field||!form)return;
 const value=button.dataset.frequency;
 const input=field.querySelector('input[name="frequency"]');
 if(!input||!OBS_FREQUENCIES.includes(value))return;
 input.value=value;
 const picker=field.querySelector('.hcx-frequency-picker');
 const summary=picker?.querySelector('summary');
 const selected=field.querySelector('[data-frequency-selected]');
 if(selected)selected.textContent=value;
 if(summary)summary.setAttribute('aria-label','Seleccionar frecuencia: '+value);
 field.querySelectorAll('.hcx-frequency-option').forEach(option=>{
  const active=option.dataset.frequency===value;
  option.setAttribute('aria-pressed',String(active));
  option.classList.toggle('is-selected',active);
 });
 if(picker)picker.open=false;
 objectiveToggleCondition(form);
 if(summary)summary.focus({preventScroll:true});
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
 const actor=resultTextClean(b.actor);
 const action=resultTextClean(b.action);
 const ctx=resultTextClean(b.context);
 const cond=resultTextClean(b.condition);
 const who=actor.charAt(0).toLocaleLowerCase('es')+actor.slice(1);
 const what=action.charAt(0).toLocaleLowerCase('es')+action.slice(1);
 const frequency=objectiveNarrativeFrequency(b.frequency);
 const when=resultDateLabel(b.observeFrom);
 const result=[resultTextClean(r.verb).toLocaleLowerCase('es'),resultTextClean(r.complement)].filter(Boolean).join(' ');
 const measure=resultTextClean(r.measureType);
 return 'Si '+who+' '+what+(ctx?', '+ctx.charAt(0).toLocaleLowerCase('es')+ctx.slice(1):'')+
  ', '+frequency+(cond?' ('+cond+')':'')+' desde el '+when+
  ', entonces esperamos '+result+'. Mediremos el avance con el indicador «'+measure+'»'+resultNarrativeUnit(r)+
  ', desde una línea base de '+resultNarrativeAmount(r.baseline,r.unit)+
  ' hasta una meta de '+resultNarrativeAmount(r.target,r.unit)+
  ' para el '+resultDateLabel(r.dueDate)+'.';
}

/* Una única fuente para el resumen de la iniciativa: hipótesis de valor construida
   con Resultado global + Comportamiento objetivo. Preservar el texto manual previo. */
function initiativeValueHypothesisReady(x){
 const r=x?.globalResult,b=x?.objectiveBehavior;
 return !!(r&&b&&resultTextClean(r.verb)&&resultTextClean(r.complement)&&
  resultTextClean(r.measureType)&&resultTextClean(r.dueDate)&&
  resultTextClean(b.actor)&&resultTextClean(b.action)&&resultTextClean(b.observeFrom));
}
function initiativeContextSummary(x){
 if(initiativeValueHypothesisReady(x))return resultValueHypothesis(x);
 return String(x?.description||'').trim()||'Pendiente de formular la hipótesis de valor.';
}
function syncInitiativeContextFromHypothesis(x){
 if(!initiativeValueHypothesisReady(x))return false;
 const next=resultValueHypothesis(x);
 if(String(x.description||'')===next)return false;
 if(x.descriptionSource!=='valueHypothesis'&&String(x.description||'').trim()){
  x.descriptionBeforeHypothesis=x.description;
 }
 x.description=next;
 x.descriptionSource='valueHypothesis';
 return true;
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
function saveObjectiveBehavior(e){e.preventDefault();const f=e.target,z=Object.fromEntries(new FormData(f)),conditional=['Al iniciar una actividad','Al finalizar una actividad','Ante una situación específica','Otra'];if(conditional.includes(z.frequency)&&!z.condition.trim())return alert('Especifica la actividad o situación que activa el comportamiento.');const x=current();x.objectiveBehavior=z;x.objective=objectiveSentence(z);syncInitiativeContextFromHypothesis(x);resultEditorsExpanded.objective=false;save();render()}

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
