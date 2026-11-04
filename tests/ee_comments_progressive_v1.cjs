/* HACERLO · Regresión comentarios: crecimiento descendente, nuevos al final y filtros. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('src/modules/encuestas/encuestas.js','utf8');
const css=fs.readFileSync('assets/css/encuestas.css','utf8');
const question={id:'texto_01',type:'text',label:'¿Qué podemos mejorar?'};
const survey={
 id:'survey-comments',title:'Encuesta CNPS',questions:[question],
 responses:Array.from({length:16},(_,i)=>({
  id:'r'+(i+1),date:new Date(Date.UTC(2026,10,1,0,i)).toISOString(),
  answers:{texto_01:'Comentario '+String(i+1).padStart(2,'0')},wave:'Base',audienceId:'a'
 }))
};
const x={id:1,surveys:[survey]};
const elements={
 'ee-comment-detail':{dataset:{visible:'5'},innerHTML:''},
 'ee-comment-list':{html:'',insertAdjacentHTML(position,html){assert.equal(position,'beforeend');this.html+=html}},
 'ee-comment-progress':{textContent:''},
 'ee-comment-more':{hidden:false,textContent:''},
 'ee-comment-question':{value:''},
 'ee-comment-person':{value:''}
};
const ctx={
 console,current:()=>x,
 EE:{optionScore:()=>null},
 safe:v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
 $:id=>elements[id],
};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext("eeFilter={wave:'',audienceId:''};eeSelected='survey-comments'",ctx);
const entries=vm.runInContext('eeCommentEntries',ctx);
const detail=vm.runInContext('eeCommentDetail',ctx);
const more=vm.runInContext('eeCommentMore',ctx);
const update=vm.runInContext('eeUpdateCommentDetail',ctx);
const dashboard=vm.runInContext('eeCommentsDashboard',ctx);
const list=entries(survey,'','');
assert.equal(list.length,16);
assert.equal(list[0].text,'Comentario 01');
assert.equal(list.at(-1).text,'Comentario 16','Los nuevos deben quedar al final');
const first=detail(survey,'','',5);
assert.match(first,/Mostrando 5 de 16 comentarios/);
assert.match(first,/Comentario 05/);
assert.doesNotMatch(first,/Comentario 06/);
assert.match(first,/eeCommentMore\(\)/);
assert.doesNotMatch(first,/página \d+ de/,'No cambiar de página al cargar más');
const board=dashboard(survey);
assert.match(board,/class="ee-detail ee-comment-accordion"/);
assert.match(board,/ontoggle="if\(this.open/);
assert.match(board,/data-visible="0"/);
update(true);
assert.equal(elements['ee-comment-detail'].dataset.visible,'5');
more();
assert.equal(elements['ee-comment-detail'].dataset.visible,'10');
assert.match(elements['ee-comment-list'].html,/Comentario 06/);
assert.match(elements['ee-comment-list'].html,/Comentario 10/);
assert.doesNotMatch(elements['ee-comment-list'].html,/Comentario 01/,'No duplicar comentarios existentes');
more();more();
assert.equal(elements['ee-comment-detail'].dataset.visible,'16');
assert.match(elements['ee-comment-list'].html,/Comentario 16/);
assert.equal(elements['ee-comment-more'].hidden,true);
survey.responses.push({id:'r17',answers:{texto_01:'Comentario 17'},wave:'Base',audienceId:'a'});
assert.equal(entries(survey,'','').at(-1).text,'Comentario 17');
assert.match(css,/\.ee-comment-list\{display:flex;flex-direction:column/);
assert.match(css,/max-height:none/);
console.log('Comentarios OK: detalle descendente, carga incremental sin saltos y recientes al final.');
