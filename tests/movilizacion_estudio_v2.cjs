/* Prueba de integración UX: comunicaciones y reconocimientos son piezas de una acción, no nuevas acciones. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(f,'utf8');
const code=read('src/modules/implementacion/mecanismos.js')+'\n'+read('src/modules/implementacion/movilizacion-estudio.js');
const app=read('src/core/app.js'),html=read('index.html'),ai=read('src/modules/inteligencia/ia.js');
assert.match(app,/renderMovilizacionEstudio\(current\(\)\)/);
assert.match(html,/movilizacion-estudio\.js\?v=1\.0\.0/);
assert.match(html,/movilizacion-estudio\.css\?v=1\.0\.0/);
assert.match(ai,/mobilization:typeof mobAIContext==='function'/);
const action={id:'a-1',name:'Fortalecer la retroalimentación',owner:'Equipo cultura',status:'En ejecución',
 mechanisms:['comunicacion','reconocimiento','laboratorio'],hypothesis:'Fortalecer la retroalimentación cotidiana.'};
const x={name:'Implementación cultural',actions:[action],
 audiences:[{id:'aud-1',name:'Líderes de equipo'}],
 behaviors:[{id:'b-1',name:'Brindar retroalimentación semanal'}]};
const calls={save:0,render:0,confirm:0,alerts:[]};
const ctx={console,Date,safe:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 hcxHero:()=>'<header>Hero</header>',current:()=>x,
 save:()=>{calls.save++},render:()=>{calls.render++},confirm:()=>{calls.confirm++;return true},
 alert:m=>calls.alerts.push(m),
 document:{getElementById:()=>null},
 FormData:class{constructor(target){this.rows=target.data;}[Symbol.iterator](){return Object.entries(this.rows)[Symbol.iterator]();}}};
vm.createContext(ctx);vm.runInContext(code,ctx);
const page=ctx.renderMovilizacionEstudio(x);
assert.match(page,/CENTRO DE ACTIVACIÓN CONDUCTUAL/);
assert.match(page,/Acciones vinculadas/);
assert.match(page,/Dar sentido/);
assert.match(page,/Fortalecer la retroalimentación/);
assert.match(page,/Piezas de ejecución/);
const empty=ctx.renderMovilizacionEstudio({...x,actions:[]});
assert.match(empty,/COMIENZA CON UNA ACCIÓN/);
assert.match(empty,/Abrir Intervenciones/);
const draft=ctx.mobDraftFromPattern('comunicacion','activar',x,action,
 {elements:{namedItem:k=>({value:k==='audienceId'?'aud-1':'b-1'})}});
assert.match(draft.body,/Líderes de equipo/);
assert.match(draft.body,/Brindar retroalimentación semanal/);
assert.equal(draft.moment,'Durante');
const make=(kind,extra={})=>({preventDefault(){},target:{data:{
 pattern:kind==='comunicacion'?'activar':'evidencia',
 audienceId:'aud-1',behaviorId:'b-1',moment:'Durante',channel:'Teams',
 title:'Título conducta',body:'Mensaje que promueve la práctica observable.',
 cta:'Practiquemos esta semana.',recipient:'Equipo Alfa',evidence:'Se compartió una práctica útil con el equipo',
 ...extra
}}});
ctx.mobSavePiece(make('comunicacion'),0,'comunicacion');
ctx.mobSavePiece(make('reconocimiento'),0,'reconocimiento');
assert.equal(x.actions.length,1,'Las piezas no crean acciones');
assert.equal(action.mechanismRecords.comunicacion.length,1);
assert.equal(action.mechanismRecords.reconocimiento.length,1);
assert.equal(calls.save,2);
assert.equal(ctx.mobCounts(x).pieces,2);
const first=action.mechanismRecords.comunicacion[0];
ctx.mobUpdateStatus(0,'comunicacion',first.id,'lista');
assert.equal(action.mechanismRecords.comunicacion[0].status,'lista');
ctx.mobUpdateStatus(0,'comunicacion',first.id,'realizada');
assert.equal(action.mechanismRecords.comunicacion[0].status,'realizada');
assert.ok(action.mechanismRecords.comunicacion[0].executedAt);
assert.equal(ctx.mobCounts(x).completed,1);
assert.equal(calls.confirm,1);
const rec=action.mechanismRecords.reconocimiento[0];
ctx.mobUpdateStatus(0,'reconocimiento',rec.id,'realizada');
assert.equal(ctx.mobCounts(x).completed,2);
const aiContext=ctx.mobAIContext(x);
assert.equal(aiContext.pieces,2);
assert.equal(aiContext.executionsDeclared,2);
assert.ok(!JSON.stringify(aiContext).includes('Equipo Alfa'),'No pasar destinatarios a IA');
assert.ok(!JSON.stringify(aiContext).includes('Mensaje que promueve'),'No pasar mensajes íntegros a IA');
assert.match(ctx.renderMovilizacionEstudio(x),/2/);
assert.match(ctx.renderMovilizacionEstudio(x),/Ejecución registrada/);
assert.equal(action.mechanisms.length,3,'Se preservan mecanismos múltiples');
assert.equal(x.actions.length,1,'Sigue existiendo una sola acción');
const legacy={id:'old',name:'Antigua acción',mechanisms:['comunicacion'],
 mechanismDetails:{comunicacion:{message:'Mensaje histórico',channel:'Correo'}}};
assert.equal(ctx.mobItems(legacy,'comunicacion').length,1,'Compatibilidad con comunicaciones previas');
assert.equal(ctx.mobItems(legacy,'comunicacion')[0].body,'Mensaje histórico');
console.log('Estudio de Movilización v2 OK: propuestas, piezas múltiples, bitácora, privacidad e IA.');
