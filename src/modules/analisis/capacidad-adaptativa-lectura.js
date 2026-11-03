/* HACERLO · Capacidad Adaptativa · conteos observados por pregunta.
   Escalas admisibles:
   1..5: detractores 1-2, pasivos 3, promotores 4-5.
   0..10: detractores 0-6, pasivos 7-8, promotores 9-10.
   NPS de 1..5 es un balance adaptado, NO NPS estandarizado.
   No combina preguntas de escalas distintas dentro de una dimensión. */
function caQuestionScale(q){
 const min=Number(q.min),max=Number(q.max);
 if(min===1&&max===5)return '1-5';
 if(min===0&&max===10)return '0-10';
 return '';
}
function caItemCounts(s,q,wave,audienceId,reverse=false){
 const scale=caQuestionScale(q),counts={promoters:0,passives:0,detractors:0,n:0,invalid:0};
 const rows=(s.responses||[]).filter(r=>
  String(r.wave||s.wave||'Base')===String(wave)&&
  (!audienceId||String(r.audienceId||'')===String(audienceId)));
 if(!scale)return {...counts,valid:false,scale:'',reason:'Escala no compatible: usar 1–5 o 0–10'};
 for(const r of rows){
  const raw=r.answers?.[q.id];
  if(raw===null||raw===undefined||raw==='')continue;
  const v=Number(raw),lo=Number(q.min),hi=Number(q.max);
  if(!Number.isInteger(v)||v<lo||v>hi){counts.invalid++;continue;}
  const n=reverse?lo+hi-v:v;
  const type=scale==='1-5'?(n<=2?'detractors':n===3?'passives':'promoters'):
   (n<=6?'detractors':n<=8?'passives':'promoters');
  counts[type]++;counts.n++;
 }
 return {...counts,scale,valid:counts.n>0,
  reason:counts.n?'Respuestas válidas categorizadas':'Sin respuestas válidas'};
}
function caPoolCounts(items){
 const counts={promoters:0,passives:0,detractors:0,n:0};
 for(const item of items){
  if(!item.counts?.valid)continue;
  for(const k of Object.keys(counts))counts[k]+=item.counts[k];
 }
 return {...counts,value:counts.n?100*(counts.promoters-counts.detractors)/counts.n:null,
  unit:'puntos',method:'Conteo conjunto de RESPUESTAS a preguntas, no de personas únicas'};
}
function caReadObserved(x,wave='Base',audienceId='',invertDesgaste=false){
 const surveys=x.surveys||[],candidates=caCandidates(x),dimensions={},owners=caAssignmentMap(x);
 for(const dim of CA_DIMENSIONS){
  const details=[],keys=Array.isArray(x.capacityAdaptive?.mappings?.[dim.id])?
   x.capacityAdaptive.mappings[dim.id].filter(key=>owners.get(key)===dim.id):[];
  for(const key of [...new Set(keys)]){
   const candidate=candidates.find(q=>q.key===key);
   if(!candidate)continue;
   const s=surveys.find(s=>String(s.id)===String(candidate.surveyId));
   const q=s?.questions?.find(q=>String(q.id)===String(candidate.questionId));
   if(!q)continue;
   const desgaste=dim.id==='energia'&&caClean(q.dimension).includes('desgaste');
   const reverse=!!q.reverse||(desgaste&&invertDesgaste);
   const counts=caItemCounts(s,q,wave,audienceId,reverse);
   details.push({surveyId:s.id,survey:s.title||'Encuesta',version:s.version||1,
    questionId:q.id,label:q.label||'Pregunta',dimension:q.dimension||'',
    type:q.type,reverse,desgaste,scale:counts.scale,
    n:counts.n,counts,value:counts.valid?
     100*(counts.promoters-counts.detractors)/counts.n:null,unit:'puntos'});
  }
  const valid=details.filter(q=>q.counts.valid);
  const scales=[...new Set(valid.map(q=>q.scale))],compatibleScale=scales.length<=1;
  const semTypes=[...new Set(details.filter(q=>['nps','cnps'].includes(q.type)).map(q=>q.type))];
  const compatibleSemantics=semTypes.length<=1;
  const needsOrientation=dim.id==='energia'&&details.some(q=>q.desgaste&&!q.reverse)&&!invertDesgaste;
  const questionComplete=details.length>0&&details.every(q=>q.counts.valid);
  const ready=questionComplete&&compatibleScale&&compatibleSemantics&&!needsOrientation;
  const counts=compatibleScale&&compatibleSemantics?caPoolCounts(valid):
   {promoters:0,passives:0,detractors:0,n:0,value:null,unit:'puntos',method:'No consolidable: revisar escalas/tipos'};
  const warning=!compatibleScale?'No mezclar preguntas 1–5 y 0–10 en la misma dimensión.':
   !compatibleSemantics?'No mezclar NPS de recomendación con CNPS de disposición en una dimensión.':
   needsOrientation?'Confirma la inversión de Desgaste antes de usarlo como Energía.':
   !questionComplete&&details.length?'Hay preguntas seleccionadas sin respuestas válidas.':'';
  dimensions[dim.id]={
   label:dim.name,mode:'balance',unit:'puntos',
   value:ready?counts.value:null,rawValue:counts.value,rawStock:ready?counts.value:null,
   ready,needsOrientation,questionsComplete:questionComplete,compatibleScale,
   compatibleSemantics,scale:scales.length===1?scales[0]:'',
   questionCount:details.length,sources:details,counts,warning,
   byScale:Object.fromEntries(['1-5','0-10'].map(k=>[k,caPoolCounts(valid.filter(q=>q.scale===k))])),
   sampleNote:'Conteos de respuestas categorizadas por pregunta; no de personas únicas.'
  };
 }
 return {initiativeId:x.id,wave,audienceId,dimensions,generatedAt:new Date().toISOString(),
  model:'observed-categorical-v3',warning:'Escalas 1–5 y 0–10 no son equivalentes psicométricamente. Se exige una misma escala por dimensión. Los balances adaptados no son NPS oficiales.'};
}
function caSaveObserved(){
 const x=current();if(!x)return;
 const snapshot=caReadObserved(x,caObservedWave,caObservedAudience,
  typeof caDynSession==='function'?caDynSession(x).invertDesgaste:false);
 if(!CA_DIMENSIONS.some(d=>snapshot.dimensions[d.id].ready)){
  alert('No hay lecturas configuradas y compatibles para guardar.');return;
 }
 const st=caStore(x);st.observations=st.observations||[];
 st.observations.push(snapshot);save();render();
}
