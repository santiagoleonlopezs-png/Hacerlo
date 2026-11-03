/* HACERLO · Regresión del motor original AnyLogic y conexión de escenarios. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,alert:(msg)=>{throw Error(msg)},document:{getElementById:()=>null}});
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
for(const p of [
 'src/modules/encuestas/motor.js',
 'src/modules/analisis/capacidad-adaptativa.js',
 'src/modules/analisis/capacidad-adaptativa-lectura.js',
 'src/modules/analisis/capacidad-adaptativa-vista.js',
 'src/modules/analisis/capacidad-adaptativa-motor.js',
 'src/modules/analisis/capacidad-adaptativa-simulacion-ui.js',
 'src/modules/analisis/pensamiento-hub.js'
 ])vm.runInContext(read(p),ctx,{filename:p});
const measure=expr=>vm.runInContext(expr,ctx);
const near=(actual,expected,tol=1e-8)=>assert.ok(Math.abs(actual-expected)<tol,actual+' != '+expected);
const reference=measure('CA_DYN.run({weeks:52})');
assert.equal(reference.series.length,53);
near(reference.initial.energia,15.75);
near(reference.initial.preparacion,43.18);
near(reference.initial.apertura,38.36);
near(reference.initial.memoria,30.30);
near(reference.initial.madurez,30.6835);
near(reference.final.energia,15.75);
near(reference.final.preparacion,46.2431102173052);
near(reference.final.apertura,41.5738007128863);
near(reference.final.memoria,46.9851689840088);
near(reference.final.madurez,34.747968555370136);
assert.equal(reference.integration,'Euler');
assert.equal(reference.stepWeeks,0.001);
assert.equal(reference.weeks,52);
const intervention=measure('CA_DYN.run({weeks:52,inputs:{cambio:30,cargaOperativa:15,liderazgo:55,acompanamiento:40}})');
assert.ok(Math.abs(intervention.final.energia-reference.final.energia)>0.01);
assert.ok(intervention.series.every(row=>Object.values(row).every(Number.isFinite)));
const x={id:77,name:'Prueba de integración',systemV23:{conditions:[],mechanisms:[],hypotheses:[],events:[]},
 audiences:[{id:'A',name:'Audiencia de prueba'}],
 surveys:[{id:'s1',title:'Pulso SENTIR',version:1,kind:'SENTIR',
 questions:[{id:'d',label:'Fatiga',type:'scale',dimension:'Desgaste',min:1,max:5},
 {id:'p',label:'Preparación',type:'scale',dimension:'Preparación',min:1,max:5},
 {id:'a',label:'Apertura',type:'scale',dimension:'Apertura',min:1,max:5},
 {id:'m',label:'Experiencia',type:'scale',dimension:'Experiencia',min:1,max:5},
 {id:'n',label:'CNPS',type:'cnps',dimension:'CNPS',min:0,max:10}],
 responses:[{id:'r1',wave:'Base',audienceId:'A',answers:{d:5,p:4,a:5,m:3,n:9}},
 {id:'r2',wave:'Base',audienceId:'A',answers:{d:3,p:4,a:3,m:4,n:6}}]}]};
const root={innerHTML:'',insertAdjacentHTML(where,html){
 this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;
}};
ctx.x=x;ctx.root=root;ctx.saved=0;
ctx.safe=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
vm.runInContext(`function current(){return x;}
function save(){saved++;}
function render(){sysHubRender(root,x);}
function sysStore(y){return y.systemV23;}
function sysRender(a){a.innerHTML='<div class="sv-shell">Vista sistémica</div>';}`,ctx);
measure('sysHubRender(root,x)');
assert.equal((root.innerHTML.match(/class="sh-module"/g)||[]).length,2);
measure("sysHubOpen('lectura')");
assert.ok(root.innerHTML.includes('Vista sistémica'));
measure("sysHubOpen('capacidad')");
assert.ok(root.innerHTML.includes('Medición inicial'));
// Sin vinculación explícita nunca deben aparecer valores de ejemplo ni ejecutarse el motor.
const empty=measure('caDynInitial(x)');
assert.equal(empty.ready,false);
assert.equal(Object.keys(empty.initial).length,0);
assert.ok(root.innerHTML.includes('Sin mediciones configuradas'));
assert.ok(!root.innerHTML.includes('15.75'));
assert.ok(!root.innerHTML.includes('43.18'));
measure("caDynTab('escenarios')");
assert.ok(root.innerHTML.includes('Configura primero la medición real'));
assert.equal((root.innerHTML.match(/type="range"/g)||[]).length,0);
assert.throws(()=>measure('caDynSimulate()'),/Configura y valida/);
assert.equal(x.capacityAdaptive?.simulationRuns?.length||0,0);
// Las sugerencias no se computan hasta confirmarlas.
measure("caDynTab('medicion');caDynOpenEvidence();caConfirmSuggested()");
const configured=measure('caDynInitial(x)');
assert.equal(configured.ready,false);
near(configured.initial.preparacion,75);
assert.equal(configured.sources.energia.kind,'missing');
measure('caDynInvert(true)');
const observed=measure('caDynInitial(x)');
assert.equal(observed.ready,true);
near(observed.initial.energia,25);
measure("caDynTab('escenarios')");
assert.equal((root.innerHTML.match(/type="range"/g)||[]).length,6);
measure("caDynInput('liderazgo',55)");
measure("caDynSimulate()");
assert.ok(root.innerHTML.includes('Comparar resultados'));
assert.equal(x.capacityAdaptive.simulationRuns.length,1);
assert.equal(x.capacityAdaptive.simulationRuns[0].source,'observed');
assert.equal(x.capacityAdaptive.simulationRuns[0].evidenceOnly,true);
assert.equal(x.capacityAdaptive.simulationRuns[0].baseline.length,53);
assert.equal(x.capacityAdaptive.simulationRuns[0].scenario.length,53);
assert.equal(ctx.saved,2);
measure("sysHubOpen('inicio')");
assert.equal((root.innerHTML.match(/class="sh-module"/g)||[]).length,2);
console.log('PASS · AnyLogic 8.9.9 · medición estricta sin valores sustitutos · escenarios con evidencia real');
