/* Pruebas integradas de Acciones en el tiempo: portafolio y proyecto, dos vistas. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('src/core/acciones-tiempo.js','utf8');
const app=fs.readFileSync('src/core/app.js','utf8'),home=fs.readFileSync('src/core/centro-inteligencia.js','utf8'),index=fs.readFileSync('index.html','utf8');
const initiatives=[
 {id:11,name:'Proyecto A',actions:[
  {name:'Preparar',start:'2026-11-02',end:'2026-11-09',status:'En ejecución',owner:'Ana'},
  {name:'Lanzamiento',start:'2026-11-12',end:'2026-11-12',status:'Pendiente'},
  {name:'Sin fecha',status:'Pendiente'}]},
 {id:22,name:'Proyecto B',actions:[
  {name:'Formar',start:'2026-11-03',end:'2026-11-15',status:'Pendiente',owner:'Luis'},
  {name:'Solo cierre',end:'2026-11-18',status:'Completada'}]}
];
const db={initiatives,selected:11};let page='',saves=0;
const ctx={db,console,Date,document:{getElementById:()=>null},save:()=>{saves++},go:v=>{page=v},current:()=>initiatives.find(i=>i.id===db.selected),
 safe:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
vm.createContext(ctx);vm.runInContext(code,ctx);
assert.equal(ctx.atRows('all').length,4,'Sin fecha se omite');
assert.equal(ctx.atRows('initiative').length,2,'El proyecto solo consulta sus acciones');
assert.match(ctx.atGantt('all'),/Proyecto B/);
assert.doesNotMatch(ctx.atGantt('initiative'),/Proyecto B/);
assert.match(ctx.atPanel('all'),/Todas las iniciativas/);
assert.match(ctx.atPanel('initiative'),/Iniciativa seleccionada/);
assert.match(ctx.atPanel('all'),/data-at-tab="gantt" class="active"/,'Gantt seleccionado al inicio');
assert.match(ctx.atPanel('all'),/^<details/,'Desplegable cerrado por defecto');
assert.match(ctx.atPanel('all'),/Gantt/);assert.match(ctx.atPanel('all'),/Calendario/);
ctx.atView('all','calendar');
assert.match(ctx.atPanel('all'),/data-at-tab="calendar" class="active"/);
ctx.atPick('all','2026-11-03');
const c=ctx.atCalendar('all');
assert.match(c,/Preparar/);assert.match(c,/Formar/);
assert.match(c,/Proyecto A/);assert.match(c,/Proyecto B/);
assert.match(c,/at-start/);
ctx.atMove('all',1);assert.equal(ctx.atState.all.month,'2026-12');
ctx.atToday('all');assert.equal(ctx.atState.all.day,null);
ctx.atOpen('22');assert.equal(db.selected,22);assert.equal(page,'Intervenciones');assert.equal(saves,1);
assert.equal(ctx.atRows('initiative').length,2);
assert.match(index,/acciones-tiempo\.js/);
assert.match(index,/acciones-tiempo\.css/);
assert.match(home,/atPanel\('all'\)/);
assert.match(app,/atPanel\('initiative'\)/);
assert.match(app,/if\(page==='Intervenciones'\)/);
console.log('Acciones en el tiempo OK: portafolio, iniciativa, Gantt, calendario, navegación y estados.');
