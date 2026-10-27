/* Prueba sin navegador de integración de los dos scripts de laboratorio. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const sim=fs.readFileSync('simulacion-agentes.js','utf8');
const research=fs.readFileSync('calibracion-agentes.js','utf8');
const context={safe:(v)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  console};
vm.createContext(context);
vm.runInContext(sim+'\n'+research,context);
const project={
  behaviors:[{name:'Registrar interacciones',scope:'specific',audienceIds:['aud-1']}],
  audiences:[
    {id:'aud-1',name:'Asesores',population:80},
    {id:'aud-2',name:'Operaciones',population:20}],
  nodes:[],edges:[],modelRuns:[],abmSettings:{}
};
let html=context.renderAgentSimulationPage(project);
assert.match(html,/Laboratorio de agentes/);
assert.match(html,/Contrastar con evidencia/);
assert.match(html,/Simulación/);
assert.match(html,/Sensibilidad/);
assert.match(html,/abm-observation-csv/);
assert.match(html,/Registrar interacciones/);
assert.match(html,/Usar parámetros calibrados/);
assert.equal(context.parseABMObservations(
  'periodo,adoptados,poblacion_elegible,fuente\n0,5,50,Base\n1,8,50,P1\n2,9,50,P2\n3,11,50,P3\n4,14,50,P4\n5,18,50,P5'
).length,6);
project.abmCalibration={behaviorKey:'0',result:{
  parameters:{threshold_mean:.6,peer_weight:.2,adoption_rate:.28},
  training_mae_pp:3,holdout_mae_pp:4,naive_holdout_mae_pp:5,
  near_optimal_candidates:3,searched_candidates:16,fit_runs:12,evaluation_runs:32,
  number_of_agents:80,better_than_naive:true,series:[],limitations:[]
}};
html=context.renderAgentSimulationPage(project);
assert.match(html,/Error reservado/);
assert.match(html,/Menor error/);
assert.match(html,/abm-target-effect/);
console.log('ABM browser contract smoke checks: OK');
