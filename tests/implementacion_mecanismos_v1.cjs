/* Mecanismos múltiples: una acción, varias vías de ejecución, sin duplicados. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const mechanisms=read('src/modules/implementacion/mecanismos.js');
const ops=read('src/modules/implementacion/operaciones.js');
const app=read('src/core/app.js');
const html=read('index.html');
assert.match(app,/\\{title:'Implementación',step:3,items:\[\['Intervenciones','▥'\],\['Movilización y refuerzo','✧'\],\['Laboratorio','◇'\]\]\}/);
assert.match(app,/actionMechanismsEditor\(\)/);
assert.match(app,/renderMovilizacionRefuerzo\(current\(\)\)/);
assert.match(html,/mecanismos\.js\?v=1\.0\.0/);
assert.match(html,/mecanismos\.css\?v=1\.0\.0/);
const fake={id:'a1',name:'Programa de acompañamiento',mechanisms:['comunicacion','reconocimiento'],
 status:'En ejecución',source:'Diagnóstico',mechanismDetails:{comunicacion:{message:'Texto previo'}}};
const x={actions:[fake]};
const checked=[
 {value:'comunicacion',checked:false},
 {value:'reconocimiento',checked:false},
 {value:'laboratorio',checked:false},
 {value:'otro',checked:false},
 {value:'ninguno',checked:true}
];
const fields={editIndex:{value:'0'},name:{value:'Programa de acompañamiento',focus(){}},
 dimension:{value:'Cambio'},owner:{value:'Equipo'},start:{value:''},end:{value:''},
 source:{value:'Diagnóstico'},hypothesis:{value:'Aplicación'}};
const form={values:{editIndex:'0',name:fields.name.value,dimension:'Cambio',owner:'Equipo',
 start:'',end:'',source:'Diagnóstico',hypothesis:'Aplicación'},
 elements:{namedItem:n=>fields[n]},
 querySelectorAll:selector=>selector==='input[name="mechanisms"]:checked'?checked.filter(b=>b.checked):checked,
 closest:()=>({scrollIntoView(){}}),reset(){this.values.editIndex='';fields.editIndex.value='';}};
checked.forEach(b=>b.form=form);
class MockFormData{
 constructor(target){this.entries=Object.entries(target.values||{});}
 [Symbol.iterator](){return this.entries[Symbol.iterator]();}
}
let saves=0,renders=0;
const dom={
 'action-form':form,'action-form-title':{textContent:''},'action-submit':{textContent:''},
 'action-cancel':{classList:{add(){},remove(){}}},
 'action-editor':{open:false,scrollIntoView(){}}
};
const ctx={console,Date,FormData:MockFormData,alert(msg){throw Error(msg)},
 current:()=>x,save(){saves++},render(){renders++},
 document:{getElementById:id=>dom[id]||null},
 safe:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 hcxHero:()=>'<section class="hcx-hero"></section>'};
vm.createContext(ctx);vm.runInContext(mechanisms+'\n'+ops,ctx);
assert.match(ctx.actionMechanismsEditor(),/Comunicaciones/);
assert.match(ctx.actionMechanismsEditor(),/Reconocimiento/);
assert.match(ctx.actionMechanismsEditor(),/Laboratorio/);
assert.match(ctx.actionMechanismsEditor(),/Otro mecanismo/);
assert.match(ctx.actionMechanismsEditor(),/No aplica/);
ctx.actionMechanismsSet(form,fake);
assert.equal(checked.find(b=>b.value==='comunicacion').checked,true);
assert.equal(checked.find(b=>b.value==='reconocimiento').checked,true);
assert.equal(checked.find(b=>b.value==='ninguno').checked,false);
const lab=checked.find(b=>b.value==='laboratorio');lab.checked=true;ctx.actionMechanismToggle(lab);
assert.equal([...ctx.actionMechanismsRead(form,fake)].sort().join(','),'comunicacion,laboratorio,reconocimiento');
ctx.addAction({preventDefault(){},target:form});
assert.equal(x.actions.length,1);
assert.equal(x.actions[0],fake,'Editar no reemplaza la acción original');
assert.equal(fake.status,'En ejecución');
assert.equal(fake.id,'a1');
assert.equal([...fake.mechanisms].sort().join(','),'comunicacion,laboratorio,reconocimiento');
assert.equal(fake.mechanismDetails.comunicacion.message,'Texto previo','Conserva preparaciones existentes');
let none=checked.find(b=>b.value==='ninguno');none.checked=true;ctx.actionMechanismToggle(none);
assert.deepEqual([...ctx.actionMechanismsRead(form,fake)],['ninguno']);
assert.ok(checked.filter(b=>b.checked).every(b=>b.value==='ninguno'));
const other=checked.find(b=>b.value==='otro');other.checked=true;ctx.actionMechanismToggle(other);
assert.equal(none.checked,false);
assert.deepEqual([...ctx.actionMechanismsRead(form,fake)],['otro']);
form.values.editIndex='';fields.editIndex.value='';form.values.name='Nueva intervención';
ctx.addAction({preventDefault(){},target:form});
assert.equal(x.actions.length,2);
assert.deepEqual([...x.actions[1].mechanisms],['otro']);
const htmlPanel=ctx.renderMovilizacionRefuerzo(x);
assert.match(htmlPanel,/Programa de acompañamiento/);
assert.match(htmlPanel,/Comunicaciones/);
assert.match(htmlPanel,/Reconocimiento/);
assert.doesNotMatch(htmlPanel,/Nueva intervención/,'Otro mecanismo no se duplica en Movilización');
form.values={message:'Recordar práctica',channel:'Teams',audience:'Líderes'};
ctx.mobilizationSave({preventDefault(){},target:form},0,'comunicacion');
assert.equal(fake.mechanismDetails.comunicacion.message,'Recordar práctica');
assert.equal(fake.mechanismDetails.comunicacion.channel,'Teams');
assert.equal(x.actions.length,2);
assert.equal(saves,3);
assert.equal(renders,3);
console.log('Mecanismos múltiples OK: selección, exclusión de No aplica, edición, persistencia y ejecución.');
