/* Regresiones de UI: guardado de valoración, navegación y panel estrecho. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const errors=[];const pages=[];let saves=0,renders=0,synced=0;
const record={id:101,name:'Caso de prueba',surveys:[],impact:null,effort:null};
const db={initiatives:[record],selected:null};
const feedback={textContent:''};
const details={open:false,querySelector:sel=>sel==='[data-priority-feedback]'?feedback:null};
const card={getAttribute:k=>k==='data-pf-id'?'101':null,querySelector:sel=>sel==='.pf-priority-card-detail'?details:null};
const document={querySelectorAll:sel=>sel==='[data-pf-id]'?[card]:[]};
const fakeSubmit={disabled:false,isConnected:true};
class FakeFormData{constructor(form){this.answers=form.answers||{};}get(key){return this.answers[key]??null;}}
const context={
 console,crypto:{randomUUID},db,document,FormData:FakeFormData,cloudReady:true,syncTimer:0,
 safe:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
 save:()=>saves++,render:()=>renders++,go:route=>pages.push(route),
 alert:msg=>errors.push(String(msg)),clearTimeout:()=>{},
 syncAll:async()=>{synced++;return true;},
 eeSelected:null,eePickerOpen:true,eeTab:'resultados',eeFilter:{wave:'Antes'},
};
vm.createContext(context);
vm.runInContext(read('src/modules/encuestas/motor.js'),context);
vm.runInContext(read('src/modules/encuestas/priorizacion.js'),context);
context.priorityGoToSurvey({closest:sel=>sel==='[data-pf-id]'?card:null});
assert.equal(pages[0],'Encuestas y experiencias','Abrir instrumento conduce a la pantalla real');
assert.equal(context.eeSelected,record.surveys[0].id,'Selecciona el instrumento asociado');
assert.equal(context.eeTab,'diseño','Abre la edición del instrumento');
assert.equal(context.eePickerOpen,false,'Oculta el selector secundario');
assert.equal(db.selected,101,'La iniciativa correcta permanece activa');
const questions=record.surveys[0].questions;
assert.equal(questions.length,4);
const answers=Object.fromEntries(questions.map((q,i)=>[q.id,q.options[i%3]]));
const form={dataset:{priorityInitiative:'101'},answers,
 querySelector:sel=>sel==='button[type="submit"]'?fakeSubmit:null};
(async()=>{
 await context.prioritySubmitOnCard({preventDefault(){},target:form});
 assert.equal(record.surveys[0].responses.length,1,'Guarda una respuesta de cuatro preguntas');
 assert.equal(record.impact,2);
 assert.equal(record.effort,3);
 assert.equal(record.priorityN,1);
 assert.ok(saves>=2);
 assert.equal(renders,1);
 assert.equal(synced,1,'Solicita confirmación del guardado en Supabase');
 assert.equal(details.open,true,'Mantiene el formulario abierto tras guardar');
 assert.match(feedback.textContent,/guardada en Supabase/,'Muestra resultado verificable');
 assert.equal(errors.length,0);
 context.syncAll=async()=>false;
 await context.prioritySubmitOnCard({preventDefault(){},target:form});
 assert.equal(record.surveys[0].responses.length,2,'Permite valoraciones adicionales');
 assert.match(feedback.textContent,/No se confirmó el guardado/,'No afirma éxito cuando falla Supabase');
 const css=read('assets/css/iniciativas-home.css');
 assert.match(css,/\.pf-priority-create-assessment \.pf-priority-options\{grid-template-columns:minmax\(0,1fr\)\}/,
  'El panel lateral presenta respuestas una por renglón');
 assert.match(css,/@container \(max-width:560px\)/,'Adaptación por espacio disponible');
 const html=read('index.html');
 assert.match(html,/src\/modules\/encuestas\/priorizacion\.js\?v=/);
 console.log('UI priorización: navegación, guardado confirmado y opciones verticales correctos.');
})().catch(err=>{console.error(err);process.exitCode=1;});
