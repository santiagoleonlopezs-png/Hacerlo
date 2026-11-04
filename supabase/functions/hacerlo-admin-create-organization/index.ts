import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const LEGACY_ORIGIN='https://santiagoleonlopezs-png.github.io';
const NEW_ORIGIN='https://app.hacerlofc.com';
const allowedOrigins=new Set([LEGACY_ORIGIN,NEW_ORIGIN]);
Deno.serve(async(req)=>{
 const origin=req.headers.get('Origin')||'';
 const cors={
  'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:LEGACY_ORIGIN,
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Vary':'Origin'
 };
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const authorization=req.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))return json({error:'Authentication required'},401);
 const url=Deno.env.get('SUPABASE_URL')!,publishable=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const caller=createClient(url,publishable,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:{user},error:userError}=await caller.auth.getUser(authorization.slice(7));
 if(userError||!user)return json({error:'Unauthorized'},401);
 const {data:admin,error:adminError}=await caller.rpc('is_platform_admin');
 if(adminError||admin!==true)return json({error:'Forbidden'},403);
 let payload:any;try{payload=await req.json()}catch{return json({error:'Invalid JSON'},400)}
 const name=typeof payload.name==='string'?payload.name.trim():'';
 const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';
 const expires=payload.expires_at||null;
 if(!name||name.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Invalid name or email'},400);
 if(expires && (!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now()))return json({error:'Invalid expiration'},400);
 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 // Search Auth users on the server only; pagination avoids exposing email addresses to the browser.
 let existing:any=null;
 for(let page=1;page<=50;page++){
  const {data,error}=await service.auth.admin.listUsers({page,perPage:1000});
  if(error)return json({error:'Cannot verify administrator account'},500);
  existing=data.users.find(u=>u.email?.toLowerCase()===email);
  if(existing||data.users.length<1000)break;
 }
 let target=existing;
 let invited=false;
 if(!target){
  const {data,error}=await service.auth.admin.inviteUserByEmail(email,{redirectTo:origin===NEW_ORIGIN?NEW_ORIGIN+'/':LEGACY_ORIGIN+'/Hacerlo/'});
  if(error)return json({error:'Invitation failed: '+error.message},400);
  target=data.user;invited=true;
 }
 if(!target)return json({error:'User lookup failed'},500);
 const {data:id,error}=await caller.rpc('platform_create_organization',{p_name:name,p_admin_user_id:target.id,p_expires_at:expires});
 if(error)return json({error:'Could not create organization: '+error.message,invitation_sent:invited},400);
 return json({organization_id:id,invitation_sent:invited});
});