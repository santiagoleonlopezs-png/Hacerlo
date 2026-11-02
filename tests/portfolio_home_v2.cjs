/* HACERLO V2.17: portafolio con datos reales y comportamiento de controles. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const code=read('src/core/iniciativas-home.js'),app=read('src/core/app.js'),html=read('index.html'),css=read('assets/css/iniciativas-home.css');
const list=[
 {id:1,name:'Conectados para crecer',description:'Adopción',population:310,scope:'inside',phase:0,impact:4,effort:3,createdAt:'2026-08-05',actions:[]},
 {id:2,name:'Cámara Contrata',description:'Prueba',population:0,scope:'inside',phase:0,impact:null,effort:null,createdAt:'2026-06-05',actions:[]},
 {id:3,name:'End to end',description:'Implementación',population:350,scope:'inside',phase:0,impact:3,effort:3,createdAt:'2026-09-30',actions:[{status:'En ejecución'},{status:'Completada'}]}
];
const db={initiatives:list};let opened=null;
const c={
 console,db,
 safe:s=>String(s??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k])),
 normalizedStatus:s=>['Completada','En ejecución'].includes(s)?s:'Pendiente',
 priority:i=>!i.impact||!i.effort?{label:'Por evaluar',route:'Evaluar'}:i.impact>=3&&i.effort>=3?{label:'Proyecto estratégico',route:'Planificar'}:{label:'Oportunidad táctica',route:'Agrupar'},
 priorityEditor:()=>'<div id="real-priority-editor"></div>',
 phases:[['R','Resultados','#09c'],['D','Diseño','#0b9'],['A','Análisis','#85c'],['I','Implementación','#d81'],['M','Medición','#b4b']],
 choose:id=>opened=id
};
vm.createContext(c);vm.runInContext(code,c);
const markup=c.renderInitiativesHome();
for(const word of ['Centro de iniciativas','Conectados para crecer','Cámara Contrata','End to end','310 personas','350 personas','660','En ejecución','Proyecto estratégico','Por evaluar','Abrir iniciativa','Editar prioridad','pf-create','pf-search','Sin evaluar'])assert.ok(markup.includes(word),'Falta '+word);
for(const field of ['name','description','scope','population','createdAt','impact','effort'])assert.ok(markup.includes('name="'+field+'"'),'Campo existente '+field);
assert.match(markup,/onsubmit="createInitiative\(event\)"/);
assert.match(markup,/onclick="pfOpen\(this\)"/);
assert.match(markup,/1 de 2 acciones completadas/,'Progreso de acciones basado en registros reales');
assert.match(markup,/Sin acciones registradas/);
assert.equal((markup.match(/class="pf-card"/g)||[]).length,3);
assert.match(app,/if\(page==='Iniciativas'\)\{a.innerHTML=renderInitiativesHome\(\);return\}/);
assert.match(html,/src\/core\/iniciativas-home\.js\?v=2\.17\.0/);
assert.match(html,/assets\/css\/iniciativas-home\.css\?v=2\.17\.0/);
assert.ok(css.includes('.pf-layout')&&css.includes('.pf-card')&&css.includes('@media'));
const cards=list.map(i=>({hidden:false,getAttribute:()=>String(i.id)}));
const filterButtons=['all','running','strategic','pending'].map(k=>({key:k,attrs:{'data-pf-filter':k},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}}));
const input={value:'',focus(){}},count={textContent:''},empty={hidden:false};
c.document={
 getElementById:id=>({'pf-search':input,'pf-count':count,'pf-empty':empty})[id]||null,
 querySelectorAll:sel=>sel.includes('[data-pf-id]')?cards:sel.includes('[data-pf-filter]')?filterButtons:[]
};
c.pfSetFilter('strategic');
assert.deepEqual(cards.map(i=>i.hidden),[false,true,false]);
c.pfSetFilter('pending');
assert.deepEqual(cards.map(i=>i.hidden),[true,false,true]);
c.pfSetFilter('running');
assert.deepEqual(cards.map(i=>i.hidden),[true,true,false]);
c.pfClear();
input.value='camara';
c.pfApply();
assert.deepEqual(cards.map(i=>i.hidden),[true,false,true],'Búsqueda sin tildes');
input.value='nada';
c.pfApply();assert.equal(empty.hidden,false);
c.pfClear();assert.deepEqual(cards.map(i=>i.hidden),[false,false,false]);
c.pfOpen({closest:()=>({getAttribute:()=>String(3)})});assert.equal(opened,3);
console.log('Portafolio OK: filtros, datos, acciones, edición, creación y rutas existentes.');
