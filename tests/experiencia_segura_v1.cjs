const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('src/core/app.js','utf8');
const helpers=fs.readFileSync('src/core/experiencia-segura.js','utf8');
const operations=fs.readFileSync('src/modules/implementacion/operaciones.js','utf8');
function navigation(){
 const input={name:'action',type:'text',defaultValue:'Original',value:'Original'},form={id:'example',elements:[input]};
 let allow=false,asks=0,unload,scrolled=false,focused=false;
 const ctx={WeakMap,JSON,Array,confirm:()=>{asks++;return allow},render(){},cloudSaveVersion:0,cloudConfirmedVersion:0,
  document:{querySelectorAll:()=>[form],querySelector:()=>({setAttribute(){},focus(){focused=true}})},
  window:{scrollTo(){scrolled=true},addEventListener(type,fn){if(type==='beforeunload')unload=fn}}};
 vm.createContext(ctx);vm.runInContext(helpers,ctx);ctx.render();
 input.value='Nuevo';assert.equal(ctx.hcxPrepareNavigation(),false);assert.equal(asks,1);
 assert.equal(input.value,'Nuevo','Cancelar la salida conserva el texto');
 allow=true;assert.equal(ctx.hcxPrepareNavigation(),true);assert.equal(ctx.hcxPrepareNavigation(),true);assert.equal(asks,2);
 input.value='Otro';let blocked=false;unload({preventDefault(){blocked=true}});assert.equal(blocked,true);
 ctx.hcxAfterNavigation();assert.ok(scrolled&&focused);
 const select={name:'unit',tagName:'SELECT',type:'select-one',options:[{value:'A',selected:true,defaultSelected:false},{value:'B',selected:false,defaultSelected:false}]};
 assert.equal(ctx.hcxFormChanged({elements:[select]}),false,'El primer option es el valor inicial por defecto');
}
async function logout(confirmed,discard=true){
 let signedOut=0,status='';const initial={initiatives:[{id:1}],selected:1};
 const ctx={logoutPending:false,db:initial,cloudReady:true,cloudOrgId:'mock',cloudSaveVersion:2,cloudConfirmedVersion:1,syncing:false,syncPending:false,syncTimer:null,
  hcxPrepareNavigation:()=>discard,confirmCloudSave:async()=>({ok:confirmed,message:'Error simulado'}),
  sb:{auth:{signOut:async()=>{signedOut++;return {error:null}}}},clearTimeout(){},setCloudStatus:m=>status=m,document:{getElementById:()=>({style:{}})}};
 vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('let logoutPending='),app.indexOf('const current=')),ctx);
 const result=await ctx.logoutHacerlo();
 if(!confirmed||!discard){assert.equal(signedOut,0);assert.equal(ctx.db,initial);assert.equal(result,false);}
 else{assert.equal(signedOut,1);assert.equal(ctx.db.initiatives.length,0);assert.equal(result,true);}
 if(!confirmed&&discard)assert.match(status,/No cerramos la sesión/);
}
async function atomicGraph(){
 let calls=0,payload,id=0,fail=false;
 const ctx={crypto:{randomUUID:()=>String(++id)},edgeRelation:()=> 'Influye en',normalizeRelation:v=>v,evidenceToDb:()=> 'observed',
  sb:{rpc:async(name,data)=>{calls++;assert.equal(name,'save_initiative_graph');payload=data;return {error:fail?Error('RPC falló'):null}}}};
 vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('async function syncGraphForInitiative'),app.indexOf('async function syncAll')),ctx);
 const graph={_cloudId:'mock',nodes:[{name:'A'},{name:'B'}],edges:[{s:0,t:1}]};
 await ctx.syncGraphForInitiative(graph);assert.equal(calls,1);assert.equal(payload.p_nodes.length,2);
 assert.equal(payload.p_edges[0].source_node_id,payload.p_nodes[0].id);
 fail=true;await assert.rejects(()=>ctx.syncGraphForInitiative(graph),/RPC falló/);
}
function metricDialog(){
 let root=null,dirty=false,discard=true,keyHandler,focused='';
 const doc={activeElement:{isConnected:true,focus(){focused='trigger'}},querySelector(){return null},body:{insertAdjacentHTML(){root=overlay}}};
 const control=name=>({value:'',focus(){doc.activeElement=this;focused=name}});
 const fields=Object.fromEntries(['key','date','value','period','notes','definition'].map(name=>[name,control(name)]));
 const first=control('first'),last=control('last'),form={elements:fields};
 const overlay={style:{},querySelector:()=>form,querySelectorAll:()=>[first,fields.value,last],addEventListener(type,fn){keyHandler=fn}};
 const ctx={Date,current:()=>({metrics:{}}),document:doc,$:id=>id==='metric-entry'?root:{textContent:''},hcxRememberForm(){},hcxFormChanged:()=>dirty,confirm:()=>discard};
 vm.createContext(ctx);vm.runInContext(operations.slice(operations.indexOf('const coreMetricNames='),operations.indexOf('function recordCoreMetric')),ctx);
 ctx.openMetricEntry('cnps');assert.equal(focused,'value');assert.equal(root.style.display,'flex');
 const event={key:'Tab',preventDefault(){},stopPropagation(){}};
 doc.activeElement=last;keyHandler(event);assert.equal(focused,'first');
 doc.activeElement=first;keyHandler({...event,shiftKey:true});assert.equal(focused,'last');
 dirty=true;discard=false;ctx.closeMetricEntry();assert.equal(root.style.display,'flex');
 discard=true;keyHandler({...event,key:'Escape'});assert.equal(root.style.display,'none');assert.equal(focused,'trigger');
 assert.match(operations,/role="dialog" aria-modal="true" aria-labelledby="metric-title"/);
}
(async()=>{navigation();await logout(false);await logout(true,false);await logout(true);await atomicGraph();metricDialog();
 console.log('Experiencia segura OK: borradores, salida con error, RPC atómico, orientación y teclado del diálogo.');
})().catch(error=>{console.error(error);process.exitCode=1});
