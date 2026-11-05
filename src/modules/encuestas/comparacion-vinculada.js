/* HACERLO: comparación real entre encuestas conectadas.
   Las asociaciones manuales requieren escalas equivalentes y consentimiento
   explícito del usuario. No modifica respuestas ni índices originales. */
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
 const candidate={id:EE.uid(),groupId:s.measurementGroupId,firstSurveyId:first.survey.id,firstQuestionId:first.q.id,secondSurveyId:second.survey.id,secondQuestionId:second.q.id,label,createdAt:EE.now()};
 const preview=eeLinkedRows(x,s,'',[candidate]);
 if(preview.rejectedLinkIds.includes(candidate.id))return eeMsg('Estas preguntas ya pertenecen a relaciones incompatibles o duplicadas. Revisa las correspondencias existentes.',true);
 x.measurementQuestionLinks.push(candidate);
 eeChainExpanded=true;save();render();eeMsg('Correspondencia guardada. La tabla muestra ahora los momentos comparables.');
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
 const mappingForm='<details class="ee-linked-mapping"'+(!rows.length?' open':'')+'><summary>Relacionar preguntas equivalentes'+(mappings.length?' · '+mappings.length+' guardadas':'')+'</summary>'+
  '<p class="muted">La categoría SENTIR/CNPS/NPS no vuelve equivalentes dos preguntas. Si miden lo mismo con tipos y sentidos compatibles, puedes relacionarlas. Las escalas numéricas compatibles se expresan en una unidad común; NPS y CNPS conservan sus índices propios.</p>'+
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
  (rows.length?'<h4>Evolución de resultados comparables</h4>':'')+tables+
  (rejectedLinkIds.length?'<p class="ee-linked-empty">'+rejectedLinkIds.length+' relación(es) entre preguntas requieren revisión. Elimina la correspondencia incompatible y vuelve a vincularla.</p>':'')+mappingForm+
  '<p class="ee-linked-footnote">La comparación es descriptiva: distintas muestras, preguntas o instrumentos no demuestran causalidad ni implican que se midió a las mismas personas.</p></div>';
}
