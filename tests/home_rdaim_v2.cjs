/* HACERLO V2.18: Inicio no duplica el portafolio; RDAIM y alertas basadas en registros. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const code=read('src/core/centro-inteligencia.js');
const app=read('src/core/app.js');
const portfolio=read('src/core/iniciativas-home.js');
const ops=read('src/modules/implementacion/operaciones.js');
const index=read('index.html');
const items=[
 {id:1,name:'Piloto de adopción',behaviors:[{name:'Uso semanal'}],audiences:[{id:'a'}],
  actions:[{name:'Formar líderes',end:'2020-05-01',owner:'Equipo',status:'Pendiente'},{name:'Ejecutar piloto',status:'En ejecución'}],
  indicators:[{name:'Adopción',baseline:'',history:[]},{name:'Cumplimiento',baseline:0,history:[{value:50},{value:65}]}],
  diagnosisFindings:[{text:'Observación'}],behaviorDiagnosis:{a:{role:'Barrera'},b:{role:'Facilitador'}}},
 {id:2,name:'Programa transversal',actions:[],behaviors:[],audiences:[],
  indicators:[{name:'Experiencia',baseline:1,value:24,history:[]}],diagnosisFindings:[],behaviorDiagnosis:{}}
];
const db={initiatives:items,selected:null};
let route='',saved=0,openedForm=false;
const c={console,db,phase:0,expandedNavStep:null,
 safe:s=>String(s??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k])),
 normalizedStatus:s=>s==='Completada'?'Completada':s==='En ejecución'?'En ejecución':'Pendiente',
 pfIcon:()=>'<svg></svg>',
 save:()=>saved++,go:next=>{route=next},
 pfToggleCreate:()=>{openedForm=true},
 eeHomeMetric:(i,k)=>i.id===1&&k==='cnps'?{value:24,note:'Base 2026'}:null
};
vm.createContext(c);
vm.runInContext(code,c);
const home=c.renderIntelligenceHome();
assert.equal((home.match(/class="ci-stage ci-stage-/g)||[]).length,5);
for(const stage of ['Resultados','Diseño','Análisis','Implementación','Medición'])assert.ok(home.includes(stage),'Falta etapa '+stage);
assert.match(home,/RDAIM/);assert.match(home,/ciOpenStage\(4\)/);
assert.match(home,/Formar líderes/);assert.match(home,/Falta línea base/);
assert.match(home,/Comportamientos objetivo/);assert.match(home,/Hallazgos registrados/);
assert.match(home,/Barreras/);assert.match(home,/Facilitadores/);
assert.match(home,/Acciones en curso/);
assert.match(home,/EJECUCIÓN · PORTAFOLIO/);
assert.match(home,/No hay acciones en curso registradas para hoy/,'Un estado sin fecha de inicio no demuestra ejecución iniciada');
assert.doesNotMatch(home,/Matriz de priorización del portafolio|Consolidado por iniciativa|Seguimiento de indicadores · Portafolio/);
assert.equal(c.ciSignals().length,2,'Acción vencida e indicador sin línea base; línea base 0 es válida');
assert.equal(c.ciEvidence().series,1,'Cuenta solo indicadores con al menos dos registros válidos');
c.ciOpenStage(2);
assert.equal(c.phase,2);assert.equal(route,'RDAIM');assert.equal(db.selected,1);
c.ciOpenSignal({getAttribute:key=>key==='data-ci-id'?'2':'Indicadores'});
assert.equal(db.selected,2);assert.equal(route,'Indicadores');
const temp=db.initiatives;db.initiatives=[];
c.ciOpenStage(0);
assert.equal(route,'Iniciativas');assert.equal(openedForm,true);
db.initiatives=temp;
const metricSource=ops.slice(0,ops.indexOf('const coreMetricNames='));
assert.ok(metricSource.includes('function portfolioMetricSummary()'));
vm.runInContext(metricSource,c);
const metrics=c.portfolioMetricSummary();
assert.match(metrics,/Seguimiento de indicadores/);
assert.match(metrics,/INS personas/);assert.match(metrics,/INS proceso/);assert.match(metrics,/CNPS/);
assert.match(metrics,/Base 2026/);
assert.equal((metrics.match(/data-portfolio-metric-id=/g)||[]).length,2,'Una fila por iniciativa');
assert.match(metrics,/Los valores mantienen sus escalas originales/);
assert.match(app,/if\(page==='Inicio'\)\{a.innerHTML=renderIntelligenceHome\(\);return\}/);
assert.match(app,/if\(page==='Analítica'\)\{a.innerHTML=renderMeasurementPage\(x\)/);
assert.match(fs.readFileSync('src/modules/medicion/integrada.js','utf8'),/portfolioMetricSummary\(\)/);
assert.match(index,/centro-inteligencia\.js\?v=2\.20\.0/);
assert.match(index,/centro-inteligencia\.css\?v=2\.19\.0/);
assert.match(index,/<div class="hero"><h1>HACERLO<\/h1>/,'Banner general intacto');
assert.match(portfolio,/portfolioPriority\(true\)/,'Matriz en Iniciativas');
console.log('Inicio V2 OK: RDAIM, señales verificables, evidencia y medición del portafolio.');
