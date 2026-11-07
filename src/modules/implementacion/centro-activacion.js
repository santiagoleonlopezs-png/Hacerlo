/* HACERLO · Centro de Activación Conductual: secuenciación, comunicación y reconocimiento.
 * Cada paso pertenece a la acción original. Nunca enviar automáticamente al guardar. */
let cacActionIndex=null,cacStepId=null,cacEditorOpen=false,cacHistory=[],cacHistoryFor='',cacHistoryLoading=false,cacBusy=false,cacMessage='';
let cacAiBusy=false,cacAiSuggestion=null,cacAiNotice='';
let cacDeliveryStatus=null,cacDeliveryLoading=false,cacProviderNotice='';
const CAC_STAGES=[
 {id:'sentido',label:'Dar sentido',moment:'Antes',description:'Explica el para qué del cambio'},
 {id:'activar',label:'Activar',moment:'Durante',description:'Pide una acción observable y realizable'},
 {id:'recordar',label:'Recordar',moment:'Durante',description:'Refuerza la práctica en el momento oportuno'},
 {id:'sostener',label:'Reforzar',moment:'Después',description:'Reconoce o consolida lo aprendido'}
];
function cacSafe(value){return typeof safe==='function'?safe(String(value??'')):String(value??'');}
function cacActions(x){return (x?.actions||[]).map((action,index)=>({action,index})).filter(r=>r.action&&typeof r.action==='object');}
function cacEnsureMechanism(action,kind){
 const active=typeof actionMechanisms==='function'?actionMechanisms(action):[];
 if(!active.includes(kind))action.mechanisms=[...new Set([...active.filter(m=>m!=='ninguno'),kind])];
}
function cacAction(x){const items=cacActions(x);return items.find(r=>r.index===cacActionIndex)||items[0]||null;}
function cacSteps(action){return Array.isArray(action?.activationSequence)?action.activationSequence:[];}
function cacSequenceSteps(action){return cacSteps(action).filter(s=>!s.standalone);}
function cacDirectSteps(action){return cacSteps(action).filter(s=>s.standalone===true);}
function cacStep(row){if(!row)return null;const steps=cacSteps(row.action);return steps.find(s=>s.id===cacStepId)||steps[0]||null;}
function cacFormDate(iso){if(!iso)return '';const d=new Date(iso);if(Number.isNaN(+d))return '';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
function cacStage(s){return CAC_STAGES.find(a=>a.id===s)||CAC_STAGES[0];}
function cacStepLabel(step){return step.status==='scheduled'?'Programado':step.status==='sent'?'Aceptado para envío':step.status==='partial'?'Envío parcial':step.status==='unknown'?'Verificar estado':'Borrador';}
function cacEnsureNew(action,stage,kind){
 const name=String(action.name||'el cambio');
 const textMap={
  sentido:['El propósito del cambio','Estamos avanzando con «'+name+'». Queremos compartir el propósito y aclarar qué esperamos lograr con esta iniciativa.','Identifica qué cambiará en tu trabajo y qué dudas necesitas resolver.'],
  activar:['Llevemos el cambio a la práctica','Ahora necesitamos llevar «'+name+'» a una acción concreta y posible en el trabajo diario.','Explica qué acción realizar, cuándo y con qué apoyo.'],
  recordar:['Recordemos la práctica','Los cambios se sostienen con prácticas repetidas. Este recordatorio sobre «'+name+'» busca ayudarte cuando necesites actuar.','Recuerda el paso concreto que las personas deben realizar.'],
  sostener:['Reconozcamos los avances','Queremos hacer visibles las prácticas que contribuyen a «'+name+'». Reconocer hechos observables ayuda a reforzar lo que vale la pena repetir.','Destaca un comportamiento observado y su contribución.']
 };
 const t=textMap[stage]||textMap.sostener;
 return {id:crypto.randomUUID(),stage,kind,title:t[0],body:t[1],cta:t[2],
  audienceIds:[],scheduledFor:'',status:'draft',createdAt:new Date().toISOString()};
}
function cacBuildSequence(){
 const row=cacAction(current());if(!row||cacBusy||!cacKeepVisibleDraft())return;
 if(cacSequenceSteps(row.action).length)return;
 const before=actionMechanisms(row.action);
 if(!before.includes('comunicacion')&&!before.includes('reconocimiento'))cacEnsureMechanism(row.action,'comunicacion');
 const m=actionMechanisms(row.action),com=m.includes('comunicacion'),rec=m.includes('reconocimiento');
 const sequence=com?
  CAC_STAGES.map(s=>cacEnsureNew(row.action,s.id,s.id==='sostener'&&rec?'reconocimiento':'comunicacion')):
  [cacEnsureNew(row.action,'sostener','reconocimiento'),cacEnsureNew(row.action,'recordar','reconocimiento')];
 row.action.activationSequence=[...cacSteps(row.action),...sequence];
 cacStepId=sequence[0].id;cacEditorOpen=true;
 cacMessage='Secuencia creada. Personaliza cada mensaje, las audiencias y el momento. Guardar no envía.';
 save();render();
}
function cacStartDirect(kind){
 if(cacBusy||!cacKeepVisibleDraft())return;
 const row=cacAction(current());if(!row)return;
 if(!['comunicacion','reconocimiento'].includes(kind))return;
 cacEnsureMechanism(row.action,kind);
 const step=cacEnsureNew(row.action,kind==='comunicacion'?'activar':'sostener',kind);
 step.standalone=true;
 row.action.activationSequence=[...cacSteps(row.action),step];
 cacStepId=step.id;cacEditorOpen=true;
 cacMessage='Activación independiente creada. No necesitas una secuencia ni completar pasos anteriores.';
 save();render();
 document.getElementById('cac-editor')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function cacKeepVisibleDraft(){
 const row=cacAction(current()),step=cacStep(row),form=document.getElementById('cac-form');
 if(!cacEditorOpen||!row||!step||step.status!=='draft'||!form)return true;
 try{cacStoreDraft(row,step,cacDraft(form,step,row));return true;}
 catch(e){alert('Revisa la fecha de programación antes de salir del editor.');return false;}
}
function cacPrepareNavigation(target){
 if(typeof page==='undefined')return true;
 if(page==='Centro de activación'&&cacEditorOpen&&!cacKeepVisibleDraft())return false;
 if(target==='Centro de activación'){cacEditorOpen=false;cacStepId=null;}
 return true;
}
function cacBackToCenter(){
 if(cacBusy||!cacKeepVisibleDraft())return;
 cacEditorOpen=false;cacStepId=null;
 cacMessage='Volviste al Centro. El borrador se conservó sin enviarse.';
 render();
 document.querySelector?.('.cac-launch')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function cacChooseAction(index){
 if(cacBusy||!cacKeepVisibleDraft())return;
 cacActionIndex=Number(index);cacStepId=null;cacEditorOpen=false;cacMessage='';render();
}
function cacChooseStep(id){
 if(cacBusy||!cacKeepVisibleDraft())return;cacStepId=id;cacEditorOpen=true;cacMessage='';render();
 document.getElementById('cac-editor')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function cacAddStep(){
 if(cacBusy||!cacKeepVisibleDraft())return;const row=cacAction(current());if(!row)return;
 const kind=actionMechanisms(row.action).includes('comunicacion')?'comunicacion':'reconocimiento';
 const step=cacEnsureNew(row.action,'recordar',kind);
 row.action.activationSequence=[...cacSteps(row.action),step];cacStepId=step.id;cacEditorOpen=true;
 cacMessage='Paso adicional creado.';save();render();
}
function cacDeleteStep(){
 if(cacBusy)return;const row=cacAction(current()),step=cacStep(row);if(!row||!step)return;
 if(step.status!=='draft')return alert('No puedes eliminar un paso que ya fue enviado o programado.');
 if(!confirm('¿Eliminar este paso de la secuencia?'))return;
 row.action.activationSequence=cacSteps(row.action).filter(p=>p.id!==step.id);
 cacStepId=null;cacEditorOpen=false;cacMessage='Paso eliminado.';save();render();
}
function cacDraft(form,step,row){
 const d=Object.fromEntries(new FormData(form));
 const title=String(d.subject||'').trim().slice(0,140),body=String(d.message||'').trim().slice(0,2400);
 const cta=String(d.cta||'').trim().slice(0,450);
 const audienceIds=[...form.querySelectorAll('input[name="audience_ids"]:checked')].map(el=>el.value);
 const contactIds=[...form.querySelectorAll('input[name="contact_ids"]:checked')].map(el=>el.value);
 const manualEmail=String(d.manualEmail||'').trim().toLowerCase().slice(0,254);
 const manualName=String(d.manualName||'').trim().slice(0,120);
 const kind=String(d.kind||step.kind);
 const mechanisms=actionMechanisms(row.action);
 return {title,body,cta,audienceIds,contactIds,manualEmail,manualName,kind:mechanisms.includes(kind)?kind:step.kind,
  scheduledFor:d.scheduledFor?new Date(d.scheduledFor).toISOString():'',
  stage:String(d.stage||step.stage)};
}
function cacStoreDraft(row,step,draft){
 Object.assign(step,draft,{updatedAt:new Date().toISOString()});save();
}
function cacSaveStep(e){
 e?.preventDefault();if(cacBusy)return;
 const row=cacAction(current()),step=cacStep(row),form=document.getElementById('cac-form');if(!row||!step||!form)return;
 const draft=cacDraft(form,step,row);
 if(!draft.title||!draft.body)return alert('Escribe el asunto y el mensaje.');
 if(step.status!=='draft')return alert('Este paso ya fue enviado o programado. Crea otro paso para una nueva versión.');
 cacStoreDraft(row,step,draft);cacMessage='Borrador guardado. Puedes seleccionar destinatarios antes de activar el envío.';render();
}
function cacDuplicateForAudience(){
 if(cacBusy)return;
 const row=cacAction(current()),step=cacStep(row),form=document.getElementById('cac-form');
 if(!row||!step||!form)return;
 let draft;
 try{draft=cacDraft(form,step,row)}catch{return alert('Revisa la fecha antes de crear otra versión.');}
 if(!draft.title||!draft.body)return alert('Completa asunto y mensaje antes de crear otra versión.');
 if(!cacKeepVisibleDraft())return;
 const copy={...cacEnsureNew(row.action,draft.stage,draft.kind),...draft,
  id:crypto.randomUUID(),standalone:true,status:'draft',
  audienceIds:[],contactIds:[],manualEmail:'',manualName:'',scheduledFor:'',requestKey:'',logId:'',acceptedCount:0,failedCount:0,
  createdAt:new Date().toISOString()};
 row.action.activationSequence=[...cacSteps(row.action),copy];
 cacStepId=copy.id;cacEditorOpen=true;
 cacMessage='Versión creada sin destinatarios ni programación. Elige una persona, una audiencia o escribe otro correo.';
 save();render();
}
function cacFillTemplate(){
 const row=cacAction(current()),step=cacStep(row),form=document.getElementById('cac-form');if(!row||!step||!form)return;
 const draft=cacEnsureNew(row.action,step.stage,step.kind);
 form.elements.namedItem('subject').value=draft.title;
 form.elements.namedItem('message').value=draft.body;
 form.elements.namedItem('cta').value=draft.cta;
 cacPreview();
}
function cacPreview(){
 const form=document.getElementById('cac-form'),display=document.getElementById('cac-preview');if(!form||!display)return;
 const val=k=>String(form.elements.namedItem(k)?.value||'');
 const contact=form.querySelector('input[name="contact_ids"]:checked');
 const contactName=contact?(current().audiencePeople||[]).find(p=>String(p.id)===String(contact.value))?.name:'';
 const sampleName=val('manualName')||contactName||'{{nombre}}';
 const actionName=cacAction(current())?.action?.name||'';
 const personalize=s=>s.replace(/\{\{nombre\}\}/g,sampleName).replace(/\{\{intervencion\}\}/g,actionName);
 const esc=cacSafe;
 display.innerHTML='<div class="cac-preview-brand">✣ HACERLO <span>· ACTIVACIÓN CONDUCTUAL</span></div>'+
  '<h3>'+esc(personalize(val('subject')||'Asunto del correo'))+'</h3>'+
  '<div class="cac-preview-message">'+esc(personalize(val('message')||'Aquí aparecerá el contenido que recibirá el destinatario.')).replace(/\n/g,'<br>')+'</div>'+
  (val('cta')?'<p class="cac-preview-cta"><b>Acción esperada</b><br>'+esc(personalize(val('cta')))+'</p>':'')+
  '<small>La vista previa no envía mensajes.</small>';
}
// Copiloto opcional: propone asunto, mensaje y acción. Nunca activa un envío.
function cacAiSuggestionHtml(step){
 const data=cacAiSuggestion;
 if(!data||data.stepId!==step.id)return '';
 const p=data.proposal||{},s=data.sources||{};
 const sources=Number(s.hallazgos||0)+Number(s.factores||0);
 const detail=sources||Number(s.audiencias||0)||Number(s.comportamientos||0)
  ?'Contexto: '+Number(s.comportamientos||0)+' comportamiento(s), '+
   Number(s.audiencias||0)+' audiencia(s), '+Number(s.hallazgos||0)+' hallazgo(s) y '+
   Number(s.factores||0)+' factor(es).'
  :'Basado en la intervención registrada.';
 return '<div class="cac-ai-proposal-card">'+
  '<div class="cac-ai-proposal-kicker">✦ PROPUESTA EDITABLE</div>'+
  '<strong>'+cacSafe(p.subject||'')+'</strong>'+
  '<p class="cac-ai-proposal-message">'+cacSafe(p.message||'').replace(/\n/g,'<br>')+'</p>'+
  '<p class="cac-ai-proposal-cta"><b>Acción esperada:</b> '+cacSafe(p.cta||'')+'</p>'+
  (p.reason?'<p class="cac-ai-proposal-reason"><b>Por qué:</b> '+cacSafe(p.reason)+'</p>':'')+
  '<small>'+cacSafe(detail)+'</small>'+
  '<div class="cac-ai-proposal-actions"><button type="button" class="primary" onclick="cacAiApply()">Aplicar y ajustar</button>'+
  '<button type="button" class="secondary" onclick="cacAiDismiss()">Descartar</button></div></div>';
}
function cacAiRefresh(){
 const card=document.getElementById('cac-ai-suggestion');
 const step=cacStep(cacAction(current()));
 if(card&&step){
  card.innerHTML=cacAiSuggestionHtml(step);
  card.hidden=!card.innerHTML;
 }
 const status=document.getElementById('cac-ai-state');
 if(status)status.textContent=cacAiNotice;
 const button=document.getElementById('cac-ai-create');
 if(button){button.disabled=cacAiBusy;button.textContent=cacAiBusy?'Preparando propuesta…':'✦ Redactar con IA';}
}
async function cacAiSuggest(){
 if(cacAiBusy||cacBusy)return;
 const x=current(),row=cacAction(x),step=cacStep(row),form=document.getElementById('cac-form');
 if(!x||!row||!step||!form||step.status!=='draft')return;
 let draft;
 try{draft=cacDraft(form,step,row);}catch{return alert('Revisa la fecha de programación.');}
 cacAiBusy=true;cacAiSuggestion=null;cacAiNotice='Consultando intervención y diagnóstico para preparar un mensaje…';
 cacAiRefresh();
 const key=step.id;let timer;
 try{
  if(!cloudReady||!x._cloudId)throw Error('Primero inicia sesión y sincroniza esta iniciativa para usar la IA.');
  cacStoreDraft(row,step,draft);
  const saved=await confirmCloudSave();
  if(!saved?.ok)throw Error(saved?.message||'No se pudo sincronizar la iniciativa.');
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Debes iniciar sesión en HACERLO.');
  // El modelo recibe el grupo de la persona elegida, pero nunca su nombre o correo.
  const contextAudienceIds=new Set(draft.audienceIds);
  for(const p of x.audiencePeople||[]){
   if(draft.contactIds.includes(String(p.id))&&p.audienceId)contextAudienceIds.add(String(p.audienceId));
  }
  const controller=new AbortController();
  timer=setTimeout(()=>controller.abort(),80000);
  const res=await fetch(HACERLO_ENGINE_URL+'/api/ai/activation-message',{
   method:'POST',headers:{'Content-Type':'application/json',
    Authorization:'Bearer '+session.access_token,
    'X-Supabase-Apikey':SUPABASE_PUBLISHABLE_KEY},
   body:JSON.stringify({
    initiative_id:x._cloudId,action_index:row.index,
    kind:draft.kind,stage:draft.stage,audience_ids:[...contextAudienceIds].slice(0,20),
    // La IA propone desde el diagnóstico; el texto privado del borrador no sale del navegador.
    subject:'',message:'',cta:''
   }),signal:controller.signal
  });
  let response={};
  try{response=await res.json();}catch{}
  if(!res.ok||!response?.proposal){
   const reason=typeof response?.detail==='string'?response.detail:'El motor de IA no devolvió una propuesta.';
   throw Error(reason);
  }
  const p=response.proposal;
  if(typeof p.subject!=='string'||typeof p.message!=='string'||typeof p.cta!=='string')
   throw Error('La propuesta no contiene todos los campos.');
  // No cambiar la ficha si el usuario navegó durante la respuesta.
  if(current()!==x||!cacEditorOpen||cacStep(cacAction(x))?.id!==key)return;
  cacAiSuggestion={stepId:key,proposal:p,sources:response.sources||{}};
  cacAiNotice='Propuesta preparada. Revísala y aplícala solo si te sirve; nada se ha enviado.';
 }catch(err){
  if(current()===x&&cacStep(cacAction(x))?.id===key){
   cacAiNotice='No se generó el mensaje: '+
    (err?.name==='AbortError'?'la IA tardó demasiado.':(err?.message||'error desconocido'))+
    ' Tu borrador sigue disponible.';
  }
 }finally{
  if(timer)clearTimeout(timer);
  cacAiBusy=false;
  cacAiRefresh();
 }
}
function cacAiApply(){
 const row=cacAction(current()),step=cacStep(row),form=document.getElementById('cac-form');
 const proposal=cacAiSuggestion;
 if(!row||!step||!form||step.status!=='draft'||proposal?.stepId!==step.id)return;
 for(const [name,value] of [['subject',proposal.proposal.subject],
                            ['message',proposal.proposal.message],['cta',proposal.proposal.cta]]){
  const field=form.elements.namedItem(name);
  if(field)field.value=String(value||'');
 }
 try{cacStoreDraft(row,step,cacDraft(form,step,row));}
 catch{return alert('Revisa los campos antes de guardar.');}
 cacAiSuggestion=null;cacAiNotice='Propuesta aplicada al borrador. Puedes editarla libremente; no se envió ningún correo.';
 cacAiRefresh();cacPreview();
 form.elements.namedItem('message')?.focus?.();
}
function cacAiDismiss(){
 cacAiSuggestion=null;cacAiNotice='Propuesta descartada. Tu mensaje anterior no cambió.';
 cacAiRefresh();
}
function cacAudienceCount(x,id){
 const set=new Set(),add=v=>{const s=String(v||'').trim().toLowerCase();if(s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))set.add(s);};
 const a=(x.audiences||[]).find(v=>String(v.id)===String(id));if(a)add(a.email||a.correo);
 (x.audiencePeople||[]).filter(p=>String(p.audienceId)===String(id)).forEach(p=>add(p.email||p.correo));
 return set.size;
}
function cacAudienceOptions(x,step){
 const audiences=x.audiences||[];
 if(!audiences.length)return '<p class="cac-muted">Todavía no hay audiencias. Regístralas en Gestión de audiencias.</p>';
 return '<div class="cac-audience-grid">'+audiences.map(a=>{
  const n=cacAudienceCount(x,a.id),selected=(step.audienceIds||[]).some(id=>String(id)===String(a.id));
  return '<label class="cac-audience-option"><input type="checkbox" name="audience_ids" value="'+cacSafe(a.id)+'"'+(selected?' checked':'')+
   ' '+(step.status!=='draft'?'disabled':'')+'><span><b>'+cacSafe(a.name)+'</b><small>'+(n?n+' '+(n===1?'contacto con correo':'contactos con correo'):'Sin correos registrados')+'</small></span></label>';
 }).join('')+'</div>';
}
function cacContactOptions(x,step){
 const people=(x.audiencePeople||[]).filter(p=>p&&p.id&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email||p.correo||'').trim()));
 if(!people.length)return '<p class="cac-muted">No hay personas con correo registrado en esta iniciativa.</p>';
 const chosen=new Set((step.contactIds||[]).map(String)),open=people.some(p=>chosen.has(String(p.id)));
 const cards=people.map(p=>{
  const aud=(x.audiences||[]).find(a=>String(a.id)===String(p.audienceId));
  const description=String(p.email||p.correo||'').trim()+(aud?' · '+aud.name:'');
  return '<label class="cac-contact-item" data-cac-contact="'+cacSafe((p.name||'')+' '+description).toLocaleLowerCase('es')+'">'+
   '<input type="checkbox" name="contact_ids" value="'+cacSafe(p.id)+'"'+(chosen.has(String(p.id))?' checked':'')+
   (step.status!=='draft'?' disabled':'')+'><span><b>'+cacSafe(p.name||'Sin nombre')+'</b><small>'+cacSafe(description)+'</small></span></label>';
 }).join('');
 return '<details class="cac-recipient-details" '+(open?'open':'')+'>'+
  '<summary>Elegir personas registradas <small>'+people.length+' disponibles</small></summary>'+
  '<div class="cac-recipient-body"><input class="cac-contact-search" type="search" autocomplete="off"'+
  ' aria-label="Buscar personas registradas" placeholder="Buscar por nombre o correo" oninput="cacFilterContacts(this.value)">'+
  '<div class="cac-contact-list">'+cards+'</div></div></details>';
}
function cacFilterContacts(value){
 const term=String(value||'').trim().toLocaleLowerCase('es');
 document.querySelectorAll?.('.cac-contact-item[data-cac-contact]').forEach(el=>{
  el.hidden=!!term&&!el.dataset.cacContact.includes(term);
 });
}
async function cacFunctionCall(body){
 const {data,error}=await sb.functions.invoke('hacerlo-activation-email',{body});
 if(error){
  let msg=error.message||'No se pudo conectar con el servidor.';
  try{const detail=await error.context?.json();if(detail?.error)msg=detail.error;}catch{}
  throw new Error(msg);
 }
 if(data?.error)throw new Error(data.error);
 return data;
}
function cacDeliveryHtml(){
 if(!cloudReady)return '<div class="cac-delivery-copy"><strong>Conexión de envío</strong><p>Inicia sesión y selecciona una iniciativa para comprobar el correo.</p></div>';
 if(!cacDeliveryStatus)return '<div class="cac-delivery-copy"><strong>Conexión de envío</strong><p>Comprobando el servicio seguro de correos…</p></div>';
 const status=cacDeliveryStatus;
 const ready=status?.configured===true;
 const missing=Array.isArray(status?.missing)?status.missing:[];
 const hasSends=cacHistory.some(r=>Number(r.accepted_count||0)>0);
 const detail=ready
  ?(hasSends?'HACERLO ya envió comunicaciones. Aquí podrás consultar su entrega y detectar mensajes que necesitan atención.':'HACERLO está listo para enviar comunicaciones. Sus resultados aparecerán aquí después del primer envío.')
  :status?.unavailable?'No pudimos comprobar la conexión de correo. Puedes volver a intentarlo; los borradores se conservan.'
  :'El envío aún no está disponible. Una persona administradora debe completar la conexión del correo.';
 const tracking=ready?(status.tracking_configured===true
   ?'La conexión para recibir resultados está preparada. Confirma en Resend que los eventos de entrega y rebote estén activados.'
   :'Los resultados de entrega todavía no se actualizan automáticamente. Hay que conectar los avisos de Resend para conocer entregas y rebotes.') :'';
 return '<div class="cac-delivery-copy"><span class="cac-eyebrow">ESTADO DE LAS COMUNICACIONES</span>'+
  '<strong>'+(ready?(hasSends?'Envíos activos':'Listo para enviar'):'Envíos no disponibles')+'</strong>'+
  '<p>'+cacSafe(detail)+'</p>'+
  (tracking?'<p>'+cacSafe(tracking)+'</p>':'')+'</div>'+
  '<div class="cac-delivery-links"><button type="button" class="secondary" onclick="cacCheckDelivery(true)">Comprobar conexión</button>'+
  (!ready?'<a href="https://supabase.com/dashboard/project/mflakxgdkpuhemgslgsa/functions" target="_blank" rel="noopener noreferrer">Revisar conexión ↗</a>':
   '<a href="https://resend.com/webhooks" target="_blank" rel="noopener noreferrer">Conectar resultados automáticos ↗</a>')+
  '</div>'+
  (ready?'<details class="cac-webhook-help"><summary>Configuración avanzada del seguimiento</summary>'+
   '<p>En Resend registra una conexión de eventos (webhook) para entregas, rebotes, fallos, aperturas, clics y quejas. Dirección de HACERLO:</p>'+
   '<code>https://mflakxgdkpuhemgslgsa.supabase.co/functions/v1/hacerlo-resend-webhook</code>'+
   '<p>Guarda el secreto de firma de Resend (whsec_…) en Supabase → Edge Functions → Secrets como RESEND_WEBHOOK_SECRET. Nunca compartas ese valor. Las aperturas y clics son señales técnicas, no miden adopción; habilítalas solo si corresponden.</p></details>':'');
}
function cacDeliveryRefresh(){
 const el=document.getElementById('cac-delivery');
 if(el){
  el.innerHTML=cacDeliveryHtml();
  el.setAttribute('data-ready',String(cacDeliveryStatus?.configured===true));
 }
 cacRefreshSendConnection();
}
async function cacCheckDelivery(force=false){
 if(!cloudReady)return null;
 if(cacDeliveryLoading)return cacDeliveryStatus;
 if(cacDeliveryStatus&&!force)return cacDeliveryStatus;
 cacDeliveryLoading=true;
 try{
  const result=await cacFunctionCall({mode:'status'});
  cacDeliveryStatus=result;
 }catch(err){
  cacDeliveryStatus={configured:false,unavailable:true};
 }finally{cacDeliveryLoading=false;cacDeliveryRefresh();}
 return cacDeliveryStatus;
}
// Mostrar siempre el resultado junto al botón: el usuario no debe buscar errores
// al inicio de la pantalla o depender de ventanas emergentes del navegador.
function cacActionFeedback(message,tone='error'){
 cacMessage=String(message||'');
 const el=document.getElementById?.('cac-action-feedback');
 if(el){
  el.hidden=false;el.textContent=cacMessage;
  el.dataset.tone=tone;
  el.setAttribute?.('role',tone==='error'?'alert':'status');
  el.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 }
 const header=document.getElementById?.('cac-notice');
 if(header)header.textContent=cacMessage;
}
function cacSendConnectionHtml(){
 if(!cloudReady)return 'Para activar un envío, primero inicia sesión y sincroniza la iniciativa.';
 const status=cacDeliveryStatus;
 if(!status||status.unavailable)return '';
 if(status.configured)return '';
 const missing=Array.isArray(status.missing)?status.missing:[];
 return 'Envío detenido: falta '+(missing.length?missing.join(' y '):'configurar el correo')+
  ' en Supabase. Puedes seguir guardando borradores.';
}
function cacRefreshSendConnection(){
 const el=document.getElementById?.('cac-send-state');
 if(!el)return;
 const msg=cacSendConnectionHtml();
 el.hidden=!msg;
 el.textContent=msg;
 el.dataset.tone=cacDeliveryStatus?.configured===false?'warning':'info';
}
function cacActivationValidation(draft,authorized,connected,synced){
 if(!draft.title)return 'Completa el asunto en el paso 01 antes de activar.';
 if(!draft.body)return 'Completa el mensaje en el paso 01 antes de activar.';
 if(!draft.audienceIds.length&&!draft.contactIds.length&&!draft.manualEmail)
  return 'Selecciona al menos una audiencia, una persona o un correo individual en el paso 02.';
 if(draft.manualEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.manualEmail))
  return 'Revisa la dirección del correo individual en el paso 02.';
 if(!authorized)return 'Marca la autorización para contactar a los destinatarios antes de activar.';
 if(!connected||!synced)return 'Inicia sesión y sincroniza esta iniciativa para poder enviar.';
 if(draft.scheduledFor){
  const delta=new Date(draft.scheduledFor).getTime()-Date.now();
  if(!Number.isFinite(delta)||delta<600000||delta>30*86400000)
   return 'La programación debe estar entre 10 minutos y 30 días a partir de ahora.';
 }
 return '';
}
async function cacActivateStep(){
 if(cacBusy){cacActionFeedback('Ya se está verificando esta activación. No es necesario volver a pulsar.','info');return;}
 const x=current(),row=cacAction(x),step=cacStep(row),form=document.getElementById?.('cac-form');
 if(!row||!step||!form){
  cacActionFeedback('No se encontró el borrador actual. Vuelve al Centro y abre nuevamente la comunicación.');
  return;
 }
 if(step.status!=='draft'){
  cacActionFeedback('Esta comunicación ya se envió o programó. Puedes crear otra versión, pero no duplicar el envío.');
  return;
 }
 let draft;
 try{draft=cacDraft(form,step,row);}
 catch{
  cacActionFeedback('La fecha de programación no es válida. Revísala en las opciones de envío.');
  return;
 }
 const authorized=!!form.querySelector('input[name="authorized"]')?.checked;
 const issue=cacActivationValidation(draft,authorized,cloudReady,x?._cloudId);
 if(issue){
  cacActionFeedback(issue);
  return;
 }
 cacBusy=true;
 const sendBtn=document.getElementById?.('cac-send');
 if(sendBtn){sendBtn.disabled=true;sendBtn.textContent='Verificando antes de enviar…';}
 cacActionFeedback('Verificando la conexión y los destinatarios. Aún no se ha enviado ningún correo.','info');
 try{
  cacStoreDraft(row,step,draft);
  const config=await cacCheckDelivery(true);
  if(!config?.configured){
   const missing=Array.isArray(config?.missing)?config.missing:[];
   const detail=missing.length?missing.join(' y '):'la configuración de Resend';
   throw Error('No se puede enviar todavía: falta '+detail+
    ' en Supabase → Edge Functions → Secrets. Tu borrador está guardado; no se envió ningún correo.');
  }
  cacActionFeedback('Conexión verificada. Comprobando destinatarios en el servidor…','info');
  const saved=await confirmCloudSave();
  if(!saved?.ok)throw Error(saved?.message||'No fue posible guardar el borrador en Supabase.');
  const payload={
   initiative_id:x._cloudId,action_index:row.index,kind:draft.kind,audience_ids:draft.audienceIds,
   contact_ids:draft.contactIds,manual_email:draft.manualEmail,manual_name:draft.manualName,
   subject:draft.title,message:draft.body,cta:draft.cta,sequence_step:draft.stage,sequence_id:step.id,
   scheduled_for:draft.scheduledFor||''
  };
  const preview=await cacFunctionCall({...payload,mode:'preview'});
  const n=Number(preview.recipient_count||0);
  if(!Number.isSafeInteger(n)||n<1)throw Error('No se encontraron destinatarios válidos. Comprueba sus correos.');
  const names=[...(preview.contacts||[]),...(preview.audiences||[]),
    ...(preview.manual_count?['Correo individual: '+draft.manualEmail]:[])].join(', ');
  const countNote=document.getElementById?.('cac-recipient-check');
  if(countNote)countNote.textContent=n+' correo(s) único(s) validados · '+names;
  const scheduled=draft.scheduledFor?new Date(draft.scheduledFor):null;
  const confirmation='Intervención: '+row.action.name+'\nPropósito: '+cacStage(draft.stage).label+
   '\nDestinatarios: '+names+'\nDirecciones únicas: '+n+'\n'+
   (scheduled?'Programación: '+scheduled.toLocaleString('es-CO'):'Envío: ahora')+
   '\n\n¿Confirmas el envío de este mensaje desde HACERLO?';
  cacActionFeedback('Se validaron '+n+' destinatario(s). Falta tu confirmación para activar.','info');
  if(!confirm(confirmation)){
   cacActionFeedback('Activación cancelada. No se envió ningún correo y tu borrador se conservó.','info');
   return;
  }
  if(sendBtn)sendBtn.textContent=scheduled?'Programando en Resend…':'Enviando…';
  cacActionFeedback('Confirmación recibida. Procesando el envío en Resend…','info');
  // El identificador evita reintentos duplicados ante una respuesta incierta.
  const key=step.requestKey||crypto.randomUUID();
  step.requestKey=key;save();
  const result=await cacFunctionCall({...payload,mode:'send',request_key:key,expected_count:n,consent_attested:true});
  step.status=result.status==='scheduled'?'scheduled':result.status==='partial'?'partial':'sent';
  step.logId=result.log_id||'';
  step.acceptedCount=result.accepted_count||0;
  step.failedCount=result.failed_count||0;
  step.activatedAt=new Date().toISOString();
  cacActionFeedback(step.status==='scheduled'?
   'Solicitud programada en Resend. Consulta Seguimiento para confirmar su entrega.':
   'Solicitud aceptada por Resend. Puedes consultar el estado de entrega en Seguimiento.','success');
  save();void cacLoadHistory(true);render();
 }catch(err){
  const reason=err?.message||'Ocurrió un error desconocido.';
  const couldHaveSent=!!step.requestKey;
  cacActionFeedback('No se completó la activación: '+reason+
   (couldHaveSent?' Consulta el historial antes de reintentar para evitar duplicados.':
    ' El borrador se conserva; no se efectuó ningún envío.'),'error');
 }finally{
  cacBusy=false;
  const button=document.getElementById?.('cac-send');
  if(button){button.disabled=false;button.textContent='Revisar destinatarios y activar';}
 }
}
function cacHistoryHtml(){
 if(!cacHistory.length)return '<p class="cac-muted">Aún no hay envíos registrados para esta iniciativa.</p>';
 const labels={sent:'Aceptado por Resend',scheduled:'Programado',partial:'Parcial',failed:'Error',processing:'En proceso'};
 return (typeof cacHistoryMetricsHTML==='function'?cacHistoryMetricsHTML(cacHistory):'')+
  '<div class="cac-history-list">'+cacHistory.map(r=>
  '<div class="cac-history-row"><div><strong>'+cacSafe(r.subject||'Comunicación')+'</strong><small>'+
   cacSafe(new Date(r.submitted_at).toLocaleString('es-CO'))+' · '+cacSafe(r.sequence_step?cacStage(r.sequence_step).label:(r.kind==='reconocimiento'?'Reconocimiento':'Comunicación'))+
   '</small></div><span class="cac-state">'+cacSafe(labels[r.status]||r.status)+'</span><span>'+Number(r.accepted_count||0)+'/'+Number(r.recipient_count||0)+' aceptados'+
   (r.scheduled_for?' · '+cacSafe(new Date(r.scheduled_for).toLocaleString('es-CO')):'')+'</span>'+
   (typeof cacHistoryEventFields==='function'?cacHistoryEventFields(r):'')+'</div>'
 ).join('')+'</div>';
}
// Conciliación manual: GET a Resend para los últimos estados, sin enviar correos.
// Consultar el último estado del proveedor, sin reenviar el mensaje.
async function cacRefreshDeliveryHistory(){
 const x=current();
 if(!cloudReady||!x?._cloudId||cacHistoryLoading)return;
 const btn=document.getElementById('cac-history-refresh');
 if(btn){btn.disabled=true;btn.textContent='Comprobando…';}
 const note=document.getElementById('cac-provider-status');
 const show=msg=>{
  cacProviderNotice=msg;
  if(note){note.hidden=false;note.textContent=msg;}
 };
 show('Consultando el estado de los correos anteriores. Esto no enviará ningún mensaje nuevo.');
 try{
  const result=await cacFunctionCall({mode:'refresh',initiative_id:x._cloudId});
  if(current()?._cloudId!==x._cloudId)return;
  const checked=Number(result?.checked||0),issues=Number(result?.errors||0);
  const denied=Number(result?.permission_denied||0);
  const states=result?.statuses||{};
  const delivered=Number(states.delivered||0)+Number(states.opened||0)+Number(states.clicked||0);
  const waiting=Number(states.sent||0)+Number(states.queued||0)+Number(states.scheduled||0);
  const blocked=Number(states.bounced||0)+Number(states.failed||0)+Number(states.suppressed||0);
  const delayed=Number(states.delivery_delayed||0);
  let message='';
  if(denied){
   message='Los mensajes se enviaron, pero esta conexión no permite consultar su resultado directamente. Para ver entregas y rebotes en HACERLO, activa los resultados automáticos en Resend. Puedes comprobar el detalle en Resend → Emails; no se enviaron mensajes nuevos.';
  }else if(issues&&!checked){
   message='No fue posible consultar el estado del proveedor. Comprueba el historial en Resend → Emails. No se ha enviado otro correo.';
  }else if(blocked){
   message='Resend registra '+blocked+' correo(s) con rechazo, supresión o error. Consulta el detalle en Resend → Emails antes de corregir o reintentar.';
  }else if(delayed){
   message='Resend indica '+delayed+' correo(s) con entrega retrasada. El proveedor puede reintentar; no lo envíes de nuevo todavía.';
  }else if(delivered){
   message='Resend confirma '+delivered+' entrega(s) o interacciones posteriores. Si no aparece en tu bandeja, revisa Spam, No deseado y cuarentena.';
  }else if(waiting){
   message='Resend informa '+waiting+' correo(s) enviados o en cola, pero aún no confirma entrega. Consulta los eventos en Resend → Emails.';
  }else if(!checked&&cacHistory.length){
   message='No hubo correos pendientes de una nueva consulta (o se revisaron hace menos de un minuto). La entrega no se puede dar por confirmada.';
  }else{
   message='Se consultaron '+checked+' correo(s). No hay una entrega confirmada todavía. Consulta Resend → Emails para ver su línea de tiempo.';
  }
  if(issues&&!denied)message+=' Algunas consultas no se completaron ('+issues+').';
  show(message);
  await cacLoadHistory(true);
 }catch(err){
  if(current()?._cloudId===x._cloudId){
   show('No se pudo consultar Resend: '+(err?.message||'Error desconocido')+
    '. La consulta no envió correos. Comprueba el mensaje en Resend → Emails.');
  }
 }finally{
  const button=document.getElementById('cac-history-refresh');
  if(button){button.disabled=false;button.textContent='Comprobar estados';}
 }
}
async function cacLoadHistory(force=false){
 const x=current();if(!x?._cloudId||!cloudReady)return;
 if(cacHistoryLoading||(!force&&cacHistoryFor===x._cloudId))return;
 cacHistoryFor=x._cloudId;cacHistoryLoading=true;
 try{
  const {data,error}=await sb.from('activation_sends')
   .select('id,subject,kind,status,recipient_count,accepted_count,failed_count,submitted_at,scheduled_for,sequence_step,delivered_count,opened_count,clicked_count,bounced_count,complained_count,suppressed_count,failed_delivery_count,delayed_count,event_updated_at,delivery_check_at,delivery_check_result')
   .eq('initiative_id',x._cloudId).order('submitted_at',{ascending:false}).limit(30);
  if(error)throw error;
  if(current()?._cloudId===x._cloudId)cacHistory=data||[];
 }catch(err){if(current()?._cloudId===x._cloudId)cacMessage='No se pudo consultar el historial: '+(err?.message||'');}
 finally{
  cacHistoryLoading=false;
  if(current()?._cloudId!==x._cloudId){
   cacHistory=[];cacHistoryFor='';
   if(current()?._cloudId)void cacLoadHistory();
  }else{
   const target=document.getElementById('cac-history');
   if(target)target.innerHTML=cacHistoryHtml();
  }
 }
}
function cacStepEditor(x,row,step){
 const immutable=step.status!=='draft',mech=actionMechanisms(row.action);
 const options=mech.filter(v=>v==='comunicacion'||v==='reconocimiento');
 const field=(label,html)=>'<label class="cac-field"><span>'+label+'</span>'+html+'</label>';
 const select=(name,entries,value)=>'<select name="'+name+'" '+(immutable?'disabled':'')+'>'+entries.map(z=>
  '<option value="'+cacSafe(z[0])+'"'+(String(z[0])===String(value)?' selected':'')+'>'+cacSafe(z[1])+'</option>').join('')+'</select>';
 const audienceOptions=cacAudienceOptions(x,step);
 const selectedCount=(step.audienceIds||[]).length+(step.contactIds||[]).length+(step.manualEmail?1:0);
 const scheduleLabel=step.scheduledFor?'Programado para '+cacSafe(new Date(step.scheduledFor).toLocaleString('es-CO')):'Envío inmediato';
 return '<section id="cac-editor" class="cac-editor cac-editor-focused">'+
  '<div class="cac-editor-back"><button type="button" class="secondary" onclick="cacBackToCenter()">← Volver al Centro</button>'+
  '<span>Tu borrador se conserva al regresar.</span></div>'+
  '<div class="cac-heading cac-compose-heading"><div><small>'+(step.standalone?'MENSAJE INDEPENDIENTE':'SECUENCIA OPCIONAL · PASO '+(cacSequenceSteps(row.action).indexOf(step)+1))+
  '</small><h3>'+(step.kind==='reconocimiento'?'Preparar reconocimiento':'Preparar comunicación')+'</h3>'+
  '<p>Redacta un mensaje claro. Nada se enviará sin tu confirmación.</p></div>'+
  (immutable?'<span class="cac-pill">'+cacSafe(cacStepLabel(step))+'</span>':
   '<button type="button" class="secondary cac-editor-remove" onclick="cacDeleteStep()">Eliminar borrador</button>')+'</div>'+
  '<div class="cac-compose-guide" aria-label="Pasos para activar">'+
  '<span><b>1</b> Mensaje</span><span><b>2</b> Destinatarios</span><span><b>3</b> Confirmación</span></div>'+
  '<div class="cac-compose-grid"><form id="cac-form" onsubmit="cacSaveStep(event)" oninput="cacPreview()">'+
  '<section class="cac-form-block cac-message-block"><div class="cac-form-block-heading">'+
   '<span class="cac-step-kicker">01 · CONTENIDO</span><h4>¿Qué necesitas comunicar?</h4>'+
   '<p>Una idea concreta y una acción que las personas puedan realizar.</p></div>'+
   (immutable?'':'<div class="cac-ai-assist"><div><strong>✦ Crear una propuesta con IA</strong>'+
    '<small>Considera la intervención y el diagnóstico. Puedes editar todo.</small></div>'+
    '<button id="cac-ai-create" type="button" class="secondary" onclick="cacAiSuggest()">✦ Redactar con IA</button></div>'+
    '<p class="cac-ai-state" id="cac-ai-state" role="status">'+cacSafe(cacAiNotice)+'</p>'+
    '<div id="cac-ai-suggestion" class="cac-ai-suggestion" '+(cacAiSuggestion?.stepId===step.id?'':'hidden')+'>'+cacAiSuggestionHtml(step)+'</div>')+
   field('Asunto','<input type="text" name="subject" maxlength="140" required '+(immutable?'readonly':'')+
    ' value="'+cacSafe(step.title||'')+'" placeholder="¿Qué deben entender o hacer?">')+
   field('Mensaje','<textarea name="message" maxlength="2400" rows="6" required '+(immutable?'readonly':'')+
    ' placeholder="Un mensaje sencillo, directo y útil.">'+cacSafe(step.body||'')+'</textarea>')+
   field('Acción esperada o refuerzo','<textarea name="cta" maxlength="450" rows="2" '+(immutable?'readonly':'')+'>'+cacSafe(step.cta||'')+'</textarea>')+
  '</section>'+
  '<section class="cac-form-block cac-recipients-block"><div class="cac-form-block-heading">'+
   '<span class="cac-step-kicker">02 · DESTINATARIOS</span><h4>¿A quién va dirigido?</h4>'+
   '<p>Puedes elegir una persona, una audiencia o combinar ambas opciones.</p></div>'+
   '<div class="cac-target-chooser"><div class="cac-target-direct"><span class="cac-target-label">✉ Correo individual</span>'+
   '<div class="cac-two">'+
    field('Dirección de correo','<input type="email" name="manualEmail" maxlength="254" value="'+cacSafe(step.manualEmail||'')+
     '" placeholder="persona@empresa.com"'+(immutable?' readonly':'')+'>')+
    field('Nombre (opcional)','<input type="text" name="manualName" maxlength="120" value="'+cacSafe(step.manualName||'')+
     '" placeholder="Nombre del destinatario"'+(immutable?' readonly':'')+'>')+
   '</div></div>'+
   '<div class="cac-audience-picker">'+
    '<details class="cac-recipient-details" '+((step.audienceIds||[]).length?'open':'')+'>'+
    '<summary>Enviar a audiencias completas <small>'+Number((x.audiences||[]).length)+' disponibles</small></summary>'+
    '<div class="cac-recipient-body"><div class="cac-audience-field"><div class="cac-audience-grid">'+
     audienceOptions.replace(/^<div class="cac-audience-grid">/,'').replace(/<\/div>$/,'')+
    '</div></div></div></details>'+
    cacContactOptions(x,step)+'</div>'+
   '<p class="cac-inline-help">'+(selectedCount?selectedCount+' selección(es) configurada(s). ':'')+
    'HACERLO verificará correos únicos antes del envío. Hasta 40 personas por activación.</p>'+
   '</div></section>'+
   '<details class="cac-editor-more" '+(step.scheduledFor?'open':'')+'>'+
    '<summary><span><strong>Personalizar momento y tipo de activación</strong><small>Opcional · '+scheduleLabel+'</small></span><span aria-hidden="true">⌄</span></summary>'+
    '<div class="cac-editor-more-fields"><div class="cac-two">'+
      field('Propósito',select('stage',CAC_STAGES.map(z=>[z.id,z.label]),step.stage))+
      field('Mecanismo',select('kind',options.map(v=>[v,v==='reconocimiento'?'Reconocimiento':'Comunicación']),step.kind))+
    '</div>'+
    field('Fecha y hora del envío (opcional)','<input type="datetime-local" name="scheduledFor" '+(immutable?'readonly':'')+
      ' value="'+cacSafe(cacFormDate(step.scheduledFor))+'">')+
    '<p class="cac-inline-help">Sin fecha se envía ahora; con fecha se programa entre 10 minutos y 30 días antes. Usa {{nombre}} y {{intervencion}} para personalizar.</p></div>'+
   '</details>'+
   (immutable?'':'<div class="cac-confirm-block"><div class="cac-confirm-heading"><span class="cac-step-kicker">03 · REVISIÓN</span>'+
    '<h4>Revisa y decide</h4><p>Guardar un borrador nunca envía un correo.</p></div>'+
    '<label class="cac-check"><input type="checkbox" name="authorized"><span>Confirmo que tengo autorización para contactar a los destinatarios.</span></label>'+
    '<p id="cac-send-state" class="cac-send-state" role="status" '+(cacSendConnectionHtml()?'':'hidden')+'>'+cacSafe(cacSendConnectionHtml())+'</p>'+
    '<div class="cac-actions"><button class="secondary" type="submit">Guardar borrador</button>'+
     '<button class="secondary" type="button" onclick="cacDuplicateForAudience()">Versión para otro destinatario</button>'+
     '<button class="primary" type="button" id="cac-send" onclick="cacActivateStep()">Revisar destinatarios y activar</button></div>'+
    '<p id="cac-action-feedback" class="cac-action-feedback" role="status" aria-live="polite" hidden></p></div>')+
   '<p class="cac-inline-help" id="cac-recipient-check">La verificación de destinatarios se realiza al activar.</p>'+
   '</form><aside class="cac-preview-panel"><div class="cac-preview-top">VISTA PREVIA · ASÍ RECIBIRÁN EL CORREO</div>'+
   '<div class="cac-preview-paper" id="cac-preview"><div class="cac-preview-brand">✣ HACERLO <span>· ACTIVACIÓN CONDUCTUAL</span></div>'+
    '<h3>'+cacSafe(step.title||'Asunto del correo')+'</h3>'+
    '<div class="cac-preview-message">'+cacSafe(step.body||'Aquí aparecerá el mensaje.').replace(/\n/g,'<br>')+'</div>'+
    (step.cta?'<p class="cac-preview-cta"><b>Acción esperada</b><br>'+cacSafe(step.cta)+'</p>':'')+'</div>'+
   '<div class="cac-preview-check"><b>Chequeo conductual</b><p>¿Queda claro qué hacer, cuándo y por qué importa?</p></div>'+
   '</aside></div></section>';
}

