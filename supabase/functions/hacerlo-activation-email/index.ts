// HACERLO | Envío autorizado para el Centro de Activación Conductual.
// Los destinatarios salen exclusivamente del app_state de la iniciativa leída en Supabase.
// Nunca se aceptan correos, organización o remitente definidos por el navegador.
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
 if(!['preview','send'].includes(mode)||!uuid.test(initiativeId)||
    !Number.isSafeInteger(actionIndex)||actionIndex<0||
    !['comunicacion','reconocimiento'].includes(kind)||
    audienceIds.length<1||audienceIds.length>20||
    !subject||!message)return json({error:'Revisa la acción, las audiencias, el asunto y el mensaje.'},400);
 if(mode==='send'&&!uuid.test(requestKey))return json({error:'Identificador de envío inválido.'},400);
 if(mode==='send'&&body?.consent_attested!==true)return json({error:'Confirma que tienes autorización para enviar comunicaciones a las audiencias.'},403);
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
 const recipients=new Set<string>();
 const addEmail=(v:unknown)=>{
  if(typeof v!=='string')return;
  const email=v.trim().toLowerCase();
  if(validEmail(email))recipients.add(email);
 };
 for(const audience of selected)addEmail(audience?.email||audience?.correo);
 const people=Array.isArray(state.audiencePeople)?state.audiencePeople:[];
 for(const person of people){
  if(audienceIds.includes(String(person?.audienceId)))addEmail(person?.email||person?.correo);
 }
 const count=recipients.size;
 if(!count)return json({error:'Las audiencias seleccionadas no tienen direcciones de correo válidas. Agrégalas en Gestión de audiencias.'},422);
 if(count>40)return json({error:'Por seguridad, el primer envío admite hasta 40 destinatarios únicos. Divide el envío en audiencias más pequeñas.'},422);
 const audienceNames=selected.map((a:any)=>text(a?.name,100)||'Audiencia');
 if(mode==='preview')return json({ok:true,recipient_count:count,audiences:audienceNames,
  note:'Destinatarios deduplicados y leídos del servidor. Se enviará un correo privado a cada persona.'});
 if(Number(body?.expected_count)!==count)return json({error:'La cantidad de destinatarios cambió. Revisa la vista previa antes de enviar.'},409);
 const resendKey=Deno.env.get('RESEND_API_KEY')||'';
 const from=Deno.env.get('HACERLO_FROM_EMAIL')||'';
 if(!resendKey||!from)return json({error:'Falta configurar RESEND_API_KEY y HACERLO_FROM_EMAIL como secretos de Supabase. No se ha enviado ningún correo.'},503);
 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 // Cuota por fábrica: reduce envíos accidentales y el uso indebido del proveedor.
 const midnight=new Date();midnight.setUTCHours(0,0,0,0);
 const {data:existingQuota,error:quotaError}=await service.from('activation_sends').select('recipient_count')
  .eq('organization_id',initiative.organization_id).gte('submitted_at',midnight.toISOString())
  .in('status',['processing','sent','partial']);
 if(quotaError)return json({error:'No se pudo comprobar el límite de envío.'},503);
 const used=(existingQuota||[]).reduce((sum:number,row:any)=>sum+Number(row.recipient_count||0),0);
 if(used+count>160)return json({error:'Se alcanzó el límite de seguridad de 160 destinatarios diarios por fábrica.'},429);
 const insert={
  initiative_id:initiative.id,organization_id:initiative.organization_id,sender_user_id:user.id,
  request_key:requestKey,action_index:actionIndex,kind,audience_ids:audienceIds,
  subject,message,cta,recipient_count:count,status:'processing',
  scheduled_for:scheduledIso||null,sequence_step:sequenceStep||null,sequence_id:sequenceId||null
 };
 const {data:log,error:insertError}=await service.from('activation_sends').insert(insert).select('id').single();
 if(insertError){
  if(insertError.code==='23505')return json({error:'Este envío ya fue procesado o se encuentra en curso. Consulta el historial antes de intentarlo otra vez.'},409);
  return json({error:'No fue posible registrar el envío. Ningún correo fue enviado.'},503);
 }
 const contentText=message+(cta?'\n\nAcción esperada: '+cta:'');
 const html='<div style="font:16px/1.65 Arial,sans-serif;max-width:640px;margin:auto;color:#193047">'+
   '<div style="font-weight:bold;font-size:13px;letter-spacing:1px;color:#176d68">HACERLO · ACTIVACIÓN CONDUCTUAL</div>'+
   '<h1 style="font-size:22px;line-height:1.3">'+escapeHtml(subject)+'</h1>'+
   '<div style="white-space:pre-line">'+escapeHtml(message)+'</div>'+
   (cta?'<p style="padding:14px 16px;background:#f0f7f5;border-radius:10px"><strong>Acción esperada</strong><br>'+escapeHtml(cta)+'</p>':'')+
   '<p style="font-size:12px;color:#687781">Enviado desde HACERLO · Fábrica del Comportamiento</p></div>';
 let accepted=0,failed=0,lastError='';
 // Mensajes individuales: nunca exponemos las demás direcciones en To/Cc.
 // No reintentar el mismo request_key evita duplicados tras un resultado parcial.
 for(const [i,email] of [...recipients].entries()){
  try{
   const response=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{
     Authorization:'Bearer '+resendKey,'Content-Type':'application/json',
     'Idempotency-Key':requestKey+'-'+i
    },
    body:JSON.stringify({from,to:[email],subject,html,text:contentText,...(scheduledIso?{scheduled_at:scheduledIso}:{})})
   });
   if(response.ok){accepted++;}
   else{failed++;lastError='Resend rechazó uno o más mensajes ('+response.status+').';}
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
