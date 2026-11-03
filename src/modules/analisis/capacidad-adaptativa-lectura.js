/* HACERLO · Capacidad Adaptativa · Evidencia observada.
   Usa los mismos cálculos y filtros que Encuestas; no modifica sus datos. */
function caReadObserved(x,wave='Base',audienceId=''){
 const surveys=x.surveys||[],candidates=caCandidates(x),cache=new Map(),dimensions={};
 for(const dim of CA_DIMENSIONS){
  const details=[];
  for(const key of caSelection(x,dim,candidates)){
   const item=candidates.find(q=>q.key===key);
   if(!item)continue;
   const survey=surveys.find(s=>String(s.id)===String(item.surveyId));
   const question=survey?.questions?.find(q=>String(q.id)===String(item.questionId));
   if(!question)continue;
   const filterKey=String(survey.id);
   if(!cache.has(filterKey))cache.set(filterKey,EE.detailed(survey,{wave,audienceId}).questions);
   const measured=cache.get(filterKey).find(q=>String(q.questionId)===String(question.id));
   if(!measured)continue;
   details.push({surveyId:survey.id,survey:survey.title,version:survey.version||1,
    questionId:question.id,label:question.label,dimension:question.dimension||'',
    type:question.type,reverse:!!question.reverse,n:measured.n||0,
    value:measured.value,unit:measured.unit,scale:measured.scale||null});
  }
  const scale=details.filter(q=>q.type==='scale'&&Number.isFinite(q.value)&&q.n>0);
  const nps=details.filter(q=>['nps','cnps'].includes(q.type));
  const rawValue=scale.length?scale.reduce((s,q)=>s+q.value,0)/scale.length:null;
  const needsOrientation=dim.id==='energia'&&scale.some(q=>caClean(q.dimension).includes('desgaste'));
  dimensions[dim.id]={label:dim.name,value:needsOrientation?null:rawValue,
   rawValue,needsOrientation,
   questionCount:scale.length,sources:details,
   sampleNote:'Promedio descriptivo de preguntas, con posible variación en n.',
   nps:nps.map(q=>({value:q.value,n:q.n,label:q.label,type:q.type}))};
 }
 return {initiativeId:x.id,wave,audienceId,dimensions,
  generatedAt:new Date().toISOString(),model:'observed-v1',
  warning:'No son stocks AnyLogic. Desgaste no equivale automáticamente a Energía; CNPS/NPS se mantienen separados.'};
}
function caSaveObserved(){
 const x=current();if(!x)return;
 const snapshot=caReadObserved(x,caObservedWave,caObservedAudience);
 const st=caStore(x);st.observations=st.observations||[];
 st.observations.push(snapshot);save();render();
}
