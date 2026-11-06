/* Regresión: las alertas en relaciones siempre usan triángulo SVG,
   incluso cuando el diagnóstico cataloga el origen como Factor conductual. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('src/modules/analisis/grafos.js','utf8');
const ctx={
 safe:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 document:{getElementById:()=>null},save:()=>{},console
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const alertIcon=ctx.graphEdgeFactorIcon({role:'Factor conductual',name:'Hábito'});
assert.match(alertIcon,/M 0 -16 L 15 11/,'La alerta necesita un triángulo, no un rombo');
assert.match(alertIcon,/stroke-width="3.2"/,'El signo de exclamación debe ser nítido');
assert.doesNotMatch(alertIcon,/>◇</);
const green=ctx.graphEdgeFactorIcon({role:'Facilitador',name:'Ayuda'});
assert.match(green,/stroke="#50ddbb"/);
assert.match(green,/M -6 0 L -1 5 L 7 -5/);
const data={nodes:[{name:'Equipo 1',type:'Tecnología'},{name:'Equipo 2',type:'Tecnología'}],
 audiences:[],graphEdgeModelVersion:2,graphShowAlerts:true,
 edges:[{s:0,t:1,relation:'Informa a',evidence:'Observada',
 graphFactors:[{name:'Hábito',role:'Factor conductual',sourceKind:'factor',sourceId:'habito'}]}]};
const app={innerHTML:''};
ctx.renderAdoptionGraphPage(app,'<header>Red</header>',data);
assert.match(app.innerHTML,/aria-label="Alerta: Hábito. Abrir relación"/);
assert.match(app.innerHTML,/M 0 -16 L 15 11/);
assert.match(app.innerHTML,/graphOpenEdgeEditor\(0\)/);
assert.match(ctx.graphFactorBadges(data.edges[0].graphFactors,'edge',0),/⚠️/);
data.graphShowAlerts=false;
ctx.renderAdoptionGraphPage(app,'<header>Red</header>',data);
assert.doesNotMatch(app.innerHTML,/aria-label="Alerta: Hábito. Abrir relación"/);
console.log('Grafo: iconos SVG de alerta y facilitador correctos, accesibles y filtrables.');
