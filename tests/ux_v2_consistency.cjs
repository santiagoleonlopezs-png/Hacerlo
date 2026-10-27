/* Revisión UI transversal sin navegador: preserva formularios y rutas.
   No se conecta a Supabase ni al backend. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html');
const core=read('src/core/app.js');
const indicators=read('src/modules/resultados/indicadores.js');
const diagnosis=read('src/modules/resultados/diagnostico.js');
const audiences=read('src/modules/diseno/audiencias.js');
const surveys=read('src/modules/encuestas/encuestas.js');
const css=read('assets/css/experiencia-ui.css');
const ux=read('src/core/experiencia-ui.js');
const stage0=core.slice(core.indexOf('if(phase===0)body='),core.indexOf('if(phase===1)body='));
assert.match(stage0,/results-stage-stack/,'Resultados usa distribución vertical propia');
assert.ok(stage0.indexOf('Comportamiento objetivo de la iniciativa')<stage0.indexOf('Todos los indicadores de la iniciativa'),'Comportamiento va arriba de Indicadores');
assert.match(stage0,/textarea id="objective"/,'Se conserva la edición del comportamiento');
assert.match(stage0,/setField\('expected',this.value\)/,'Se conservan resultados esperados');
assert.match(stage0,/indicatorTable\(x\)/,'Se conserva la tabla y su vinculación');
assert.match(read('assets/css/experiencia-ui.css'),/\.results-stage-stack\{display:grid;grid-template-columns:minmax\(0,1fr\)/);

const ia=read('src/modules/inteligencia/ia.js');
const integrated=read('src/modules/inteligencia/integrada.js');
for(const path of ['src/core/experiencia-ui.js','assets/css/experiencia-ui.css']){
 assert.ok(html.includes(path),'La página principal no carga '+path);
}
assert.ok(html.indexOf('src/core/experiencia-ui.js')<html.indexOf('src/modules/inteligencia/integrada.js'));
assert.match(css,/main:has\(#app \.hcx-hero\)>\.hero/);
assert.match(core,/renderAdoptionGraphPage\(a,hcxHero/);
assert.match(core,/renderIndicatorsEditor\(x,hcxHero/);
assert.match(core,/if\(page==='Encuestas y experiencias'\)\{a.innerHTML=eePage\(x\)/);
assert.match(core,/if\(page==='Simulación de agentes'\)\{a.innerHTML=renderABMExperiencePage\(x\)/);
assert.match(core,/if\(page==='Pensamiento sistémico'\)\{sysRender\(a,head,x\)/);
assert.match(diagnosis,/hcxHero\('Diagnóstico'/);
assert.match(audiences,/hcxHero\('Gestión de audiencias'/);
assert.match(surveys,/RDAIM · MEDICIÓN/);
assert.match(surveys,/hcx-more/);
for(const attr of ['data-k="id"','data-k="type"','data-k="min"','data-k="max"','data-k="options"','data-k="correct"']){
 assert.ok(surveys.includes(attr),'No debe perderse el campo '+attr);
}
for(const attr of ["onsubmit=\"addEvidenceRecord(event)\"","onsubmit=\"addExperiment(event)\"","onsubmit=\"addObservation(event)\"","id=\"network-result\"","id=\"api-url\""]){
 assert.ok(integrated.includes(attr),'No debe perderse la función '+attr);
}
const context={console,safe:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
 normalizedStatus:z=>z==='Completada'?'Completada':'Pendiente',audQuadrant:()=>null};
vm.createContext(context);
vm.runInContext(ux+'\n'+ia+'\n'+integrated,context);
const x={id:7,name:'Piloto <test>',scope:'inside',
 audiences:[{id:'a',name:'Asesores',population:20}],behaviors:[{id:'b',name:'Registro CRM',scope:'all'}],
 nodes:[],edges:[],actions:[],indicators:[],systemVariables:[],systemLinks:[],
 experiments:[],observations:[],evidenceRecords:[],modelRuns:[],metrics:{}};
const page=context.intelligencePage(x);
assert.ok(page.includes('hcx-hero'));
assert.ok(page.includes('hcx-intel'));
assert.ok(page.indexOf('Interpretar tu iniciativa con IA')<page.indexOf('Registrar evidencias'));
assert.ok(page.indexOf('Registrar evidencias')<page.indexOf('Conexión técnica de redes'));
assert.equal((page.match(/class="hcx-fold"/g)||[]).length,5,'Se conservaron cinco secciones complementarias');
assert.equal((page.match(/<\/details>/g)||[]).length,(page.match(/<details/g)||[]).length);
assert.ok(page.includes('Piloto &lt;test&gt;'),'Datos de iniciativa escapados');
assert.ok(page.includes('onsubmit="addEvidenceRecord(event)"'));
assert.ok(page.includes('onsubmit="addExperiment(event)"'));
assert.ok(page.includes('onsubmit="addObservation(event)"'));
assert.ok(page.includes('runIntegratedAI()'));
assert.ok(page.includes('go(\'Grafo de adopción\')'));
const output=context.renderLocalAIResult({
 system_reading:'Resumen del sistema',audience_reading:'Lectura de audiencia',
 structural_findings:['Diferencias entre áreas'],hypotheses:[{title:'Barrera de tiempo',rationale:'Observación',evidence_limit:'Sin causalidad'}],
 interventions:[{name:'Opción A',why:'Acompañamiento'}, {name:'B',why:'Reducción de fricción'},
   {name:'C',why:'Capacitación'}, {name:'D',why:'Incentivos'}],
 what_to_measure:['Tasa de uso'],traceability:'No causal'
});
assert.match(output,/Lectura ejecutiva/);
assert.match(output,/Resumen del sistema/);
assert.equal((output.match(/class="hcx-ai-choice"/g)||[]).length,4);
assert.match(output,/Ver las otras 1 opciones/);
assert.match(output,/convertAIIntervention\(3\)/);
assert.match(output,/Examinar hallazgos e hipótesis/);
assert.match(output,/Ver qué medir/);
const diagContext={console,safe:context.safe,render(){},save(){},current:()=>x};
vm.createContext(diagContext);
vm.runInContext(ux+'\n'+diagnosis,diagContext);
x.behaviorDiagnosis={};x.diagnosisFindings=[];x.diagnosisHypotheses=[];
const diag=diagContext.diagnosisPage(x);
assert.match(diag,/hcx-hero/);
assert.match(diag,/Diagnóstico conductual/);
assert.match(diag,/Hallazgos y micronarrativas/);
assert.match(diag,/diag-cards/);
console.log('Revisión transversal OK: banners, IA prioritaria, acciones y formularios conservados');
