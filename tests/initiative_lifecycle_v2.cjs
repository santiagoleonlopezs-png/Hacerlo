/* HACERLO: eliminación segura, guardado y visibilidad de errores. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('src/core/app.js','utf8');
const cards=fs.readFileSync('src/core/iniciativas-home.js','utf8');
const page=fs.readFileSync('index.html','utf8');
const start=app.indexOf('async function deleteInitiative(id){');
const end=app.indexOf('let recoveryMode=false;',start);
assert.ok(start>=0&&end>start,'Existe el manejador de eliminación');
const code=app.slice(start,end);
function scenario(kind){
 const cloudId='cloud-row-001',org='org-001';
 const x={id:1001,name:'Ejemplo de prueba',_cloudId:cloudId};
 const db={initiatives:[x],selected:x.id},calls=[],messages=[];
 let backup=0,renders=0,alerts=0;
 const sb={from(table){
  calls.push({table});
  return {delete(){return {
   eq(field,value){calls.push({field,value});return this;},
   select(){return Promise.resolve(kind==='success'?{data:[{id:cloudId}],error:null}:
    kind==='denied'?{data:[],error:null}:{data:null,error:{message:'Restricción referencial'}});}
  }}};
 }};
 const fn=new Function('db','cloudReady','cloudOrgId','initiativeDeleteBusy','syncing','syncPending',
  'syncTimer','sb','setCloudStatus','localBackup','render','go','page','alert','clearTimeout','setTimeout',
  code+'\nreturn deleteInitiative')(
   db,true,org,false,false,false,null,sb,(msg,error)=>messages.push({msg,error}),
   ()=>backup++,()=>renders++,()=>{throw Error('go inesperado');},'Iniciativas',()=>alerts++,()=>{},()=>{});
 return fn(x.id).then(ok=>({ok,db,calls,messages,backup,renders,alerts,cloudId,org}));
}
(async()=>{
 const ok=await scenario('success');
 assert.equal(ok.ok,true);
 assert.equal(ok.db.initiatives.length,0,'Se elimina solo después de confirmar respuesta de Supabase');
 assert.equal(ok.db.selected,null);
 assert.equal(ok.backup,1);
 assert.equal(ok.renders,1);
 assert.ok(ok.calls.some(c=>c.field==='id'&&c.value===ok.cloudId),'Filtra por fila');
 assert.ok(ok.calls.some(c=>c.field==='organization_id'&&c.value===ok.org),'Filtra por empresa');
 const denied=await scenario('denied');
 assert.equal(denied.ok,false);
 assert.equal(denied.db.initiatives.length,1,'No borrar localmente si RLS rechaza');
 assert.equal(denied.backup,0);
 assert.equal(denied.renders,0);
 assert.ok(denied.messages.at(-1).error);
 assert.equal(denied.alerts,1);
 const constraint=await scenario('constraint');
 assert.equal(constraint.ok,false);
 assert.equal(constraint.db.initiatives.length,1,'No borrar localmente si hay una restricción FK');
 assert.match(cards,/async function pfDelete\(button\)/);
 assert.match(cards,/confirm\('¿Eliminar definitivamente/);
 assert.match(cards,/onclick="pfDelete\(this\)"/);
 assert.match(page,/id="sync-retry"/);
 assert.match(app,/syncPending=true/,'Guardado pendiente si otro está en curso');
 assert.match(app,/if\(syncPending&&!initiativeDeleteBusy\)/,'Se reprograma al concluir');
 assert.match(app,/el\.classList\.toggle\('hcx-visually-hidden',!err\)/,'Errores de sincronización visibles');
 console.log('Iniciativas: eliminación segura, control de organización, reintento y errores visibles.');
})().catch(error=>{console.error(error);process.exitCode=1});
