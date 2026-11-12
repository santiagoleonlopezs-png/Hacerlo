/* Promedios por indicador y fecha de medición. Cada iniciativa pesa lo mismo
 * en Inicio; una encuesta/momento es una medición, no cada respuesta. */
const medPeriodMetrics=[['INS personas','ins_personas'],['INS proceso','ins_proceso'],['CNPS','cnps']];
let medPeriodViews=new Map(),medPeriodOrg='';
function medDateKey(value){
 const raw=String(value||'').trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
  const d=new Date(raw+'T12:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===raw?raw:'';
 }
 const d=new Date(raw);
 if(!raw||!Number.isFinite(d.getTime()))return '';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(p=>[p.type,p.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function medSurveyMeasurementDate(s,wave){
 const configured=medDateKey(s.momentSettings?.[wave]?.date);
 if(configured)return configured;
 const waves=new Set(medArray(s.responses).map(r=>String(r.wave||'Base')));
 const single=waves.size<=1;
 const explicit=single?medDateKey(s.measurementDate)||medDateKey(s.applicationStart):'';
 if(explicit)return explicit;
 const dates=medArray(s.responses).filter(r=>String(r.wave||'Base')===String(wave)).map(r=>medDateKey(r.date)).filter(Boolean).sort();
 return dates[0]||(single?medDateKey(s.applicationEnd):'');
}
function medPeriodView(scope,x){
 const org=typeof cloudOrgId!=='undefined'?String(cloudOrgId||''):'';
 if(org!==medPeriodOrg){medPeriodViews.clear();medPeriodOrg=org;}
 const id=scope==='home'?'home':'initiative:'+String(x?._cloudId||x?.id||'');
 if(!medPeriodViews.has(id))medPeriodViews.set(id,{mode:scope==='home'?'month':'latest',month:medDateKey(new Date().toISOString()).slice(0,7),from:'',to:'',open:false});
 return medPeriodViews.get(id);
}
function medPeriodBounds(view){
 if(view.mode==='latest'||view.mode==='all')return {from:'',to:'',error:''};
 if(view.mode==='month'){
  const from=medDateKey(view.month+'-01');
  if(!from)return {error:'Selecciona un mes válido.'};
  const d=new Date(from+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);
  return {from,to:d.toISOString().slice(0,10),error:''};
 }
 const from=medDateKey(view.from),to=medDateKey(view.to);
 return !from||!to?{error:'Selecciona las fechas Desde y Hasta.'}:from>to?{error:'La fecha Desde debe ser anterior o igual a Hasta.'}:{from,to,error:''};
}
function medPeriodLabel(view){
 const b=medPeriodBounds(view);
 return b.error?b.error:view.mode==='latest'?'Última medición':view.mode==='all'?'Todo el historial con fecha':medDate(b.from)+' — '+medDate(b.to);
}
function medSetPeriod(scope,field,value){
 const x=scope==='home'?null:current();
 if(!['home','initiative'].includes(scope)||!['mode','month','from','to'].includes(field))return;
 if(field==='mode'&&!['latest','month','range','all'].includes(value))return;
 if(scope==='home'&&field==='mode'&&value==='latest')return;
 if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation())return;
 const view=medPeriodView(scope,x),panel=scope==='home'?document.querySelector('.med-portfolio-period'):null;
 if(panel)view.open=panel.open;
 view[field]=String(value);render();
}
function medPeriodControls(scope,x){
 const view=medPeriodView(scope,x),bounds=medPeriodBounds(view),prefix='med-period-'+scope;
 const change=field=>'onchange="medSetPeriod('+medArgs(scope,field)+',this.value)"';
 return '<div class="med-period-controls" role="group" aria-label="Período de INS y CNPS"><label for="'+prefix+'-mode">Período de INS y CNPS<select id="'+prefix+'-mode" '+change('mode')+'>'+
  (scope==='initiative'?'<option value="latest"'+(view.mode==='latest'?' selected':'')+'>Última medición</option>':'')+
  [['month','Promedio del mes'],['range','Promedio entre fechas'],['all','Promedio de todo el historial']].map(([id,label])=>'<option value="'+id+'"'+(view.mode===id?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  (view.mode==='month'?'<label for="'+prefix+'-month">Mes<input id="'+prefix+'-month" type="month" value="'+safe(view.month)+'" '+change('month')+'></label>':'')+
  (view.mode==='range'?'<label for="'+prefix+'-from">Desde<input id="'+prefix+'-from" type="date" value="'+safe(view.from)+'" '+change('from')+'></label><label for="'+prefix+'-to">Hasta<input id="'+prefix+'-to" type="date" value="'+safe(view.to)+'" '+change('to')+'></label>':'')+
  '</div><p class="med-caption med-period-label" role="'+(bounds.error?'alert':'status')+'">'+safe(medPeriodLabel(view))+'</p>';
}
function medPeriodScale(definition,kind){
 const text=String(definition||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 if(kind==='survey'||/[-−]100\s*(?:a|al|hasta|–|—|\.\.)\s*\+?100/.test(text))return 'balance:-100:100';
 return 'manual:'+(text||'sin definir');
}
function medPeriodSourcePoints(x,key){
 const source=medCoreSeries(x,key);
 if(source.kind!=='survey'){
  const rows=source.rows.map(r=>({...r,scale:medPeriodScale(r.definition||x.metrics?.[key+'_definition'],'manual')}));
  if(!rows.length&&source.current!==null)rows.push({date:'',value:source.current,scale:medPeriodScale(x.metrics?.[key+'_definition'],'manual')});
  return {source,rows};
 }
 const selected=source.source,survey=medArray(x.surveys).find(s=>String(s.id)===String(selected?.surveyId));
 if(!survey||typeof EE==='undefined')return {source,rows:[]};
 const refs=[{surveyId:survey.id,key:selected.key}];
 if(survey.measurementGroupId&&typeof eeLinkedRows==='function'){
  if(selected.key==='global'){
   // Un global solo se extiende a instrumentos completos equivalentes.
   if(typeof eeChainFullCompatible==='function'&&eeChainFullCompatible(x,survey)){
    const config=s=>JSON.stringify({mode:s.compositionConfig?.mode||'original',allowPartial:!!s.compositionConfig?.allowPartial,
     reference:medArray(s.questions).find(q=>q.id===s.compositionConfig?.referenceId)?.label||'',
     questions:medArray(s.compositionConfig?.questionIds).map(id=>medArray(s.questions).find(q=>q.id===id)?.label).sort()});
    for(const member of eeChainMembers(x,survey))if(member!==survey&&config(member)===config(survey))refs.push({surveyId:member.id,key:'global'});
   }
  }else{
   const id=String(selected.key||'').slice(9);
   const group=eeLinkedRows(x,survey).rows.find(r=>r.questionRefs.some(q=>String(q.surveyId)===String(survey.id)&&String(q.questionId)===id));
   for(const ref of group?.questionRefs||[])if(String(ref.surveyId)!==String(survey.id))refs.push({surveyId:ref.surveyId,key:'question:'+ref.questionId});
  }
 }
 const rows=[];
 for(const ref of refs){
  const member=medArray(x.surveys).find(s=>String(s.id)===String(ref.surveyId));
  const resolved=medCoreSeries({...x,surveyHomeSources:{...x.surveyHomeSources,[key]:ref}},key);
  for(const row of resolved.rows)rows.push({...row,date:medSurveyMeasurementDate(member,row.period),surveyId:member.id,scale:medPeriodScale('','survey')});
 }
 return {source,rows};
}
function medPeriodSummary(x,key,view){
 const {source,rows}=medPeriodSourcePoints(x,key),bounds=medPeriodBounds(view);
 const undated=rows.filter(r=>!medDateKey(r.date)).length;
 const selected=bounds.error?[]:rows.filter(r=>{
  const date=medDateKey(r.date);return date&&(!bounds.from||date>=bounds.from)&&(!bounds.to||date<=bounds.to)&&medNumber(r.value)!==null;
 }).sort((a,b)=>medDateKey(a.date).localeCompare(medDateKey(b.date)));
 const scales=new Set(selected.map(r=>r.scale)),conflict=scales.size>1;
 return {source,rows:selected,count:selected.length,undated,scale:scales.size===1?[...scales][0]:'',conflict,error:bounds.error,
  value:!bounds.error&&!conflict&&selected.length?selected.reduce((n,r)=>n+r.value,0)/selected.length:null};
}
function medPortfolioPeriodData(initiatives,view){
 const rows=medArray(initiatives).map(x=>({initiative:x,metrics:Object.fromEntries(medPeriodMetrics.map(([,key])=>[key,medPeriodSummary(x,key,view)]))}));
 const metrics=Object.fromEntries(medPeriodMetrics.map(([,key])=>{
  const summaries=rows.map(r=>r.metrics[key]),valid=summaries.filter(s=>s.value!==null);
  const conflict=summaries.some(s=>s.conflict)||new Set(valid.map(s=>s.scale)).size>1;
  return [key,{value:!conflict&&valid.length?valid.reduce((n,s)=>n+s.value,0)/valid.length:null,error:medPeriodBounds(view).error,
   count:summaries.reduce((n,s)=>n+s.count,0),initiatives:valid.length,missing:rows.length-valid.length,
   undated:summaries.reduce((n,s)=>n+s.undated,0),conflict}];
 }));
 return {rows,metrics};
}
function medPeriodStatus(summary){return summary.error?'Completa el período':summary.conflict?'Revisar definiciones y escalas':summary.value===null?'Sin mediciones en el período':'Promedio del período';}
function medTogglePortfolioPeriod(panel){if(panel.isConnected)medPeriodView('home').open=panel.open;}
function medPortfolioPeriodPanel(){
 const view=medPeriodView('home'),data=medPortfolioPeriodData(db.initiatives,view);
 return '<details class="med-page med-portfolio-period" '+(view.open?'open ':'')+'ontoggle="medTogglePortfolioPeriod(this)"><summary><span class="med-period-icon" aria-hidden="true">◷</span><span class="med-period-copy"><strong id="med-portfolio-title">Indicadores del período</strong><small>Todas las iniciativas · INS personas, INS proceso y CNPS</small></span><span class="med-period-chevron" aria-hidden="true">⌄</span></summary><div class="med-period-body">'+medPeriodControls('home')+
  '<div class="med-instruments">'+medPeriodMetrics.map(([label,key])=>{const s=data.metrics[key];
   return '<article class="med-core-card med-period-card" data-metric="'+key+'"><div class="med-metric-heading"><span class="med-metric-symbol" aria-hidden="true">'+(key==='ins_personas'?'◉':key==='ins_proceso'?'⌘':'✦')+'</span><span class="med-chip">Promedio entre iniciativas</span></div><h3>'+label+'</h3><strong class="med-big">'+safe(medValue(s.value))+'</strong><p>'+safe(medPeriodStatus(s))+'</p><small>'+s.initiatives+' de '+data.rows.length+' iniciativas con datos · '+s.count+' mediciones</small>'+(s.undated?'<small>'+s.undated+' registros sin fecha excluidos</small>':'')+'</article>';
  }).join('')+'</div><p class="med-caption">Cada iniciativa tiene el mismo peso: primero se promedian sus mediciones del período y luego los promedios de las iniciativas con datos. INS personas, INS proceso y CNPS se calculan por separado.</p>'+
  '<details class="med-period-detail"><summary>Ver promedio por iniciativa</summary><div class="med-table-wrap"><table><thead><tr><th scope="col">Iniciativa</th>'+medPeriodMetrics.map(([label])=>'<th scope="col">'+label+'</th>').join('')+'<th scope="col">Detalle</th></tr></thead><tbody>'+
  data.rows.map(({initiative:x,metrics})=>'<tr data-portfolio-metric-id="'+safe(String(x.id))+'"><th scope="row">'+safe(x.name)+'</th>'+medPeriodMetrics.map(([,key])=>{const s=metrics[key];return '<td><strong>'+safe(medValue(s.value))+'</strong><small>'+safe(s.conflict?'Revisar escalas':s.count?s.count+' mediciones':'Sin mediciones')+'</small></td>';}).join('')+'<td><button type="button" class="secondary" onclick="openPortfolioMetric(this)">Ver medición ↗</button></td></tr>').join('')+
  '</tbody></table></div>'+(data.rows.length?'':medEmpty('Crea una iniciativa para empezar a medir.'))+'</details></div></details>';
}
