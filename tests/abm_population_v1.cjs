/* Regresión: personas registradas sin población declarada ni adopción evaluada. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=['agentes-evidencia-v2.js','agentes-abm.js','agentes-calibracion.js','agentes-experiencia.js']
  .map(name=>fs.readFileSync('src/modules/analisis/'+name,'utf8')).join('\n');
const x={name:'Prueba ficticia',behaviors:[{id:'b',name:'Usar el servicio',scope:'specific',audienceIds:['a']}],
  audiences:[{id:'a',name:'Usuarios'},{id:'other',name:'Otra audiencia',population:999}],
  audiencePeople:Array.from({length:23},(_,i)=>({id:'p'+i,audienceId:'a'})),nodes:[],edges:[],modelRuns:[]};
x.audiencePeople.push({id:'unrelated',audienceId:'other'});
const form={elements:{behaviorIndex:{value:'0'},mode:{value:'synthetic'},scenario:{value:'friction'},
  initialPct:{value:'5',dataset:{}},periods:{value:'6'},runs:{value:'8'},sampleSize:{value:'50'},seed:{value:'2026'}}};
for(const i of [0,1])for(const dim of ['capability','opportunity','motivation'])form.elements[dim+'_'+i]={value:'.5'};
const dom=new Map();
const node=id=>{if(!dom.has(id))dom.set(id,{textContent:'',innerHTML:'',disabled:false});return dom.get(id)};
const calls=[];
const ctx={console,safe:v=>String(v??''),current:()=>x,save(){},cloudSaveVersion:0,
  confirmCloudSave:async()=>({ok:true}),HACERLO_ENGINE_URL:'https://engine.invalid',SUPABASE_PUBLISHABLE_KEY:'test',
  sb:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}},
  document:{getElementById:id=>id==='abm-form'?form:node(id),querySelectorAll:()=>[]},
  fetch:async(url,opts)=>{calls.push(JSON.parse(opts.body));return {ok:true,json:async()=>({model_version:'abm-1.2'})}}};
vm.createContext(ctx);vm.runInContext(source,ctx);
ctx.abmReadPlannedIntervention=()=>({value:null});
ctx.renderABMVisualResult=()=>'';ctx.renderABMScenarioComparison=()=>'';
async function main(){
  const before=JSON.stringify(x.audiences);
  const evidence=ctx.abmV2EvidenceSummary(x,x.behaviors[0]);
  assert.equal(evidence.eligible,23);assert.equal(evidence.measured,0);
  assert.equal(ctx.abmV2Population(x,x.audiences[0]).population,23);
  x.audiencePeople.push({...x.audiencePeople[0]});
  assert.equal(ctx.abmV2Population(x,x.audiences[0]).population,23,'No duplicar IDs');
  x.audiencePeople.pop();
  const html=ctx.renderABMExperiencePage(x);
  assert.match(html,/0 de 23 personas/);assert.match(html,/cohorte de personas registradas/);
  await ctx.runAgentSimulation({preventDefault(){},target:form});
  assert.equal(calls.length,1);
  assert.equal(calls[0].audiences.length,1);
  assert.equal(calls[0].audiences[0].population,23);
  assert.equal(calls[0].audiences[0].population_source,'registered_people');
  assert.equal(calls[0].initial_adoption,.05,'La falta de estados no cambia la estimación manual');
  assert.equal(ctx.getABMResearchInputs().payload.audiences[0].population,23,'Calibración y sensibilidad usan la misma población');
  assert.equal(x.modelRuns[0].result.population_sources[0].population,23);
  assert.equal(JSON.stringify(x.audiences),before,'No modificar los datos de Gestión de audiencias');
  x.audiences[0].population='200';
  assert.equal(ctx.abmV2Population(x,x.audiences[0]).population,200,'Respetar la población declarada');
  for(const missing of [undefined,'',0,'0']){
    x.audiences[0].population=missing;
    assert.equal(ctx.getABMResearchInputs().payload.audiences[0].population,23);
  }
  ctx.abmRefreshAudienceChoice(x,x.behaviors[0],0);
  assert.match(node('abm-starting-info').textContent,/0 de 23/);
  x.audiencePeople=[];
  assert.throws(()=>ctx.getABMResearchInputs(),/registra personas.*Usuarios/);
  await ctx.runAgentSimulation({preventDefault(){},target:form});
  assert.equal(calls.length,1,'No enviar solicitudes sin población conocida');
  assert.match(node('abm-status').textContent,/Usuarios/);
  assert.equal(node('abm-start').disabled,false);
  console.log('Población ABM OK: 23 personas sin estados, alcance, deduplicación, procedencia y controles.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
