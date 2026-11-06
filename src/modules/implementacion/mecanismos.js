/* HACERLO Implementación · mecanismos múltiples sin duplicar acciones. */
const HACERLO_MECHANISMS=Object.freeze([
 {id:'comunicacion',label:'Comunicaciones'},
 {id:'reconocimiento',label:'Reconocimiento'},
 {id:'laboratorio',label:'Laboratorio'},
 {id:'otro',label:'Otro mecanismo'},
 {id:'ninguno',label:'No aplica'}
]);
function actionMechanisms(action){
 const raw=Array.isArray(action?.mechanisms)?action.mechanisms:
  (action?.learningLabExperience?['laboratorio']:['ninguno']);
 const ids=[...new Set(raw.filter(v=>HACERLO_MECHANISMS.some(k=>k.id===v)))];
 return ids.includes('ninguno')?['ninguno']:(ids.length?ids:['ninguno']);
}
function actionMechanismsEditor(){
 return '<fieldset class="hcx-mechanisms"><legend>Mecanismos de intervención <small>Elige uno o varios</small></legend>'+
  '<div class="hcx-mechanism-grid">'+HACERLO_MECHANISMS.map(m=>
   '<label class="hcx-mechanism-option"><input type="checkbox" name="mechanisms" value="'+m.id+'"'+(m.id==='ninguno'?' checked':'')+
   ' onchange="actionMechanismToggle(this)"><span>'+m.label+'</span></label>').join('')+'</div>'+
  '<p class="hcx-mechanism-help">Puedes combinar comunicaciones, reconocimiento, laboratorio y otros mecanismos. «No aplica» es exclusivo.</p></fieldset>';
}
function actionMechanismToggle(input){
 const form=input.form;if(!form?.querySelectorAll)return;
 const boxes=Array.from(form.querySelectorAll('input[name="mechanisms"]'));
 if(input.checked){
  if(input.value==='ninguno')boxes.forEach(b=>{if(b!==input)b.checked=false});
  else boxes.forEach(b=>{if(b.value==='ninguno')b.checked=false});
 }
 if(!boxes.some(b=>b.checked)){const none=boxes.find(b=>b.value==='ninguno');if(none)none.checked=true;}
}
function actionMechanismsSet(form,action){
 if(!form?.querySelectorAll)return;
 const selected=actionMechanisms(action);
 form.querySelectorAll('input[name="mechanisms"]').forEach(box=>{box.checked=selected.includes(box.value)});
}
function actionMechanismsRead(form,original){
 if(!form?.querySelectorAll)return actionMechanisms(original);
 const selected=Array.from(form.querySelectorAll('input[name="mechanisms"]:checked')).map(n=>n.value);
 const values=[...new Set(selected.filter(v=>HACERLO_MECHANISMS.some(m=>m.id===v)))];
 return values.includes('ninguno')?['ninguno']:(values.length?values:['ninguno']);
}
function actionMechanismsBadges(action){
 const active=actionMechanisms(action).filter(v=>v!=='ninguno');
 return active.length?'<div class="hcx-mechanism-tags">'+active.map(id=>{
  const def=HACERLO_MECHANISMS.find(m=>m.id===id);
  return '<span>'+safe(def.label)+'</span>';
 }).join('')+'</div>':'';
}
function mobilizationActionCard(action,index,kind){
 const details=action.mechanismDetails?.[kind]||{};
 const communicator=kind==='comunicacion';
 const fields=communicator?
  '<label>Mensaje o intención comunicativa<textarea name="message" maxlength="1500" placeholder="¿Qué comportamiento queremos activar?">'+safe(details.message||'')+'</textarea></label>'+
  '<div class="grid"><label>Canal<input name="channel" maxlength="120" placeholder="Ej. correo, conversación, Teams" value="'+safe(details.channel||'')+'"></label>'+
  '<label>Audiencia<input name="audience" maxlength="180" placeholder="¿A quién se dirige?" value="'+safe(details.audience||'')+'"></label></div>':
  '<label>Comportamiento observable que se reconocerá<textarea name="practice" maxlength="1500" placeholder="¿Qué práctica concreta queremos reforzar?">'+safe(details.practice||'')+'</textarea></label>'+
  '<div class="grid"><label>Forma de reconocimiento<input name="format" maxlength="120" placeholder="Ej. entre pares, visibilización de práctica" value="'+safe(details.format||'')+'"></label>'+
  '<label>Evidencia del comportamiento<input name="evidence" maxlength="250" placeholder="¿Qué hecho verificable lo respalda?" value="'+safe(details.evidence||'')+'"></label></div>';
 return '<article class="hcx-mobilization-card"><div class="hcx-mobilization-card-head"><div>'+
  '<h3>'+safe(action.name||'Acción sin nombre')+'</h3><p class="muted">'+safe(action.owner||'Sin responsable')+
  ' · '+safe(action.status||'Pendiente')+'</p></div><button type="button" class="secondary" onclick="go(\'Intervenciones\')">Ver en Intervenciones ↗</button></div>'+
  '<details class="hcx-fold"><summary><span class="hcx-fold-titles"><strong>'+(communicator?'Preparar comunicación':'Preparar reconocimiento')+
  '</strong><small>'+((communicator?details.message:details.practice)?'Configuración registrada':'Configurar ejecución')+
  '</small></span><span class="hcx-fold-chevron">⌄</span></summary><div class="hcx-fold-content">'+
  '<form onsubmit="mobilizationSave(event,'+index+',\''+kind+'\')">'+fields+
  '<button type="submit" class="primary">Guardar preparación</button></form></div></details></article>';
}
function mobilizationSave(e,index,kind){
 e.preventDefault();
 const x=current(),action=x?.actions?.[index];
 if(!action||!['comunicacion','reconocimiento'].includes(kind)||!actionMechanisms(action).includes(kind))return;
 const values=Object.fromEntries(new FormData(e.target));
 const allowed=kind==='comunicacion'?['message','channel','audience']:['practice','format','evidence'];
 const clean=Object.fromEntries(allowed.map(k=>[k,String(values[k]||'').trim().slice(0,k==='message'||k==='practice'?1500:250)]));
 action.mechanismDetails=action.mechanismDetails||{};
 action.mechanismDetails[kind]={...clean,updatedAt:new Date().toISOString()};
 save();render();
}
function renderMovilizacionRefuerzo(x){
 const section=(kind,label,desc)=>{
  const actions=(x?.actions||[]).map((action,index)=>({action,index}))
   .filter(({action})=>actionMechanisms(action).includes(kind));
  return '<section class="hcx-mobilization-section"><div class="hcx-mobilization-title"><h2>'+label+
   '</h2><p class="muted">'+desc+'</p><small>'+actions.length+' acciones vinculadas</small></div>'+
   (actions.length?actions.map(({action,index})=>mobilizationActionCard(action,index,kind)).join(''):
   '<div class="hcx-lab-note">No hay acciones vinculadas. Selecciona este mecanismo al crear o editar una acción en Intervenciones.</div>')+
   '</section>';
 };
 return '<div class="hcx-mobilization">'+hcxHero('Movilización y refuerzo',x,
  'Activa y refuerza comportamientos con comunicaciones y reconocimiento vinculados a tus acciones.',
  'RDAIM · IMPLEMENTACIÓN','✧')+
  '<div class="hcx-mobilization-intro"><span>Una acción, varios mecanismos.</span> La creación y el seguimiento permanecen en Intervenciones.'+
  '<button type="button" class="secondary" onclick="go(\'Intervenciones\')">Gestionar acciones ↗</button></div>'+
  section('comunicacion','Comunicaciones','Diseña mensajes y define sus audiencias y canales.')+
  section('reconocimiento','Reconocimiento','Define qué comportamiento observable reconocer y con qué evidencia.')+
  '</div>';
}
