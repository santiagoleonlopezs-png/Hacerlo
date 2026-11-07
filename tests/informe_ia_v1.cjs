/* Exportación de IA: solo el informe generativo, sin replicar datos ni RDAIM. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const exporter=fs.readFileSync('src/modules/inteligencia/informe-ia.js','utf8');
const ai=fs.readFileSync('src/modules/inteligencia/ia.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sandbox={console,Date};
vm.createContext(sandbox);
vm.runInContext(exporter,sandbox);
const initiative={
 name:'Transformación de cultura',
 surveys:[{secret:'NO_EXPORTAR_DATOS_PRIVADOS'}],
 audiencePeople:[{email:'NO_EXPORTAR_FICHAS_PERSONALES'}],
 integratedAIAnalysis:{
  generatedAt:'2026-11-07T05:00:00.000Z',model:'modelo-probado',
  system_reading:'Lectura de la iniciativa y sus condiciones de adopción.',
  audience_reading:'Lectura agregada de audiencias.',
  structural_findings:['Hay una barrera relacionada con la claridad.'],
  hypotheses:[{title:'Hipótesis A',rationale:'Debe contrastarse con las personas.',evidence_limit:'Datos parciales.'}],
  interventions:[{name:'Acción propuesta',why:'Responde a la barrera.',measure:'Adopción observada.'}],
  what_to_measure:['Tasa de ejecución del comportamiento.'],
  traceability:'Fuentes agregadas de diagnóstico y encuestas.'
 }
};
const report=sandbox.aiReportData(initiative);
assert.equal(report.initiative,'Transformación de cultura');
assert.equal(report.sections.length,7);
assert.equal(report.sections[0].title,'Lectura ejecutiva');
assert.equal(report.sections[3].items[0].note,'Límite de evidencia: Datos parciales.');
assert.equal(report.sections[4].items[0].note,'Cómo medir: Adopción observada.');
assert.match(sandbox.aiReportFilename(report,'pdf'),/^HACERLO_Informe_IA_/);
assert.match(sandbox.aiReportFilename(report,'pptx'),/\.pptx$/);
assert.doesNotMatch(JSON.stringify(report),/NO_EXPORTAR_DATOS_PRIVADOS|NO_EXPORTAR_FICHAS_PERSONALES/);
assert.throws(()=>sandbox.aiReportData({name:'Sin IA'}),/Primero genera/);
assert.ok(ai.includes('exportAIReportPDF()'));
assert.ok(ai.includes('exportAIReportPPTX()'));
assert.ok(!ai.includes('exportExecutivePPTX()'));
assert.ok(!ai.includes('exportPowerBIJSON()'));
assert.ok(!ai.includes('Descargar resultados y datos'));
assert.ok(html.includes('src/modules/inteligencia/informe-ia.js?v=1.0.0'));
assert.ok(html.indexOf('informe-ia.js')<html.indexOf('src/modules/inteligencia/ia.js'));
console.log('Informe IA OK: PDF y PPTX exclusivos, sin datos crudos ni informe RDAIM duplicado.');