// Al abrir una sección secundaria, plegar las otras para reducir la carga visual.
function cacFoldToggle(el){
 if(!el?.open)return;
 const root=el.closest?.('.cac-home');
 root?.querySelectorAll?.(':scope > details.cac-simple-fold, :scope > details.cac-extra-tools, :scope > details.cac-technical')
  ?.forEach(d=>{if(d!==el)d.open=false});
}
function renderCentroActivacion(x){
 const rows=cacActions(x),row=cacAction(x),
  sequence=row?cacSequenceSteps(row.action):[],direct=row?cacDirectSteps(row.action):[],step=cacStep(row);
 if(x?._cloudId&&cacHistoryFor!==x._cloudId){
  cacHistory=[];cacHistoryFor='';
  if(!cacHistoryLoading)void cacLoadHistory();
 }
 if(cloudReady&&!cacDeliveryStatus&&!cacDeliveryLoading)void cacCheckDelivery();
 const editing=!!(cacEditorOpen&&step&&row);
 let content='';
 if(!rows.length){
  content='<section class="cac-empty"><div class="cac-empty-symbol" aria-hidden="true">✧</div>'+
   '<div class="cac-empty-copy"><span class="cac-eyebrow">EMPIEZA POR UNA INTERVENCIÓN</span>'+
   '<h3>Activa un comportamiento desde una acción existente</h3>'+
   '<p>Primero define una intervención; después podrás comunicar, reconocer o reforzar sin configurar un recorrido obligatorio.</p></div>'+
   '<button class="secondary" type="button" onclick="go(\'Intervenciones\')">Ver intervenciones ↗</button></section>';
 }else{
  const action=row.action,allSteps=cacSteps(action),drafts=allSteps.filter(s=>s.status==='draft').length;
  const sent=allSteps.filter(s=>['sent','partial','scheduled'].includes(s.status)).length;
  const chooser='<section class="cac-launch"><div class="cac-launch-main"><div class="cac-launch-copy">'+
   '<span class="cac-eyebrow">COMUNICACIONES Y REFUERZOS</span>'+
   '<h3>'+(editing?'Estás preparando una activación':'¿Qué quieres activar hoy?')+'</h3>'+
   '<p>'+(editing?'Completa tu mensaje y revisa a quién va dirigido.':'Elige una intervención y prepara un mensaje útil para su audiencia.')+'</p></div>'+
   '<label class="cac-launch-choose">¿Qué intervención quieres activar?'+
    '<select onchange="cacChooseAction(this.value)" aria-label="Intervención de origen">'+
    rows.map(r=>'<option value="'+r.index+'"'+(row.index===r.index?' selected':'')+'>'+cacSafe(r.action.name||'Acción')+'</option>').join('')+
    '</select></label></div>'+
   (!editing?'<div class="cac-launch-bottom"><div class="cac-launch-actions">'+
    '<button class="primary cac-launch-primary" type="button" onclick="cacStartDirect(\'comunicacion\')">✉ Nueva comunicación</button>'+
    '<button class="secondary" type="button" onclick="cacStartDirect(\'reconocimiento\')">✧ Nuevo reconocimiento</button>'+
    (!sequence.length?'<details class="cac-action-menu"><summary>Más opciones <span aria-hidden="true">⌄</span></summary>'+
     '<div><button type="button" class="secondary" onclick="cacBuildSequence()">＋ Crear secuencia opcional</button></div></details>':'')+
    '</div><div class="cac-launch-counts"><span>'+drafts+' '+(drafts===1?'borrador':'borradores')+'</span>'+
     '<span aria-hidden="true">·</span><span>'+sent+' '+(sent===1?'activación registrada':'activaciones registradas')+'</span></div></div>':'')+
   '</section>';
  let directSection='';
  if(direct.length){
   // Comunicación antes que reconocimiento; dentro de cada tipo, más recientes primero.
   const sorted=direct.slice().reverse().sort((a,b)=>Number(a.kind!=='comunicacion')-Number(b.kind!=='comunicacion'));
   const cards=items=>items.map(s=>
    '<button class="cac-direct-item'+(step?.id===s.id?' is-active':'')+'" type="button" onclick="cacChooseStep(\''+cacSafe(s.id)+'\')">'+
    '<span>'+cacSafe(s.kind==='reconocimiento'?'✧ Reconocimiento':'✉ Comunicación')+'</span>'+
    '<strong>'+cacSafe(s.title||'Sin asunto')+'</strong>'+
    '<small>'+cacSafe(cacStepLabel(s))+(s.scheduledFor?' · '+cacSafe(new Date(s.scheduledFor).toLocaleDateString('es-CO')):'')+'</small></button>'
   ).join('');
   directSection='<section class="cac-simple-list"><div class="cac-simple-head"><div><span class="cac-eyebrow">TU ACTIVIDAD</span>'+
    '<h3>Comunicaciones y reconocimientos</h3><p>Selecciona una tarjeta para continuar o consultar su estado.</p></div>'+
    '<span class="cac-list-count">'+direct.length+'</span></div>'+
    '<div class="cac-direct-list">'+cards(sorted.slice(0,4))+'</div>'+
    (sorted.length>4?'<details class="cac-archive"><summary>Ver '+(sorted.length-4)+' más <span aria-hidden="true">⌄</span></summary>'+
     '<div class="cac-direct-list">'+cards(sorted.slice(4))+'</div></details>':'')+
    '</section>';
  }
  let sequenceSection='';
  if(sequence.length){
   sequenceSection='<details class="cac-sequence cac-simple-fold" ontoggle="cacFoldToggle(this)"><summary><span class="cac-fold-mark">◇</span>'+
    '<span class="cac-fold-copy"><strong>Secuencia opcional</strong><small>'+sequence.length+
     ' pasos · Puedes activar cualquiera sin completar los demás</small></span><span class="cac-fold-chevron" aria-hidden="true">⌄</span></summary>'+
    '<div class="cac-fold-content"><div class="cac-fold-actions"><button class="secondary" type="button" onclick="cacAddStep()">＋ Añadir paso</button></div>'+
    '<div class="cac-timeline">'+sequence.map((s,i)=>
     '<button type="button" onclick="cacChooseStep(\''+cacSafe(s.id)+'\')" class="cac-step'+(step?.id===s.id?' is-active':'')+'">'+
     '<span class="cac-step-number">'+String(i+1).padStart(2,'0')+'</span>'+
     '<span class="cac-step-meta"><small>'+cacSafe(cacStage(s.stage).moment.toUpperCase())+'</small>'+
     '<strong>'+cacSafe(cacStage(s.stage).label)+'</strong>'+
     '<em>'+cacSafe(cacStepLabel(s))+(s.scheduledFor?' · '+cacSafe(new Date(s.scheduledFor).toLocaleDateString('es-CO')):'')+'</em></span></button>'
    ).join('')+'</div></div></details>';
  }
  const signal=typeof cacSignalPanel==='function'?cacSignalPanel(x,row):'';
  const journeys=typeof cacJourneysHTML==='function'?cacJourneysHTML(x,row):'';
  const more='<details class="cac-extra-tools" ontoggle="cacFoldToggle(this)"><summary><span class="cac-fold-mark">✧</span>'+
    '<span class="cac-fold-copy"><strong>Personalización y refuerzos inteligentes</strong>'+
    '<small>Recomendaciones basadas en evidencia y recorridos por audiencia</small></span>'+
    '<span class="cac-fold-chevron" aria-hidden="true">⌄</span></summary>'+
    '<div class="cac-extra-content">'+signal+journeys+'</div></details>';
  content=editing?chooser+cacStepEditor(x,row,step):
   chooser+directSection+sequenceSection+more;
 }
 const title=typeof hcxHero==='function'?hcxHero('Centro de Activación Conductual',x,
  'Comunica, reconoce y refuerza comportamientos desde cada intervención.',
  'RDAIM · IMPLEMENTACIÓN','✧'):'<h2>Centro de Activación Conductual</h2>';
 const technical='<details class="cac-technical" ontoggle="cacFoldToggle(this)"><summary><span class="cac-fold-mark">◷</span>'+
  '<span class="cac-fold-copy"><strong>Resultados de las comunicaciones</strong>'+
  '<small>Conoce qué se envió, qué llegó y qué necesita atención</small></span>'+
  '<span class="cac-fold-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="cac-technical-content">'+
  '<section class="cac-delivery" id="cac-delivery" data-ready="'+String(cacDeliveryStatus?.configured===true)+'">'+cacDeliveryHtml()+'</section>'+
  '<section class="cac-history"><div class="cac-heading"><div><small>ESTADO DE LOS MENSAJES</small>'+
   '<h3>Envíos y entregas</h3><p>Revisa las entregas confirmadas, los rechazos y los resultados que todavía no se han podido comprobar. Abrir un correo no significa adoptar un comportamiento.</p></div>'+
   '<button class="secondary" type="button" id="cac-history-refresh" onclick="cacRefreshDeliveryHistory()">Comprobar estados</button></div>'+
   '<p class="cac-provider-status" id="cac-provider-status" role="status" aria-live="polite" '+(cacProviderNotice?'':'hidden')+'>'+cacSafe(cacProviderNotice)+'</p>'+
   '<div class="cac-provider-links"><a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer">Consultar correos en Resend ↗</a>'+
   '<small>«Aceptado» significa que se recibió la solicitud de envío, no que el correo haya llegado.</small></div>'+
   '<div id="cac-history">'+cacHistoryHtml()+'</div></section>'+
  '<section class="cac-behavior-metrics"><div><span class="cac-eyebrow">RESULTADOS CONDUCTUALES</span>'+
   '<h3>Indicadores de cambio en HACERLO</h3>'+
   '<p>Esta iniciativa tiene <b>'+Number((x.indicators||[]).length)+'</b> indicadores. Consulta su evolución en Resultados o Medición; no los confundas con las métricas de correo.</p></div>'+
   '<div class="cac-metric-links"><button type="button" class="secondary" onclick="go(\'Indicadores\')">Ver indicadores</button>'+
   '<button type="button" class="secondary" onclick="go(\'Analítica\')">Ir a Analítica</button></div></section>'+
  '</div></details>';
 return '<div class="cac-home cac-home-streamlined">'+title+
  '<p class="cac-notice" id="cac-notice" role="status" aria-live="polite">'+cacSafe(cacMessage)+'</p>'+
  content+technical+
  '<p class="cac-disclaimer">Los envíos siempre requieren revisión, destinatarios autorizados y confirmación. Las recomendaciones no envían correos automáticamente.</p></div>';
}
