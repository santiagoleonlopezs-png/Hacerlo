/* HACERLO: comparación real entre encuestas conectadas.
   Las asociaciones manuales requieren escalas equivalentes y consentimiento
   explícito del usuario. No modifica respuestas ni índices originales. */
let eeLinkedMappingOpen=false;
function eeLinkedNumericQuestion(q){
 return !!q&&(['scale','nps','cnps','knowledge'].includes(q.type)
  ||['choice','text'].includes(q.type)&&q.optionScoring?.enabled);
}
function eeLinkedScoreStructure(q){
 if(!eeLinkedNumericQuestion(q))return null;
 if(q.optionScoring?.enabled)return JSON.stringify({
  type:'scored-options',min:q.optionScoring.min,max:q.optionScoring.max,
  direction:q.optionScoring.direction||'higher',
  options:(q.optionScoring.options||[]).map(o=>[o.option,o.value]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
 });
 if(q.type==='knowledge')return JSON.stringify({type:q.type,correct:q.correct,options:q.options||[]});
 return JSON.stringify({type:q.type,min:q.min,max:q.max,reverse:!!q.reverse});
}
function eeLinkedCanCompare(a,b){
 if(!eeLinkedNumericQuestion(a)||!eeLinkedNumericQuestion(b)||a.type!==b.type)return false;
 if(a.optionScoring?.enabled||b.optionScoring?.enabled){
  if(!a.optionScoring?.enabled||!b.optionScoring?.enabled)return false;
  const c=a.optionScoring,d=b.optionScoring;
  return Number.isFinite(c.min)&&Number.isFinite(c.max)&&c.max>c.min
    &&Number.isFinite(d.min)&&Number.isFinite(d.max)&&d.max>d.min
    &&(c.direction||'higher')===(d.direction||'higher');
 }
 if(a.type==='scale')return Number.isFinite(a.min)&&Number.isFinite(a.max)&&a.max>a.min
   &&Number.isFinite(b.min)&&Number.isFinite(b.max)&&b.max>b.min&&!!a.reverse===!!b.reverse;
 if(a.type==='knowledge')return eeLinkedScoreStructure(a)===eeLinkedScoreStructure(b);
 return eeLinkedScoreStructure(a)===eeLinkedScoreStructure(b);
}
function eeLinkedCanAuto(a,b){
 if(!eeLinkedCanCompare(a,b))return false;
 if(a.optionScoring?.enabled||b.optionScoring?.enabled)return eeLinkedScoreStructure(a)===eeLinkedScoreStructure(b);
 // Dos preguntas con igual enunciado, tipo y orientación son comparables
 // aunque hayan sido catalogadas en dimensiones distintas.
 const lower=q=>eeChainNorm(q.dimension)==='desgaste';
 return lower(a)===lower(b);
}
function eeLinkedStoredMappings(x,s){
 const ids=new Set(eeChainMembers(x,s).map(z=>z.id)),group=s.measurementGroupId;
 if(!group)return [];
 return (x.measurementQuestionLinks||[]).filter(z=>z.groupId===group&&ids.has(z.firstSurveyId)&&ids.has(z.secondSurveyId));
}
function eeLinkedReadMetric(s,qid,audienceId=''){
 const q=(s.questions||[]).find(z=>z.id===qid);
 if(!eeLinkedNumericQuestion(q))return null;
 const metric=EE.detailed(s,{audienceId}).questions.find(row=>row.questionId===qid);
 if(!metric)return null;
 let value=metric.value??null,unit=metric.unit||'';
 if(q.optionScoring?.enabled){
  const c=q.optionScoring;
  value=value===null?null:Math.round(10000*(value-c.min)/(c.max-c.min))/100;
  unit='% de escala';
 }else if(q.type==='scale'||q.type==='knowledge')unit='%';
 return {value,n:metric.scoredOptions?metric.scoredN:metric.n,unit,label:q.label,questionId:q.id};
}
function eeLinkedSummary(s,audienceId=''){
 const count=(s.responses||[]).filter(r=>!audienceId||String(r.audienceId)===String(audienceId)).length;
 const composition=EE.composition(s,{audienceId});
 return {count,
  reference:composition.npsReference?.n>0?{value:composition.npsReference.balance,n:composition.npsReference.n,label:composition.npsReference.label}:null,
  global:composition.instrumentGlobal?.n>0?{value:composition.instrumentGlobal.balance,n:composition.instrumentGlobal.n}:null
 };
}
function eeLinkedRows(x,s,audienceId='',extraLinks=[]){
 const members=eeChainMembers(x,s),nodes=new Map(),parent=new Map(),groups=new Map();
 for(const survey of members)for(const q of survey.questions||[]){
  if(!eeLinkedNumericQuestion(q))continue;
  const id=JSON.stringify([survey.id,q.id]),node={id,survey,q};
  nodes.set(id,node);parent.set(id,id);groups.set(id,{nodes:[node],links:[]});
 }
 const root=id=>{
  if(!parent.has(id))return null;
  let p=parent.get(id);
  while(p!==parent.get(p))p=parent.get(p);
  parent.set(id,p);
  return p;
 };
 const merge=(a,b,link=null)=>{
  const ra=root(a),rb=root(b);
  if(!ra||!rb)return false;
  if(ra===rb){if(link)groups.get(ra).links.push(link);return true;}
  const ga=groups.get(ra),gb=groups.get(rb);
  if(ga.nodes.some(n=>gb.nodes.some(m=>m.survey.id===n.survey.id)))return false;
  if(ga.nodes.some(n=>gb.nodes.some(m=>!eeLinkedCanCompare(n.q,m.q))))return false;
  parent.set(rb,ra);ga.nodes.push(...gb.nodes);ga.links.push(...gb.links);
  if(link)ga.links.push(link);
  groups.delete(rb);return true;
 };
 // Instrumentos nacidos con «Crear siguiente medición»: misma familia e ID
 // de pregunta. Se respeta el enunciado y el sentido para no comparar
 // automáticamente preguntas cuyo significado haya sido modificado.
 const byOrigin=new Map();
 for(const node of nodes.values()){
  const family=String(node.survey.familyId||node.survey.previousSurveyId||node.survey.id);
  const key=JSON.stringify([family,String(node.q.id)]);
  if(!byOrigin.has(key))byOrigin.set(key,[]);
  byOrigin.get(key).push(node);
 }
 for(const lineage of byOrigin.values()){
  for(let i=0;i<lineage.length;i++)for(let j=i+1;j<lineage.length;j++){
   const first=lineage[i],second=lineage[j];
   if(first.survey.id!==second.survey.id
    &&eeChainNorm(first.q.label)===eeChainNorm(second.q.label)
    &&eeLinkedCanAuto(first.q,second.q))
    merge(first.id,second.id);
  }
 }
 const byName=new Map();
 for(const node of nodes.values()){
  const label=eeChainNorm(node.q.label);
  if(!label)continue;
  if(!byName.has(label))byName.set(label,[]);
  byName.get(label).push(node);
 }
 for(const matches of byName.values()){
  const counts=new Map();
  for(const node of matches)counts.set(node.survey.id,(counts.get(node.survey.id)||0)+1);
  if([...counts.values()].some(count=>count>1))continue;
  for(let i=0;i<matches.length;i++)for(let j=i+1;j<matches.length;j++){
   if(matches[i].survey.id!==matches[j].survey.id&&eeLinkedCanAuto(matches[i].q,matches[j].q))
    merge(matches[i].id,matches[j].id);
  }
 }
 const rejectedLinkIds=[];
 for(const link of [...eeLinkedStoredMappings(x,s),...extraLinks]){
  const a=JSON.stringify([link.firstSurveyId,link.firstQuestionId]);
  const b=JSON.stringify([link.secondSurveyId,link.secondQuestionId]);
  if(!merge(a,b,link))rejectedLinkIds.push(link.id);
 }
 const rows=[...groups.values()].filter(g=>g.nodes.length>1)
  .map(g=>{
   const selected=g.nodes.find(n=>g.links.length)||g.nodes[0];
   const manual=g.links.length>0;
   const linkLabel=g.links.map(v=>v.label).find(Boolean);
   const values=members.map(m=>{
    const n=g.nodes.find(z=>z.survey.id===m.id);
    return n?eeLinkedReadMetric(m,n.q.id,audienceId):null;
   });
   const unit=values.find(v=>v?.unit)?.unit||'';
   return {id:(manual?'manual:':'auto:')+g.nodes.map(n=>n.id).sort().join('|'),
    label:linkLabel||selected.q.label,unit,source:manual?'manual':'auto',
    values,questionRefs:g.nodes.map(n=>({surveyId:n.survey.id,questionId:n.q.id}))};
  })
  .sort((a,b)=>a.label.localeCompare(b.label,'es'));
 return {members,rows,rejectedLinkIds};
}
function eeLinkedDiff(row){
 const valid=row.values.map((m,i)=>({i,value:m?.value})).filter(m=>m.value!==null&&m.value!==undefined);
 if(valid.length<2)return null;
 return Math.round((valid.at(-1).value-valid[0].value)*100)/100;
}
function eeLinkedQuestionOptions(members){
 return members.map(s=>{
  const options=(s.questions||[]).filter(eeLinkedNumericQuestion).map(q=>
   '<option value="'+safe(s.id+'|'+q.id)+'">'+safe(q.label)+' · '+safe(q.type==='scale'?q.min+'–'+q.max:q.type)+'</option>').join('');
  return options?'<optgroup label="'+safe(eeChainMoment(s)+' · '+s.title)+'">'+options+'</optgroup>':'';
 }).join('');
}
function eeLinkedFormNotice(form,message,error=true){
 const feedback=form?.querySelector?.('[data-ee-map-feedback]');
 if(feedback){
  feedback.hidden=false;feedback.textContent=message;
  feedback.classList.toggle('is-error',!!error);
  feedback.setAttribute('role',error?'alert':'status');
 }else eeMsg(message,error);
}
function eeLinkedChooseCounterpart(form){
 const first=form?.elements?.namedItem?.('first'),second=form?.elements?.namedItem?.('second');
 if(!first||!second)return;
 const [surveyId,questionId]=String(first.value||'').split('|');
 const survey=eeChainMembers(current(),eeSurvey()).find(z=>String(z.id)===surveyId);
 const question=survey?.questions?.find(q=>String(q.id)===questionId);
 const previous=second.value;
 const options=Array.from(second.options||[]);
 for(const option of options)option.disabled=!!surveyId&&!!option.value&&option.value.split('|')[0]===surveyId;
 const currentOption=options.find(o=>o.value===previous);
 if(currentOption&&!currentOption.disabled&&currentOption.value)return;
 const candidates=options.filter(o=>o.value&&!o.disabled);
 const matching=candidates.find(o=>{
  const [sid,qid]=o.value.split('|');
  const other=eeChainMembers(current(),eeSurvey()).find(z=>String(z.id)===sid);
  const otherQ=other?.questions?.find(q=>String(q.id)===qid);
  return question&&otherQ&&eeChainNorm(question.label)===eeChainNorm(otherQ.label)
   &&eeLinkedCanAuto(question,otherQ);
 });
 second.value=matching?.value||'';
 const feedback=form.querySelector?.('[data-ee-map-feedback]');
 if(feedback){feedback.hidden=true;feedback.textContent='';}
}
function eeLinkedSaveQuestionMap(event){
 event.preventDefault();
 const x=current(),s=eeSurvey(),form=event.target;
 if(!x||!s)return;
 const fd=new FormData(form),fail=message=>eeLinkedFormNotice(form,message,true);
 if(fd.get('equivalent')!=='yes')return fail('Confirma que ambas preguntas miden el mismo atributo con el mismo sentido.');
 const members=eeChainMembers(x,s);
 if(members.length<2||!s.measurementGroupId)return fail('Conecta primero las encuestas en el seguimiento.');
 const locate=value=>{
  const [sid,qid]=String(value||'').split('|');
  const survey=members.find(z=>String(z.id)===sid);
  return {survey,q:survey?.questions?.find(q=>String(q.id)===qid)};
 };
 const first=locate(fd.get('first')),second=locate(fd.get('second'));
 if(!first.survey||!second.survey)return fail('Selecciona dos preguntas de las encuestas conectadas.');
 if(first.survey.id===second.survey.id)return fail('Elige una pregunta de otra medición; no puedes relacionar preguntas dentro de la misma encuesta.');
 if(!eeLinkedCanCompare(first.q,second.q))return fail('Estas preguntas no tienen escalas o sentidos compatibles. Selecciona otras preguntas equivalentes.');
 const label=String(first.q.label||'').trim();
 if(!label)return fail('La pregunta de origen debe tener un nombre válido.');
 const pairKey=link=>[JSON.stringify([link.firstSurveyId,link.firstQuestionId]),
   JSON.stringify([link.secondSurveyId,link.secondQuestionId])].sort().join('|');
 const candidate={id:EE.uid(),groupId:s.measurementGroupId,
  firstSurveyId:first.survey.id,firstQuestionId:first.q.id,
  secondSurveyId:second.survey.id,secondQuestionId:second.q.id,
  label,createdAt:EE.now()};
 x.measurementQuestionLinks ||= [];
 if(eeLinkedStoredMappings(x,s).some(m=>pairKey(m)===pairKey(candidate)))
  return fail('Esta correspondencia ya está guardada y se utiliza en la comparación.');
 const preview=eeLinkedRows(x,s,'',[candidate]);
 if(preview.rejectedLinkIds.includes(candidate.id))
  return fail('Las preguntas pertenecen a correspondencias incompatibles. Revisa las relaciones existentes.');
 x.measurementQuestionLinks.push(candidate);
 eeChainExpanded=true;eeLinkedMappingOpen=true;save();render();
 const visibleForm=typeof document!=='undefined'?document.querySelector('.ee-linked-mapping-form'):null;
 eeLinkedFormNotice(visibleForm||form,'Correspondencia guardada. Se conservará en el seguimiento.',false);
 if(typeof eeVerifySave==='function'){
  void eeVerifySave('Correspondencia entre preguntas',s.id).then(ok=>{
   if(ok!==false)return;
   const currentForm=typeof document!=='undefined'?document.querySelector('.ee-linked-mapping-form'):null;
   eeLinkedFormNotice(currentForm||form,'La correspondencia está en este equipo, pero el servidor aún no confirmó el guardado. Revisa la conexión.',true);
  });
 }
}
function eeLinkedRemoveQuestionMap(id){
 const x=current(),s=eeSurvey();if(!x||!s)return;
 x.measurementQuestionLinks=(x.measurementQuestionLinks||[]).filter(z=>z.id!==id||z.groupId!==s.measurementGroupId);
 eeChainExpanded=true;save();render();eeMsg('Correspondencia eliminada sin alterar las encuestas.');
 if(typeof eeVerifySave==='function')void eeVerifySave('Comparación de preguntas',s.id);
}
/* Resultados comparables del seguimiento, sin sobrescribir los resultados
   ni alterar la escala original de ninguna encuesta. */
function eeLinkedEvolutionData(x,s,audienceId=''){
 const comparison=eeLinkedRows(x,s,audienceId);
 const members=comparison.members;
 if(members.length<2)return null;
 const counted=members.map(m=>(m.responses||[]).filter(r=>!audienceId||String(r.audienceId)===String(audienceId)).length);
 const measured=counted.map((n,i)=>n>0?i:-1).filter(i=>i>=0);
 const shared=unit=>comparison.rows.filter(row=>row.unit===unit&&measured.length>=2
   &&measured.every(i=>row.values[i]?.value!==null&&row.values[i]?.value!==undefined&&row.values[i]?.n>0));
 // Solo variables disponibles en TODOS los momentos efectivamente medidos.
 // No recalcular un "global" con preguntas diferentes en Base y Durante.
 const commonPercent=shared('%');
 const commonPoints=shared('puntos');
 const avg=(values)=>values.length?Math.round(values.reduce((a,b)=>a+b,0)*100/values.length)/100:null;
 const baseline=measured.length?measured[0]:-1,latest=measured.length?measured.at(-1):-1;
 const series=members.map((m,i)=>{
  const values=commonPercent.map(row=>row.values[i]?.value).filter(v=>v!==null&&v!==undefined);
  const reference=commonPoints.length===1?commonPoints[0].values[i]:null;
  const metrics=[
   {key:'linked:global',label:'Promedio de preguntas comparables',value:values.length===commonPercent.length?avg(values):null,n:counted[i],unit:'%',min:0,max:100},
   {key:'linked:reference',label:commonPoints.length===1?commonPoints[0].label:'Índice de referencia comparable',value:reference?.value??null,n:reference?.n??0,unit:'puntos',min:-100,max:100}
  ];
  return {wave:eeChainMoment(m),date:eeChainDateInfo(m).date,n:counted[i],metrics};
 });
 const comparisons=series[0].metrics.map(metric=>{
  const first=baseline>=0?series[baseline].metrics.find(q=>q.key===metric.key):null;
  const last=latest>=0?series[latest].metrics.find(q=>q.key===metric.key):null;
  const hasChange=measured.length>=2&&first?.value!=null&&last?.value!=null;
  return {...metric,baselineValue:first?.value??null,latestValue:last?.value??null,
   baselineN:first?.n||0,latestN:last?.n||0,
   delta:hasChange?Math.round((last.value-first.value)*100)/100:null};
 });
 return {members,counted,measured,sharedPercent:commonPercent,sharedPoints:commonPoints,
  baseline:baseline>=0?series[baseline].wave:'',latest:latest>=0?series[latest].wave:'',
  series,comparisons,hasComparison:measured.length>=2&&(commonPercent.length>0||commonPoints.length===1)};
}
function eeLinkedEvolutionDashboard(x,s,audienceId=''){
 const data=eeLinkedEvolutionData(x,s,audienceId);
 if(!data||data.members.length<2)return '';
 const global=data.comparisons.find(q=>q.key==='linked:global');
 const reference=data.comparisons.find(q=>q.key==='linked:reference');
 const sections=[];
 if(data.sharedPercent.length){
  sections.push('<div class="ee-linked-primary-chart"><h4>Promedio de preguntas comparables</h4>'+
   '<p class="muted">'+data.sharedPercent.length+' pregunta(s) común(es) con puntuación porcentual. Cada pregunta tiene el mismo peso en el promedio de cada momento; no es el CNPS original.</p>'+
   eeMetricChart(data,'linked:global')+eeEvolutionTable(data,['linked:global'])+'</div>');
 }
 if(data.sharedPoints.length===1){
  sections.push('<details class="ee-linked-primary-reference" open><summary>Índice de referencia comparable</summary>'+
   '<p class="muted">Misma pregunta e índice de −100 a 100 en las mediciones.</p>'+
   eeMetricChart(data,'linked:reference')+eeEvolutionTable(data,['linked:reference'])+'</details>');
 }
 const card=(value,label,unit,delta)=>{
  const score=value?.latestValue;
  return '<div class="ee-linked-primary-metric"><small>'+safe(label)+'</small>'+
   '<strong>'+(score===null||score===undefined?'—':eeNumber(score))+
   '<span>'+safe(unit)+'</span></strong>'+
   '<span>'+(delta===null||delta===undefined?'Sin comparación':(delta>0?'↑ +':delta<0?'↓ ':'')+eeNumber(delta)+' '+(unit==='%'?'puntos porcentuales':'puntos'))+'</span></div>';
 };
 const cards=(data.sharedPercent.length?card(global,'Promedio comparable','%',global.delta):'')+
  (data.sharedPoints.length===1?card(reference,'Referencia comparable','puntos',reference.delta):'');
 const note=!data.measured.length?'Las mediciones vinculadas todavía no tienen respuestas.':
  data.measured.length===1?'Solo un momento tiene respuestas; podrás comparar cuando llegue la siguiente medición.':
  !sections.length?'Las mediciones están conectadas, pero aún no comparten preguntas con resultados compatibles. Puedes relacionarlas en «Conectar y comparar encuestas».':'';
 return '<section class="ee-linked-primary" aria-label="Evolución del seguimiento vinculado">'+
  '<div class="ee-linked-primary-heading"><div><span>SEGUIMIENTO VINCULADO</span><h3>Resultados comparables entre momentos</h3>'+
   '<p class="muted">'+data.members.length+' mediciones conectadas · '+safe(data.baseline||'Sin base')+' → '+safe(data.latest||'Sin resultados')+'</p></div>'+
   '<span class="ee-linked-primary-count">'+data.sharedPercent.length+' preguntas porcentuales comparables</span></div>'+
  (cards?'<div class="ee-linked-primary-metrics">'+cards+'</div>':'')+
  (note?'<p class="ee-linked-primary-note">'+safe(note)+'</p>':'')+
  sections.join('')+
  '<p class="ee-linked-primary-footnote">Comparación descriptiva de muestras por momento; no supone que respondieron las mismas personas. Los resultados originales de cada encuesta se conservan abajo.</p>'+
 '</section>';
}
function eeLinkedExport(){
 const x=current(),s=eeSurvey(),comparison=eeLinkedRows(x,s,eeFilter.audienceId);
 const headers=['resultado','tipo','unidad',...comparison.members.map(z=>eeChainMoment(z)),'cambio'];
 const rows=comparison.rows.map(r=>[r.label,r.source,r.unit,...r.values.map(v=>v?.value??''),eeLinkedDiff(r)??'']);
 eeDownload('comparacion-vinculada-'+s.id+'.csv',EE.csv([headers,...rows]),'text/csv;charset=utf-8');
}
function eeChainComparisonView(x,s){
 const linked=eeChainMembers(x,s),audienceId=eeFilter.audienceId;
 if(linked.length<2)return '';
 const cards=linked.map(z=>{
  const summary=eeLinkedSummary(z,audienceId);
  const value=m=>m?.value==null?'—':eeNumber(m.value);
  return '<article class="ee-linked-summary"><div class="ee-linked-summary-heading"><small>'+safe(eeChainMoment(z))+'</small><strong>'+safe(z.title)+'</strong></div>'+
   '<div class="ee-linked-summary-values"><div><span>Respuestas</span><b>'+summary.count+'</b></div>'+
    '<div><span>Índice de referencia</span><b>'+value(summary.reference)+'</b></div>'+
    '<div><span>Índice global propio</span><b>'+value(summary.global)+'</b></div></div></article>';
 }).join('');
 const {members,rows,rejectedLinkIds}=eeLinkedRows(x,s,audienceId);
 const tables=rows.length?'<div class="ee-linked-table-scroll"><table class="ee-evolution-table ee-linked-results"><thead><tr><th>Resultado comparable</th>'+
  members.map(z=>'<th>'+safe(eeChainMoment(z))+'</th>').join('')+'<th>Cambio*</th></tr></thead><tbody>'+
  rows.map(row=>{
   const delta=eeLinkedDiff(row);
   return '<tr><th scope="row">'+safe(row.label)+
    '<small>'+safe(row.unit)+(row.source==='manual'?' · validado por usuario':' · misma pregunta')+'</small></th>'+
    row.values.map(v=>'<td>'+ (v?.value==null?'—':eeNumber(v.value))+'<small>n = '+(v?.n||0)+'</small></td>').join('')+
    '<td>'+ (delta==null?'—':(delta>0?'↑ +':delta<0?'↓ ':'')+eeNumber(delta))+'</td></tr>';
  }).join('')+'</tbody></table></div><p class="muted ee-linked-footnote">* Diferencia en puntos de la unidad indicada, entre el primer y el último momento con respuestas válidas.</p>'+
  '<button class="secondary" type="button" onclick="eeLinkedExport()">↓ Descargar comparación</button>':
  '<p class="ee-linked-empty">No se encontraron preguntas automáticamente comparables. Abre «Relacionar preguntas equivalentes» para definir correspondencias válidas. Una encuesta sin respuestas se mostrará como «—» hasta recibir datos.</p>';
 const mappings=eeLinkedStoredMappings(x,s);
 const mapSummary=mappings.length?'<div class="ee-linked-mappings">'+mappings.map(m=>
  '<div class="ee-linked-map"><span>'+safe(m.label)+'</span><button class="secondary" type="button" onclick="eeLinkedRemoveQuestionMap(\''+safe(m.id)+'\')">Quitar</button></div>').join('')+'</div>':'';
 const questionOptions=eeLinkedQuestionOptions(linked);
 const mappingForm='<details class="ee-linked-mapping"'+(!rows.length||eeLinkedMappingOpen?' open':'')+' ontoggle="eeLinkedMappingOpen=this.open"><summary>Relacionar preguntas equivalentes'+(mappings.length?' · '+mappings.length+' guardadas':'')+'</summary>'+
  '<p class="muted">La categoría SENTIR/CNPS/NPS no vuelve equivalentes dos preguntas. Si miden lo mismo con tipos y sentidos compatibles, puedes relacionarlas. Las escalas numéricas compatibles se expresan en una unidad común; NPS y CNPS conservan sus índices propios.</p>'+
  mapSummary+
  '<form onsubmit="eeLinkedSaveQuestionMap(event)" class="ee-linked-mapping-form">'+
  '<label>Pregunta del primer momento<select name="first" required onchange="eeLinkedChooseCounterpart(this.form)"><option value="">Elegir pregunta</option>'+questionOptions+'</select></label>'+
  '<label>Pregunta del otro momento<select name="second" required><option value="">Elegir pregunta</option>'+questionOptions+'</select></label>'+
  '<p class="ee-linked-auto-label">Se usará automáticamente el nombre de la primera pregunta. No necesitas escribirlo otra vez.</p>'+
  '<label class="ee-linked-confirm"><input type="checkbox" name="equivalent" value="yes" required> Confirmo que ambas preguntas evalúan el mismo atributo y con el mismo sentido de respuesta. Acepto la normalización de escalas cuando corresponda.</label>'+
  '<button class="primary" type="submit">Guardar correspondencia</button><p class="ee-linked-form-feedback" data-ee-map-feedback role="status" hidden></p></form></details>';
 return '<div class="ee-linked-comparison"><h3>Comparación entre momentos</h3>'+
  '<p class="muted">Resultados de cada encuesta vinculada. Los índices propios se muestran para consulta, sin considerarlos automáticamente equivalentes.</p>'+
  '<div class="ee-linked-summary-grid">'+cards+'</div>'+
  (rows.length?'<h4>Evolución de resultados comparables</h4>':'')+tables+
  (rejectedLinkIds.length?'<p class="ee-linked-empty">'+rejectedLinkIds.length+' relación(es) entre preguntas requieren revisión. Elimina la correspondencia incompatible y vuelve a vincularla.</p>':'')+mappingForm+
  '<p class="ee-linked-footnote">La comparación es descriptiva: distintas muestras, preguntas o instrumentos no demuestran causalidad ni implican que se midió a las mismas personas.</p></div>';
}
