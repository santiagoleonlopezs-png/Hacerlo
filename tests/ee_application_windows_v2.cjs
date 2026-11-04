/* HACERLO: regresiones de programacion y banco Voces del Cambio. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const read=path=>fs.readFileSync(path,'utf8');
const x={id:1,name:'Cambio de ejemplo',audiences:[{id:'g1',name:'Gestores'},{id:'g2',name:'Administradores'}],surveys:[],surveyTrash:[]};
const ctx={console,structuredClone,crypto:{randomUUID},current:()=>x,save:()=>{},render:()=>{},diagModuleMenu:()=>'<nav></nav>',
 $:()=>({textContent:'',setAttribute(){}}),confirm:()=>true,alert:message=>{throw Error(message)},
 safe:v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
};
vm.createContext(ctx);
for(const path of ['src/modules/encuestas/motor.js','src/modules/encuestas/programacion.js','src/modules/encuestas/encuestas.js'])
 vm.runInContext(read(path),ctx);
const template=vm.runInContext("EE.template('CNPS')",ctx);
assert.equal(template.length,10,'El banco Excel contiene exactamente diez preguntas');
assert.equal(template.filter(q=>q.type==='scale').length,6);
assert.equal(template.filter(q=>q.type==='choice').length,3);
assert.equal(template.filter(q=>q.type==='text').length,1);
assert.equal(template.filter(q=>q.missingChoiceOptions).length,0,'Las alternativas originales ya están completas');
for(const index of [4,6,7]){
 assert.equal(template[index].type,'choice');
 assert.equal(template[index].options.length,4,'La pregunta '+(index+1)+' tiene cuatro alternativas');
 assert.match(ctx.eeQuestionInput(template[index]),/ee-choice-option/,'Opciones visibles para pregunta '+(index+1));
}
assert.match(template[7].options[0],/muchos riesgos/);
assert.match(template[4].options[0],/Estoy en pausa/);
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
assert.equal(vm.runInContext('eeHasUnfinishedChoices',ctx)(survey),false);
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
assert.equal(snapshot.anonymous,true,'Las encuestas nuevas son anónimas por defecto');
survey.anonymous=false;survey.identityLabel='Cédula';
const identified=ctx.eePublicSnapshot(survey);
assert.equal(identified.anonymous,false);
assert.equal(identified.identityLabel,'Cédula');
survey.publication={token:'77daac42-5e6f-4510-8dc0-17ed03be2add'};
ctx.URL=URL;ctx.location={href:'https://example.org/Hacerlo/index.html'};
const links=ctx.eePublishLinks(survey);
assert.equal((links.match(/class="ee-share-link"/g)||[]).length,6,'Dos audiencias por tres olas producen seis enlaces');
assert.match(links,/a=g1/);
assert.match(links,/w=Durante/);
assert.doesNotMatch(links,/Selecciona tu audiencia/);

const old=create('CNPS','Instrumento anterior');
old.questions=[{id:'cnps',label:'Pregunta antigua',min:0,max:10,type:'cnps',required:true}];
old.status='active';x.surveys=[old];
vm.runInContext('eeSelected='+JSON.stringify(old.id),ctx);
ctx.eeRestoreCnpsBank();
assert.equal(old.questions.length,10,'Puede restaurar plantillas anteriores sin respuestas');
assert.equal(old.status,'draft','Exige validar alternativas antes de activar');
assert.equal(old.questionBankHistory.length,1,'Conserva el respaldo del banco anterior');
assert.ok(read('responder.html').includes('responder.js?v=2.37.0'),'Formulario externo actualizado');
assert.match(read('src/modules/encuestas/responder.js'),/ee-choice-option/,'Formulario público presenta las opciones');
assert.ok(read('index.html').includes('programacion.js?v=2.37.0'),'Módulo cargado en la plataforma');
assert.ok(read('src/modules/encuestas/responder.js').includes('type="hidden" name="_audienceId"'),'La audiencia no se pregunta al usuario');
assert.ok(!read('src/modules/encuestas/responder.js').includes('<details><summary>Sobre esta medición'),'No mostrar desplegable innecesario');

console.log('Encuestas: 10 preguntas Excel, programación, 4 olas, selección múltiple y compatibilidad OK.');
