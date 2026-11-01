/* Regression: Diagnostic module contains surveys and a persistent four-way menu. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const core=read('src/core/app.js'),dx=read('src/modules/resultados/diagnostico.js'),ee=read('src/modules/encuestas/encuestas.js'),html=read('index.html');
const nav={innerHTML:''};
const x={id:1,name:'Test',surveys:[],surveyTrash:[],behaviors:[],diagnosisFindings:[],diagnosisHypotheses:[],behaviorDiagnosis:{}};
const c={console,page:'Inicio',phase:0,$:id=>id==='nav'?nav:null,
 phases:[['R','Resultados','#09c'],['D','Diseño','#0b9'],['A','Análisis','#85c'],['I','Implementación','#d81'],['M','Medición','#b4b']],
 render(){},save(){},current:()=>x,safe:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
 hcxHero:()=>'<section class="hcx-hero"></section>',EE:{init:z=>z.surveys||[]}};
vm.createContext(c);
const start=core.indexOf('const HACERLO_NAV_GROUPS='),end=core.indexOf('function choose(id)',start);
assert.ok(start>=0&&end>start);
vm.runInContext(core.slice(start,end),c);
vm.runInContext(dx+'\n'+ee,c);
c.go('Encuestas y experiencias');
assert.equal(c.phase,0);
assert.doesNotMatch(nav.innerHTML,/onclick="go\('Encuestas y experiencias'\)"/);
assert.match(nav.innerHTML,/nav nav-child active" onclick="go\('Diagnóstico'\)"/);
const tabs=c.diagModuleMenu('encuestas');
const names=['Encuestas y experiencias','Diagnóstico conductual','Hallazgos y micronarrativas','Tablero integrado'];
for(const n of names)assert.ok(tabs.includes(n));
assert.ok(names.every((n,i)=>i===0||tabs.indexOf(names[i-1])<tabs.indexOf(n)));
assert.equal((tabs.match(/<button/g)||[]).length,4);
assert.match(tabs,/active" aria-current="page" onclick="go\('Encuestas y experiencias'\)"/);
assert.match(c.eePage(x),/diag-module-menu/);
assert.match(c.eePage(x),/ee-single-column/);
assert.match(c.eePage(x),/RDAIM · RESULTADOS · DIAGNÓSTICO/);
assert.match(ee,/eeSetTab\(&quot;resultados&quot;\)/);
c.diagSwitch('hallazgos');
assert.equal(c.page,'Diagnóstico');
assert.equal(vm.runInContext('diagTab',c),'hallazgos');
c.go('Encuestas y experiencias');
assert.match(nav.innerHTML,/nav nav-child active" onclick="go\('Diagnóstico'\)"/);
assert.match(html,/class="top hcx-session-bar"/);
assert.match(html,/onclick="logoutHacerlo\(\)">Cerrar sesión/);
assert.doesNotMatch(html,/onclick="exportData\(\)"|onchange="importData\(event\)"/);
assert.match(html,/id="cloud-status" class="hcx-visually-hidden"/);
assert.match(html,/<aside><div class="logo">✣ HACERLO<\/div><div class="tag">Fábrica del Comportamiento/);
console.log('Diagnostico: menus internos, encuestas, resultados y cabecera correctos.');
