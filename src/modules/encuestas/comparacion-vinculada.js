/* HACERLO: comparación real entre encuestas conectadas.
   Las asociaciones manuales requieren escalas equivalentes y consentimiento
   explícito del usuario. No modifica respuestas ni índices originales. */
function eeLinkedNumericQuestion(q){
 return !!q&&(['scale','nps','cnps'].includes(q.type)||['choice','text'].includes(q.type)&&q.optionScoring?.enabled);
}
function eeLinkedScoreStructure(q){
 if(!eeLinkedNumericQuestion(q))return null;
 if(q.optionScoring?.enabled)return JSON.stringify({type:'scored-options',min:q.optionScoring.min,max:q.optionScoring.max,direction:q.optionScoring.direction||'higher'});
 return JSON.stringify({type:q.type,min:q.min,max:q.max,reverse:!!q.reverse});
}
function eeLinkedCanCompare(a,b){
 if(!eeLinkedNumericQuestion(a)||!eeLinkedNumericQuestion(b))return false;
 if(a.type!==b.type)return false;
 if(a.type==='scale')return Number.isFinite(Number(a.min))&&Number.isFinite(Number(a.max))&&Number(a.max)>Number(a.min)&&Number.isFinite(Number(b.min))&&Number.isFinite(Number(b.max))&&Number(b.max)>Number(b.min)&&!!a.reverse===!!b.reverse;
 return eeLinkedScoreStructure(a)===eeLinkedScoreStructure(b);
}
function eeLinkedStoredMappings(x,s){
 const ids=new Set(eeChainMembers(x,s).map(z=>z.id)),group=s.measurementGroupId;
 if(!group)return [];
 return (x.measurementQuestionLinks||[]).filter(z=>z.groupId===group&&ids.has(z.firstSurveyId)&&ids.has(z.secondSurveyId));
}
function eeLinkedReadMetric(s,qid,audienceId=''){
 const q=(s.questions||[]).find(z=>z.id===qid);
 if(!eeLinkedNumericQuestion(q))return null;
 const metrics=EE.detailed(s,{audienceId}).questions;
 const metric=metrics.find(row=>row.questionId===qid);
 if(!metric||!metric.unit||metric.value==null)return null;
 return {value:metric.value,n:metric.scoredOptions?metric.scoredN:metric.n,unit:metric.unit,label:q.label,questionId:q.id};
}
function eeLinkedSummary(s,audienceId=''){
 const count=(s.responses||[]).filter(r=>!audienceId||String(r.audienceId)===String(audienceId)).length;
 const composition=EE.composition(s,{audienceId});
 return {count,
  reference:composition.npsReference?.n>0?{value:composition.npsReference.balance,n:composition.npsReference.n,label:composition.npsReference.label}:null,
  global:composition.instrumentGlobal?.n>0?{value:composition.instrumentGlobal.balance,n:composition.instrumentGlobal.n}:null
 };
}
function eeLinkedRows(x,s,audienceId=''){
 const members=eeChainMembers(x,s),report=eeChainComparableMetrics(x,s,audienceId);
 const rows=report.rows.map(row=>({id:'auto:'+row.signature,label:row.label,unit:row.unit,source:'auto',values:row.values}));
 for(const link of eeLinkedStoredMappings(x,s)){
  const a=members.find(m=>m.id===link.firstSurveyId),b=members.find(m=>m.id===link.secondSurveyId);
  const qA=a?.questions?.find(q=>q.id===link.firstQuestionId),qB=b?.questions?.find(q=>q.id===link.secondQuestionId);
  if(!a||!b||!eeLinkedCanCompare(qA,qB))continue;
  const first=eeLinkedReadMetric(a,qA.id,audienceId),second=eeLinkedReadMetric(b,qB.id,audienceId);
  rows.push({id:link.id,label:link.label||qA.label+' / '+qB.label,unit:first?.unit||second?.unit||'',
   source:'manual',firstSurveyId:a.id,secondSurveyId:b.id,firstQuestion:qA.label,secondQuestion:qB.label,
   values:members.map(m=>m.id===a.id?first:m.id===b.id?second:null)});
 }
 return {members,rows:rows.filter(row=>row.values.filter(v=>v?.value!==null&&v?.value!==undefined).length>=2)};
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
function eeLinkedSaveQuestionMap(event){
 event.preventDefault();
 const x=current(),s=eeSurvey();if(!x||!s)return;
 const form=event.target,fd=new FormData(form);
 if(fd.get('equivalent')!=='yes')return eeMsg('Confirma que ambas preguntas miden el mismo atributo con la misma escala.',true);
 const locate=value=>{
  const [sid,qid]=String(value||'').split('|');
  const survey=eeChainMembers(x,s).find(z=>z.id===sid);
  return {survey,q:survey?.questions?.find(q=>q.id===qid)};
 };
 const first=locate(fd.get('first')),second=locate(fd.get('second'));
 if(!first.survey||!second.survey||first.survey.id===second.survey.id)return eeMsg('Elige preguntas de dos encuestas diferentes.',true);
 if(!eeLinkedCanCompare(first.q,second.q))return eeMsg('Las preguntas no tienen un tipo de resultado o dirección compatible. No se puede calcular un cambio válido.',true);
 const label=String(fd.get('label')||'').trim();
 if(!label||label.length>100)return eeMsg('Escribe un nombre de hasta 100 caracteres para el resultado comparable.',true);
 const key=[first.survey.id,first.q.id,second.survey.id,second.q.id].sort().join('|');
 const existing=eeLinkedStoredMappings(x,s).some(z=>[z.firstSurveyId,z.firstQuestionId,z.secondSurveyId,z.secondQuestionId].sort().join('|')===key);
 if(existing)return eeMsg('Esa correspondencia ya está vinculada.',true);
 x.measurementQuestionLinks ||= [];
 x.measurementQuestionLinks.push({id:EE.uid(),groupId:s.measurementGroupId,firstSurveyId:first.survey.id,firstQuestionId:first.q.id,secondSurveyId:second.survey.id,secondQuestionId:second.q.id,label,createdAt:EE.now()});
 eeChainExpanded=true;save();render();eeMsg('Preguntas vinculadas. La comparación numérica ya aparece en el seguimiento.');
 if(typeof eeVerifySave==='function')void eeVerifySave('Comparación de preguntas',s.id);
}
function eeLinkedRemoveQuestionMap(id){
 const x=current(),s=eeSurvey();if(!x||!s)return;
 x.measurementQuestionLinks=(x.measurementQuestionLinks||[]).filter(z=>z.id!==id||z.groupId!==s.measurementGroupId);
 eeChainExpanded=true;save();render();eeMsg('Correspondencia eliminada sin alterar las encuestas.');
 if(typeof eeVerifySave==='function')void eeVerifySave('Comparación de preguntas',s.id);
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
 const {members,rows}=eeLinkedRows(x,s,audienceId);
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
  '<p class="ee-linked-empty">Todavía no hay resultados equivalentes para calcular un cambio entre encuestas. Puedes indicar qué preguntas miden el mismo atributo.</p>';
 const mappings=eeLinkedStoredMappings(x,s);
 const mapSummary=mappings.length?'<div class="ee-linked-mappings">'+mappings.map(m=>
  '<div class="ee-linked-map"><span>'+safe(m.label)+'</span><button class="secondary" type="button" onclick="eeLinkedRemoveQuestionMap(\''+safe(m.id)+'\')">Quitar</button></div>').join('')+'</div>':'';
 const questionOptions=eeLinkedQuestionOptions(linked);
 const mappingForm='<details class="ee-linked-mapping"><summary>Relacionar preguntas equivalentes</summary>'+
  '<p class="muted">Puedes enlazar preguntas con redacción diferente si realmente miden el mismo atributo y conservan el mismo sentido de respuesta. Si sus escalas numéricas son distintas, se normalizan a 0–100 antes de calcular diferencias. La plataforma valida tipos y rangos antes de calcular diferencias.</p>'+
  mapSummary+
  '<form onsubmit="eeLinkedSaveQuestionMap(event)" class="ee-linked-mapping-form">'+
  '<label>Pregunta del primer momento<select name="first" required><option value="">Elegir pregunta</option>'+questionOptions+'</select></label>'+
  '<label>Pregunta del otro momento<select name="second" required><option value="">Elegir pregunta</option>'+questionOptions+'</select></label>'+
  '<label>Nombre de la variable comparable<input name="label" maxlength="100" required placeholder="Ej. Claridad frente al cambio"></label>'+
  '<label class="ee-linked-confirm"><input type="checkbox" name="equivalent" value="yes" required> Confirmo que ambas preguntas evalúan el mismo atributo y con el mismo sentido de respuesta. Acepto la normalización de escalas cuando corresponda.</label>'+
  '<button class="primary" type="submit">Guardar correspondencia</button></form></details>';
 return '<div class="ee-linked-comparison"><h3>Comparación entre momentos</h3>'+
  '<p class="muted">Resultados de cada encuesta vinculada. Los índices propios se muestran para consulta, sin considerarlos automáticamente equivalentes.</p>'+
  '<div class="ee-linked-summary-grid">'+cards+'</div>'+
  (rows.length?'<h4>Evolución de resultados comparables</h4>':'')+tables+mappingForm+
  '<p class="ee-linked-footnote">La comparación es descriptiva: distintas muestras, preguntas o instrumentos no demuestran causalidad ni implican que se midió a las mismas personas.</p></div>';
}
