
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const cors={
 'Access-Control-Allow-Origin':'https://santiagoleonlopezs-png.github.io',
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Vary':'Origin'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});
Deno.serve(async(request:Request)=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({error:'Método no permitido'},405);
 const authorization=request.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))return json({error:'Debes iniciar sesión'},401);
 const url=Deno.env.get('SUPABASE_URL')||'';
 const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(!url||!anon||!secret)return json({error:'Configuración de servidor incompleta'},500);
 const caller=createClient(url,anon,{
   global:{headers:{Authorization:authorization}},
   auth:{persistSession:false,autoRefreshToken:false}
 });
 const {data:{user},error:userError}=await caller.auth.getUser(authorization.substring(7));
 if(userError||!user)return json({error:'Sesión inválida'},401);
 const {data:admin,error:adminError}=await caller.rpc('is_platform_admin');
 if(adminError||admin!==true)return json({error:'Acceso exclusivo de superadministrador'},403);

 let body:any;
 try{body=await request.json()}catch{return json({error:'Datos de solicitud inválidos'},400)}
 const organization_id=typeof body.organization_id==='string'?body.organization_id.trim():'';
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 const role=typeof body.role==='string'?body.role.trim():'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organization_id))
   return json({error:'Fábrica inválida'},400);
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
   return json({error:'Correo electrónico inválido'},400);
 if(!['admin','editor','viewer'].includes(role))
   return json({error:'Selecciona administrador, editor o consulta'},400);

 const {data:members,error:membersError}=await caller.rpc('platform_admin_members',{p_org:organization_id});
 if(membersError)return json({error:'No se pudo verificar la fábrica: '+membersError.message},400);
 if((members||[]).some((m:any)=>m.email?.toLowerCase()===email))
   return json({error:'Esta persona ya pertenece a la fábrica. Puedes cambiar su rol en la lista.'},409);

 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 // Nombre real de la fábrica para personalizar el correo de invitación.
 const {data:organization,error:orgError}=await service.from('organizations')
   .select('id,name').eq('id',organization_id).single();
 if(orgError||!organization?.name)return json({error:'No se pudo validar el nombre de la fábrica'},400);
 const organizationName=String(organization.name).slice(0,120);
 const roleLabel={admin:'Administrador',editor:'Editor',viewer:'Consulta'}[role];
 let found:any=null;
 // Buscar usuarios en el servidor; las direcciones no se envían al navegador.
 for(let page=1;page<=50;page++){
  const {data,error}=await service.auth.admin.listUsers({page,perPage:1000});
  if(error)return json({error:'No se pudo consultar la cuenta de usuario'},500);
  found=data.users.find(u=>u.email?.toLowerCase()===email);
  if(found||data.users.length<1000)break;
 }
 let invited=false;
 if(!found){
  const {data,error}=await service.auth.admin.inviteUserByEmail(email,{
    redirectTo:'https://santiagoleonlopezs-png.github.io/Hacerlo/',
    // Estas propiedades están disponibles en la plantilla de Auth como {{ .Data.organization_name }}.
    data:{organization_name:organizationName,role_label:roleLabel,invited_from:'HACERLO Admin'}
  });
  if(error)return json({error:'No se pudo enviar la invitación: '+error.message},400);
  found=data.user;
  invited=true;
 }
 if(!found?.id)return json({error:'No fue posible obtener el usuario'},500);
 // El RPC autentica al superadministrador y protege el aislamiento por organización.
 const {error:addError}=await caller.rpc('platform_admin_add_member',{
  p_org:organization_id,p_user:found.id,p_role:role
 });
 if(addError)return json({
   error:'No se pudo asignar acceso: '+addError.message,
   invitation_sent:invited
 },400);
 return json({
  ok:true,organization_id,organization_name:organizationName,email,role,user_id:found.id,
  invitation_sent:invited,existing_account:!invited
 });
});
