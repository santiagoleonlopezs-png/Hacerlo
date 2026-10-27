/* HACERLO V2 — Selector compacto de encuestas sin pérdida de funcionalidades. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('src/modules/encuestas/encuestas.js','utf8');
const css=fs.readFileSync('assets/css/encuestas.css','utf8');
const surveys=[
 {id:'s-a',title:'DX inicial Experiencia Conectados',kind:'NPS',version:1,status:'active',responses:new Array(104).fill({}),questions:[]},
 {id:'s-b',title:'Conversemos Conciencia inicial',kind:'Libre',version:1,status:'active',responses:new Array(74).fill({}),questions:[]}
];
const x={id:1,name:'Conectados para crecer',surveys,surveyTrash:[]};
let renders=0,saves=0,deleted=0;
const context={
 console,
 current:()=>x,
 EE:{init:()=>x.surveys,create:(kind,title)=>({id:'s-new',title,kind,status:'draft',version:1,responses:[],questions:[]})},
 safe:v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
 save:()=>saves++,render:()=>renders++,
 alert:msg=>{throw Error('Unexpected alert '+msg)}
};
vm.createContext(context);vm.runInContext(code,context);
context.eeDesigner=()=>'<article id="instrument-design">Diseño guardado</article>';
context.eeSurveyKindPanel=()=>'<div id="kind-settings"></div>';
context.eeHomeSourcesPanel=()=>'<div id="home-settings"></div>';
context.eeQuestionTypePanel=()=>'<div id="question-type"></div>';
context.eeDirectionPanel=()=>'<div id="direction-settings"></div>';
context.eeOptionScoringPanel=()=>'<div id="option-score"></div>';
context.eeResults=()=>'<div id="survey-results"></div>';
context.eeResponsePanel=()=>'<div id="survey-response"></div>';
context.eeImportPanel=()=>'<div id="survey-import"></div>';
context.eeSharePanel=()=>'<div id="survey-share"></div>';
context.eeTrashPanel=()=>'<div id="survey-trash"></div>';
context.eeMomentEditor=()=>'<div id="survey-moment"></div>';
context.eeImportHistory=()=>'<p id="import-history"></p>';
context.eeQuickPanel=()=>'<div id="quick-panel"></div>';
assert.equal(vm.runInContext('eePickerOpen',context),false,'Selector lateral no debe abrir al entrar');
let page=context.eePage(x);
assert.match(page,/id="ee-instrument-select"/);
assert.match(page,/ee-single-column/);
assert.doesNotMatch(page,/class="panel ee-sidebar"/);
assert.doesNotMatch(page,/ee-layout/);
assert.ok(page.includes('DX inicial Experiencia Conectados'));
assert.ok(page.includes('Conversemos Conciencia inicial'));
assert.match(page,/104 respuestas/);
assert.match(page,/＋ Crear o importar/);
assert.doesNotMatch(page,/ee-manager-grid/,'La creación debe permanecer contraída');
assert.match(page,/Opciones del instrumento/);
assert.match(page,/id="survey-moment"/,'La edición de momento debe seguir disponible');
assert.match(page,/id="import-history"/);
assert.match(page,/id="instrument-design"/);
assert.match(page,/id="question-type"/);
assert.match(page,/id="direction-settings"/);
assert.match(page,/id="option-score"/);
assert.match(page,/onclick="eeClone\(\)"/);
assert.match(page,/onclick="eeDeleteSurvey\(\)"/);
assert.match(page,/onclick="eeSetTab\(&quot;importar&quot;\)"/);
assert.match(page,/onclick="eeSetTab\(&quot;resultados&quot;\)"/);
assert.match(page,/onchange="eeOpen\(this.value\)"/);
context.eeOpen('s-b');
assert.equal(vm.runInContext('eeSelected',context),'s-b');
assert.equal(vm.runInContext('eeTab',context),'diseño');
page=context.eePage(x);
assert.match(page,/74 respuestas/);
assert.ok(page.indexOf('value="s-b" selected')>=0);
context.eeTogglePicker();
page=context.eePage(x);
assert.match(page,/ee-manager-grid/);
assert.match(page,/onchange="eeQuickRead\(this\)"/);
assert.match(page,/onsubmit="eeCreate\(event\)"/);
assert.match(page,/Ocultar creación/);
x.surveyTrash=[{id:'trashed'}];
assert.match(context.eePage(x),/id="survey-trash"/,'Papelera permanece accesible');
context.eeTogglePicker();
assert.doesNotMatch(context.eePage(x),/ee-manager-grid/);
assert.ok(css.includes('.ee-toolbar-row'));
assert.ok(css.includes('.ee-manager-grid'));
assert.ok(css.includes('.ee-single-column'));
const zero={id:2,name:'Iniciativa sin encuestas',surveys:[],surveyTrash:[]};
const oldSurveys=x.surveys,oldName=x.name,oldId=x.id,oldTrash=x.surveyTrash;
Object.assign(x,zero);
vm.runInContext('eeSelected=null;eeQuickState=null;eePickerOpen=false',context);
page=context.eePage(x);
assert.match(page,/ee-manager-grid/,'La primera creación debe estar a la vista');
assert.match(page,/Cargar desde Excel/);
assert.match(page,/Nuevo instrumento manual/);
assert.match(page,/Sin instrumentos todavía/);
assert.match(page,/Empieza con un instrumento/);
Object.assign(x,{id:oldId,name:oldName,surveys:oldSurveys,surveyTrash:oldTrash});
console.log('Encuestas V2 OK: selector superior, cambio de instrumento, gestión plegable, importación, papelera y estado inicial');
