/* Inicio HACERLO: acciones que iniciaron y no han finalizado, consolidadas entre iniciativas. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('src/core/centro-inteligencia.js','utf8');
const items=[
 {id:'i1',name:'Transformación operativa',
  actions:[
   {name:'Acompañamiento líderes',start:'2026-10-01',end:'2026-11-20',owner:'María',status:'En ejecución'},
   {name:'Acción vencida',start:'2026-09-12',end:'2026-10-27',owner:'Andrés',status:'En ejecución'},
   {name:'Plan futuro',start:'2026-11-09',end:'2026-12-01',status:'En ejecución'},
   {name:'Pendiente pasado',start:'2026-10-01',end:'2026-11-20',status:'Pendiente'},
   {name:'Terminada',start:'2026-10-01',end:'2026-11-08',status:'Completada'},
   {name:'Sin fecha',status:'En ejecución'}
  ],behaviors:[],audiences:[],indicators:[],diagnosisFindings:[]},
 {id:'i2',name:'Mejoramiento servicio',
  actions:[
   {name:'Activar canales',start:'2026-11-06',end:'2026-11-06',owner:'Equipo servicio',status:'En ejecución'},
   {name:'Sin fecha de fin',start:'2026-08-01',owner:'Camila',status:'En ejecución'}
  ],behaviors:[],audiences:[],indicators:[],diagnosisFindings:[]}
];
const db={initiatives:items,selected:null};
let opened='';
const ctx={
 db,console,Date,
 safe:v=>String(v??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k])),
 normalizedStatus:s=>s==='En ejecución'?'En ejecución':s==='Completada'?'Completada':'Pendiente',
 pfIcon:()=>'<svg></svg>',
 save:()=>{},go:v=>{opened=v}
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const list=ctx.ciActionsRunningToday('2026-11-06');
assert.equal(list.length,4,'Incluye en ejecución que ya iniciaron en ambas iniciativas');
assert.equal(list[0].name,'Acción vencida','Prioriza la acción atrasada');
assert.equal(list[0].overdue,true);
assert.equal(list[1].name,'Activar canales','Destaca la fecha de finalización de hoy');
assert.equal(list[1].finishesToday,true);
assert.equal(list[2].name,'Acompañamiento líderes');
assert.equal(list[3].name,'Sin fecha de fin');
assert.equal(new Set(list.map(x=>x.initiativeId)).size,2,'Consolida todas las iniciativas');
assert.ok(!list.some(x=>['Pendiente pasado','Terminada','Plan futuro','Sin fecha'].includes(x.name)));
const row=ctx.ciRunningActionRow(list[0]);
assert.match(row,/Acción vencida/);
assert.match(row,/Transformación operativa/);
assert.match(row,/Andrés/);
assert.match(row,/Fecha de fin vencida/);
assert.match(row,/data-ci-target="Intervenciones"/);
ctx.ciOpenSignal({getAttribute:k=>k==='data-ci-id'?'i2':'Intervenciones'});
assert.equal(db.selected,'i2','Abre la iniciativa de origen');
assert.equal(opened,'Intervenciones');
const html=ctx.renderIntelligenceHome();
assert.match(html,/EJECUCIÓN · PORTAFOLIO/);
assert.match(html,/Acciones en curso/);
assert.ok(html.lastIndexOf('ci-running')>html.lastIndexOf('ci-next'),'El consolidado está al final del Inicio');
assert.match(html,/No hay acciones en curso registradas|ci-running-row/);
const css=fs.readFileSync('assets/css/centro-inteligencia.css','utf8');
assert.match(css,/\.ci-running/);
assert.match(css,/\.ci-running-state\.is-late/);
assert.match(css,/@media\(max-width:600px\)/);
const all=items.flatMap(x=>x.actions);
assert.ok(all.length>list.length,'El consolidado no confunde todas las acciones con las iniciadas');
console.log('Inicio OK: acciones iniciadas, sin completar, fechas, vencimientos y consolidado por iniciativas.');
