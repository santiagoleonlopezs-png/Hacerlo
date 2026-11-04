/* HACERLO · Encadenamiento manual de instrumentos entre momentos.
   No altera respuestas, publicaciones ni instrumentos originales. */
function eeChainNorm(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
}
function eeChainWaves(s){return [...new Set((s.responses||[]).map(r=>String(r.wave||s.wave||'Base')))];}
function eeChainMoment(s){return String(s.measurementMoment||eeChainWaves(s)[0]||s.wave||'Base').trim();}
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
 if(!a.responses?.length||!b.responses?.length)return 'Ambas encuestas deben tener respuestas.';
 if(new Set((a.questions||[]).map(eeChainQuestionKey)).size!==a.questions?.length||new Set((b.questions||[]).map(eeChainQuestionKey)).size!==b.questions?.length)return 'Hay preguntas con textos repetidos; no es seguro hacer la correspondencia.';
 if(eeChainWaves(a).length!==1||eeChainWaves(b).length!==1)return 'Utiliza encuestas con un solo momento cada una; las olas internas ya se comparan por separado.';
 if(eeChainSignature(a)!==eeChainSignature(b))return 'Las preguntas, dimensiones, tipos o escalas no coinciden.';
 if(JSON.stringify(a.compositionConfig||{})!==JSON.stringify(b.compositionConfig||{}))return 'La configuración del índice global es diferente.';
 return '';
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
 return members.length<2?'':members.slice(1).map(m=>eeChainIssue(members[0],m)).find(Boolean)||'';
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
 if(members.length<2||eeChainInvalid(x,s))return EE.evolution(s,audienceId);
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
  eeChainMoment(m),{order:i+1,date:m.measurementDate||''}
 ]));
 const baseline=members.find(m=>eeChainRank(eeChainMoment(m))===0)||members[0];
 const composite={...master,responses:rows,momentSettings,baselineMoment:eeChainMoment(baseline)};
 return EE.evolution(composite,audienceId);
}
function eeChainPanel(x,s){
 const members=eeChainMembers(x,s),linked=members.length>1,invalid=eeChainInvalid(x,s);
 const others=EE.init(x).filter(z=>z.id!==s.id);
 const options=others.map(z=>{
  const reason=eeChainIssue(s,z)||(z.measurementGroupId&&z.measurementGroupId!==s.measurementGroupId?'Ya vinculada a otro seguimiento.':'');
  return '<option value="'+safe(z.id)+'"'+(reason?' disabled':'')+'>'+safe(z.title)+' · '+safe(eeChainMoment(z))+(reason?' · No compatible':'')+'</option>';
 }).join('');
 const usable=others.filter(z=>!eeChainIssue(s,z)&&!z.measurementGroupId);
 const rows=linked?'<form onsubmit="eeChainSave(event)"><div class="ee-chain-list">'+members.map((z,i)=>
  '<div class="ee-chain-line"><div><b>'+safe(z.title)+'</b><small>'+z.responses.length+' respuestas</small></div>'+
  '<label>Momento<input name="moment_'+i+'" value="'+safe(eeChainMoment(z))+'" maxlength="80" required></label>'+
  '<label>Orden<input name="order_'+i+'" type="number" min="1" max="50" step="1" value="'+(i+1)+'" required></label>'+
  '<label>Fecha<input name="date_'+i+'" type="date" value="'+safe(z.measurementDate||'')+'"></label>'+
  '<button class="secondary" type="button" onclick="eeChainRemove(\''+safe(z.id)+'\')" aria-label="Desvincular '+safe(z.title)+'">Quitar</button></div>'
 ).join('')+'</div><button class="secondary" type="submit">Guardar momentos y orden</button></form>':'';
 return '<details class="ee-chain"'+(linked?' open':'')+'><summary>↗ Conectar encuestas para comparar momentos'+(linked?' · '+members.length+' vinculadas':'')+'</summary>'+
  '<p class="muted">Elige encuestas de esta iniciativa que midan las mismas preguntas y escalas. Así podrás conectar Base, Durante y Después sin mover ni duplicar respuestas.</p>'+
  (invalid?'<p class="notice">Comparación pausada: '+safe(invalid)+'</p>':'')+rows+
  (usable.length?'<form class="ee-chain-add" onsubmit="eeChainAdd(event)">'+
   '<label>Esta encuesta corresponde a<input name="firstMoment" value="'+safe(eeChainMoment(s))+'" required maxlength="80" list="ee-chain-stages"></label>'+
   '<label>Encuesta que deseas conectar<select name="otherId" required><option value="">Selecciona otra encuesta</option>'+options+'</select></label>'+
   '<label>Momento de la otra encuesta<input name="otherMoment" value="" required maxlength="80" list="ee-chain-stages" placeholder="Ej. Base, Durante o Después"></label>'+
   '<datalist id="ee-chain-stages"><option value="Base"><option value="Durante"><option value="Después"></datalist>'+
   '<button class="primary" type="submit">Conectar encuesta</button></form>':
   '<p class="muted">No hay otras encuestas compatibles disponibles. Solo se pueden encadenar instrumentos con respuestas y preguntas equivalentes.</p>')+
  '<p class="ee-chain-note">La comparación es descriptiva y no demuestra causalidad. Las encuestas y sus respuestas permanecen independientes.</p></details>';
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
 changes.forEach(v=>{v.survey.measurementMoment=v.moment;v.survey.measurementOrder=v.order;v.survey.measurementDate=v.date;});
 eeFilter.wave='';save();render();eeMsg('Momentos y orden guardados.');
 if(typeof eeVerifySave==='function')void eeVerifySave('Orden del seguimiento',s.id);
}
function eeChainGoMoment(moment){
 const x=current(),s=eeSurvey(),found=eeChainMembers(x,s).find(m=>eeChainMoment(m)===moment);
 if(!found){eeFilter.wave=moment;render();return;}
 eeSelected=found.id;eeFilter.wave=eeChainWaves(found)[0]||'';eeTab='resultados';render();
}
