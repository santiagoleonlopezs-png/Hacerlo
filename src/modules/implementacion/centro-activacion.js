/* HACERLO · Centro de Activación Conductual: secuenciación, comunicación y reconocimiento.
 * Cada paso pertenece a la acción original. Nunca enviar automáticamente al guardar. */
let cacActionIndex=null,cacStepId=null,cacEditorOpen=false,cacHistory=[],cacHistoryFor='',cacHistoryLoading=false,cacBusy=false,cacMessage='';
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
 const row=cacAction(current());if(!row||cacBusy)return;
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
 if(cacBusy)return;
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
function cacBackToCenter(){
 if(cacBusy||!cacKeepVisibleDraft())return;
 cacEditorOpen=false;cacStepId=null;
 cacMessage='Volviste al Centro. El borrador se conservó sin enviarse.';
 render();
 document.querySelector?.('.cac-control')?.scrollIntoView?.({behavior:'smooth',block:'start'});
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
 if(cacBusy)return;const row=cacAction(current());if(!row)return;
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
 const kind=String(d.kind||step.kind);
 const mechanisms=actionMechanisms(row.action);
 return {title,body,cta,audienceIds,kind:mechanisms.includes(kind)?kind:step.kind,
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
 cacStoreDraft(row,step,draft);cacMessage='Borrador guardado. Puedes seleccionar las audiencias antes de activar el envío.';render();
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
  audienceIds:[],scheduledFor:'',requestKey:'',logId:'',acceptedCount:0,failedCount:0,
  createdAt:new Date().toISOString()};
 row.action.activationSequence=[...cacSteps(row.action),copy];
 cacStepId=copy.id;cacEditorOpen=true;
 cacMessage='Se creó otra versión sin destinatarios ni programación. Elige otra audiencia y adapta el mensaje.';
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
 const esc=cacSafe;
 display.innerHTML='<div class="cac-preview-brand">✣ HACERLO <span>· ACTIVACIÓN CONDUCTUAL</span></div>'+
  '<h3>'+esc(val('subject')||'Asunto del correo')+'</h3>'+
  '<div class="cac-preview-message">'+esc(val('message')||'Aquí aparecerá el contenido que recibirá la audiencia.').replace(/\n/g,'<br>')+'</div>'+
  (val('cta')?'<p class="cac-preview-cta"><b>Acción esperada</b><br>'+esc(val('cta'))+'</p>':'')+
  '<small>La vista previa no envía mensajes.</small>';
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
async function cacActivateStep(){
 if(cacBusy)return;
 const x=current(),row=cacAction(x),step=cacStep(row),form=document.getElementById('cac-form');
 if(!row||!step||!form)return;
 if(step.status!=='draft')return alert('Este paso ya fue enviado o programado. No se duplicará.');
 let draft;try{draft=cacDraft(form,step,row)}catch{return alert('Revisa la fecha de programación.');}
 if(!draft.title||!draft.body||!draft.audienceIds.length)return alert('Completa asunto, mensaje y al menos una audiencia.');
 if(!form.querySelector('input[name="authorized"]')?.checked)return alert('Confirma que cuentas con autorización para comunicarte con esas personas.');
 if(!cloudReady||!x._cloudId)return alert('Debes tener la iniciativa sincronizada con Supabase para enviar.');
 const scheduled=draft.scheduledFor?new Date(draft.scheduledFor):null;
 if(scheduled&&(+scheduled-Date.now()<600000||+scheduled-Date.now()>30*86400000))return alert('Programa entre 10 minutos y 30 días a partir de ahora.');
 cacBusy=true;const sendBtn=document.getElementById('cac-send');if(sendBtn){sendBtn.disabled=true;sendBtn.textContent='Revisando destinatarios…';}
 try{
  cacStoreDraft(row,step,draft);
  const saved=await confirmCloudSave();
  if(!saved.ok)throw Error(saved.message||'No fue posible guardar la secuencia en Supabase.');
  const payload={
   initiative_id:x._cloudId,action_index:row.index,kind:draft.kind,audience_ids:draft.audienceIds,
   subject:draft.title,message:draft.body,cta:draft.cta,sequence_step:draft.stage,sequence_id:step.id,
   scheduled_for:draft.scheduledFor||''
  };
  const preview=await cacFunctionCall({...payload,mode:'preview'});
  const n=Number(preview.recipient_count||0),names=(preview.audiences||[]).join(', ');
  document.getElementById('cac-recipient-check').textContent=n+' destinatarios únicos verificados por el servidor · '+names;
  const confirmation='Intervención: '+row.action.name+'\nPaso: '+cacStage(draft.stage).label+
   '\nAudiencias: '+names+'\nDestinatarios únicos: '+n+'\n'+
   (scheduled?'Programación: '+scheduled.toLocaleString('es-CO'):'Envío: ahora')+
   '\n\n¿Confirmas el envío de este mensaje desde HACERLO?';
  if(!confirm(confirmation)){cacMessage='No se envió. Puedes seguir editando el paso.';return;}
  if(sendBtn)sendBtn.textContent=scheduled?'Programando en Resend…':'Enviando…';
  // Persistir el identificador en el cliente: reintentos no generan duplicados.
  const key=step.requestKey||crypto.randomUUID();
  step.requestKey=key;save();
  const result=await cacFunctionCall({...payload,mode:'send',request_key:key,expected_count:n,consent_attested:true});
  step.status=result.status==='scheduled'?'scheduled':result.status==='partial'?'partial':'sent';
  step.logId=result.log_id||'';
  step.acceptedCount=result.accepted_count||0;
  step.failedCount=result.failed_count||0;
  step.activatedAt=new Date().toISOString();
  cacMessage=step.status==='scheduled'?'Paso programado en el proveedor.':'Solicitud de envío procesada por el proveedor.';
  save();void cacLoadHistory(true);render();
 }catch(err){
  cacMessage='No se completó la activación: '+(err?.message||'Error desconocido')+
   '. Si el envío quedó en curso, consulta el historial antes de reintentarlo.';
  const p=document.getElementById('cac-notice');if(p)p.textContent=cacMessage;
 }finally{
  cacBusy=false;const button=document.getElementById('cac-send');
  if(button){button.disabled=false;button.textContent='Revisar destinatarios y activar';}
 }
}
function cacHistoryHtml(){
 if(!cacHistory.length)return '<p class="cac-muted">Aún no hay envíos registrados para esta iniciativa.</p>';
 const labels={sent:'Aceptado por Resend',scheduled:'Programado',partial:'Parcial',failed:'Error',processing:'En proceso'};
 return '<div class="cac-history-list">'+cacHistory.map(r=>
  '<div class="cac-history-row"><div><strong>'+cacSafe(r.subject||'Comunicación')+'</strong><small>'+
   cacSafe(new Date(r.submitted_at).toLocaleString('es-CO'))+' · '+cacSafe(r.sequence_step?cacStage(r.sequence_step).label:(r.kind==='reconocimiento'?'Reconocimiento':'Comunicación'))+
   '</small></div><span class="cac-state">'+cacSafe(labels[r.status]||r.status)+'</span><span>'+Number(r.accepted_count||0)+'/'+Number(r.recipient_count||0)+' aceptados'+
   (r.scheduled_for?' · '+cacSafe(new Date(r.scheduled_for).toLocaleString('es-CO')):'')+'</span></div>'
 ).join('')+'</div>';
}
async function cacLoadHistory(force=false){
 const x=current();if(!x?._cloudId||!cloudReady)return;
 if(cacHistoryLoading||(!force&&cacHistoryFor===x._cloudId))return;
 cacHistoryFor=x._cloudId;cacHistoryLoading=true;
 try{
  const {data,error}=await sb.from('activation_sends')
   .select('id,subject,kind,status,recipient_count,accepted_count,failed_count,submitted_at,scheduled_for,sequence_step')
   .eq('initiative_id',x._cloudId).order('submitted_at',{ascending:false}).limit(30);
  if(error)throw error;
  cacHistory=data||[];
 }catch(err){cacMessage='No se pudo consultar el historial: '+(err?.message||'');}
 finally{cacHistoryLoading=false;const target=document.getElementById('cac-history');if(target)target.innerHTML=cacHistoryHtml();}
}
function cacStepEditor(x,row,step){
 const immutable=step.status!=='draft',mech=actionMechanisms(row.action);
 const options=mech.filter(v=>v==='comunicacion'||v==='reconocimiento');
 const field=(label,html)=>'<label class="cac-field"><span>'+label+'</span>'+html+'</label>';
 const select=(name,options,value)=>'<select name="'+name+'" '+(immutable?'disabled':'')+'>'+options.map(z=>
  '<option value="'+cacSafe(z[0])+'"'+(String(z[0])===String(value)?' selected':'')+'>'+cacSafe(z[1])+'</option>').join('')+'</select>';
 const audienceOptions=cacAudienceOptions(x,step);
 return '<section id="cac-editor" class="cac-editor">'+
  '<div class="cac-editor-back"><button type="button" class="secondary" onclick="cacBackToCenter()">← Volver al Centro</button><span>El borrador se conserva al volver.</span></div>'+
  '<div class="cac-heading"><div><small>'+(step.standalone?'ACTIVACIÓN INDEPENDIENTE':'PASO '+(cacSequenceSteps(row.action).indexOf(step)+1))+' · '+cacSafe(cacStage(step.stage).moment.toUpperCase())+'</small><h3>'+cacSafe(cacStage(step.stage).label)+
  '</h3><p>Redacta el mensaje, escoge sus destinatarios y define cuándo activar esta etapa.</p></div>'+
  (immutable?'<span class="cac-pill">'+cacSafe(cacStepLabel(step))+'</span>':'<button type="button" class="secondary" onclick="cacDeleteStep()">Eliminar paso</button>')+'</div>'+
  '<div class="cac-compose-grid"><form id="cac-form" onsubmit="cacSaveStep(event)" oninput="cacPreview()">'+
  '<div class="cac-two">'+field('Propósito',select('stage',CAC_STAGES.map(z=>[z.id,z.label]),step.stage))+
  field('Mecanismo',select('kind',options.map(v=>[v,v==='reconocimiento'?'Reconocimiento':'Comunicación']),step.kind))+'</div>'+
  '<fieldset class="cac-field cac-audience-field"><legend>Audiencias destinatarias</legend>'+audienceOptions+'</fieldset>'+
  '<p class="cac-inline-help">Los correos se toman de Gestión de audiencias. El servidor deduplica destinatarios y valida permisos antes de enviar.</p>'+
  field('Asunto','<input type="text" name="subject" maxlength="140" required '+(immutable?'readonly':'')+' value="'+cacSafe(step.title||'')+'" placeholder="¿Qué deben entender o hacer?">')+
  field('Mensaje','<textarea name="message" maxlength="2400" rows="7" required '+(immutable?'readonly':'')+' placeholder="Escribe aquí el mensaje concreto.">'+cacSafe(step.body||'')+'</textarea>')+
  field('Acción esperada o refuerzo','<textarea name="cta" maxlength="450" rows="2" '+(immutable?'readonly':'')+'>'+cacSafe(step.cta||'')+'</textarea>')+
  field('Fecha y hora del envío (opcional)','<input type="datetime-local" name="scheduledFor" '+(immutable?'readonly':'')+' value="'+cacSafe(cacFormDate(step.scheduledFor))+'">')+
  '<p class="cac-inline-help">Sin fecha, se envía ahora. Con fecha, se programa en Resend hasta 30 días antes.</p>'+
  (immutable?'':(
   '<label class="cac-check"><input type="checkbox" name="authorized"><span>Confirmo que estoy autorizado para enviar comunicaciones a las audiencias seleccionadas.</span></label>'+
   '<div class="cac-actions"><button class="secondary" type="submit">Guardar borrador</button><button class="secondary" type="button" onclick="cacFillTemplate()">Proponer mensaje</button><button class="secondary" type="button" onclick="cacDuplicateForAudience()">Versión para otra audiencia</button>'+
   '<button class="primary" type="button" id="cac-send" onclick="cacActivateStep()">Revisar destinatarios y activar</button></div>'
  ))+
  '<p class="cac-inline-help" id="cac-recipient-check">Revisión de destinatarios pendiente.</p>'+
  '</form><aside class="cac-preview-panel"><div class="cac-preview-top">VISTA PREVIA DEL CORREO</div>'+
  '<div class="cac-preview-paper" id="cac-preview"><div class="cac-preview-brand">✣ HACERLO <span>· ACTIVACIÓN CONDUCTUAL</span></div><h3>'+cacSafe(step.title||'Asunto del correo')+'</h3><div class="cac-preview-message">'+cacSafe(step.body||'Aquí aparecerá el mensaje.').replace(/\n/g,'<br>')+'</div>'+(step.cta?'<p class="cac-preview-cta"><b>Acción esperada</b><br>'+cacSafe(step.cta)+'</p>':'')+'</div>'+
  '<div class="cac-preview-check"><b>Chequeo conductual</b><p>¿El mensaje expresa claramente qué hacer, cuándo hacerlo y por qué vale la pena?</p></div>'+
  '</aside></div></section>';
}
function renderCentroActivacion(x){
 const rows=cacActions(x),row=cacAction(x),
  sequence=row?cacSequenceSteps(row.action):[],direct=row?cacDirectSteps(row.action):[],step=cacStep(row);
 if(x?._cloudId&&!cacHistoryLoading&&cacHistoryFor!==x._cloudId)void cacLoadHistory();
 let content='';
 if(!rows.length){
  content='<section class="cac-empty"><div class="cac-empty-symbol" aria-hidden="true">✧</div><div class="cac-empty-copy"><span class="cac-eyebrow">EMPIEZA CUANDO QUIERAS</span><h3>Tu primera activación comienza con una intervención</h3>'+
   '<p>Cuando tengas una intervención, podrás comunicar o reconocer sin configurar pasos adicionales.</p></div>'+
   '<button class="secondary" type="button" onclick="go(\'Intervenciones\')">Ver intervenciones ↗</button></section>';
 }else{
  const mechanisms=actionMechanisms(row.action);
  const choose='<section class="cac-control"><div><span class="cac-eyebrow">INTERVENCIÓN DE ORIGEN</span>'+
   '<h3>¿Qué intervención quieres activar?</h3></div><label class="cac-select">Intervención <select onchange="cacChooseAction(this.value)">'+
   rows.map(r=>'<option value="'+r.index+'"'+(row.index===r.index?' selected':'')+'>'+cacSafe(r.action.name||'Acción')+'</option>').join('')+
   '</select></label></section>';
  const options='<section class="cac-entry"><div><span class="cac-eyebrow">ELIGE CÓMO ACTIVAR</span>'+
   '<h3>Una acción puntual o una secuencia: tú decides.</h3>'+
   '<p>No hay etapas obligatorias ni requisitos previos. Puedes activar cualquier comunicación o reconocimiento cuando tenga sentido.</p></div>'+
   '<div class="cac-entry-actions">'+
   '<button class="primary" type="button" onclick="cacStartDirect(\'comunicacion\')">✉ Nueva comunicación</button>'+
   '<button class="secondary" type="button" onclick="cacStartDirect(\'reconocimiento\')">✧ Nuevo reconocimiento</button>'+
   (!sequence.length?'<button class="secondary" type="button" onclick="cacBuildSequence()">＋ Crear secuencia opcional</button>':'')+
   '</div></section>';
  let directSection='';
  if(direct.length)directSection='<section class="cac-sequence"><div class="cac-heading"><div><small>ACTIVACIONES INDEPENDIENTES</small>'+
   '<h3>Comunicaciones y reconocimientos individuales</h3>'+
   '<p>No dependen de una secuencia. Puedes enviarlos y programarlos por separado.</p></div></div>'+
   '<div class="cac-direct-list">'+direct.map(s=>
    '<button class="cac-direct-item'+(step?.id===s.id?' is-active':'')+'" type="button" onclick="cacChooseStep(\''+cacSafe(s.id)+'\')">'+
    '<span>'+cacSafe(s.kind==='reconocimiento'?'✧ Reconocimiento':'✉ Comunicación')+'</span>'+
    '<strong>'+cacSafe(s.title||'Sin asunto')+'</strong><small>'+cacSafe(cacStepLabel(s))+'</small></button>'
   ).join('')+'</div></section>';
  let sequenceSection='';
  if(sequence.length)sequenceSection='<section class="cac-sequence"><div class="cac-heading"><div>'+
   '<small>SECUENCIACIÓN OPCIONAL</small><h3>Ruta de activación conductual</h3>'+
   '<p>Etapas sugeridas, no prerrequisitos: puedes ejecutar cualquier paso sin completar los anteriores, o no usar la ruta.</p></div>'+
   '<button class="secondary" type="button" onclick="cacAddStep()">＋ Añadir paso</button></div>'+
   '<div class="cac-timeline">'+sequence.map((s,i)=>
    '<button type="button" onclick="cacChooseStep(\''+cacSafe(s.id)+'\')" class="cac-step'+(step?.id===s.id?' is-active':'')+'">'+
    '<span class="cac-step-number">'+String(i+1).padStart(2,'0')+'</span>'+
    '<span class="cac-step-meta"><small>'+cacSafe(cacStage(s.stage).moment.toUpperCase())+'</small>'+
    '<strong>'+cacSafe(cacStage(s.stage).label)+'</strong>'+
    '<em>'+cacSafe(cacStepLabel(s))+(s.scheduledFor?' · '+cacSafe(new Date(s.scheduledFor).toLocaleDateString('es-CO')):'')+
    '</em></span></button>'
   ).join('')+'</div></section>';
  content=choose+options+directSection+sequenceSection+(cacEditorOpen&&step?cacStepEditor(x,row,step):'');
 }
 const title=typeof hcxHero==='function'?hcxHero('Centro de Activación Conductual',x,
  'Comunica, reconoce y refuerza comportamientos, con secuencias opcionales y envíos a audiencias.',
  'RDAIM · IMPLEMENTACIÓN','✧'):'<h2>Centro de Activación Conductual</h2>';
 return '<div class="cac-home">'+title+
  '<section class="cac-introduction"><div class="cac-intro-copy"><span class="cac-eyebrow">DEL DISEÑO A LA ACCIÓN</span>'+
  '<p>Comunica, reconoce o programa refuerzos. <strong>Tú decides cuándo y cómo.</strong></p></div>'+
  '<div class="cac-capabilities"><span>✉ Audiencias</span><span>◷ Secuencias opcionales</span><span>✧ Reconocimiento</span></div></section>'+
  content+
  '<p class="cac-notice" id="cac-notice" role="status" aria-live="polite">'+cacSafe(cacMessage)+'</p>'+
  '<section class="cac-history"><div class="cac-heading"><div><small>TRAZABILIDAD</small>'+
  '<h3>Seguimiento de envíos</h3><p>Datos técnicos del servicio de correo: mensajes aceptados, rechazados o programados. No miden adopción ni entrega efectiva.</p></div>'+
  '<button class="secondary" type="button" onclick="cacLoadHistory(true)">Actualizar</button></div>'+
  '<div id="cac-history">'+cacHistoryHtml()+'</div></section>'+
  '<section class="cac-behavior-metrics"><div><span class="cac-eyebrow">RESULTADOS CONDUCTUALES</span>'+
  '<h3>Indicadores de cambio en HACERLO</h3>'+
  '<p>Esta iniciativa tiene <b>'+Number((x.indicators||[]).length)+'</b> indicadores definidos. Son diferentes de los estados técnicos del correo. Consulta su avance en Resultados y la evidencia de medición en Analítica.</p></div>'+
  '<div class="cac-metric-links"><button type="button" class="secondary" onclick="go(\'Indicadores\')">Ver indicadores</button>'+
  '<button type="button" class="secondary" onclick="go(\'Analítica\')">Ir a Analítica</button></div></section>'+
  '<p class="cac-disclaimer">Los envíos requieren autenticación, permiso de edición, autorización confirmada y proveedor configurado. Un correo aceptado no demuestra que se haya leído ni que el comportamiento haya cambiado.</p></div>';
}
