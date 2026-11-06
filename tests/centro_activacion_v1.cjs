/* Centro de activación: navegación, secuenciación y autorización sin disparar envíos de prueba. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('src/core/app.js'),index=read('index.html'),code=read('src/modules/implementacion/mecanismos.js')+'\n'+read('src/modules/implementacion/centro-activacion.js');
assert.match(app,/\['Intervenciones','▥'\],\['Plan de cambio','▤'\],\['Centro de activación','✧'\],\['Laboratorio','◇'\]/);
assert.match(app,/page==='Centro de activación'/);
assert.match(index,/centro-activacion\.js\?v=1\.0\.0/);
assert.match(index,/centro-activacion\.css\?v=1\.0\.0/);
const action={name:'Nuevo proceso',hypothesis:'Mejorar adopción',mechanisms:['comunicacion','reconocimiento']};
const x={name:'Iniciativa',actions:[action],audiences:[{id:'a1',name:'Equipo A',email:'a@example.com'}],
 audiencePeople:[{id:'p1',audienceId:'a1',email:'a@example.com'},{id:'p2',audienceId:'a1',email:'b@example.com'}]};
const calls={save:0,render:0,alert:0,network:0};
const ctx={console,Date,Number,crypto:{randomUUID:()=>String(calls.save+1).padStart(8,'0')+'-0000-4000-8000-000000000000'},
 safe:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 current:()=>x,save:()=>calls.save++,render:()=>calls.render++,
 confirm:()=>true,alert:()=>calls.alert++,
 cloudReady:false,hcxHero:()=>'<header>HACERLO</header>',
 document:{getElementById:()=>null},
 sb:{functions:{invoke:()=>{calls.network++;throw Error('No deberia enviar')}}}};
vm.createContext(ctx);vm.runInContext(code,ctx);
assert.match(ctx.renderCentroActivacion(x),/Centro de Activación Conductual|ACTIVAR/);
assert.match(ctx.renderCentroActivacion(x),/Nueva comunicación/);
assert.match(ctx.renderCentroActivacion(x),/Nuevo reconocimiento/);
assert.match(ctx.renderCentroActivacion(x),/Crear secuencia opcional/);
ctx.cacStartDirect('comunicacion');
assert.equal(x.actions.length,1,'La activación puntual no duplica la intervención');
assert.equal(action.activationSequence.length,1,'Se crea únicamente un mensaje puntual');
assert.equal(action.activationSequence[0].standalone,true,'Mensaje independiente, sin secuencia');
assert.equal(ctx.cacSequenceSteps(action).length,0,'La secuencia sigue siendo opcional');
assert.equal(calls.network,0,'La activación puntual no envía sin autorización');
ctx.cacBuildSequence();
assert.equal(x.actions.length,1,'Ninguna acción nueva');
assert.equal(ctx.cacSequenceSteps(action).length,4,'Etapas de activación, recordatorio y refuerzo');
assert.equal(action.activationSequence.length,5,'Se conserva la activación independiente al añadir la secuencia');
assert.equal(ctx.cacSequenceSteps(action).map(s=>s.stage).join(','),'sentido,activar,recordar,sostener');
assert.equal(ctx.cacSequenceSteps(action)[3].kind,'reconocimiento');
assert.ok(action.activationSequence.every(s=>s.status==='draft'));
assert.equal(calls.network,0,'Crear secuencia NO envía correo');
assert.equal(ctx.cacAudienceCount(x,'a1'),2,'Deduplicar el correo de una audiencia y su persona');
assert.match(ctx.renderCentroActivacion(x),/Selecciona qué vamos a activar/);
assert.match(ctx.renderCentroActivacion(x),/Dar sentido/);
assert.match(ctx.renderCentroActivacion(x),/Recordar/);
assert.match(ctx.renderCentroActivacion(x),/Reforzar/);
ctx.cacAddStep();
assert.equal(action.activationSequence.length,6);
const step=action.activationSequence[5];
ctx.cacDeleteStep();
assert.equal(action.activationSequence.length,5);
step.status='scheduled';action.activationSequence.push(step);
ctx.cacChooseStep(step.id);
ctx.cacDeleteStep();
assert.equal(action.activationSequence.length,6,'Un paso programado no puede borrarse sin cancelar su programación');
assert.equal(calls.network,0,'Editar secuencias no dispara llamadas de envío');
assert.ok(calls.save>=2);
console.log('Centro de activación OK: menú, secuencias, audiencias, sin envíos involuntarios.');
