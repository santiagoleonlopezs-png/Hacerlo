/* HACERLO · El orden manual de comportamientos conserva indicadores y hallazgos. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('src/modules/implementacion/operaciones.js','utf8');
const a={id:'b-a',name:'Identificar incidentes'},b={id:'b-b',name:'Reportar incidentes'},c={id:'b-c',name:'Gestionar eventos'};
const initiative={id:'i-1',behaviors:[a,b,c],indicators:[{name:'Adopción',behaviorIds:['b-a']}],
 diagnosisFindings:[{id:'f-1',behaviors:['0','2','b-b']},{id:'f-2',behaviors:['1']}]};
let saved=0,rendered=0;
const ctx={console,Date,
 current:()=>initiative,save:()=>saved++,render:()=>rendered++,
 document:{getElementById:()=>null},
 safe:value=>String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])),
 indicatorHasBehavior:(x,r,b)=>r.behaviorIds.includes(String(b.id)),
 behaviorAudienceLabel:()=> 'Todas las audiencias',
 ensureBehaviorIds:()=>{},
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const visible=initiative.behaviors.map((b,i)=>({b,i,ref:b.id}));
const html=ctx.behaviorExploreEntries(initiative,visible,visible[0]);
assert.match(html,/behaviorMove\(0,1\)/,'Debe ofrecer bajar el primero');
assert.match(html,/behaviorMove\(1,-1\)/,'Debe ofrecer subir el segundo');
assert.match(html,/aria-label="Subir comportamiento"/);
assert.match(html,/aria-label="Bajar comportamiento"/);
assert.match(html,/Quita la búsqueda|Usa las flechas/);
assert.match(html,/class="behavior-explore-entry-row"/,'No debe anidar botones en botones');
assert.doesNotMatch(html,/<button[^>]*class="behavior-explore-entry[^"]*"[^>]*>(?:(?!<\/button>)[\s\S])*<button[^>]*class="behavior-order-button"/,'No anidar controles en el botón principal');
ctx.behaviorMove(0,1);
assert.deepEqual(initiative.behaviors.map(x=>x.id),['b-b','b-a','b-c']);
assert.equal(initiative.diagnosisFindings[0].behaviors.join(','),'1,2,b-b','El hallazgo conserva sus referencias');
assert.equal(initiative.diagnosisFindings[1].behaviors.join(','),'0');
assert.deepEqual(initiative.indicators[0].behaviorIds,['b-a'],'Los indicadores siguen asociados por ID');
assert.equal(vm.runInContext('behaviorExploreSelected',ctx),'b-a','Mantener selección al mover');
assert.equal(saved,1);
assert.equal(rendered,1);
ctx.behaviorMove(0,-1);ctx.behaviorMove(2,1);
assert.equal(saved,1,'No mover fuera de los límites');
vm.runInContext('behaviorExploreSearch="reportar"',ctx);
ctx.behaviorMove(1,-1);
assert.equal(saved,1,'No reordenar mientras haya una búsqueda activa');
const filtered=ctx.behaviorExploreEntries(initiative,[{b:a,i:1,ref:a.id}],null);
assert.match(filtered,/borra la búsqueda/);
assert.doesNotMatch(filtered,/behavior-order-button/);
vm.runInContext('behaviorExploreSearch="";behaviorExploreAudience="audiencia-1"',ctx);
ctx.behaviorMove(1,-1);
assert.equal(saved,1,'No reordenar desde un filtro de audiencia');
vm.runInContext('behaviorExploreAudience="__all__"',ctx);
ctx.behaviorMove(1,-1);
assert.deepEqual(initiative.behaviors.map(x=>x.id),['b-a','b-b','b-c'],'El segundo movimiento puede deshacer el primero');
assert.equal(initiative.diagnosisFindings[0].behaviors.join(','),'0,2,b-b');
assert.equal(saved,2);
console.log('Diseño de comportamientos: reordenación persistente, filtros seguros, indicadores y hallazgos intactos.');
