/* HACERLO · Instrumento de priorización: un solo origen en Encuestas.
   El diseño se copia a la iniciativa; no hay puntuaciones manuales ni posiciones fijas. */
const PRIORITY_KEY='priority-impact-effort';
const PRIORITY_QUESTIONS=[
 {id:'prio_impact_business',dimension:'Impacto',label:'¿Qué nivel de impacto tendría esta iniciativa en el negocio?',anchors:[
  [1,'Se mantienen los resultados actuales.'],
  [3,'Cambia el resultado de un proceso.'],
  [5,'Cambia un resultado global del negocio.']]},
 {id:'prio_impact_delay',dimension:'Impacto',label:'¿Qué sucede si la iniciativa no se realiza ahora?',anchors:[
  [1,'Posponerla no afecta resultados ni operación.'],
  [3,'Posponerla exige ajustes para sostener la operación.'],
  [5,'Posponerla provoca incumplimientos o interrupciones.']]},
 {id:'prio_effort_resources',dimension:'Esfuerzo',label:'¿Cuánto esfuerzo organizacional consume realizar esta iniciativa?',anchors:[
  [1,'Se ejecuta con la dedicación y los recursos ya asignados.'],
  [3,'Requiere reasignar dedicación y recursos de otras actividades.'],
  [5,'Requiere dedicar personas y recursos exclusivamente a la iniciativa.']]},
 {id:'prio_effort_change',dimension:'Esfuerzo',label:'¿Cuánto tiene que cambiar la gente su forma de trabajar una vez entre en operación la iniciativa?',anchors:[
  [1,'Se mantienen las prácticas actuales.'],
  [3,'Se modifica una rutina de trabajo.'],
  [5,'Se redefine la forma de ejercer el rol.']]}
];
function priorityQuestions(){
 return PRIORITY_QUESTIONS.map(q=>({
  id:q.id,label:q.label,dimension:q.dimension,type:'choice',required:true,
  priorityRandomized:true,options:q.anchors.map(a=>a[1]),
  optionScoring:{enabled:true,min:1,max:5,direction:'higher',options:q.anchors.map(a=>({option:a[1],value:a[0]}))}
 }));
}
function priorityNewSurvey(){
 if(typeof EE==='undefined')return null;
 const s=EE.create('Libre','Valoración de impacto y esfuerzo');
 Object.assign(s,{instrumentKey:PRIORITY_KEY,priorityTemplateVersion:1,kind:'Libre',status:'draft',
  questions:priorityQuestions(),description:'Valoración de la iniciativa mediante cuatro decisiones descriptivas; se presentan respuestas sin números y en orden variable.',
  instrumentNote:'Instrumento de priorización descriptiva. No equivale a una escala psicométrica validada.',
  wave:'Valoración',version:1,responses:[]});
 return s;
}
function prioritySurveys(x){return (x?.surveys||[]).filter(s=>s.instrumentKey===PRIORITY_KEY);}
function priorityEnsureSurvey(x){
 x.surveys ||= [];
 let surveys=prioritySurveys(x);
 if(!surveys.length){const s=priorityNewSurvey();if(!s)return null;x.surveys.push(s);return s;}
 return surveys.reduce((best,s)=>!best||Number(s.version||1)>Number(best.version||1)?s:best,null);
}
function priorityScoreReady(s){
 if(!s||!Array.isArray(s.questions))return false;
 const qs=s.questions.filter(q=>q.type==='choice'&&['Impacto','Esfuerzo'].includes(q.dimension));
 if(!qs.some(q=>q.dimension==='Impacto')||!qs.some(q=>q.dimension==='Esfuerzo'))return false;
 return qs.every(q=>{
  const scoring=q.optionScoring;
  if(!scoring?.enabled||!Array.isArray(scoring.options)||!Array.isArray(q.options)||q.options.length<2)return false;
  const map=new Map(scoring.options.map(o=>[o.option,o.value]));
  return q.options.every(o=>map.has(o)&&Number.isFinite(map.get(o))&&map.get(o)>=1&&map.get(o)<=5);
 });
}
function priorityAnswers(form,s){
 const answers=Object.fromEntries(s.questions.map(q=>[q.id,String(new FormData(form).get(q.id)||'').trim()]));
 const filled=Object.values(answers).filter(Boolean).length;
 if(!filled)return {mode:'skip',answers:{}};
 if(filled!==s.questions.filter(q=>q.required).length)return {mode:'incomplete',answers:{}};
 const valid=EE.validateResponse(s,answers);
 if(valid.errors.length)return {mode:'invalid',error:valid.errors.join(' · ')};
 return {mode:'complete',answers:valid.answers};
}
function priorityStoreResponse(x,s,answers,source='initiative-home'){
 const check=EE.validateResponse(s,answers);
 if(check.errors.length)throw Error(check.errors.join(' · '));
 if(!priorityScoreReady(s))throw Error('El instrumento necesita preguntas y valores válidos para Impacto y Esfuerzo.');
 if(s.status==='draft')s.status='active';
 s.responses ||= [];
 s.responses.push({id:EE.uid(),date:EE.now(),respondent:'',audienceId:'',wave:s.wave||'Valoración',answers:check.answers,source});
 priorityApplySummary(x);
}
function priorityResults(x){
 const surveys=prioritySurveys(x);
 const latest=surveys.filter(s=>s.responses?.length).sort((a,b)=>Number(b.version||1)-Number(a.version||1))[0];
 const selected=latest||surveys.sort((a,b)=>Number(b.version||1)-Number(a.version||1))[0];
 if(!selected)return {impact:null,effort:null,n:0,survey:null,version:null,date:null,valid:false};
 if(!priorityScoreReady(selected))return {impact:null,effort:null,n:0,survey:selected,version:selected.version,date:null,valid:false};
 const groups={Impacto:[],Esfuerzo:[]},dates=[];
 for(const r of selected.responses||[]){
  const per={Impacto:[],Esfuerzo:[]};
  for(const q of selected.questions.filter(q=>['Impacto','Esfuerzo'].includes(q.dimension)&&q.type==='choice')){
   const score=EE.optionScore(q,r.answers?.[q.id]);
   if(score!==null&&Number.isFinite(score))per[q.dimension].push(score);
  }
  const sizes={Impacto:selected.questions.filter(q=>q.dimension==='Impacto'&&q.type==='choice').length,Esfuerzo:selected.questions.filter(q=>q.dimension==='Esfuerzo'&&q.type==='choice').length};
  if(!Object.keys(per).every(k=>per[k].length===sizes[k]))continue;
  for(const k of Object.keys(per))groups[k].push(per[k].reduce((a,b)=>a+b,0)/per[k].length);
  dates.push(r.date||'');
 }
 const n=groups.Impacto.length;
 const mean=k=>n?Math.round(groups[k].reduce((a,b)=>a+b,0)/n*100)/100:null;
 return {impact:mean('Impacto'),effort:mean('Esfuerzo'),n,survey:selected,version:selected.version||1,date:dates.sort().at(-1)||null,valid:true};
}
function priorityApplySummary(x){
 const result=priorityResults(x);
 if(!result.valid||!result.n){if(x.prioritySource===PRIORITY_KEY){x.impact=null;x.effort=null;x.prioritySource=null;}return result;}
 x.impact=result.impact;x.effort=result.effort;x.prioritySource=PRIORITY_KEY;
 x.prioritySurveyId=result.survey.id;x.priorityN=result.n;x.priorityDate=result.date;
 return result;
}
function priorityQuestionMarkup(s,context='home'){
 if(!priorityScoreReady(s))return '<div class="pf-priority-warning">Revisa en Encuestas las dimensiones y los valores de respuesta para Impacto y Esfuerzo antes de diligenciar.</div>';
 const sections=['Impacto','Esfuerzo'].map(d=>{
  const qs=s.questions.filter(q=>q.type==='choice'&&q.dimension===d);
  return '<section class="pf-priority-dimension"><h4>'+d+'</h4>'+
    qs.map(q=>'<fieldset class="pf-priority-question"><legend>'+safe(q.label)+'</legend>'+
      '<div class="pf-priority-options">'+EE.shuffleChoices(q).map(answer=>'<label class="pf-priority-choice"><input type="radio" name="'+safe(q.id)+'" value="'+safe(answer)+'"><span>'+safe(answer)+'</span></label>').join('')+'</div></fieldset>').join('')+'</section>';
 }).join('');
 return '<div class="pf-priority-questions">'+sections+'</div>';
}
function priorityOverview(x){
 const v=priorityResults(x);
 if(!v.n)return '<div class="pf-priority-empty">Sin respuestas del instrumento. La iniciativa permanece por evaluar.</div>';
 return '<div class="pf-priority-stats"><div><span>Impacto promedio</span><strong>'+v.impact.toLocaleString('es-CO',{maximumFractionDigits:2})+' / 5</strong></div>'+
 '<div><span>Esfuerzo promedio</span><strong>'+v.effort.toLocaleString('es-CO',{maximumFractionDigits:2})+' / 5</strong></div></div>'+
 '<p class="pf-priority-proof">'+v.n+' '+(v.n===1?'valoración válida':'valoraciones válidas')+' · Instrumento v'+v.version+(v.date?' · Actualizado '+safe(String(v.date).slice(0,10)):'')+'</p>';
}
function prioritySurveyResults(x,s){
 const r=priorityResults(x);
 return '<section class="panel pf-priority-survey-summary"><h3>Resultados globales · Impacto y Esfuerzo</h3>'+
 (r.survey?.id===s.id?priorityOverview(x):'<p class="muted">Estás revisando otra versión del instrumento. Las iniciativas utilizan el último conjunto de respuestas válidas de una versión comparable.</p>')+
 '<p class="muted">Promedio de las dos preguntas por dimensión para cada respuesta completa y, después, promedio entre respuestas. Cada persona tiene el mismo peso. La matriz utiliza el valor sin redondearlo a entero.</p></section>';
}
function priorityCardForm(x){
 const s=prioritySurveys(x).sort((a,b)=>Number(b.version||1)-Number(a.version||1))[0]||{questions:priorityQuestions()};
 return '<details class="pf-priority-card-detail" data-pf-priority><summary>Valorar impacto y esfuerzo <span aria-hidden="true">⌄</span></summary>'+
 '<div class="pf-priority-card-body">'+priorityOverview(x)+
 '<p class="pf-priority-intro">Responde en este mismo lugar o comparte el instrumento desde Encuestas. Las opciones no muestran puntajes y su orden cambia para cada pregunta.</p>'+
 (priorityScoreReady(s)?'<form onsubmit="prioritySubmitOnCard(event)" data-priority-initiative="'+safe(String(x.id))+'">'+priorityQuestionMarkup(s)+
 '<div class="pf-priority-actions"><button type="submit" class="primary">Guardar valoración</button><button type="button" class="secondary" onclick="priorityGoToSurvey(this)">Abrir instrumento en Encuestas ↗</button></div></form>':
 '<button type="button" class="secondary" onclick="priorityGoToSurvey(this)">Configurar instrumento en Encuestas ↗</button>')+
 '</div></details>';
}
function priorityGoToSurvey(button){
 const card=button.closest('[data-pf-id]'),id=card?.getAttribute('data-pf-id');
 if(id){const x=db.initiatives.find(i=>String(i.id)===id);if(x){db.selected=x.id;const s=priorityEnsureSurvey(x);if(s&&typeof eeSelected!=='undefined')eeSelected=s.id;save();}}
 if(typeof go==='function')go('Encuestas');
}
function prioritySubmitOnCard(e){
 e.preventDefault();
 const form=e.target, x=db.initiatives.find(i=>String(i.id)===form.dataset.priorityInitiative);
 if(!x)return;
 const s=priorityEnsureSurvey(x);
 if(!priorityScoreReady(s))return alert('Configura el instrumento en Encuestas antes de valorar.');
 const selected=priorityAnswers(form,s);
 if(selected.mode!=='complete')return alert(selected.mode==='skip'?'Responde todas las preguntas o utiliza el instrumento desde Encuestas.':selected.error||'Responde todas las preguntas de las dos dimensiones.');
 try{priorityStoreResponse(x,s,selected.answers);save();render();}catch(error){alert(error.message);}
}
function priorityOpenCard(button){
 const card=button.closest('[data-pf-id]'),details=card?.querySelector('.pf-priority-card-detail');
 if(!details)return;
 details.open=true;
 details.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function priorityCreateState(form){
 const block=form?.querySelector('#pf-priority-create');
 if(!block)return;
 const enabled=!!form.elements.namedItem('name')?.value.trim()&&!!form.elements.namedItem('createdAt')?.value;
 block.hidden=!enabled;
 if(!enabled)block.open=false;
}
function priorityCreateForm(){
 const s={questions:priorityQuestions()};
 return '<details class="pf-priority-card-detail pf-priority-create-assessment" id="pf-priority-create" hidden><summary>Valorar impacto y esfuerzo <span aria-hidden="true">⌄</span></summary>'+
 '<div class="pf-priority-card-body"><p class="pf-priority-intro">Medición opcional. Puedes responder ahora o crear la iniciativa y valorar después desde este home o Encuestas.</p>'+
 priorityQuestionMarkup(s)+'</div></details>';
}
function prioritySubmitFromCreation(form,x){
 if(typeof EE==='undefined')return {ok:true};
 const s=priorityEnsureSurvey(x),state=priorityAnswers(form,s);
 if(state.mode==='skip')return {ok:true};
 if(state.mode!=='complete')return {ok:false,message:state.error||'Completa todas las preguntas o deja la valoración para después.'};
 try{priorityStoreResponse(x,s,state.answers);return {ok:true};}catch(e){return {ok:false,message:e.message};}
}
function priorityNavigateAssessment(id){
 if(typeof portfolioView==='undefined')return;
 portfolioView='initiatives';portfolioFilter='all';portfolioListMode='cards';
 render();
 const card=[...document.querySelectorAll('.pf-card')].find(el=>el.dataset.pfId===String(id));
 const details=card?.querySelector('.pf-priority-card-detail');
 if(details){details.open=true;details.scrollIntoView?.({behavior:'smooth',block:'start'});}
}
