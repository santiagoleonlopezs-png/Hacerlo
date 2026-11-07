// HACERLO | Envío autorizado para el Centro de Activación Conductual.
// Los contactos se validan contra la iniciativa. Solo UN destinatario manual por envío.
// El remitente, la fábrica y los permisos se verifican en el servidor.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const allowedOrigins=new Set([
 'https://app.hacerlofc.com','https://hacerlofc.com','https://www.hacerlofc.com',
 'https://santiagoleonlopezs-png.github.io'
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validEmail=(s:string)=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c));
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const now=()=>new Date().toISOString();

Deno.serve(async(request:Request)=>{
 const origin=request.headers.get('Origin')||'';
 const cors={
  'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://app.hacerlofc.com',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Vary':'Origin'
 };
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
 });
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({error:'Método no permitido.'},405);
 if(origin&&!allowedOrigins.has(origin))return json({error:'Origen no permitido.'},403);
 const bearer=request.headers.get('Authorization')||'';
 if(!bearer.startsWith('Bearer '))return json({error:'Debes iniciar sesión.'},401);
 const url=Deno.env.get('SUPABASE_URL')||'';
 const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(!url||!anon||!secret)return json({error:'Servidor de activación sin configurar.'},503);
 const caller=createClient(url,anon,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await caller.auth.getUser(bearer.slice(7));
 if(userError||!user||user.is_anonymous)return json({error:'Sesión inválida.'},401);
 let body:any;
 try{body=await request.json()}catch{return json({error:'Solicitud inválida.'},400)}
 const mode=body?.mode;
 // Comprobación sin revelar credenciales: el usuario puede ver si está
 // listo para enviar antes de confirmar una comunicación real.
 if(mode==='status'){
  const apiKey=Deno.env.get('RESEND_API_KEY')||'';
  const fromValue=Deno.env.get('HACERLO_FROM_EMAIL')||'';
  const sender=fromValue.match(/<([^<>]+)>/)?.[1]||fromValue.trim();
  const senderValid=validEmail(sender);
  const missing=[...(!apiKey?['RESEND_API_KEY']:[]),...(!fromValue||!senderValid?['HACERLO_FROM_EMAIL']:[])];
  return json({ok:true,configured:missing.length===0,missing,
    tracking_configured:!!Deno.env.get('RESEND_WEBHOOK_SECRET'),
    domain:senderValid?sender.split('@')[1]:'',
    note:missing.length?'Configura los secretos en Supabase antes de enviar.':
      'Configuración presente; la entrega y el dominio aún requieren un envío de prueba.'});
 }
 // Conciliación explícita y de solo lectura del estado más reciente en Resend.
 // No requiere webhook; no crea ni reenvía mensajes. Limitada a correos propios.
 if(mode==='refresh'){
  const initiativeId=text(body?.initiative_id,60);
  if(!uuid.test(initiativeId))return json({error:'Selecciona una iniciativa válida.'},400);
  const {data:initiative,error:initiativeError}=await caller.from('initiatives')
   .select('id,organization_id').eq('id',initiativeId).maybeSingle();
  if(initiativeError||!initiative)return json({error:'No tienes acceso a esta iniciativa.'},403);
  const {data:canEdit,error:permissionError}=await caller.rpc('can_edit_org',{p_org:initiative.organization_id});
  if(permissionError||canEdit!==true)return json({error:'Necesitas permiso de edición en una fábrica activa.'},403);
  const resendKey=Deno.env.get('RESEND_API_KEY')||'';
  if(!resendKey)return json({error:'No se ha configurado Resend.'},503);
  const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:sends,error:sendsError}=await service.from('activation_sends').select('id')
   .eq('initiative_id',initiativeId).eq('organization_id',initiative.organization_id)
   .order('submitted_at',{ascending:false}).limit(10);
  if(sendsError)return json({error:'No se pudo consultar el historial de envíos.'},503);
  const ids=(sends||[]).map((s:any)=>s.id);
  if(!ids.length)return json({ok:true,checked:0,note:'No hay correos de esta iniciativa para verificar.'});
  const {data:items,error:itemsError}=await service.from('activation_email_items')
   .select('id,activation_id,organization_id,resend_email_id,last_synced_at,provider_last_event,delivered_at,opened_at,clicked_at,bounced_at,complained_at,suppressed_at,failed_at,delayed_at,delivery_status')
   .in('activation_id',ids).eq('organization_id',initiative.organization_id)
   .order('created_at',{ascending:false}).limit(100);
  if(itemsError)return json({error:'No se pudieron consultar los identificadores de los correos.'},503);
  let checked=0,changed=0,failed=0,denied=0,throttled=0;
  const counts:Record<string,number>={};
  const touched=new Set<string>();
  for(const item of items||[]){
   if(checked>=10)break;
   const last=item.last_synced_at?new Date(item.last_synced_at).getTime():0;
   if(Date.now()-last<60*1000)continue;
   if(!/^[a-z0-9-]{8,180}$/i.test(item.resend_email_id))continue;
   checked++;
   try{
    const response=await fetch('https://api.resend.com/emails/'+encodeURIComponent(item.resend_email_id),{
     headers:{Authorization:'Bearer '+resendKey,'User-Agent':'HACERLO-Activation/1.1'}
    });
    if(!response.ok){failed++;if(response.status===403||response.status===401)denied++;if(response.status===429)throttled++;continue;}
    const mail=await response.json();
    const event=String(mail?.last_event||'').toLowerCase();
    const known=['queued','sent','delivered','opened','clicked','bounced','suppressed','complained','failed','delivery_delayed','scheduled'];
    const patch:Record<string,unknown>={last_synced_at:now()};
    if(known.includes(event)){
     patch.provider_last_event=event;
     counts[event]=(counts[event]||0)+1;
    }else counts.unknown=(counts.unknown||0)+1;
    if(known.includes(event)){
     const observed=now();
     const map:Record<string,string>={
      delivered:'delivered_at',opened:'opened_at',clicked:'clicked_at',bounced:'bounced_at',
      complained:'complained_at',suppressed:'suppressed_at',failed:'failed_at',
      delivery_delayed:'delayed_at'
     };
     const col=map[event];
     if(col&&!item[col])patch[col]=observed;
     // Abierto/clicado implica que Resend registró interacción posterior a entrega.
     // Esta inferencia operativa nunca se utiliza como evidencia de adopción.
     if(['opened','clicked'].includes(event)&&!item.delivered_at)patch.delivered_at=observed;
     if(event==='clicked'&&!item.opened_at)patch.opened_at=observed;
     if(['delivered','bounced','suppressed','complained','failed','delivery_delayed'].includes(event))
      patch.delivery_status=event==='delivery_delayed'?'delayed':event;
    }
    const {error:updateError}=await service.from('activation_email_items')
     .update(patch).eq('id',item.id).eq('organization_id',initiative.organization_id);
    if(updateError){failed++;continue;}
    touched.add(item.activation_id);changed++;
   }catch{failed++;}
  }
  for(const activationId of touched){
   const {data:rows,error:statsError}=await service.from('activation_email_items')
    .select('provider_last_event,delivered_at,opened_at,clicked_at,bounced_at,complained_at,suppressed_at,failed_at,delayed_at')
    .eq('activation_id',activationId).eq('organization_id',initiative.organization_id);
   if(statsError){failed++;continue;}
   const count=(key:string)=>(rows||[]).filter((row:any)=>!!row[key]).length;
   const byState:Record<string,number>={};
   for(const record of rows||[]){const status=record.provider_last_event||'unknown';byState[status]=(byState[status]||0)+1;}
   const {error:totalError}=await service.from('activation_sends').update({
    delivery_check_at:now(),delivery_check_result:byState,
    delivered_count:count('delivered_at'),opened_count:count('opened_at'),
    clicked_count:count('clicked_at'),bounced_count:count('bounced_at'),
    complained_count:count('complained_at'),suppressed_count:count('suppressed_at'),
    failed_delivery_count:count('failed_at'),delayed_count:count('delayed_at'),
    event_updated_at:now()
   }).eq('id',activationId).eq('initiative_id',initiativeId).eq('organization_id',initiative.organization_id);
   if(totalError)failed++;
  }
  return json({ok:true,checked,updated:changed,errors:failed,permission_denied:denied,
   rate_limited:throttled,statuses:counts,
   note:denied?'La clave actual permite enviar pero no consultar el correo. Comprueba el envío en el panel de Resend o habilita el webhook.':
   'Consulta del último estado de Resend. No sustituye los eventos completos del webhook y no mide adopción.'});
 }
 const initiativeId=text(body?.initiative_id,60);
 const actionIndex=body?.action_index;
 const kind=body?.kind;
 const requestKey=text(body?.request_key,60);
 const subject=text(body?.subject,140);
 const message=text(body?.message,2400);
 const cta=text(body?.cta,450);
 const sequenceStep=text(body?.sequence_step,70);
 const sequenceId=text(body?.sequence_id,100);
 const scheduledFor=text(body?.scheduled_for,50);
 const audienceIds=Array.isArray(body?.audience_ids)?
   [...new Set(body.audience_ids.filter((a:unknown)=>typeof a==='string'&&a.length<=100))]:[];
 const contactIds=Array.isArray(body?.contact_ids)?
   [...new Set(body.contact_ids.filter((a:unknown)=>typeof a==='string'&&a.length<=100))]:[];
 const manualEmail=text(body?.manual_email,254).toLowerCase();
 const manualName=text(body?.manual_name,120);
 if(contactIds.length>40||(manualEmail&&!validEmail(manualEmail))||
    (body?.manual_email!=null&&typeof body.manual_email!=='string'))
  return json({error:'Revisa los contactos y el correo manual.'},400);
 if(!['preview','send'].includes(mode)||!uuid.test(initiativeId)||
    !Number.isSafeInteger(actionIndex)||actionIndex<0||
    !['comunicacion','reconocimiento'].includes(kind)||
    audienceIds.length>20||(!audienceIds.length&&!contactIds.length&&!manualEmail)||
    !subject||!message)return json({error:'Selecciona una audiencia, un contacto o escribe un correo individual válido.'},400);
 if(mode==='send'&&!uuid.test(requestKey))return json({error:'Identificador de envío inválido.'},400);
 if(mode==='send'&&body?.consent_attested!==true)return json({error:'Confirma que tienes autorización para comunicarte con estos destinatarios.'},403);
 let scheduledIso='';
 if(scheduledFor){
  const when=new Date(scheduledFor),delta=when.getTime()-Date.now();
  if(!Number.isFinite(when.getTime())||delta<10*60*1000||delta>30*24*60*60*1000)return json({error:'Programa el envío entre 10 minutos y 30 días a partir de ahora.'},422);
  scheduledIso=when.toISOString();
 }
 const {data:initiative,error:initiativeError}=await caller.from('initiatives')
   .select('id,organization_id,app_state').eq('id',initiativeId).maybeSingle();
 if(initiativeError||!initiative)return json({error:'No tienes acceso a esa iniciativa.'},403);
 // La función SQL comprueba rol editor/administrador Y vigencia de la fábrica.
 const {data:canEdit,error:permissionError}=await caller.rpc('can_edit_org',{p_org:initiative.organization_id});
 if(permissionError||canEdit!==true)return json({error:'Necesitas permiso de edición en una fábrica activa para enviar.'},403);
 const state=initiative.app_state||{};
 const action=Array.isArray(state.actions)?state.actions[actionIndex]:null;
 const mechanisms=Array.isArray(action?.mechanisms)?action.mechanisms:
   (action?.mechanismRecords?Object.keys(action.mechanismRecords):[]);
 if(!action||!mechanisms.includes(kind))return json({error:'Esta intervención no tiene habilitado el mecanismo seleccionado.'},400);
 const audiences=Array.isArray(state.audiences)?state.audiences:[];
 const selected=audiences.filter((a:any)=>audienceIds.includes(String(a?.id)));
 if(selected.length!==audienceIds.length)return json({error:'Una o más audiencias ya no existen.'},409);
 // Resolver los IDs de personas dentro del tenant; nunca confiar en emails asociados a IDs enviados por cliente.
 const recipients=new Map<string,{name:string,source:string}>();
 const addEmail=(v:unknown,name:unknown,source:string)=>{
  if(typeof v!=='string')return;
  const email=v.trim().toLowerCase();
  if(validEmail(email)){
   const existing=recipients.get(email);
   if(!existing||(!existing.name&&text(name,120)))
    recipients.set(email,{name:text(name,120),source});
  }
 };
 const people=Array.isArray(state.audiencePeople)?state.audiencePeople:[];
 const contacts=people.filter((p:any)=>contactIds.includes(String(p?.id)));
 if(contacts.length!==contactIds.length)return json({error:'Alguna persona seleccionada ya no existe en esta iniciativa.'},409);
 for(const audience of selected)addEmail(audience?.email||audience?.correo,audience?.name,'audiencia');
 for(const person of people){
  if(audienceIds.includes(String(person?.audienceId)))addEmail(person?.email||person?.correo,person?.name,'audiencia');
 }
 for(const person of contacts){
  const email=String(person?.email||person?.correo||'').trim().toLowerCase();
  if(!validEmail(email))return json({error:'Alguna persona no tiene correo válido. Corrígelo en Gestión de audiencias.'},422);
  addEmail(email,person?.name,'contacto');
 }
 if(manualEmail)addEmail(manualEmail,manualName,'manual');
 const count=recipients.size;
 if(!count)return json({error:'No hay destinatarios con correos válidos.'},422);
 if(manualEmail&&(message.includes('{{nombre}}')||subject.includes('{{nombre}}')||cta.includes('{{nombre}}'))&&!manualName)
  return json({error:'Para usar {{nombre}} con el correo manual, escribe el nombre del destinatario.'},422);
 if(count>40)return json({error:'Por seguridad, el primer envío admite hasta 40 destinatarios únicos. Divide el envío en audiencias más pequeñas.'},422);
 const audienceNames=selected.map((a:any)=>text(a?.name,100)||'Audiencia');
 const contactNames=contacts.map((p:any)=>text(p?.name,100)||'Persona registrada');
 if(mode==='preview')return json({ok:true,recipient_count:count,audiences:audienceNames,
  contacts:contactNames,manual_count:manualEmail?1:0,
  note:'Destinatarios únicos verificados. Cada persona recibirá un correo privado.'});
 if(Number(body?.expected_count)!==count)return json({error:'La cantidad de destinatarios cambió. Revisa la vista previa antes de enviar.'},409);
 const resendKey=Deno.env.get('RESEND_API_KEY')||'';
 const from=Deno.env.get('HACERLO_FROM_EMAIL')||'';
 // Mantener las respuestas en el buzón comercial, aunque el remitente use un subdominio.
 const replyTo=(Deno.env.get('HACERLO_REPLY_TO_EMAIL')||'contacto@hacerlofc.com').trim();
 if(!validEmail(replyTo))return json({error:'La dirección de respuesta de HACERLO no es válida.'},503);
 if(!resendKey||!from)return json({
  error:'El envío está deshabilitado porque falta configurar Resend en Supabase. No se ha enviado ningún correo.',
  code:'EMAIL_NOT_CONFIGURED',missing:[...(!resendKey?['RESEND_API_KEY']:[]),...(!from?['HACERLO_FROM_EMAIL']:[])]
 },503);
 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 // Cuota por fábrica: reduce envíos accidentales y el uso indebido del proveedor.
 const midnight=new Date();midnight.setUTCHours(0,0,0,0);
 const {data:existingQuota,error:quotaError}=await service.from('activation_sends').select('recipient_count')
  .eq('organization_id',initiative.organization_id).gte('submitted_at',midnight.toISOString())
  .in('status',['processing','sent','scheduled','partial']);
 if(quotaError)return json({error:'No se pudo comprobar el límite de envío.'},503);
 const used=(existingQuota||[]).reduce((sum:number,row:any)=>sum+Number(row.recipient_count||0),0);
 if(used+count>160)return json({error:'Se alcanzó el límite de seguridad de 160 destinatarios diarios por fábrica.'},429);
 if(manualEmail){
  const {data:recent,error:recentError}=await service.from('activation_sends')
   .select('manual_email_count').eq('sender_user_id',user.id)
   .gte('submitted_at',midnight.toISOString()).in('status',['processing','sent','scheduled','partial']);
  if(recentError)return json({error:'No se pudo verificar el límite de correos manuales.'},503);
  const usedManual=(recent||[]).reduce((n:number,r:any)=>n+Number(r.manual_email_count||0),0);
  if(usedManual>=20)return json({error:'Límite inicial de 20 correos manuales por usuario y día.'},429);
 }
 const insert={
  initiative_id:initiative.id,organization_id:initiative.organization_id,sender_user_id:user.id,
  request_key:requestKey,action_index:actionIndex,kind,audience_ids:audienceIds,
  subject,message,cta,recipient_count:count,status:'processing',
  contact_ids:contactIds,manual_email_count:manualEmail?1:0,
  scheduled_for:scheduledIso||null,sequence_step:sequenceStep||null,sequence_id:sequenceId||null
 };
 const {data:log,error:insertError}=await service.from('activation_sends').insert(insert).select('id').single();
 if(insertError){
  if(insertError.code==='23505')return json({error:'Este envío ya fue procesado o se encuentra en curso. Consulta el historial antes de intentarlo otra vez.'},409);
  return json({error:'No fue posible registrar el envío. Ningún correo fue enviado.'},503);
 }
 // Personalización individual, escapada antes de componer HTML.
 const personalize=(src:string,name:string)=>src
  .replace(/\{\{nombre\}\}/g,name).replace(/\{\{intervencion\}\}/g,text(action?.name,150));
 const contentFor=(name:string)=>{
  const individualSubject=personalize(subject,name),individualMessage=personalize(message,name),individualCta=personalize(cta,name);
  const textBody=individualMessage+(individualCta?'\n\nAcción esperada: '+individualCta:'');
  const html='<div style="font:16px/1.65 Arial,sans-serif;max-width:640px;margin:auto;color:#193047">'+
   '<div style="font-weight:bold;font-size:13px;letter-spacing:1px;color:#176d68">HACERLO · ACTIVACIÓN CONDUCTUAL</div>'+
   '<h1 style="font-size:22px;line-height:1.3">'+escapeHtml(individualSubject)+'</h1>'+
   '<div style="white-space:pre-line">'+escapeHtml(individualMessage)+'</div>'+
   (individualCta?'<p style="padding:14px 16px;background:#f0f7f5;border-radius:10px"><strong>Acción esperada</strong><br>'+escapeHtml(individualCta)+'</p>':'')+
   '<p style="font-size:12px;color:#687781">Enviado desde HACERLO · Fábrica del Comportamiento</p></div>';
  return {subject:individualSubject,html,text:textBody};
 };
 let accepted=0,failed=0,lastError='';
 // Mensajes individuales: nunca exponemos las demás direcciones en To/Cc.
 // No reintentar el mismo request_key evita duplicados tras un resultado parcial.
 for(const [i,[email,recipient]] of [...recipients.entries()].entries()){
  try{
   const content=contentFor(recipient.name);
   const response=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{
     Authorization:'Bearer '+resendKey,'Content-Type':'application/json',
     'Idempotency-Key':requestKey+'-'+i
    },
    body:JSON.stringify({from,to:[email],reply_to:replyTo,...content,...(scheduledIso?{scheduled_at:scheduledIso}:{})})
   });
   if(response.ok){
    const result=await response.json().catch(()=>null);
    // Vincular cada correo al envío sin guardar nombres ni direcciones.
    const providerId=typeof result?.id==='string'?result.id:'';
    accepted++;
    if(providerId){
     const {error:trackError}=await service.from('activation_email_items').insert({
      activation_id:log.id,organization_id:initiative.organization_id,
      resend_email_id:providerId,delivery_status:'accepted'
     });
     if(trackError)lastError='Resend aceptó el mensaje, pero falló el registro del seguimiento. Revisa Resend antes de reintentar.';
    }else lastError='Resend aceptó el mensaje sin identificador de seguimiento.';
   }else{failed++;lastError='Resend rechazó uno o más mensajes ('+response.status+').';}
  }catch{failed++;lastError='Error de comunicación con el servicio de correo.';}
  await service.from('activation_sends').update({
   accepted_count:accepted,failed_count:failed,
   failure_summary:lastError
  }).eq('id',log.id);
 }
 const status=failed===0?(scheduledIso?'scheduled':'sent'):accepted>0?'partial':'failed';
 await service.from('activation_sends').update({
  status,accepted_count:accepted,failed_count:failed,finished_at:now(),
  failure_summary:lastError
 }).eq('id',log.id);
 return json({ok:accepted>0,status,accepted_count:accepted,failed_count:failed,
  recipient_count:count,log_id:log.id,
  scheduled_for:scheduledIso||null,
  note:scheduledIso?'Programado en el proveedor; todavía no se ha entregado.':'Aceptado por el proveedor no equivale a entregado ni leído.'},accepted>0?200:502);
});
