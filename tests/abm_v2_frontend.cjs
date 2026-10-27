/* HACERLO V2: prueba sin navegador de los scripts científicos modulares. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const evidence=fs.readFileSync('src/modules/analisis/agentes-evidencia-v2.js','utf8');
const sim=fs.readFileSync('src/modules/analisis/agentes-abm.js','utf8');
const research=fs.readFileSync('src/modules/analisis/agentes-calibracion.js','utf8');
const guided=fs.readFileSync('src/modules/analisis/agentes-experiencia.js','utf8');
const context={safe:(v)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  console};
vm.createContext(context);
vm.runInContext(evidence+'\n'+sim+'\n'+research+'\n'+guided,context);
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
assert.match(html,/Simula mecanismos/);
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
let visual=context.renderABMExperiencePage(project);
assert.match(visual,/¿Qué pasaría si/);
assert.match(visual,/¿Qué harías para impulsar el cambio/);
assert.equal((visual.match(/data-abm-scenario=/g)||[]).length,4);
assert.match(visual,/abm-initial-track/);
assert.match(visual,/abm-tech-settings/);
assert.match(visual,/abm-science-drawer/);
assert.match(visual,/render/gi);
assert.match(visual,/Registrar interacciones/);
const sample={
 scenario:'friction',periods:5,runs:8,seed:12,agent_count:50,edge_count:10,
 mode:'synthetic',parameter_origin:'hypothetical_defaults',
 final:{baseline:{mean:.22,p10:.2,p90:.25},intervention:{mean:.33,p10:.28,p90:.36},difference:{mean:.11,p10:.08,p90:.15}},
 series:[{period:0,baseline:{mean:.1},intervention:{mean:.1}},
 {period:1,baseline:{mean:.2},intervention:{mean:.3}}],audiences:[],limitations:[]
};
const shown=context.renderABMVisualResult(sample);
assert.match(shown,/11.0/);
assert.match(shown,/22.0%/);
assert.match(shown,/33.0%/);
assert.match(shown,/No predicción|no predicción|no es un pronóstico/);
assert.match(shown,/Cómo podría evolucionar/);
console.log('ABM browser contract smoke checks: OK');
