/* Centro de activación: navegación, secuenciación y autorización sin disparar envíos de prueba. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('src/core/app.js'),index=read('index.html'),code=read('src/modules/implementacion/mecanismos.js')+'\n'+read('src/modules/implementacion/centro-activacion.js');
assert.match(app,/\['Intervenciones','▥'\],\['Plan de cambio','▤'\],\['Centro de activación','✧'\],\['Laboratorio','◇'\]/);
assert.match(app,/page==='Centro de activación'/);
assert.match(index,/centro-activacion\.js\?v=1\.3\.0/);
assert.match(index,/centro-activacion\.css\?v=1\.3\.0/);
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
const editor=ctx.renderCentroActivacion(x);
assert.match(editor,/id="cac-editor"/);
assert.match(editor,/onclick="cacBackToCenter\(\)"/);
assert.match(editor,/<fieldset class="cac-field cac-audience-field">/,'El grupo de audiencias usa fieldset, sin labels anidados');
assert.doesNotMatch(editor,/<label class="cac-field"><span>Audiencias destinatarias/);
assert.match(editor,/Versión para otro destinatario/);
assert.match(editor,/Correo individual/);
assert.match(editor,/name="manualEmail"/);
assert.match(editor,/name="manualName"/);
assert.match(editor,/Elegir personas registradas/);
ctx.cacBackToCenter();
assert.doesNotMatch(ctx.renderCentroActivacion(x),/id="cac-editor"/,'Volver cierra el editor, no la iniciativa');
assert.equal(action.activationSequence.length,1,'Volver conserva la activación');
ctx.cacChooseStep(action.activationSequence[0].id);
assert.match(ctx.renderCentroActivacion(x),/id="cac-editor"/,'Se puede reabrir un paso guardado');
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
const peopleHtml=ctx.cacContactOptions(x,{contactIds:['p2'],status:'draft'});
assert.match(peopleHtml,/b@example\.com/);
assert.match(peopleHtml,/name="contact_ids"/);
assert.match(peopleHtml,/value="p2" checked/);
ctx.FormData=class{constructor(form){return new Map(Object.entries(form.mock))}};
const dummy={mock:{subject:'Hola {{nombre}}',message:'Acción en {{intervencion}}',cta:'Actuar',manualEmail:'fuera@empresa.com',manualName:'Andrea',kind:'comunicacion',stage:'activar'},
 querySelectorAll:(selector)=>selector.includes('audience_ids')?[]:[{value:'p2'}]};
const drafted=ctx.cacDraft(dummy,{kind:'comunicacion',stage:'activar'}, {action});
assert.equal(drafted.manualEmail,'fuera@empresa.com');
assert.equal(drafted.manualName,'Andrea');
assert.equal(drafted.contactIds.join(','),'p2');
assert.equal(drafted.audienceIds.length,0,'Los destinatarios individuales no requieren audiencia');
assert.match(read('supabase/functions/hacerlo-activation-email/index.ts'),/!contactIds.length&&!manualEmail/);
assert.match(ctx.renderCentroActivacion(x),/Qué intervención quieres activar/);
assert.match(ctx.renderCentroActivacion(x),/Dar sentido/);
assert.match(ctx.renderCentroActivacion(x),/Recordar/);
assert.match(ctx.renderCentroActivacion(x),/Reforzar/);
assert.match(ctx.renderCentroActivacion(x),/Seguimiento de envíos/,'Los estados del proveedor tienen nombre técnico');
assert.match(ctx.renderCentroActivacion(x),/Indicadores de cambio en HACERLO/,'Los resultados conductuales se distinguen del proveedor');
assert.match(ctx.renderCentroActivacion(x),/Ver indicadores/);
assert.match(app,/cacPrepareNavigation\(n\)/,'Navegar por menú restablece la vista de Centro de activación');
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
// Regresión UX: ninguna intervención exige activar mecanismos como prerequisito.
const plain={name:'Intervención sin mecanismos',mechanisms:['ninguno']};
x.actions.push(plain);
ctx.cacChooseAction(1);
assert.match(ctx.renderCentroActivacion(x),/Nueva comunicación/);
assert.match(ctx.renderCentroActivacion(x),/Nuevo reconocimiento/);
assert.doesNotMatch(ctx.renderCentroActivacion(x),/activa Comunicación o Reconocimiento/);
ctx.cacStartDirect('reconocimiento');
assert.equal(plain.activationSequence.length,1,'Una intervención sin mecanismos admite activación directa');
assert.ok(plain.mechanisms.includes('reconocimiento'),'Se vincula el mecanismo al iniciar, sin prerequisitos');
assert.ok(!plain.mechanisms.includes('ninguno'),'No aplica se sustituye por el mecanismo usado');
assert.equal(calls.network,0,'No se envía nada al crear un borrador');
const style=read('assets/css/centro-activacion.css');
assert.match(style,/--cac-surface:#0c283c/,'Identidad cromática HACERLO');
assert.match(style,/\.cac-control,\.cac-sequence,\.cac-editor,\.cac-history,\.cac-empty,\.cac-entry/,'Paneles comparten la misma superficie oscura');
assert.doesNotMatch(style,/var\(--card,#fff\)/,'No utilizar superficies blancas por ausencia de variables');
assert.match(style,/\.cac-audience-field \.cac-audience-option input\[type="checkbox"\]/,'El checkbox tiene tamaño propio');
assert.match(style,/\.cac-editor-back/,'La navegación de regreso tiene estilo');
assert.match(style,/\.cac-behavior-metrics/,'Los indicadores conductuales tienen panel propio');
assert.match(ctx.renderCentroActivacion({...x,actions:[]}),/Tu primera activación comienza con una intervención/);
console.log('Centro de activación OK: línea gráfica oscura, acciones sin prerrequisitos, secuencias opcionales y cero envíos involuntarios.');
