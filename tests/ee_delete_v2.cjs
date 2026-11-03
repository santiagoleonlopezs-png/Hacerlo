/* HACERLO: eliminar encuestas desde Opciones del instrumento, con Papelera y confirmación. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const draft={id:'draft',title:'Prueba CNPS',kind:'SENTIR',version:1,status:'draft',responses:[],questions:[]};
const published={id:'published',title:'Encuesta distribuida',kind:'Libre',version:1,status:'active',responses:[{id:'r1'}],questions:[],publication:{id:'publication-1',token:'previous'}};
const x={id:1,name:'Ejemplo',surveys:[draft,published],surveyTrash:[]};
let saves=0,renders=0,confirmed=true,denyPublication=false;
const notices=[],revocations=[];
const context={
 console,current:()=>x,
 EE:{init:i=>i.surveys,now:()=>new Date().toISOString(),uid:()=> 'revoked-token',simulation:()=>({})},
 safe:value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
 save:()=>saves++,render:()=>renders++,confirm:()=>confirmed,
 $:id=>id==='ee-message'?{set textContent(t){notices.push(t)},setAttribute(){}}:null,
 alert:()=>{throw Error('No se esperaba alerta')},
 sb:{from(table){assert.equal(table,'ee_publications');return {update(payload){revocations.push(payload);return {
  eq(key,value){assert.equal(key,'id');assert.equal(value,'publication-1');return Promise.resolve({
   error:denyPublication?{message:'Permiso insuficiente'}:null
  });}
 };}}}},
 diagModuleMenu:()=>'<nav></nav>'
};
vm.createContext(context);vm.runInContext(read('src/modules/encuestas/encuestas.js'),context);
for(const name of ['eeDesigner','eeSurveyKindPanel','eeHomeSourcesPanel','eeQuestionTypePanel',
 'eeDirectionPanel','eeOptionScoringPanel','eeMomentEditor','eeImportHistory','eeResults','eeSharePanel']){
 context[name]=()=>'<div></div>';
}
const markup=context.eePage(x);
assert.match(markup,/<details class="ee-instrument-options"><summary>Opciones del instrumento<\/summary>[\s\S]*?onclick="eeDeleteSurvey\(\)"/,'Eliminar permanece dentro de Opciones del instrumento');
assert.equal((markup.match(/onclick="eeDeleteSurvey\(\)"/g)||[]).length,1,'Una única acción de eliminar');
assert.match(markup,/Opciones del instrumento/);
(async()=>{
 context.eeOpen('draft');
 confirmed=false;
 await context.eeDeleteSurvey();
 assert.equal(x.surveys.length,2,'Cancelar no elimina nada');
 confirmed=true;
 await context.eeDeleteSurvey();
 assert.equal(x.surveys.length,1,'Elimina la encuesta seleccionada de la lista activa');
 assert.equal(x.surveyTrash.length,1,'Conserva preguntas y respuestas en la Papelera');
 assert.equal(revocations.length,0,'Un borrador no requiere revocación de enlace');
 assert.match(context.eePage(x),/ee-manager-trash/,'La Papelera sigue disponible al abrir Crear o importar');
 context.eeRestoreSurvey(0);
 assert.equal(x.surveys.length,2);
 assert.equal(x.surveyTrash.length,0);
 assert.ok(x.surveys.some(s=>s.id==='draft'));
 context.eeOpen('published');
 denyPublication=true;
 await context.eeDeleteSurvey();
 assert.ok(x.surveys.some(s=>s.id==='published'),'Si Supabase rechaza el cierre, no se elimina');
 assert.match(notices.at(-1),/No se pudo eliminar/);
 denyPublication=false;
 await context.eeDeleteSurvey();
 assert.ok(!x.surveys.some(s=>s.id==='published'));
 assert.equal(published.status,'closed');
 assert.equal(published.publication.revoked,true);
 assert.equal(published.publication.token,'revoked-token');
 assert.equal(revocations.at(-1).active,false,'Revoca el enlace antes de mover a Papelera');
 assert.equal(x.surveyTrash.at(-1).survey.responses.length,1,'Conserva las respuestas');
 assert.ok(saves>=3);
 assert.ok(renders>=3);
 const css=read('assets/css/encuestas.css');
 assert.match(css,/\.ee-instrument-options>summary\{/);
 console.log('Encuestas: eliminación visible, confirmación, revocación, Papelera y restauración correctas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
