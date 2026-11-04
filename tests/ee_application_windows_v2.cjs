/* HACERLO: regresiones de programacion y banco Voces del Cambio. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const read=path=>fs.readFileSync(path,'utf8');
const x={id:1,name:'Cambio de ejemplo',audiences:[{id:'g1',name:'Gestores'},{id:'g2',name:'Administradores'}],surveys:[],surveyTrash:[]};
const ctx={console,crypto:{randomUUID},current:()=>x,save:()=>{},render:()=>{},diagModuleMenu:()=>'<nav></nav>',
 confirm:()=>true,alert:message=>{throw Error(message)},
 safe:v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
};
vm.createContext(ctx);
for(const path of ['src/modules/encuestas/motor.js','src/modules/encuestas/programacion.js','src/modules/encuestas/encuestas.js'])
 vm.runInContext(read(path),ctx);
const template=vm.runInContext("EE.template('CNPS')",ctx);
assert.equal(template.length,10,'El banco Excel contiene exactamente diez preguntas');
assert.equal(template.filter(q=>q.type==='scale').length,7);
assert.equal(template.filter(q=>q.type==='choice').length,2);
assert.equal(template.filter(q=>q.type==='text').length,1);
assert.equal(template.filter(q=>q.missingChoiceOptions).length,2,'Excel no trae alternativas para P5/P7');
assert.equal(template.filter(q=>q.type==='cnps').length,0,'No inventar una pregunta CNPS ausente del archivo');
assert.match(template[0].label,/Tengo claridad sobre qué está cambiando/);
assert.match(template[9].label,/¿Qué necesitarías para avanzar un paso más/);
const create=vm.runInContext('EE.create',ctx),survey=create('CNPS','Cómo va el cambio');
x.surveys.push(survey);
ctx.eePage(x);
const html=ctx.eePage(x);
for(const text of ['Inicio de aplicación','Fin de aplicación','name="audienceIds"','name="waveMode"',
  'Antes','Durante','Después','Todas','ee-question-fold'])
 assert.ok(html.includes(text),'Falta control '+text);
assert.equal(vm.runInContext('eeHasUnfinishedChoices',ctx)(survey),true);
survey.applicationStart=vm.runInContext('eeParseApplicationTime',ctx)('2026-11-04T08:00');
survey.applicationEnd=vm.runInContext('eeParseApplicationTime',ctx)('2026-11-04T10:00');
const check=vm.runInContext('eeApplicationCheck',ctx);
assert.equal(check(survey,Date.parse('2026-11-04T12:30:00Z')).ok,false,'Bloquea antes del inicio');
assert.equal(check(survey,Date.parse('2026-11-04T14:00:00Z')).ok,true,'Admite durante la ventana');
assert.equal(check(survey,Date.parse('2026-11-04T15:30:00Z')).ok,false,'Bloquea después del fin');
assert.equal(vm.runInContext('eeLocalApplicationTime',ctx)(survey.applicationStart),'2026-11-04T08:00');
survey.audienceIds=['g1','g2'];survey.waveMode='Todas';survey.wave='Antes';
assert.deepEqual(Array.from(vm.runInContext('eeResponseWaves',ctx)(survey)),['Antes','Durante','Después']);
const snapshot=ctx.eePublicSnapshot(survey);
assert.equal(snapshot.audiences.length,2);
assert.equal(snapshot.audienceIds.length,2);
assert.equal(snapshot.applicationStart,survey.applicationStart);
assert.equal(snapshot.waveMode,'Todas');
const old=create('CNPS','Instrumento anterior');
old.questions=[{id:'cnps',label:'Pregunta antigua',min:0,max:10,type:'cnps',required:true}];
old.status='active';x.surveys=[old];
vm.runInContext('eeSelected='+JSON.stringify(old.id),ctx);
ctx.eeRestoreCnpsBank();
assert.equal(old.questions.length,10,'Puede restaurar plantillas anteriores sin respuestas');
assert.equal(old.status,'draft','Exige validar alternativas antes de activar');
assert.equal(old.questionBankHistory.length,1,'Conserva el respaldo del banco anterior');
assert.ok(read('responder.html').includes('responder.js?v=2.35.0'),'Formulario externo actualizado');
assert.ok(read('index.html').includes('programacion.js?v=2.35.0'),'Módulo cargado en la plataforma');
console.log('Encuestas: 10 preguntas Excel, programación, 4 olas, selección múltiple y compatibilidad OK.');
