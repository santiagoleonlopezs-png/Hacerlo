/* HACERLO · Señales adaptativas sin automatizar ni simular adopción. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('src/modules/implementacion/centro-senales.js','utf8');
const action={id:'a-1',name:'Reportar incidentes',behaviorId:'b-1',mechanisms:['comunicacion']};
const x={
 actions:[action],behaviors:[{id:'b-1',name:'Registrar incidente dentro de 24h',scope:'all'}],
 indicators:[{id:'i-1',name:'Oportunidad de reporte',baseline:'20',target:'80',value:'40',unit:'Porcentaje (%)',behaviorIds:['b-1']},
  {id:'i-2',name:'Otro indicador',baseline:20,target:30,value:15,behaviorIds:['b-2']}],
 audiences:[{id:'aud-1',name:'Equipo',barriers:'No hay instrucciones claras'}],
 audiencePeople:[
  {id:'1',audienceId:'aud-1',adoptionHistory:[{behaviorId:'b-1',stage:'tries',observedOn:'2026-10-20'}]},
  {id:'2',audienceId:'aud-1',adoptionHistory:[{behaviorId:'b-1',stage:'performs',observedOn:'2026-10-20'}]},
  {id:'3',audienceId:'aud-1',adoptionHistory:[{behaviorId:'b-1',stage:'tries',observedOn:'2026-10-20'}]}
 ]
};
let saved=0,rendered=0,network=0;
const ctx={
 console,Date,Number,
 current:()=>x,cacAction:()=>({action,index:0}),cacBusy:false,cacEditorOpen:false,
 cacEnsureMechanism:(a,k)=>{a.mechanisms=[...new Set([...(a.mechanisms||[]),k])];},
 cacEnsureNew:(a,stage,kind)=>({id:'step-new',stage,kind,title:'',body:'',cta:'',status:'draft'}),
 cacSteps:a=>a.activationSequence||[],cacKeepVisibleDraft:()=>true,
 cacSafe:v=>String(v??'').replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])),
 save:()=>saved++,render:()=>rendered++,
 document:{getElementById:()=>null},
 sb:{functions:{invoke:()=>network++}}
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const row={action,index:0};
assert.equal(ctx.cacSignalNumber(''),null);
assert.equal(ctx.cacSignalNumber('0'),0);
let model=ctx.cacSignalModel(x,row);
assert.equal(model.behaviors.length,1);
assert.equal(model.indicators.length,1,'Indicadores ajenos no contaminan la interpretación');
assert.equal(model.indicators[0].state,'pending');
assert.equal(model.observed.total,3);
assert.equal(model.observed.tries,2);
assert.equal(model.suggested.stage,'recordar');
assert.equal(model.suggested.kind,'comunicacion');
assert.match(ctx.cacSignalPanel(x,row),/Preparar refuerzo/);
assert.match(ctx.cacSignalPanel(x,row),/meta aún no alcanzada/);
assert.match(ctx.cacSignalPanel(x,row),/no diagnóstico causal/);
ctx.cacPrepareFromSignal();
assert.equal(action.activationSequence.length,1);
assert.equal(action.activationSequence[0].standalone,true,'No requiere secuencia completa');
assert.equal(action.activationSequence[0].status,'draft');
assert.equal(action.activationSequence[0].audienceIds.length,0,'No selecciona personas');
assert.match(action.activationSequence[0].basis.source,/indicadores_y_adopcion/);
assert.equal(saved,1);assert.equal(rendered,1);assert.equal(network,0,'No se envió ningún correo');

x.indicators[0].value='95';
model=ctx.cacSignalModel(x,row);
assert.equal(model.indicators[0].state,'target');
assert.equal(model.suggested.stage,'activar','La evidencia de prueba permite recomendar apoyo a la ejecución');
x.audiencePeople.forEach(p=>p.adoptionHistory[0].stage='sustains');
model=ctx.cacSignalModel(x,row);
assert.equal(model.suggested.stage,'sostener');
assert.equal(model.suggested.kind,'reconocimiento');
x.indicators[0].value='';
x.indicators[0].history=[];
x.audiencePeople=[];
x.audiences[0].barriers='';
model=ctx.cacSignalModel(x,row);
assert.equal(model.indicators[0].current,null,'No inferir medición por campo vacío');
assert.equal(model.suggested,null);
assert.match(ctx.cacSignalPanel(x,row),/Sin señal suficiente/);
const orphan=ctx.cacSignalModel(x,{action:{name:'Otra acción'},index:1});
assert.equal(orphan.hasLinks,false);
assert.equal(orphan.suggested,null);
assert.match(ctx.cacSignalPanel(x,{action:{name:'Otra acción'},index:1}),/Sin comportamiento vinculado/);
console.log('Centro de activación: señales verificables y borradores adaptativos sin autoenvíos.');
