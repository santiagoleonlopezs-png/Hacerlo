/* HACERLO · Reordenamiento arrastrando directamente comportamientos, sin flechas. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const code=read('src/modules/implementacion/operaciones.js');
const a={id:'b-a',name:'Identificar incidentes'},b={id:'b-b',name:'Reportar incidentes'},c={id:'b-c',name:'Gestionar eventos'};
const initiative={id:'i-1',behaviors:[a,b,c],indicators:[{name:'Adopción',behaviorIds:['b-a']}],
 diagnosisFindings:[{id:'f-1',behaviors:['0','2','b-b']},{id:'f-2',behaviors:['1']}]};
let saved=0,rendered=0;
const ctx={console,Date,
 current:()=>initiative,save:()=>saved++,render:()=>rendered++,
 document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null},
 safe:v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])),
 indicatorHasBehavior:(x,r,b)=>r.behaviorIds.includes(String(b.id)),
 behaviorAudienceLabel:()=> 'Todas las audiencias',ensureBehaviorIds:()=>{}
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const visible=()=>initiative.behaviors.map((b,i)=>({b,i,ref:b.id}));
const html=ctx.behaviorExploreEntries(initiative,visible(),visible()[0]);
assert.match(html,/draggable="true"/);
assert.match(html,/ondragstart="behaviorDragStart\(event,this\)"/);
assert.match(html,/ondragover="behaviorDragOver\(event,this\)"/);
assert.match(html,/ondrop="behaviorDragDrop\(event,this\)"/);
assert.match(html,/behaviorTouchStart\(event,this\)/,'Arrastre en pantallas táctiles');
assert.match(html,/Alt \+ ↑ \/ ↓/,'Reordenamiento accesible por teclado');
assert.match(html,/behavior-explore-entry-content/);
assert.match(html,/behavior-explore-drag-grip/);
assert.doesNotMatch(html,/behavior-order-button|behaviorMove\(|Subir comportamiento|Bajar comportamiento/,'Sin botones de subir ni bajar');
assert.equal((html.match(/class="behavior-explore-entry-row"/g)||[]).length,3,'Tres tarjetas, todas arrastrables');

assert.equal(ctx.behaviorReorder(0,2),true);
assert.equal(initiative.behaviors.map(x=>x.id).join(','),'b-b,b-c,b-a');
assert.equal(initiative.diagnosisFindings[0].behaviors.join(','),'2,1,b-b','Conservar referencias antiguas por posición');
assert.equal(initiative.diagnosisFindings[1].behaviors.join(','),'0');
assert.equal(initiative.indicators[0].behaviorIds.join(','),'b-a','El indicador conserva su ID');
assert.equal(vm.runInContext('behaviorExploreSelected',ctx),'b-a','Conservar selección');
assert.equal(saved,1);assert.equal(rendered,1);
assert.equal(ctx.behaviorReorder(2,0),true);
assert.equal(initiative.behaviors.map(x=>x.id).join(','),'b-a,b-b,b-c');
assert.equal(initiative.diagnosisFindings[0].behaviors.join(','),'0,2,b-b');
assert.equal(saved,2);
assert.equal(ctx.behaviorReorder(0,0),false);
assert.equal(ctx.behaviorReorder(0,-1),false);
assert.equal(ctx.behaviorReorder(0,3),false);
assert.equal(saved,2,'No se guarda si no hay cambios');

vm.runInContext('behaviorExploreSearch="reportar"',ctx);
assert.equal(ctx.behaviorReorder(0,1),false);
const filtered=ctx.behaviorExploreEntries(initiative,[{b:a,i:0,ref:a.id}],null);
assert.match(filtered,/borra la búsqueda/);
assert.doesNotMatch(filtered,/draggable="true"|behavior-explore-drag-grip/);
vm.runInContext('behaviorExploreSearch="";behaviorExploreAudience="audiencia-1"',ctx);
assert.equal(ctx.behaviorReorder(0,1),false);
vm.runInContext('behaviorExploreAudience="__all__"',ctx);

// Simular arrastre desde la primera tarjeta hasta la parte inferior de la segunda.
const classes=new Set();
const first={dataset:{index:'0'},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
const second={dataset:{index:'1'},getBoundingClientRect:()=>({top:50,height:100}),
 classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
let payload='';
ctx.behaviorDragStart({dataTransfer:{setData:(type,data)=>{assert.equal(type,'text/plain');payload=data;},effectAllowed:''}},first);
assert.equal(payload,'0');
assert.ok(classes.has('is-dragging'));
ctx.behaviorDragDrop({clientY:130,preventDefault:()=>{},stopPropagation:()=>{}},second);
assert.equal(initiative.behaviors.map(x=>x.id).join(','),'b-b,b-a,b-c');
assert.equal(saved,3);
assert.equal(vm.runInContext('behaviorDragFrom',ctx),null,'Limpia el estado del arrastre');

const css=read('assets/css/experiencia-ui.css');
assert.match(css,/\.behavior-explore-entry-row>\.behavior-explore-entry/);
assert.match(css,/cursor:grab/);
assert.match(css,/touch-action:none/);
assert.match(css,/is-drop-before/);
assert.match(css,/is-drop-after/);
assert.doesNotMatch(css,/\.behavior-order-button/,'No quedan estilos de las antiguas flechas');
console.log('Comportamientos OK: arrastrar y soltar, táctil, selección, guardado, vínculos y filtros.');
