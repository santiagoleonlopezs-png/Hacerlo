
/* HACERLO Admin · Membresías por fábrica. Nunca usa service_role en el navegador. */
(function(){
 const roles=[
  {value:'admin',text:'Administrador'},
  {value:'editor',text:'Editor'},
  {value:'viewer',text:'Consulta'}
 ];
 const roleName={owner:'Propietario',admin:'Administrador',editor:'Editor',viewer:'Consulta'};
 function make(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function createHacerloMemberManager({sb,reloadOrganizations}){
  const dialog=document.createElement('dialog');
  dialog.className='ham-dialog';
  dialog.setAttribute('aria-labelledby','ham-title');
  dialog.innerHTML=`
   <div class="ham-header">
    <div><div class="ham-overline">ACCESOS POR ORGANIZACIÓN</div>
      <h2 id="ham-title">Administrar usuarios</h2>
      <p id="ham-org-label" class="ham-org-label"></p></div>
    <button id="ham-close" class="secondary ham-close" type="button" aria-label="Cerrar administración de usuarios">Cerrar</button>
   </div>
   <div class="ham-section">
    <h3>Invitar a esta fábrica</h3>
    <p>El usuario recibirá una invitación si no tiene cuenta. Si ya tiene una, se asignará el acceso a esta empresa.</p>
    <form id="ham-invite-form" class="ham-invite-form">
      <label>Correo electrónico<input id="ham-email" type="email" autocomplete="email" maxlength="254" required placeholder="persona@empresa.com"></label>
      <label>Rol de acceso
       <select id="ham-role" required>
        <option value="viewer">Consulta · solo lectura</option>
        <option value="editor">Editor · puede modificar</option>
        <option value="admin">Administrador de empresa</option>
       </select>
      </label>
      <button id="ham-invite-button" type="submit">Invitar usuario</button>
    </form>
    <p class="ham-hint">Los administradores de empresa no son superadministradores y no pueden acceder a este panel.</p>
   </div>
   <div class="ham-section">
    <div class="ham-list-heading"><h3>Usuarios de la fábrica</h3>
      <button id="ham-refresh" type="button" class="secondary">Actualizar</button></div>
    <div class="ham-table-scroll"><table class="ham-table">
      <thead><tr><th>Correo</th><th>Rol</th><th>Acción</th></tr></thead>
      <tbody id="ham-members"></tbody>
    </table></div>
   </div>
   <p id="ham-message" class="ham-message" role="status" aria-live="polite"></p>
   <p class="ham-hint">Retirar un usuario elimina su acceso a esta fábrica, no su cuenta global ni los datos de la empresa. El propietario no se puede modificar desde aquí.</p>
  `;
  document.body.appendChild(dialog);
  const get=id=>dialog.querySelector('#'+id);
  let factory=null;
  let busy=false;
  const message=(text,error=false)=>{const elem=get('ham-message');elem.textContent=text;elem.classList.toggle('is-error',!!error)};
  function setBusy(next){
   busy=next;
   get('ham-invite-button').disabled=next;
   get('ham-refresh').disabled=next;
  }
  function roleSelect(member){
   const select=make('select','ham-row-role');
   if(member.role==='owner'){
    select.add(new Option('Propietario · protegido','owner'));
    select.disabled=true;
    select.setAttribute('aria-label','Propietario protegido');
    return select;
   }
   for(const r of roles)select.add(new Option(r.text,r.value));
   select.value=member.role;
   select.setAttribute('aria-label','Rol de '+member.email);
   select.addEventListener('change',async()=>{
    const next=select.value,previous=member.role;
    if(busy){select.value=previous;return}
    if(!window.confirm('¿Cambiar a '+roleName[next]+' el acceso de '+member.email+'?')){
      select.value=previous;return;
    }
    select.disabled=true;
    message('Actualizando permisos…');
    const {error}=await sb.rpc('platform_admin_change_member_role',{
     p_org:factory.id,p_user:member.user_id,p_role:next
    });
    if(error){select.value=previous;select.disabled=false;message(error.message,true);return}
    member.role=next;
    message('Permisos actualizados.');
    await refreshMembers();
   });
   return select;
  }
  function row(member){
   const tr=make('tr');
   const email=make('td','ham-user-email',member.email||'Sin correo');
   const role=make('td');role.append(roleSelect(member));
   const action=make('td');
   if(member.role==='owner'){
    action.append(make('span','ham-owner-label','Protegido'));
   }else{
    const remove=make('button','secondary ham-remove','Retirar');
    remove.type='button';
    remove.setAttribute('aria-label','Retirar a '+member.email);
    remove.addEventListener('click',async()=>{
     if(busy)return;
     if(!window.confirm('¿Retirar a '+member.email+' de '+factory.name+'? No se borrarán sus datos personales ni las iniciativas.'))return;
     remove.disabled=true;message('Retirando acceso…');
     const {error}=await sb.rpc('platform_admin_remove_member',{p_org:factory.id,p_user:member.user_id});
     if(error){remove.disabled=false;message(error.message,true);return}
     message('Usuario retirado de esta fábrica.');
     await refreshMembers();await reloadOrganizations();
    });
    action.append(remove);
   }
   tr.append(email,role,action);
   return tr;
  }
  async function refreshMembers(){
   if(!factory)return;
   const tbody=get('ham-members');
   tbody.replaceChildren();
   const tr=make('tr'),td=make('td','ham-loading','Cargando usuarios…');td.colSpan=3;tr.append(td);tbody.append(tr);
   const {data,error}=await sb.rpc('platform_admin_members',{p_org:factory.id});
   tbody.replaceChildren();
   if(error){message('No se pudo obtener la lista: '+error.message,true);return}
   if(!data?.length){
    const empty=make('tr'),cell=make('td','ham-loading','Aún no hay usuarios asignados');cell.colSpan=3;empty.append(cell);tbody.append(empty);
   }else data.forEach(member=>tbody.append(row(member)));
   get('ham-title').textContent='Administrar usuarios ('+(data?.length||0)+')';
  }
  async function open(organization){
   factory=organization;
   get('ham-org-label').textContent=organization.name;
   get('ham-email').value='';
   get('ham-role').value='viewer';
   message('');
   dialog.showModal();
   await refreshMembers();
   if(organization.status!=='active')message('Esta fábrica no está activa. Los accesos comenzarán a funcionar al reactivarla.',true);
  }
  get('ham-close').addEventListener('click',()=>dialog.close());
  get('ham-refresh').addEventListener('click',()=>refreshMembers());
  get('ham-invite-form').addEventListener('submit',async(event)=>{
   event.preventDefault();
   if(!factory||busy)return;
   const email=get('ham-email').value.trim().toLowerCase();
   const role=get('ham-role').value;
   if(!roles.some(item=>item.value===role))return message('Rol inválido',true);
   setBusy(true);message('Verificando cuenta y asignando acceso…');
   try{
    const {data,error}=await sb.functions.invoke('hacerlo-admin-invite-member',{
     body:{organization_id:factory.id,email,role}
    });
    if(error||data?.error){
      let detail=data?.error||error?.message||'No se pudo completar la invitación';
      if(error?.context && typeof error.context.json==='function'){
       try{const body=await error.context.json();detail=body?.error||detail}catch{}
      }
      throw Error(detail);
    }
    get('ham-email').value='';
    await refreshMembers();
    await reloadOrganizations();
    message(data.invitation_sent?'Usuario agregado. Invitación enviada por correo.':'Cuenta existente vinculada. Ya puede entrar con sus credenciales.');
   }catch(err){message('No se pudo invitar: '+(err?.message||'Error desconocido'),true)}
   finally{setBusy(false)}
  });
  return {open,close:()=>dialog.close()};
 }
 window.createHacerloMemberManager=createHacerloMemberManager;
})();
