/* Integración ficticia Diseño → Grafo → ABM → Supabase.
   No toca cuentas reales, datos privados ni desplegados en Render. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/);
assert(inline,'Falta script principal');
const sim=fs.readFileSync('simulacion-agentes.js','utf8');
const lab=fs.readFileSync('calibracion-agentes.js','utf8');
const memory={initiatives:[],graph_nodes:[],graph_edges:[],memberships:[
  {organization_id:'org-test',role:'owner'}]};
let uuid=0;
const dom=new Map();
const element=id=>{
  if(!dom.has(id))dom.set(id,{innerHTML:'',textContent:'',disabled:false,
    style:{},value:'',classList:{add(){},remove(){},toggle(){}},
    addEventListener(){},querySelectorAll(){return[]}});
  return dom.get(id);
};
const calls=[];
function query(table){
  let operation='select',payload=null,filters=[];
  const builder={
    select(){return this},
    insert(data){operation='insert';payload=data;return this},
    update(data){operation='update';payload=data;return this},
    delete(){operation='delete';return this},
    eq(key,value){filters.push([key,value]);return this},
    limit(){return this},order(){return this},
    single(){return Promise.resolve(result()).then(r=>({
      data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error
    }))},
    then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}
  };
  function result(){
    const rows=memory[table];
    if(!rows)return {data:null,error:{message:'Tabla inexistente '+table}};
    const matches=r=>filters.every(([k,v])=>r[k]===v);
    if(operation==='select')return {data:rows.filter(matches).map(r=>structuredClone(r)),error:null};
    if(operation==='delete'){memory[table]=rows.filter(r=>!matches(r));return{data:null,error:null}}
    if(operation==='insert'){
      const items=(Array.isArray(payload)?payload:[payload]).map(r=>structuredClone(r));
      if(table==='initiatives')items.forEach(r=>r.id='cloud-'+(++uuid));
      rows.push(...items);return{data:items,error:null};
    }
    if(operation==='update'){
      rows.filter(matches).forEach(row=>Object.assign(row,structuredClone(payload)));
      return {data:null,error:null};
    }
    throw Error('Operación desconocida '+operation);
  }
  return builder;
}
const mockClient={from:query,auth:{
  getSession:async()=>({data:{session:{access_token:'token-ficticio'}}}),
  onAuthStateChange(){},signOut:async()=>({error:null})}
};
class MockFormData{
  constructor(target){this.items=target.data||{}}
  *[Symbol.iterator](){yield* Object.entries(this.items)}
  getAll(name){return this.items[name]===undefined?[]:
    (Array.isArray(this.items[name])?this.items[name]:[this.items[name]])}
}
const ctx={console,FormData:MockFormData,
  crypto:{randomUUID:()=> 'uuid-'+(++uuid)},
  window:{supabase:{createClient:()=>mockClient}},
  localStorage:{values:new Map(),setItem(k,v){this.values.set(k,v)},getItem(k){return this.values.get(k)||null}},
  document:{getElementById:element,addEventListener(){},querySelector(sel){
    if(sel==='input[name="useCalibrated"]')return element('calibrated-checkbox');
    return null}},
  setTimeout(){return 1},clearTimeout(){},
  fetch:async(url,options)=>{
    const payload=JSON.parse(options.body);
    calls.push({url,payload,auth:options.headers.Authorization});
    let response;
    if(url.endsWith('/adoption'))response={
      status:'experimental_not_calibrated',scenario:payload.scenario,
      mode:payload.mode,agent_count:payload.agents.length,edge_count:payload.edges.length,
      runs:payload.runs,seed:payload.seed,periods:payload.periods,
      final:{baseline:{mean:.22,p10:.17,p90:.26},
        intervention:{mean:.32,p10:.26,p90:.38},
        difference:{mean:.10,p10:.06,p90:.15}},
      series:[{period:0,baseline:{mean:.10,p10:.10,p90:.10},
        intervention:{mean:.10,p10:.10,p90:.10}}],
      audiences:[],limitations:['Datos ficticios']
    };
    else if(url.endsWith('/calibrate'))response={
      status:'retrospective_not_prospective_validation',
      parameters:{threshold_mean:.58,peer_weight:.20,adoption_rate:.28},
      initial_adoption:.10,number_of_agents:payload.agents.length,
      near_optimal_candidates:3,searched_candidates:16,training_mae_pp:4,
      holdout_mae_pp:6,naive_holdout_mae_pp:7,better_than_naive:true,
      fit_runs:12,evaluation_runs:32,series:[],limitations:[]
    };
    else if(url.endsWith('/sensitivity'))response={
      status:'local_parameter_sensitivity_not_prediction',
      target_effect_pp:payload.target_effect_pp,
      summary:{min_effect_pp:2,median_effect_pp:6,max_effect_pp:9,
        meeting_target:7,total:9},
      configurations:[{parameters:payload.parameters||{},effect_pp:6,
        meets_target:true}],limitations:[]
    };
    else throw Error('URL inesperada '+url);
    return {ok:true,json:async()=>response};
  }
};
vm.createContext(ctx);
vm.runInContext(inline[1]+'\n'+sim+'\n'+lab,ctx);
async function main(){
  const event=data=>({preventDefault(){},target:{data}});
  const fields={name:{value:'Piloto ficticio: adopción CRM'},
    description:{value:'Prueba técnica automatizada, sin personas reales'},
    population:{value:'60'},scope:{value:'inside'},createdAt:{value:'2026-10-26'},
    impact:{value:'3'},effort:{value:'2'}};
  vm.runInContext('createInitiative',ctx)({preventDefault(){},target:fields});
  const current=()=>vm.runInContext('current()',ctx);
  assert.equal(current().name,'Piloto ficticio: adopción CRM');
  const btn={closest(){return{querySelectorAll(){return[
    {dataset:{field:'name'},value:'Asesores'},
    {dataset:{field:'population'},value:'40'},
    {dataset:{field:'impact'},value:'Alto'}]}}}};
  vm.runInContext('addAudienceFromButton',ctx)(btn);
  const audienceId=current().audiences[0].id;
  current().audiences.push({id:'aud-b',name:'Operaciones',population:20});
  vm.runInContext('addBehavior',ctx)(event({
    name:'Registrar interacciones en CRM',description:'Registrar cada interacción',
    scope:'specific',audienceIds:[audienceId],kind:''
  }));
  assert.equal(current().behaviors[0].audienceIds[0],audienceId);
  current().nodes=[
    {name:'P01',type:'Persona',audienceId},
    {name:'P02',type:'Persona',audienceId},
    {name:'P03',type:'Persona',audienceId:'aud-b'}
  ];
  current().edges=[
    {s:0,t:1,relation:'Influye en',measureType:'scale',measureValue:4},
    {s:1,t:2,relation:'Colabora con',measureType:'scale',measureValue:2}
  ];
  vm.runInContext("go('Simulación de agentes')",ctx);
  assert.match(element('app').innerHTML,/Piloto ficticio/);
  assert.match(element('app').innerHTML,/Registrar interacciones/);
  const controls={behaviorIndex:{value:'0'},scenario:{value:'friction'},
    mode:{value:'observed'},initialPct:{value:'10'},periods:{value:'5'},
    runs:{value:'6'},sampleSize:{value:'50'},seed:{value:'2026'},
    capability_0:{value:'0.60'},opportunity_0:{value:'0.45'},
    motivation_0:{value:'0.55'},capability_1:{value:'0.50'},
    opportunity_1:{value:'0.55'},motivation_1:{value:'0.50'},
    useCalibrated:{checked:false}};
  element('abm-form').elements=controls;
  await vm.runInContext('runAgentSimulation',ctx)({
    preventDefault(){},target:element('abm-form')});
  assert.equal(calls[0].payload.mode,'observed');
  assert.equal(calls[0].payload.agents.length,2);
  assert.equal(calls[0].payload.edges.length,1);
  assert.equal(calls[0].payload.edges[0].weight,.8);
  assert.match(calls[0].auth,/^Bearer /);
  assert.equal(current().modelRuns.length,1);
  const csv='periodo,adoptados,poblacion_elegible,fuente\n'+
    [4,6,10,12,15,18].map((count,i)=>i+','+count+',40,Registro ficticio '+i).join('\n');
  element('abm-observation-csv').value=csv;
  await vm.runInContext('calibrateAgentModel',ctx)();
  assert.equal(calls[1].payload.observations.length,6);
  assert.equal(calls[1].payload.observations[0].adopted_count,4);
  assert.equal(current().abmCalibration.result.parameters.threshold_mean,.58);
  assert.equal(current().abmObservationCsv['0'],csv);
  assert.match(element('abm-calibration-result').innerHTML,/holdout/);
  element('abm-target-effect').value='5';
  await vm.runInContext('evaluateABMSensitivity',ctx)();
  assert.equal(calls[2].payload.parameters.threshold_mean,.58);
  assert.equal(current().abmSensitivity.result.summary.total,9);
  controls.useCalibrated.checked=true;
  await vm.runInContext('runAgentSimulation',ctx)({
    preventDefault(){},target:element('abm-form')});
  assert.equal(calls[3].payload.parameters.threshold_mean,.58);
  assert.equal(current().modelRuns.length,2);
  await vm.runInContext('syncAll()',ctx);
  assert.equal(memory.initiatives.length,1);
  assert.equal(memory.graph_nodes.length,3);
  assert.equal(memory.graph_edges.length,2);
  assert.equal(memory.initiatives[0].app_state.modelRuns.length,2);
  assert.equal(memory.initiatives[0].app_state.abmCalibration.result.holdout_mae_pp,6);
  vm.runInContext('db={initiatives:[],selected:null}',ctx);
  await vm.runInContext('loadCloud()',ctx);
  assert.equal(current().name,'Piloto ficticio: adopción CRM');
  assert.equal(current().modelRuns.length,2);
  assert.equal(current().abmSensitivity.result.summary.total,9);
  assert.equal(current().abmObservationCsv['0'],csv);
  assert.equal(memory.initiatives.length,1);
  console.log('E2E simulado OK: iniciativa, diseño, grafo, ABM, calibración, sensibilidad y persistencia/recuperación');
}
main().catch(error=>{console.error(error);process.exitCode=1});
