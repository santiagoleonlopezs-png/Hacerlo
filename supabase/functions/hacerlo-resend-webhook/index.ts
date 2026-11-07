/* HACERLO · Eventos Resend verificados para el Centro de Activación.
 * Endpoint público ÚNICAMENTE porque verifica HMAC-SHA256 de Svix.
 * Nunca guarda direcciones, nombres, asunto, IP ni clics personales. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const events=new Set([
 'email.sent','email.scheduled','email.delivered','email.delivery_delayed',
 'email.opened','email.clicked','email.bounced','email.failed',
 'email.complained','email.suppressed'
]);
function decodeBase64(s:string):Uint8Array{
 const normalized=s.replace(/-/g,'+').replace(/_/g,'/');
 const bytes=atob(normalized);
 return Uint8Array.from(bytes,c=>c.charCodeAt(0));
}
async function validSignature(req:Request,raw:string,secret:string):Promise<boolean>{
 if(!secret.startsWith('whsec_'))return false;
 const id=req.headers.get('svix-id')||req.headers.get('webhook-id')||'';
 const timestamp=req.headers.get('svix-timestamp')||req.headers.get('webhook-timestamp')||'';
 const signature=req.headers.get('svix-signature')||req.headers.get('webhook-signature')||'';
 if(!/^[\w-]{8,200}$/.test(id)||!/^\d{10}$/.test(timestamp)||
    Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 try{
  const key=await crypto.subtle.importKey('raw',decodeBase64(secret.slice(6)),
   {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const expected=new Uint8Array(await crypto.subtle.sign('HMAC',key,
   new TextEncoder().encode(id+'.'+timestamp+'.'+raw)));
  const given=signature.split(' ').filter(Boolean).filter(x=>x.startsWith('v1,'));
  for(const item of given){
   let observed:Uint8Array;
   try{observed=decodeBase64(item.slice(3))}catch{continue}
   if(observed.length!==expected.length)continue;
   let diff=0;
   for(let i=0;i<expected.length;i++)diff|=observed[i]^expected[i];
   if(diff===0)return true;
  }
 }catch{return false}
 return false;
}
Deno.serve(async(req:Request)=>{
 const output=(status:number,message:string)=>new Response(message,{status,
  headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 if(req.method!=='POST')return output(405,'Método no permitido');
 const secret=Deno.env.get('RESEND_WEBHOOK_SECRET')||'';
 if(!secret)return output(503,'Webhook no configurado');
 const raw=await req.text();
 if(raw.length>100000)return output(413,'Evento demasiado grande');
 if(!await validSignature(req,raw,secret))return output(401,'Firma inválida');
 let event:any;
 try{event=JSON.parse(raw)}catch{return output(400,'Evento inválido')}
 const type=String(event?.type||'');
 if(!events.has(type))return output(200,'Evento no aplicable');
 const providerId=String(event?.data?.email_id||'');
 const id=req.headers.get('svix-id')||req.headers.get('webhook-id')||'';
 if(!providerId||providerId.length>180)return output(200,'Sin identificador');
 const url=Deno.env.get('SUPABASE_URL')||'';
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(!url||!serviceKey)return output(503,'Servicio no disponible');
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:item,error:lookupError}=await db.from('activation_email_items')
  .select('id,activation_id,organization_id,delivery_status,delivered_at,opened_at,clicked_at,bounced_at,complained_at,suppressed_at,failed_at,delayed_at')
  .eq('resend_email_id',providerId).maybeSingle();
 if(lookupError)return output(503,'Consulta no disponible');
 // El endpoint puede recibir webhooks de otros correos del mismo dominio.
 if(!item)return output(200,'Evento no asociado a HACERLO');
 const {error:dupeError}=await db.from('activation_email_events').insert({
  event_id:id,resend_email_id:providerId,event_type:type
 });
 if(dupeError){
  if(dupeError.code==='23505')return output(200,'Duplicado');
  return output(503,'Registro temporalmente no disponible');
 }
 const col={
  'email.delivered':'delivered_at','email.opened':'opened_at',
  'email.clicked':'clicked_at','email.bounced':'bounced_at',
  'email.complained':'complained_at','email.suppressed':'suppressed_at',
  'email.failed':'failed_at','email.delivery_delayed':'delayed_at'
 }[type] as string|undefined;
 const eventDate=new Date(String(event?.created_at||''));
 const occurred=Number.isFinite(eventDate.getTime())?eventDate.toISOString():new Date().toISOString();
 const patch:Record<string,unknown>={};
 if(col&&!item[col])patch[col]=occurred;
 const statusMap:Record<string,string>={
  'email.delivered':'delivered','email.delivery_delayed':'delayed','email.bounced':'bounced',
  'email.failed':'failed','email.complained':'complained','email.suppressed':'suppressed'
 };
 const status=statusMap[type];
 // Eventos de aperturas/clics no sustituyen la confirmación de entrega.
 if(status){
  const terminal=new Set(['delivered','bounced','failed','complained','suppressed']);
  if(type==='email.delivery_delayed'&&!terminal.has(item.delivery_status))
   patch.delivery_status='delayed';
  else if(type!=='email.delivery_delayed')
   patch.delivery_status=status;
 }
 if(Object.keys(patch).length){
  const {error:updateError}=await db.from('activation_email_items').update(patch).eq('id',item.id);
  if(updateError){
   await db.from('activation_email_events').delete().eq('event_id',id);
   return output(503,'No se pudo aplicar el evento');
  }
 }
 const {data:rows,error:sumError}=await db.from('activation_email_items')
  .select('delivered_at,opened_at,clicked_at,bounced_at,complained_at,suppressed_at,failed_at,delayed_at')
  .eq('activation_id',item.activation_id);
 if(sumError){
  await db.from('activation_email_events').delete().eq('event_id',id);
  return output(503,'No se pudo consolidar');
 }
 const sum=(key:string)=>(rows||[]).filter((r:any)=>!!r[key]).length;
 const {error:totalError}=await db.from('activation_sends').update({
  delivered_count:sum('delivered_at'),
  opened_count:sum('opened_at'),
  clicked_count:sum('clicked_at'),
  bounced_count:sum('bounced_at'),
  complained_count:sum('complained_at'),
  suppressed_count:sum('suppressed_at'),
  failed_delivery_count:sum('failed_at'),
  delayed_count:sum('delayed_at'),
  event_updated_at:new Date().toISOString()
 }).eq('id',item.activation_id).eq('organization_id',item.organization_id);
 if(totalError){
  await db.from('activation_email_events').delete().eq('event_id',id);
  return output(503,'No se pudo consolidar');
 }
 return output(200,'OK');
});
