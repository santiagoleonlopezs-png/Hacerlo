/* Regresión HACERLO V2: Editar del Kanban debe abrir, precargar y actualizar sin duplicar. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ops=fs.readFileSync('src/modules/implementacion/operaciones.js','utf8');
const app=fs.readFileSync('src/core/app.js','utf8');
const panel=fs.readFileSync('src/modules/medicion/paneles.js','utf8');
assert.match(panel,/onclick="editAction\(\$\{z\.index\}\)"/);
assert.match(app,/id="action-form-title"/);
assert.match(app,/id="action-cancel"/);
assert.match(app,/x\.actions\.map\(a=>a\.source\)/,'Se preservan los orígenes existentes, incluida la IA HACERLO');
assert.match(app,/x\.actions\.map\(a=>a\.dimension\)/,'Se preservan las dimensiones antiguas');
const action={
 id:'action-001',name:'Crear sesiones',dimension:'Por definir',owner:'Líder de talento',
 start:'2026-10-20',end:'2026-11-01',
 source:'Inteligencia HACERLO · hipótesis generativa',hypothesis:'Reforzar práctica',
 measurement:'Tasa de adopción',status:'En ejecución',
 createdAt:'2026-10-20T12:00:00.000Z',linkedConditionId:'cond-3',
 metadata:{approval:'pending'}
};
const x={actions:[action]};
const values=['editIndex','name','dimension','owner','start','end','source','hypothesis'];
const fields=Object.fromEntries(values.map(name=>[name,{
 name,value:name==='editIndex'?'':'',focused:false,
 focus(){this.focused=true;}
}]));
let resets=0,scrolls=0;
const form={
 elements:{namedItem:name=>fields[name]},
 closest:()=>({scrollIntoView(){scrolls++}}),
 reset(){resets++;for(const [k,v] of Object.entries(fields))v.value=k==='source'?'Manual':'';}
};
const canceller={classList:{hidden:true,remove(name){if(name==='hide')this.hidden=false},add(name){if(name==='hide')this.hidden=true}}};
const submit={textContent:'+ Crear acción'},title={textContent:'Nueva acción'};
const dom={'action-form':form,'action-cancel':canceller,'action-submit':submit,'action-form-title':title};
let saves=0,renders=0,alerts=[];
class FakeFormData {
 constructor(f){this.map=new Map(Object.entries(f.elements.namedItem('editIndex')!==undefined?
 Object.fromEntries(values.map(k=>[k,fields[k].value])):{}));}
 [Symbol.iterator](){return this.map[Symbol.iterator]();}
}
const sandbox={
 current:()=>x,save(){saves++},render(){renders++},
 alert:message=>alerts.push(message),
 document:{getElementById:id=>dom[id]||null},
 FormData:FakeFormData,console
};
vm.createContext(sandbox);vm.runInContext(ops,sandbox);
assert.equal(typeof sandbox.editAction,'function');
sandbox.editAction(0);
assert.equal(fields.editIndex.value,'0');
assert.equal(fields.name.value,'Crear sesiones');
assert.equal(fields.dimension.value,'Por definir');
assert.equal(fields.source.value,'Inteligencia HACERLO · hipótesis generativa');
assert.equal(fields.hypothesis.value,'Reforzar práctica');
assert.equal(title.textContent,'Editar acción');
assert.equal(submit.textContent,'Guardar cambios');
assert.equal(canceller.classList.hidden,false);
assert.equal(fields.name.focused,true);
assert.equal(scrolls,1);
fields.name.value='Sesiones de acompañamiento';
fields.owner.value='Nuevo líder';
fields.hypothesis.value='Nueva teoría del cambio';
sandbox.addAction({preventDefault() {},target:form});
assert.equal(x.actions.length,1,'Editar no duplica');
assert.equal(x.actions[0],action,'Conserva identidad y referencias');
assert.equal(action.name,'Sesiones de acompañamiento');
assert.equal(action.owner,'Nuevo líder');
assert.equal(action.hypothesis,'Nueva teoría del cambio');
assert.equal(action.status,'En ejecución','Conserva estado');
assert.equal(action.id,'action-001');
assert.equal(action.measurement,'Tasa de adopción');
assert.equal(action.source,'Inteligencia HACERLO · hipótesis generativa');
assert.equal(action.linkedConditionId,'cond-3');
assert.deepEqual(action.metadata,{approval:'pending'});
assert.equal(action.editIndex,undefined,'El índice no entra en datos persistidos');
assert.equal(saves,1);
assert.equal(renders,1);
sandbox.cancelActionEdit();
assert.equal(resets,1);
assert.equal(fields.editIndex.value,'');
assert.equal(title.textContent,'Nueva acción');
assert.equal(submit.textContent,'+ Crear acción');
assert.equal(canceller.classList.hidden,true);
fields.name.value='Nueva práctica';
fields.start.value='2026-11-15';
fields.end.value='2026-11-01';
sandbox.addAction({preventDefault(){},target:form});
assert.equal(x.actions.length,1,'Rechaza fechas inversas');
assert.match(alerts.at(-1),/fecha final/);
fields.end.value='2026-11-20';
sandbox.addAction({preventDefault(){},target:form});
assert.equal(x.actions.length,2,'Crear sigue funcionando');
assert.equal(x.actions[1].name,'Nueva práctica');
assert.equal(x.actions[1].status,'Pendiente');
assert.equal(x.actions[1].editIndex,undefined);
assert.equal(saves,2);
assert.equal(renders,2);
sandbox.editAction(456);
assert.equal(x.actions.length,2);
console.log('Implementación V2 OK: editar, guardar sin duplicar, preservar vínculos, cancelar y crear');
