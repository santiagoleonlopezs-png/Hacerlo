/* Selector de audiencias en Simulación: subconjuntos permitidos y límites del comportamiento. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const evidence=fs.readFileSync('src/modules/analisis/agentes-evidencia-v2.js','utf8');
const simulator=fs.readFileSync('src/modules/analisis/agentes-abm.js','utf8');
const calibration=fs.readFileSync('src/modules/analisis/agentes-calibracion.js','utf8');
const guided=fs.readFileSync('src/modules/analisis/agentes-experiencia.js','utf8');
const initiative={
 name:'Piloto ficticio',
 behaviors:[{id:'b1',name:'Uso del CRM',scope:'specific',audienceIds:['a','b']}],
 audiences:[{id:'a',name:'Asesores',population:30},{id:'b',name:'Líderes',population:20},
            {id:'c',name:'Soporte',population:10}],
 nodes:[],edges:[],modelRuns:[],abmSettings:{}
};
const inputBoxes=[{value:'a',checked:true},{value:'b',checked:true}];
const start={disabled:false};
const summary={textContent:''};
const form={elements:{behaviorIndex:{value:'0'}}};
const ctx={
 console,safe:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
 current:()=>initiative,save(){},
 document:{getElementById:id=>id==='abm-form'?form:id==='abm-start'?start:id==='abm-audience-summary'?summary:null,
  querySelectorAll:()=>inputBoxes}
};
vm.createContext(ctx);
vm.runInContext(evidence+'\n'+simulator+'\n'+calibration+'\n'+guided,ctx);
const b=initiative.behaviors[0];
assert.deepEqual(ctx.abmApplicableAudiences(initiative,b).map(v=>v.id),['a','b']);
assert.deepEqual(ctx.abmSelectedAudiences(initiative,b,0).map(v=>v.id),['a','b']);
let markup=ctx.renderABMExperiencePage(initiative);
assert.equal((markup.match(/data-abm-audience /g)||[]).length,2);
assert.doesNotMatch(markup,/value="c"[^>]*data-abm-audience/);
ctx.abmToggleAudience('b',false);
assert.deepEqual(ctx.abmSelectedAudiences(initiative,b,0).map(v=>v.id),['a']);
assert.match(summary.textContent,/1 seleccionada/);
ctx.abmToggleAudience('a',false);
assert.deepEqual(ctx.abmSelectedAudiences(initiative,b,0),[]);
assert.equal(start.disabled,true);
ctx.abmToggleAudience('c',true);
assert.deepEqual(ctx.abmSelectedAudiences(initiative,b,0),[],'No se puede agregar audiencia ajena al comportamiento');
ctx.abmSelectAllAudiences();
assert.deepEqual(ctx.abmSelectedAudiences(initiative,b,0).map(v=>v.id),['a','b']);
assert.equal(start.disabled,false);
const config=initiative.abmAudienceSelection;
assert.ok(!Object.hasOwn(config,'b1'),'Restaurar selección total es el valor predeterminado');

form.elements.mode={value:'synthetic'};
form.elements.scenario={value:'training'};
form.elements.initialPct={value:'10'};
form.elements.periods={value:'6'};
form.elements.sampleSize={value:'50'};
form.elements.seed={value:'2026'};
form.elements.runs={value:'10'};
for(const i of [0,1,2]){
  for(const k of ['capability','opportunity','motivation']){
    form.elements[k+'_'+i]={value:'0.5'};
  }
}
initiative.abmAudienceSelection={b1:['b']};
const research=ctx.getABMResearchInputs().payload;
assert.deepEqual(research.audiences.map(a=>a.id),['b'],'La calibración debe usar la audiencia seleccionada');
assert.equal(research.audiences[0].population,20);
initiative.abmAudienceSelection={b1:[]};
assert.throws(()=>ctx.getABMResearchInputs(),/No hay audiencias aplicables/);

console.log('Audiencias ABM V2 OK: selección múltiple, filtrado, vacío y restauración total');
