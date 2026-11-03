/* HACERLO · Regresión de asignación exclusiva y conteos multítem. */
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,alert:msg=>{throw Error(msg)}});
for(const p of [
 'src/modules/encuestas/motor.js',
 'src/modules/analisis/capacidad-adaptativa.js',
 'src/modules/analisis/capacidad-adaptativa-lectura.js'
 ])vm.runInContext(fs.readFileSync(path.join(base,p),'utf8'),ctx,{filename:p});
const fn=expr=>vm.runInContext(expr,ctx);
let saves=0;
const x={id:12,capacityAdaptive:{version:1,mappings:{}},
 surveys:[
  {id:'s5',title:'Instrumento 1–5',version:1,kind:'SENTIR',
   questions:[
    {id:'q1',label:'Me siento preparado',type:'scale',dimension:'Preparación',min:1,max:5},
    {id:'q2',label:'Cuento con recursos',type:'scale',dimension:'Preparación',min:1,max:5},
    {id:'fatiga',label:'Me siento agotado',type:'scale',dimension:'Desgaste',min:1,max:5}
   ],
   responses:[
    {id:'a',wave:'Base',answers:{q1:5,q2:1,fatiga:5}},
    {id:'b',wave:'Base',answers:{q1:4,q2:3,fatiga:5}},
    {id:'c',wave:'Base',answers:{q1:3}}
   ]},
  {id:'s10',title:'Instrumento 0–10',version:1,kind:'CNPS',
   questions:[{id:'q10',label:'Apoyaría el cambio',type:'cnps',dimension:'Sin dimensión',min:0,max:10}],
   responses:[
    {id:'a',wave:'Base',answers:{q10:9}},
    {id:'b',wave:'Base',answers:{q10:7}},
    {id:'c',wave:'Base',answers:{q10:6}}
   ]}
 ]};
ctx.x=x;ctx.save=()=>{saves++};ctx.render=()=>{};
vm.runInContext('function current(){return x;}',ctx);
const key5=JSON.stringify(['s5','q1']);
const key10=JSON.stringify(['s10','q10']);
fn('caConfirmSuggested()');
assert.equal(fn('caSelection(x,CA_DIMENSIONS[1],caCandidates(x)).length'),2);
assert.equal(fn("caSelection(x,CA_DIMENSIONS[3],caCandidates(x)).length"),0);
const dim=fn("caReadObserved(x,'Base').dimensions.preparacion");
assert.equal(dim.ready,true);
assert.equal(dim.counts.promoters,2); // q1: 5, 4
assert.equal(dim.counts.passives,2);  // q1: 3, q2: 3
assert.equal(dim.counts.detractors,1);// q2: 1
assert.equal(dim.counts.n,5);         // 5 respuestas, 3 personas
assert.equal(dim.value,20);           // (2-1)/5 * 100; no promedio de índices
const energy=fn("caReadObserved(x,'Base','',false).dimensions.energia");
assert.equal(energy.needsOrientation,true);
assert.equal(energy.ready,false);
const inverted=fn("caReadObserved(x,'Base','',true).dimensions.energia");
assert.equal(inverted.ready,true);
assert.equal(inverted.counts.detractors,2); // inversión antes de clasificar
assert.equal(inverted.value,-100);
ctx.targetDim='memoria';ctx.targetKey=key10;
vm.runInContext('caAssignQuestion(targetDim,targetKey)',ctx);
const memory=fn("caReadObserved(x,'Base').dimensions.memoria");
assert.equal(memory.ready,true);
assert.equal(memory.scale,'0-10');
assert.equal(memory.counts.promoters,1);
assert.equal(memory.counts.passives,1);
assert.equal(memory.counts.detractors,1);
assert.equal(memory.value,0);
ctx.targetDim='preparacion';
vm.runInContext('caAssignQuestion(targetDim,targetKey)',ctx);
assert.equal(fn('caAssignmentMap(x).get(targetKey)'),'preparacion');
assert.equal(fn("caReadObserved(x,'Base').dimensions.memoria.sources.length"),0);
const mixed=fn("caReadObserved(x,'Base').dimensions.preparacion");
assert.equal(mixed.ready,false);
assert.equal(mixed.compatibleScale,false);
assert.equal(mixed.value,null);
assert.match(mixed.warning,/1–5 y 0–10/);
assert.ok(saves>=3);
console.log('PASS · 1–5 / 0–10 · conteos agrupados · sin duplicación · escala mixta bloqueada · inversión de Desgaste');
