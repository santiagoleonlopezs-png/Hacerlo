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
 const members=eeChainMembers(x,s),linked=members.find(m=>m.id===id),group=s.measurementGroupId;
 if(!linked||members.length<2||!group)throw Error('No se encontró una relación activa para esta encuesta.');
 for(const key of ['measurementGroupId','measurementMoment','measurementOrder','measurementDate'])delete linked[key];
 const remaining=members.filter(m=>m.id!==id);
 if(remaining.length===1)for(const key of ['measurementGroupId','measurementMoment','measurementOrder','measurementDate'])delete remaining[0][key];
 x.measurementQuestionLinks=(x.measurementQuestionLinks||[]).filter(z=>z.groupId!==group||(
  z.firstSurveyId!==linked.id&&z.secondSurveyId!==linked.id&&remaining.length>1));
 return linked;
}
function eeChainClear(x,s){
 const group=s.measurementGroupId;
 if(!group)return 0;
 const members=eeChainMembers(x,s);
 for(const survey of members){
  for(const key of ['measurementGroupId','measurementMoment','measurementOrder','measurementDate'])delete survey[key];
 }
 x.measurementQuestionLinks=(x.measurementQuestionLinks||[]).filter(z=>z.groupId!==group);
 return members.length;
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
 const usable=others.filter(z=>!eeChainIssue(s,z)&&!z.measurementGroupId);
 const options=usable.map(z=>'<option value="'+safe(z.id)+'">'+safe(z.title)+'</option>').join('');
 const edit=linked?'<details class="ee-chain-manage"><summary>Ajustar fechas y orden de las mediciones</summary>'+
  '<form class="ee-chain-edit" onsubmit="eeChainSave(event)"><div class="ee-chain-list">'+members.map((z,i)=>{
   const info=eeChainDateInfo(z);
   return '<div class="ee-chain-line"><div class="ee-chain-survey"><b>'+safe(z.title)+'</b><small>'+z.responses.length+' respuestas</small></div>'+
    '<label>Momento<select name="moment_'+i+'" required>'+eeChainMomentOptions(eeChainMoment(z))+'</select></label>'+
    '<label>Orden<input name="order_'+i+'" type="number" min="1" max="50" step="1" value="'+(i+1)+'" required></label>'+
    '<label>Fecha<input name="date_'+i+'" type="date" value="'+safe(info.date)+'" aria-label="Fecha de '+safe(z.title)+'"><small class="ee-chain-date-source">'+safe(info.source)+'</small></label></div>';
  }).join('')+'</div><button class="secondary ee-chain-save" type="submit">Guardar ajustes</button></form></details>':'';
 return '<details class="ee-chain"'+(eeChainExpanded?' open':'')+' ontoggle="eeChainExpanded=this.open">'+
  '<summary><span>Conectar y comparar encuestas</span><small>'+(linked?members.length+' mediciones vinculadas':'Configurar seguimiento')+'</small></summary>'+
  '<div class="ee-chain-body">'+
  (invalid?'<p class="notice">'+safe(invalid)+'</p>':'')+
  (linked?'<div class="ee-chain-actionbar"><span>Seguimiento entre '+members.length+' encuestas</span>'+
   '<button class="secondary ee-chain-clear" type="button" onclick="eeChainRemoveAll()">Eliminar todas las relaciones</button></div>':'')+
  (linked?eeChainOverview(x,s):'<p class="muted">Conecta dos o más instrumentos para consultar sus resultados por momento. Vincular no altera preguntas ni respuestas.</p>')+
  edit+
  (usable.length?'<details class="ee-chain-manage"><summary>+ Vincular otra encuesta</summary><form class="ee-chain-add" onsubmit="eeChainAdd(event)">'+
   '<label>Momento actual<select name="firstMoment" required>'+eeChainMomentOptions(eeChainMoment(s))+'</select></label>'+
   '<label>Encuesta para conectar<select name="otherId" required><option value="">Seleccionar encuesta</option>'+options+'</select></label>'+
   '<label>Momento de la otra<select name="otherMoment" required>'+eeChainMomentOptions(eeChainRank(eeChainMoment(s))===0?'Durante':eeChainRank(eeChainMoment(s))===1?'Después':'Base')+'</select></label>'+
   '<button class="primary" type="submit">Conectar</button></form></details>':
   (!linked?'<p class="muted">No hay otros instrumentos disponibles para vincular.</p>':''))+
  '<p class="ee-chain-note">Comparaciones descriptivas entre preguntas equivalentes. No se mezclan índices de categorías distintas por el simple hecho de vincular encuestas.</p></div></details>';
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
 const linked=eeChainMembers(x,s).find(m=>m.id===id);
 if(!linked)return eeMsg('No se encontró la encuesta asociada.',true);
 if(!confirm('¿Eliminar la relación de «'+linked.title+'»? Se conservan el instrumento y todas sus respuestas.'))return;
 try{
  eeChainUnlink(x,s,id);eeChainExpanded=true;eeFilter.wave='';eeFilter.audienceId='';
  save();render();eeMsg('Relación eliminada. La encuesta y sus respuestas se conservaron.');
  if(typeof eeVerifySave==='function')void eeVerifySave('Relaciones de medición',s.id);
 }catch(err){eeMsg(err.message,true);}
}
function eeChainRemoveAll(){
 const x=current(),s=eeSurvey();if(!x||!s)return;
 const members=eeChainMembers(x,s);if(members.length<2)return eeMsg('No hay relaciones que eliminar.');
 if(!confirm('¿Eliminar las relaciones entre las '+members.length+' encuestas? Se conservarán íntegros los instrumentos, las respuestas y los resultados.'))return;
 const count=eeChainClear(x,s);eeChainExpanded=true;eeFilter={wave:'',audienceId:''};
 save();render();eeMsg(count+' encuestas desvinculadas sin borrar información.');
 if(typeof eeVerifySave==='function')void eeVerifySave('Relaciones de medición',s.id);
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
 // Mantener la exportación coherente con la comparación visual, incluidas
 // las relaciones manuales y las mediciones que aún no tienen respuestas.
 if(typeof eeLinkedRows==='function'){
  const report=eeLinkedRows(x,s,audienceId);
  return {members:report.members,rows:report.rows};
 }
 return {members:eeChainMembers(x,s),rows:[]};
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
 const members=eeChainMembers(x,s);
 const list=members.map((survey,i)=>{
  const count=(survey.responses||[]).filter(r=>!eeFilter.audienceId||String(r.audienceId)===String(eeFilter.audienceId)).length;
  const date=eeChainDateInfo(survey).date;
  return '<article class="ee-chain-stage"><span class="ee-chain-step">'+(i+1)+'</span>'+
   '<div><small>'+safe(eeChainMoment(survey))+(date?' · '+safe(date):'')+'</small>'+
   '<strong>'+safe(survey.title)+'</strong><span>'+count+' '+(count===1?'respuesta':'respuestas')+'</span></div>'+
   '<div class="ee-chain-stage-actions"><button class="secondary" type="button" onclick="eeChainSelectSurvey(\''+safe(survey.id)+'\')">Ver resultados</button>'+ 
    '<button class="secondary ee-chain-remove" type="button" onclick="eeChainRemove(\''+safe(survey.id)+'\')" aria-label="Eliminar relación de '+safe(survey.title)+'">Desvincular</button></div></article>';
 }).join('');
 return '<div class="ee-chain-overview">'+
  '<div><h3>Secuencia vinculada</h3><p class="muted">'+members.length+' encuestas conectadas · '+
  safe(eeChainMoment(members[0]))+' → '+safe(eeChainMoment(members.at(-1)))+'</p></div>'+
  '<div class="ee-chain-timeline">'+list+'</div>'+
  (typeof eeChainComparisonView==='function'?eeChainComparisonView(x,s):'')+
  '</div>';
}
