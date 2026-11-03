/* HACERLO · Capacidad Adaptativa · fase 1: vinculación auditable de preguntas.
   No altera las encuestas, ni simula ecuaciones de AnyLogic todavía. */
const CA_DIMENSIONS=[
 {id:'energia',name:'Energía adaptativa',aliases:['desgaste','energía','energia','fatiga','saturación','carga emocional','ánimo']},
 {id:'preparacion',name:'Preparación para el cambio',aliases:['preparación','preparacion','autoeficacia','claridad','control','influir','recursos']},
 {id:'apertura',name:'Apertura adaptativa',aliases:['apertura','disposición','disposicion','curiosidad','flexibilidad','aprender']},
 {id:'memoria',name:'Memoria adaptativa',aliases:['experiencia','memoria','confianza','expectativas','cambios recientes']}
];
let caExpanded=false,caSurveyFilter='';
function caClean(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function caCandidates(x){
 return (x.surveys||[]).flatMap(s=>(s.questions||[]).filter(q=>['scale','nps','cnps'].includes(q.type)).map(q=>({
  key:JSON.stringify([s.id,q.id]),surveyId:s.id,questionId:q.id,survey:s.title||'Encuesta',
  kind:s.kind||'',label:q.label||'',dimension:q.dimension||'',type:q.type,
  min:q.min,max:q.max,reverse:!!q.reverse,
  responses:(s.responses||[]).length
 })));
}
function caRecommend(q,d){
 const hay=caClean(q.dimension+' '+q.label),terms=d.aliases.map(caClean);
 const dimension=caClean(q.dimension);
 if(terms.some(t=>dimension.includes(t)))return 3;
 if(terms.some(t=>hay.includes(t)))return 1;
 return 0;
}
function caStore(x){return x.capacityAdaptive||(x.capacityAdaptive={version:1,mappings:{},updatedAt:null});}
function caDimensionFromSource(name){
 const val=caClean(name).trim();
 if(!val||['sin dimension','sin clasificar','general','otros','n/a'].includes(val))return '';
 if(/desgaste|fatiga|energia|cansancio/.test(val))return 'energia';
 if(/preparacion|preparado|capacidades/.test(val))return 'preparacion';
 if(/apertura|disposicion|flexibilidad/.test(val))return 'apertura';
 if(/experiencia|memoria|aprendizajes previos/.test(val))return 'memoria';
 return '';
}
function caAssignmentMap(x){
 const owners=new Map();
 for(const dim of CA_DIMENSIONS){
  const saved=x.capacityAdaptive?.mappings?.[dim.id];
  if(!Array.isArray(saved))continue;
  for(const key of saved)if(!owners.has(key))owners.set(key,dim.id);
 }
 return owners;
}
function caSelection(x,d,candidates){
 const saved=x.capacityAdaptive?.mappings?.[d.id];
 if(Array.isArray(saved)){
  const owners=caAssignmentMap(x);
  return [...new Set(saved)].filter(key=>owners.get(key)===d.id);
 }
 // Sugerencias visibles: no se contabilizan hasta que el usuario las confirme.
 return candidates.filter(q=>caDimensionFromSource(q.dimension)===d.id).map(q=>q.key)
  .filter(key=>!caAssignmentMap(x).has(key));
}
function caAssignQuestion(dim,key){
 const x=current();if(!x)return;
 const candidates=caCandidates(x);
 if(!CA_DIMENSIONS.some(d=>d.id===dim)||!candidates.some(q=>q.key===key))return;
 const st=caStore(x);
 for(const d of CA_DIMENSIONS){
  const saved=Array.isArray(st.mappings[d.id])?st.mappings[d.id]:[];
  st.mappings[d.id]=saved.filter(v=>v!==key);
 }
 st.mappings[dim]=[...new Set([...st.mappings[dim],key])];
 st.updatedAt=new Date().toISOString();save();render();
}
function caRemoveQuestion(dim,key){
 const x=current();if(!x)return;const st=caStore(x);
 if(!CA_DIMENSIONS.some(d=>d.id===dim))return;
 st.mappings[dim]=(Array.isArray(st.mappings[dim])?st.mappings[dim]:[]).filter(v=>v!==key);
 st.updatedAt=new Date().toISOString();save();render();
}
function caToggleDimension(dim,key,checked){
 if(checked)caAssignQuestion(dim,key);else caRemoveQuestion(dim,key);
}
function caReset(dim){
 const x=current();if(!x)return;
 const st=caStore(x);st.mappings[dim]=[];
 st.updatedAt=new Date().toISOString();save();render();
}
function caConfirmSuggested(){
 const x=current();if(!x)return;
 const st=caStore(x),candidates=caCandidates(x),owners=caAssignmentMap(x);
 for(const d of CA_DIMENSIONS)if(!Array.isArray(st.mappings[d.id]))st.mappings[d.id]=[];
 for(const q of candidates){
  const dim=caDimensionFromSource(q.dimension);
  if(dim&&!owners.has(q.key)){
   st.mappings[dim].push(q.key);owners.set(q.key,dim);
  }
 }
 st.updatedAt=new Date().toISOString();save();render();
}
function caToggle(){caExpanded=!caExpanded;render();}
function caFilter(value){caSurveyFilter=value;render();}
function caQuestionHint(q){
 const from=caDimensionFromSource(q.dimension);
 if(from)return from;
 const ranked=CA_DIMENSIONS.map(d=>({id:d.id,score:caRecommend(q,d)}))
  .filter(d=>d.score>0).sort((a,b)=>b.score-a.score);
 if(ranked.length===1||(ranked.length>1&&ranked[0].score>ranked[1].score))return ranked[0].id;
 return '';
}
function caMarkup(x){
 const qs=caCandidates(x),st=caStore(x),owner=caAssignmentMap(x);
 const surveys=[...new Map(qs.map(q=>[q.surveyId,q.survey])).entries()];
 const waiting=qs.filter(q=>!owner.has(q.key)&&(!caSurveyFilter||String(q.surveyId)===String(caSurveyFilter)));
 const selectedCount=owner.size;
 const unassigned=qs.filter(q=>!owner.has(q.key)).length;
 const sourceLabel=q=>safe(q.survey)+' · '+safe(q.dimension||'Sin dimensión')+' · '+safe(q.type.toUpperCase());
 const encode=q=>encodeURIComponent(q.key);
 return `<section class="panel ca-entry" id="ca-panel">
  <div class="flex" style="justify-content:space-between;align-items:center;gap:12px">
   <div><div class="ca-kicker">FUENTES REALES · ASIGNACIÓN ÚNICA</div>
   <h2 class="ca-title">Preguntas por dimensión</h2>
   <p class="muted" style="margin:0">Cada pregunta solo puede pertenecer a una dimensión; no se duplica en el modelo.</p></div>
   <button class="secondary" type="button" onclick="caToggle()" aria-expanded="${caExpanded}">${caExpanded?'Ocultar configuración':'Clasificar preguntas →'}</button>
  </div>
  ${caExpanded?`<div style="margin-top:16px">
   <div class="muted" style="font-size:12px;margin-bottom:12px">${selectedCount} asignadas · ${unassigned} pendientes de clasificar. Las preguntas sin dimensión aparecen una sola vez en el banco inferior.</div>
   <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px">
    ${CA_DIMENSIONS.map(d=>{
     const keys=Array.isArray(st.mappings[d.id])?caSelection(x,d,qs):[];
     const assigned=keys.map(key=>qs.find(q=>q.key===key)).filter(Boolean);
     return `<section class="panel" style="margin:0"><div class="flex" style="justify-content:space-between;align-items:center">
      <h3 style="margin:0">${safe(d.name)}</h3><button class="secondary" type="button" onclick="caReset('${d.id}')" style="font-size:11px" ${!assigned.length?'disabled':''}>Limpiar</button>
     </div>
     <p class="muted" style="font-size:12px">${assigned.length} pregunta(s) vinculada(s)</p>
     ${assigned.map(q=>`<div class="ca-assigned-row"><div><strong>${safe(q.label||'Pregunta')}</strong>
      <small>${sourceLabel(q)}</small></div>
      <button type="button" class="secondary" aria-label="Desvincular pregunta" onclick="caRemoveQuestion('${d.id}',decodeURIComponent('${encode(q)}'))">×</button>
     </div>`).join('')||'<p class="muted" style="font-size:12px">Sin preguntas asignadas.</p>'}
     </section>`}).join('')}
   </div>
   <details class="ca-unassigned-pool" open>
    <summary><strong>Banco de preguntas por clasificar (${unassigned})</strong><small>Selecciona una dimensión una sola vez</small></summary>
    <div class="ca-pool-controls"><label>Instrumento
     <select onchange="caFilter(this.value)"><option value="">Todos</option>
     ${surveys.map(([id,title])=>`<option value="${safe(id)}" ${String(caSurveyFilter)===String(id)?'selected':''}>${safe(title)}</option>`).join('')}</select>
    </label></div>
    <div class="ca-pool-list">
     ${waiting.map(q=>{
      const hint=caQuestionHint(q),hintName=CA_DIMENSIONS.find(d=>d.id===hint)?.name;
      return `<div class="ca-pool-row">
       <div class="ca-pool-info"><strong>${safe(q.label||'Pregunta')}</strong>
        <small>${sourceLabel(q)}</small>
        ${hintName?`<small class="ca-pool-hint">${caDimensionFromSource(q.dimension)?'Dimensión del instrumento':'Sugerencia por texto'}: ${safe(hintName)}</small>`:''}
       </div>
       <label>Asignar a
        <select onchange="if(this.value)caAssignQuestion(this.value,decodeURIComponent('${encode(q)}'))">
         <option value="">Elegir dimensión</option>
         ${CA_DIMENSIONS.map(d=>`<option value="${d.id}">${safe(d.name)}</option>`).join('')}
        </select></label>
      </div>`}).join('')||'<p class="muted">No hay preguntas pendientes en este filtro.</p>'}
    </div>
   </details>
   ${qs.some(q=>!owner.has(q.key)&&caDimensionFromSource(q.dimension))?
    '<div class="ca-dyn-footer-actions"><button type="button" class="secondary" onclick="caConfirmSuggested()">Confirmar dimensiones del instrumento</button></div>':''}
   <p class="muted" style="font-size:12px;margin-top:14px">Las sugerencias no son diagnósticos automáticos. Solo se calculan valores de preguntas asignadas y con respuestas válidas.</p>
  </div>`:''}
 </section>`;
}
