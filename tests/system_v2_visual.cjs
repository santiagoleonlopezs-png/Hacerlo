/* Contratos del rediseño sistémico: conserva el editor, el historial y las hipótesis sin causalidad inventada. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const original=fs.readFileSync('src/modules/analisis/sistemico.js','utf8');
const visual=fs.readFileSync('src/modules/analisis/sistemico-experiencia.js','utf8');
const context={
  safe:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  console,crypto:{randomUUID:()=>'fixture'},render(){this.renders=(this.renders||0)+1},save(){},
  document:{getElementById:()=>null}
};
vm.createContext(context);
vm.runInContext(original+'\n'+visual,context);
const x={
 name:'Piloto adopción',behaviors:[{id:'b1',name:'Registrar interacciones'},{id:'b2',name:'Participar'}],
 audiences:[],nodes:[],edges:[],actions:[],behaviorDiagnosis:{},
 systemV23:{
  selectedBehavior:'b1',
  conditions:[
   {id:'c1',name:'Permisos insuficientes',type:'Restricción',orientation:'Dificulta',state:'Persistente',behaviorId:'b1',source:'Diagnóstico'},
   {id:'c2',name:'Soporte del líder',type:'Recurso',orientation:'Favorece',state:'Presente',behaviorId:'b1'},
   {id:'c3',name:'Problema resuelto',type:'Proceso',orientation:'Dificulta',state:'Resuelta',behaviorId:'b1'},
   {id:'c4',name:'Otro comportamiento',type:'Contexto',orientation:'Dificulta',state:'Presente',behaviorId:'b2'}],
  mechanisms:[{id:'m1',name:'Bucle reforzador',type:'Refuerzo',certainty:'Hipótesis',conditionId:'c1'}],
  hypotheses:[{id:'h1',statement:'Si quitamos permisos…',status:'Pendiente',conditionId:'c1'}],
  events:[
   {date:'2026-01-01T00:00:00Z',kind:'Condición',target:'c1',state:'Presente',detail:'Registro anterior'},
   {date:'2026-03-01T00:00:00Z',moment:'Durante',kind:'Condición',target:'c1',state:'Persistente',detail:'Revisión de permisos'},
   {date:'2026-04-01T00:00:00Z',moment:'Después',kind:'Hipótesis',target:'h1',detail:'No hay evidencia suficiente'}]
 }
};
context.current=()=>x;
let sum=context.sysVisualSummary(x,x.systemV23);
assert.equal(sum.conditions.length,3);
assert.equal(sum.visible.length,2);
assert.equal(sum.negative.length,1);
assert.equal(sum.positive.length,1);
assert.equal(sum.mechanisms.length,1);
assert.equal(sum.hypotheses.length,1);
assert.equal(sum.events.length,3);
assert.equal(sum.unassignedEvents,1);
let html=context.renderSystemVisualPage(x,x.systemV23);
for(const part of ['¿Qué está sosteniendo','Lo que favorece','Lo que dificulta','Lo que mantiene el patrón','Lo que debemos contrastar','EVOLUCIÓN','Permisos insuficientes']){
 assert.ok(html.includes(part),part);
}
assert.doesNotMatch(html,/Otro comportamiento/);
assert.doesNotMatch(html,/Problema resuelto/);
context.sysMomentGo('Durante');
sum=context.sysVisualSummary(x,x.systemV23);
assert.equal(sum.events.length,1);
assert.match(context.renderSystemVisualPage(x,x.systemV23),/Revisión de permisos/);
assert.doesNotMatch(context.renderSystemVisualPage(x,x.systemV23),/Registro anterior/);
context.sysMomentGo('Antes');
assert.equal(context.sysVisualSummary(x,x.systemV23).events.length,0,'No inventar momento de eventos previos');
context.sysEvent(x.systemV23,'Condición','c1','Nueva observación',{state:'Presente'});
assert.equal(x.systemV23.events.at(-1).moment,'Antes');
assert.equal(context.sysVisualSummary(x,x.systemV23).events.length,1);
const element={innerHTML:''};
context.sysRender(element,'',x);
assert.match(element.innerHTML,/id="sys-advanced-editor"/);
assert.match(element.innerHTML,/Registrar condición/);
assert.match(element.innerHTML,/Explorador de mecanismos|Mapa sistémico/);
assert.match(element.innerHTML,/Comparar momentos/);
context.sysVisualOpen('mecanismos');
assert.equal(vm.runInContext('sysTab',context),'mecanismos');
assert.equal(vm.runInContext('sysVisualEditorOpen',context),true);
context.sysVisualHistory();
assert.equal(vm.runInContext('sysCompare',context),true);
assert.equal(context.sysSnapshot(x.systemV23,'2026-03-02').c1,'Persistente');
console.log('Sistema visual V2 OK: condiciones, bucles registrados, histórico, momentos y editor conservados');
