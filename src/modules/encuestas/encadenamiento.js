/* HACERLO · Encadenamiento manual de instrumentos entre momentos.
   No altera respuestas, publicaciones ni instrumentos originales. */
function eeChainNorm(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
}
function eeChainWaves(s){return [...new Set((s.responses||[]).map(r=>String(r.wave||s.wave||'Base')))];}
function eeChainMoment(s){return String(s.measurementMoment||eeChainWaves(s)[0]||s.wave||'Base').trim();}
/* Fecha desde el instrumento, sin inventar una fecha cuando no existe. */
let eeChainExpanded=false;
function eeChainDateValue(raw){
 const value=String(raw||'').trim();
 if(!value)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return Number.isFinite(Date.parse(value+'T12:00:00Z'))?value:'';
 const parsed=new Date(value);
 if(!Number.isFinite(parsed.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(parsed);
 const p=Object.fromEntries(parts.map(v=>[v.type,v.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
function eeChainDateInfo(s){
 const manual=eeChainDateValue(s?.measurementDate);
 if(manual)return {date:manual,source:'Fecha ajustada'};
 const application=eeChainDateValue(s?.applicationStart);
 if(application)return {date:application,source:'Inicio de aplicación'};
 const responseDates=(s?.responses||[]).map(r=>eeChainDateValue(r.date)).filter(Boolean).sort();
 if(responseDates.length)return {date:responseDates[0],source:'Primera respuesta'};
 const end=eeChainDateValue(s?.applicationEnd);
 if(end)return {date:end,source:'Fin de aplicación'};
 return {date:'',source:'Sin fecha registrada'};
}
function eeChainMomentOptions(moment){
 const value=String(moment||'Base').trim();
 const options=['Base','Durante','Después'];
 if(value&&!options.includes(value))options.push(value);
 return options.map(v=>'<option value="'+safe(v)+'"'+(v===value?' selected':'')+'>'+safe(v)+'</option>').join('');
}
function eeChainRank(moment){
 const name=eeChainNorm(moment);
 return /^(base|antes|diagnostico|linea base)/.test(name)?0:/^(durante|seguimiento)/.test(name)?1:/^(despues|cierre|final|resultado)/.test(name)?2:3;
}
function eeChainQuestionKey(q){return eeChainNorm(q.label);}
function eeChainSignature(s){
 const qs=(s.questions||[]).map(q=>({
  label:eeChainQuestionKey(q),type:q.type,dimension:eeChainNorm(q.dimension),
  min:q.min??null,max:q.max??null,reverse:!!q.reverse,
  correct:q.type==='knowledge'?String(q.correct||''):null,
  options:['choice','knowledge'].includes(q.type)?(q.options||[]).map(String):null,
  scoring:q.optionScoring?.enabled?{
   min:q.optionScoring.min,max:q.optionScoring.max,direction:q.optionScoring.direction||'higher',
   values:(q.optionScoring.options||[]).map(o=>[o.option,o.value]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
  }:null
 })).sort((a,b)=>a.label.localeCompare(b.label));
 return JSON.stringify({kind:s.kind,questions:qs});
}
function eeChainIssue(a,b){
 if(!a||!b||a.id===b.id)return 'Elige otra encuesta.';
 if(a.instrumentKey||b.instrumentKey)return 'El instrumento de priorización se analiza por separado.';
 return '';
}
function eeChainStrictCompatibility(a,b){
 return !eeChainIssue(a,b)
  && a.responses?.length>0 && b.responses?.length>0
  && eeChainWaves(a).length===1 && eeChainWaves(b).length===1
  && new Set((a.questions||[]).map(eeChainQuestionKey)).size===a.questions?.length
  && new Set((b.questions||[]).map(eeChainQuestionKey)).size===b.questions?.length
  && eeChainSignature(a)===eeChainSignature(b)
  && JSON.stringify(a.compositionConfig||{})===JSON.stringify(b.compositionConfig||{});
}
function eeChainFullCompatible(x,s){
 const members=eeChainMembers(x,s);
 return members.length>1&&members.every((m,i)=>i===0||eeChainStrictCompatibility(members[0],m));
}
function eeChainMembers(x,s){
 const all=EE.init(x);
 if(!s?.measurementGroupId)return [s].filter(Boolean);
 return all.filter(z=>z.measurementGroupId===s.measurementGroupId).sort((a,b)=>{
  const ao=Number(a.measurementOrder),bo=Number(b.measurementOrder);
  if(ao>0&&bo>0)return ao-bo;
  if(ao>0)return -1;if(bo>0)return 1;
  return eeChainRank(eeChainMoment(a))-eeChainRank(eeChainMoment(b))
   ||String(a.createdAt||'').localeCompare(String(b.createdAt||'')) ||a.id.localeCompare(b.id);
 });
}
function eeChainConnected(x,s){return eeChainMembers(x,s).length>1;}
function eeChainInvalid(x,s){
 const members=eeChainMembers(x,s);
 if(members.length<2)return '';
 const names=members.map(m=>eeChainNorm(eeChainMoment(m)));
 if(new Set(names).size!==names.length)return 'Dos encuestas tienen el mismo momento. Edita sus etiquetas para distinguirlas.';
 return members.slice(1).map(m=>eeChainIssue(members[0],m)).find(Boolean)||'';
}
function eeChainLink(x,s,otherId,firstMoment,secondMoment){
 const other=EE.init(x).find(z=>z.id===otherId);
 const reason=eeChainIssue(s,other);
 if(reason)throw Error(reason);
 if(other.measurementGroupId)throw Error('La otra encuesta ya pertenece a un seguimiento. Desvincúlala allí primero.');
 const names=[firstMoment,secondMoment].map(v=>String(v||'').trim());
 if(names.some(v=>!v||v.length>80))throw Error('Define un momento de hasta 80 caracteres por encuesta.');
 const members=eeChainMembers(x,s);
 const existing=members.filter(m=>m.id!==s.id).map(m=>eeChainNorm(eeChainMoment(m)));
 if(eeChainNorm(names[0])===eeChainNorm(names[1])||existing.includes(eeChainNorm(names[0]))||existing.includes(eeChainNorm(names[1])))
  throw Error('Cada encuesta debe tener un momento diferente. Por ejemplo: Durante · noviembre.');
 const group=s.measurementGroupId||EE.uid();
 s.measurementGroupId=group;s.measurementMoment=names[0];
 other.measurementGroupId=group;other.measurementMoment=names[1];
 return other;
}
function eeChainUnlink(x,s,id){
 const linked=eeChainMembers(x,s).find(m=>m.id===id);
 if(!linked)throw Error('No se encontró la encuesta vinculada.');
 delete linked.measurementGroupId;delete linked.measurementMoment;delete linked.measurementOrder;delete linked.measurementDate;
 return linked;
}
function eeChainEvolution(x,s,audienceId=''){
 const members=eeChainMembers(x,s);
 if(members.length<2||eeChainInvalid(x,s)||!eeChainFullCompatible(x,s))return EE.evolution(s,audienceId);
 const master=members[0],canonical=new Map(master.questions.map(q=>[eeChainQuestionKey(q),q.id]));
 const rows=members.flatMap(source=>(source.responses||[]).map(r=>{
  const answers={};
  for(const q of source.questions||[]){
   const id=canonical.get(eeChainQuestionKey(q));
   if(id&&Object.hasOwn(r.answers||{},q.id))answers[id]=r.answers[q.id];
  }
  return {...r,id:source.id+':'+r.id,answers,wave:eeChainMoment(source),measurementSurveyId:source.id};
 }));
 const momentSettings=Object.fromEntries(members.map((m,i)=>[
  eeChainMoment(m),{order:i+1,date:eeChainDateInfo(m).date}
 ]));
 const baseline=members.find(m=>eeChainRank(eeChainMoment(m))===0)||members[0];
 const composite={...master,responses:rows,momentSettings,baselineMoment:eeChainMoment(baseline)};
 return EE.evolution(composite,audienceId);
}
function eeChainPanel(x,s){
 const members=eeChainMembers(x,s),linked=members.length>1,invalid=eeChainInvalid(x,s);
 const others=EE.init(x).filter(z=>z.id!==s.id);
 const options=others.map(z=>{
  const reason=eeChainIssue(s,z)||(z.measurementGroupId?'Ya vinculada a otro seguimiento.':'');
  return '<option value="'+safe(z.id)+'"'+(reason?' disabled':'')+'>'+safe(z.title)+(reason?' · No disponible':'')+'</option>';
 }).join('');
 const usable=others.filter(z=>!eeChainIssue(s,z)&&!z.measurementGroupId);
 const rows=linked?'<form class="ee-chain-edit" onsubmit="eeChainSave(event)"><div class="ee-chain-list">'+members.map((z,i)=>{
  const info=eeChainDateInfo(z);
  return '<div class="ee-chain-line"><div class="ee-chain-survey"><b>'+safe(z.title)+'</b><small>'+z.responses.length+' respuestas</small></div>'+
    '<label>Momento<select name="moment_'+i+'" required>'+eeChainMomentOptions(eeChainMoment(z))+'</select></label>'+
    '<label>Orden<input name="order_'+i+'" type="number" min="1" max="50" step="1" value="'+(i+1)+'" required></label>'+
    '<label>Fecha<input name="date_'+i+'" type="date" value="'+safe(info.date)+'" aria-label="Fecha de '+safe(z.title)+'"><small class="ee-chain-date-source">'+safe(info.source)+'</small></label>'+
    '<button class="secondary ee-chain-remove" type="button" onclick="eeChainRemove(\''+safe(z.id)+'\')" aria-label="Desvincular '+safe(z.title)+'">Quitar</button></div>';
 }).join('')+'</div><button class="secondary ee-chain-save" type="submit">Guardar ajustes</button></form>':'';
 return '<details class="ee-chain"'+(eeChainExpanded?' open':'')+' ontoggle="eeChainExpanded=this.open">'+
  '<summary><span>Conectar y comparar encuestas</span><small>'+(linked?members.length+' mediciones vinculadas':'Configurar seguimiento')+'</small></summary>'+
  '<div class="ee-chain-body"><p class="muted">Organiza las encuestas de esta iniciativa en una secuencia de medición. Los resultados del instrumento seleccionado permanecen arriba.</p>'+
  (invalid?'<p class="notice">'+safe(invalid)+'</p>':'')+
  (linked?eeChainOverview(x,s):'')+
  rows+
  (usable.length?'<form class="ee-chain-add" onsubmit="eeChainAdd(event)">'+
   '<label>Momento actual<select name="firstMoment" required>'+eeChainMomentOptions(eeChainMoment(s))+'</select></label>'+
   '<label>Encuesta para conectar<select name="otherId" required><option value="">Seleccionar encuesta</option>'+options+'</select></label>'+
   '<label>Momento de la otra<select name="otherMoment" required>'+eeChainMomentOptions(eeChainRank(eeChainMoment(s))===0?'Durante':eeChainRank(eeChainMoment(s))===1?'Después':'Base')+'</select></label>'+
   '<button class="primary" type="submit">Conectar</button></form>':
   '<p class="muted ee-chain-quiet">No hay otras encuestas disponibles para vincular. Usa «Crear siguiente medición» para continuar con el instrumento.</p>')+
  '<p class="ee-chain-note">Las fechas se obtienen del instrumento cuando existen; puedes ajustarlas. Solo se comparan preguntas equivalentes, sin inferir causalidad.</p></div></details>';
}
function eeChainAdd(event){
 event.preventDefault();const x=current(),s=eeSurvey();if(!x||!s)return;
 try{
  const fd=new FormData(event.target);
  eeChainLink(x,s,String(fd.get('otherId')||''),fd.get('firstMoment'),fd.get('otherMoment'));
  eeFilter={wave:'',audienceId:eeFilter.audienceId};save();render();eeMsg('Encuestas conectadas. La evolución ahora incluye ambos momentos.');
  if(typeof eeVerifySave==='function')void eeVerifySave('Vínculos de medición',s.id);
 }catch(err){eeMsg(err.message,true);}
}
function eeChainRemove(id){
 const x=current(),s=eeSurvey();if(!x||!s)return;
 if(!confirm('¿Desvincular esta encuesta del seguimiento? Sus preguntas y respuestas no se eliminarán.'))return;
 try{eeChainUnlink(x,s,id);eeFilter.wave='';save();render();eeMsg('Encuesta desvinculada sin borrar información.');
  if(typeof eeVerifySave==='function')void eeVerifySave('Vínculos de medición',s.id);
 }catch(err){eeMsg(err.message,true);}
}
function eeChainSave(event){
 event.preventDefault();const x=current(),s=eeSurvey();if(!x||!s)return;
 const list=eeChainMembers(x,s),fd=new FormData(event.target),changes=[],names=new Set(),orders=new Set();
 for(let i=0;i<list.length;i++){
  const moment=String(fd.get('moment_'+i)||'').trim(),order=Number(fd.get('order_'+i)),date=String(fd.get('date_'+i)||'');
  if(!moment||moment.length>80||names.has(eeChainNorm(moment)))return eeMsg('Cada encuesta necesita un momento distinto, de hasta 80 caracteres.',true);
  if(!Number.isInteger(order)||order<1||order>50||orders.has(order))return eeMsg('Utiliza un orden único entre 1 y 50 para cada encuesta.',true);
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return eeMsg('Revisa las fechas de medición.',true);
  names.add(eeChainNorm(moment));orders.add(order);changes.push({survey:list[i],moment,order,date});
 }
 changes.forEach(v=>{v.survey.measurementMoment=v.moment;v.survey.measurementOrder=v.order;if(v.date!==eeChainDateInfo(v.survey).date)v.survey.measurementDate=v.date;});
 eeFilter.wave='';save();render();eeMsg('Momentos y orden guardados.');
 if(typeof eeVerifySave==='function')void eeVerifySave('Orden del seguimiento',s.id);
}
function eeChainGoMoment(moment){
 const x=current(),s=eeSurvey(),found=eeChainMembers(x,s).find(m=>eeChainMoment(m)===moment);
 if(!found){eeFilter.wave=moment;render();return;}
 eeSelected=found.id;eeFilter.wave=eeChainWaves(found)[0]||'';eeTab='resultados';render();
}


/* Crear la próxima aplicación del mismo banco: nace vinculada, pero sin respuestas. */
function eeChainNextMoment(x,s){
 const stages=eeChainMembers(x,s).map(m=>eeChainNorm(eeChainMoment(m)));
 const last=eeChainNorm(eeChainMoment(s));
 const preferred=last==='antes'||last==='base'||last.startsWith('diagnostico')?'Durante':
   last.startsWith('durante')?'Después':!stages.some(v=>v==='durante')?'Durante':
   !stages.some(v=>v==='despues')?'Después':'Seguimiento '+(stages.length+1);
 if(!stages.includes(eeChainNorm(preferred)))return preferred;
 return 'Seguimiento '+(stages.length+1);
}
function eeChainCreateNext(){
 const x=current(),s=eeSurvey();
 if(!x||!s)return;
 if(s.instrumentKey)return eeMsg('El instrumento de priorización conserva su propio seguimiento.',true);
 if(!Array.isArray(s.questions)||!s.questions.length)return eeMsg('Define primero las preguntas del instrumento.',true);
 const members=eeChainMembers(x,s),nextMoment=eeChainNextMoment(x,s);
 const group=s.measurementGroupId||EE.uid();
 const root=String(s.title||'Encuesta').replace(/\s*·\s*(Antes|Base|Durante|Después|Seguimiento \d+)$/i,'');
 const title=(root+' · '+nextMoment).slice(0,160);
 const newSurvey=structuredClone(s);
 Object.assign(newSurvey,{
  id:EE.uid(),title,previousSurveyId:s.id,familyId:s.familyId||s.id,
  version:Number(s.version||1)+1,status:'draft',responses:[],
  createdAt:EE.now(),updatedAt:EE.now(),measurementGroupId:group,
  measurementMoment:nextMoment,measurementOrder:members.length+1,measurementDate:'',
  wave:nextMoment==='Base'?'Antes':nextMoment,
  waveMode:['Antes','Durante','Después'].includes(nextMoment)?nextMoment:'Antes',
  applicationStart:null,applicationEnd:null
 });
 for(const prop of ['publication','syncedAt','metricLinks','importHistory','lastImportedAt',
  'momentSettings','baselineMoment','momentHistory','questionBankHistory','titleHistory',
  'lastIntegratedAt','importBatchId'])delete newSurvey[prop];
 for(const [index,member] of members.entries()){
  member.measurementGroupId=group;
  member.measurementMoment ||=eeChainMoment(member);
  member.measurementOrder ||=index+1;
 }
 EE.init(x).push(newSurvey);
 eeSelected=newSurvey.id;eePickerOpen=false;eeTab='diseño';
 eeFilter={wave:'',audienceId:''};eeImport=null;
 save();render();eeMsg('Nueva medición vinculada a '+members.length+' anterior(es). Conserva preguntas y escalas, sin copiar respuestas.');
 if(typeof eeVerifySave==='function')void eeVerifySave('Nueva medición vinculada',newSurvey.id);
}
function eeChainMetricSignature(q){
 const scoring=q.optionScoring?.enabled?{
  min:q.optionScoring.min,max:q.optionScoring.max,direction:q.optionScoring.direction||'higher',
  values:(q.optionScoring.options||[]).map(o=>[eeChainNorm(o.option),o.value]).sort((a,b)=>a[0].localeCompare(b[0]))
 }:null;
 return JSON.stringify({
  label:eeChainQuestionKey(q),type:q.type,dimension:eeChainNorm(q.dimension),
  min:q.min??null,max:q.max??null,reverse:!!q.reverse,
  correct:q.type==='knowledge'?eeChainNorm(q.correct):null,
  options:q.type==='knowledge'?(q.options||[]).map(eeChainNorm).sort():null,
  scoring
 });
}
function eeChainComparableMetrics(x,s,audienceId=''){
 const members=eeChainMembers(x,s),columns=members.map(survey=>{
  const d=EE.detailed(survey,{audienceId}),numeric=new Map();
  for(const q of survey.questions||[]){
   const m=d.questions.find(row=>row.questionId===q.id);
   if(!m?.unit||!['scale','nps','cnps','knowledge'].includes(q.type)&&!q.optionScoring?.enabled)continue;
   const signature=eeChainMetricSignature(q);
   if(numeric.has(signature))continue;
   numeric.set(signature,{label:q.label,unit:m.unit,value:m.value??null,n:m.n||0});
  }
  return numeric;
 });
 const registry=new Map();
 columns.forEach((column,i)=>column.forEach((metric,signature)=>{
  if(!registry.has(signature))registry.set(signature,{signature,label:metric.label,unit:metric.unit,count:0});
  registry.get(signature).count++;
 }));
 const rows=[...registry.values()].filter(item=>item.count>=2).map(item=>({
  ...item,values:columns.map(column=>column.get(item.signature)||null)
 }));
 return {members,rows};
}
function eeChainExportComparison(){
 const x=current(),s=eeSurvey(),report=eeChainComparableMetrics(x,s,eeFilter.audienceId);
 const headers=['Pregunta comparable','Unidad',...report.members.map(m=>eeChainMoment(m))];
 const lines=report.rows.map(row=>[row.label,row.unit,...row.values.map(v=>v?.value??'')]);
 eeDownload('mediciones-vinculadas-'+s.id+'.csv',EE.csv([headers,...lines]),'text/csv;charset=utf-8');
}
function eeChainSelectSurvey(id){
 const x=current(),s=EE.init(x).find(z=>z.id===id);if(!s)return;
 eeSelected=s.id;eeFilter={wave:'',audienceId:eeFilter.audienceId};
 eeTab='resultados';render();
}
function eeChainOverview(x,s){
 const report=eeChainComparableMetrics(x,s,eeFilter.audienceId),members=report.members;
 const list=members.map((survey,i)=>{
  const count=(survey.responses||[]).filter(r=>!eeFilter.audienceId||String(r.audienceId)===String(eeFilter.audienceId)).length;
  return '<article class="ee-chain-stage"><span class="ee-chain-step">'+(i+1)+'</span>'+
   '<div><small>'+safe(eeChainMoment(survey))+(eeChainDateInfo(survey).date?' · '+safe(eeChainDateInfo(survey).date):'')+'</small>'+
   '<strong>'+safe(survey.title)+'</strong><span>'+count+' '+(count===1?'respuesta':'respuestas')+'</span></div>'+
   '<button class="secondary" type="button" onclick="eeChainSelectSurvey(\''+safe(survey.id)+'\')">Ver resultados</button></article>';
 }).join('');
 const linkedQuestionRows=report.rows.map(row=>'<tr><th scope="row">'+safe(row.label)+'<small>'+safe(row.unit)+'</small></th>'+
  row.values.map(metric=>'<td>'+(metric?.value==null?'—':eeNumber(metric.value))+
   '<small>n = '+(metric?.n||0)+'</small></td>').join('')+'</tr>').join('');
 const count=report.rows.length;
 const metrics=count?'<details class="ee-chain-questions" open><summary>Preguntas comparables · '+count+'</summary>'+
   '<p class="muted">Solo se contrastan preguntas con el mismo texto, tipo, dirección, escala y puntuación. No se combinan resultados globales de instrumentos distintos.</p>'+
   '<div style="overflow-x:auto"><table class="ee-evolution-table"><thead><tr><th>Pregunta</th>'+
   members.map(m=>'<th>'+safe(eeChainMoment(m))+'</th>').join('')+
   '</tr></thead><tbody>'+linkedQuestionRows+'</tbody></table></div></details>':
   '<p class="notice">Las encuestas ya están conectadas, pero todavía no tienen preguntas cuantitativas equivalentes. Puedes seguir cada momento por separado; HACERLO no calculará una diferencia entre resultados distintos.</p>';
 return '<div class="ee-chain-overview">'+
  '<div><h3>Secuencia vinculada</h3><p class="muted">'+members.length+' encuestas conectadas · '+
  safe(eeChainMoment(members[0]))+' → '+safe(eeChainMoment(members.at(-1)))+'</p></div>'+
  '<h3>Secuencia de medición</h3><div class="ee-chain-timeline">'+list+'</div>'+
  metrics+
  (count?'<button class="secondary" type="button" onclick="eeChainExportComparison()">↓ Descargar preguntas comparables</button>':'')+
  '<p class="muted">La conexión es descriptiva: no prueba causalidad ni seguimiento individual pareado.</p></div>';
}
