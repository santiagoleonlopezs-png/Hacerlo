/* HACERLO · Capacidad Adaptativa · adaptador de evidencia sin modificar EE.
   CNPS/NPS: conteo de respuestas válidas por pregunta, nunca suma de personas.
   Prohíbe mezclar escalas, CNPS y NPS en un mismo stock dinámico. */
function caPoolBalances(items,type){
 const selected=items.filter(q=>q.type===type);
 const valid=selected.filter(q=>q.counts?.valid&&q.n>0);
 const promoters=valid.reduce((sum,q)=>sum+q.counts.promoters,0);
 const passives=valid.reduce((sum,q)=>sum+q.counts.passives,0);
 const detractors=valid.reduce((sum,q)=>sum+q.counts.detractors,0);
 const n=promoters+passives+detractors;
 return {type,questions:selected.length,validQuestions:valid.length,
  promoters,passives,detractors,n,
  value:n?100*(promoters-detractors)/n:null,
  unit:'puntos',method:'Conteo de respuestas válidas a ítems; no personas únicas',
  invalidQuestions:selected.filter(q=>!q.counts?.valid).length};
}
function caReadObserved(x,wave='Base',audienceId=''){
 const surveys=x.surveys||[],candidates=caCandidates(x),cache=new Map(),dimensions={};
 const owners=caAssignmentMap(x);
 for(const dim of CA_DIMENSIONS){
  const details=[];
  const assigned=Array.isArray(x.capacityAdaptive?.mappings?.[dim.id])?
   x.capacityAdaptive.mappings[dim.id].filter(key=>owners.get(key)===dim.id):[];
  for(const key of [...new Set(assigned)]){
   const item=candidates.find(q=>q.key===key);
   if(!item)continue;
   const survey=surveys.find(s=>String(s.id)===String(item.surveyId));
   const question=survey?.questions?.find(q=>String(q.id)===String(item.questionId));
   if(!question)continue;
   if(!cache.has(String(survey.id)))cache.set(String(survey.id),EE.detailed(survey,{wave,audienceId}).questions);
   const measured=cache.get(String(survey.id)).find(q=>String(q.questionId)===String(question.id));
   if(!measured)continue;
   const detail={
    surveyId:survey.id,survey:survey.title,version:survey.version||1,
    questionId:question.id,label:question.label,dimension:question.dimension||'',
    type:question.type,reverse:!!question.reverse,n:measured.n||0,
    value:measured.value,unit:measured.unit,scale:measured.scale||null
   };
   if(['nps','cnps'].includes(question.type)){
    const strictRange=Number(question.min)===0&&Number(question.max)===10;
    const p=Number(measured.promoters)||0,pass=Number(measured.passives)||0,d=Number(measured.detractors)||0;
    const countsValid=strictRange&&detail.n>0&&p+pass+d===detail.n;
    detail.counts={promoters:p,passives:pass,detractors:d,n:detail.n,
     valid:countsValid,reason:!strictRange?'CNPS/NPS requiere escala de 0 a 10':detail.n===0?'Sin respuestas válidas':'Conteos verificados'};
    detail.value=countsValid?100*(p-d)/detail.n:null;
    detail.unit='puntos';
   }
   details.push(detail);
  }
  const scale=details.filter(q=>q.type==='scale');
  const usableScales=scale.filter(q=>Number.isFinite(q.value)&&q.n>0&&q.scale&&Number(q.scale[1])>Number(q.scale[0]));
  const cnps=caPoolBalances(details,'cnps');
  const nps=caPoolBalances(details,'nps');
  const kinds=[...new Set(details.map(q=>q.type))];
  const mode=kinds.length===1&&['scale','nps','cnps'].includes(kinds[0])?kinds[0]:kinds.length?'mixed':'none';
  const scales=[...new Set(usableScales.map(q=>JSON.stringify(q.scale)))];
  const compatibleScale=scales.length<=1;
  const rawValue=usableScales.length&&mode==='scale'?
   usableScales.reduce((s,q)=>s+q.value,0)/usableScales.length:null;
  const balance=mode==='cnps'?cnps:mode==='nps'?nps:null;
  const rawStock=mode==='scale'?rawValue:balance?.value??null;
  const needsOrientation=dim.id==='energia'&&details.some(q=>caClean(q.dimension).includes('desgaste'));
  const questionsComplete=details.length>0&&details.every(q=>q.n>0)&&
   (mode==='scale'?usableScales.length===details.length&&compatibleScale:
    (mode==='nps'||mode==='cnps')?balance.invalidQuestions===0&&balance.validQuestions===details.length:false);
  dimensions[dim.id]={
   label:dim.name,mode,unit:mode==='scale'?'%':'puntos',
   value:mode==='scale'&&!needsOrientation?rawValue:null,
   rawValue,rawStock,needsOrientation,questionsComplete,compatibleScale,
   questionCount:usableScales.length,sources:details,
   cnps,nps,npsByQuestion:details.filter(q=>['nps','cnps'].includes(q.type)),
   sampleNote:'CNPS/NPS por conteos de respuestas a preguntas; escalas por promedios normalizados, sin mezclarlos.',
   warning:mode==='mixed'?'Se seleccionaron preguntas de tipos diferentes.':!compatibleScale?'Se seleccionaron escalas de rangos diferentes.':''
  };
 }
 return {initiativeId:x.id,wave,audienceId,dimensions,generatedAt:new Date().toISOString(),
  model:'observed-v2',warning:'No se combinan CNPS, NPS y escalas. Los conteos multítem no representan personas únicas.'};
}
function caSaveObserved(){
 const x=current();if(!x)return;
 const snapshot=caReadObserved(x,caObservedWave,caObservedAudience);
 if(!CA_DIMENSIONS.some(d=>Number.isFinite(snapshot.dimensions[d.id]?.rawStock))){
  alert('No hay lecturas reales configuradas para guardar.');return;
 }
 const st=caStore(x);st.observations=st.observations||[];
 st.observations.push(snapshot);save();render();
}
