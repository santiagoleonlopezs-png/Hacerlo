/* Medición integrada: lecturas derivadas de las fuentes de la iniciativa.
 * No promedia instrumentos, no convierte simulaciones en resultados observados
 * y solo vincula registros por IDs o por asociaciones legacy explícitas. */
let medView={key:'',behavior:'all',audience:'',open:'',tab:'results'};
let medExternalCache=new WeakMap(),medSessionIdentity='';
if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange)sb.auth.onAuthStateChange((_event,session)=>{
 const identity=String(session?.user?.id||'');
 if(identity!==medSessionIdentity){medSessionIdentity=identity;medExternalCache=new WeakMap();}
});
function medArray(v){return Array.isArray(v)?v:[];}
function medNumber(v){return v===null||v===undefined||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);}
function medValue(v){const n=medNumber(v);return n===null?'—':n.toLocaleString('es-CO',{maximumFractionDigits:2});}
function medDate(v){const raw=/^\d{4}-\d{2}-\d{2}$/.test(String(v))?v+'T12:00:00':v;const d=new Date(raw||'');return Number.isFinite(d.getTime())?d.toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}):'Sin fecha registrada';}
function medTime(v){const raw=/^\d{4}-\d{2}-\d{2}$/.test(String(v))?v+'T12:00:00':v;const n=new Date(raw||'').getTime();return Number.isFinite(n)?n:null;}
function medKey(b,i){return String(b.id??'legacy-'+i);}
function medBehaviorRef(x,value){const raw=String(value);const i=medArray(x.behaviors).findIndex((b,i)=>raw==='index:'+i||b.id==null&&raw===String(i));return i>=0?medKey(x.behaviors[i],i):raw;}
function medArgs(...args){return args.map(v=>safe(JSON.stringify(v))).join(',');}
function medEmpty(text){return '<p class="med-empty">'+safe(text)+'</p>';}
function medNav(label,pageName){return '<button type="button" class="secondary" onclick="go('+medArgs(pageName)+')">'+safe(label)+' ↗</button>';}
function medFold(id,title,subtitle,body){return '<details class="med-fold" data-med-fold="'+safe(id)+'" '+(medView.open===id?'open ':'')+'ontoggle="medToggleFold(this)"><summary><span><strong>'+safe(title)+'</strong><small>'+safe(subtitle)+'</small></span><span aria-hidden="true">⌄</span></summary><div class="med-fold-body">'+body+'</div></details>';}
function medToggleFold(el){
 if(!el.isConnected)return;
 if(el.open){medView.open=el.dataset.medFold;document.querySelectorAll('.med-page [data-med-fold]').forEach(other=>{if(other!==el)other.open=false;});}
 else if(medView.open===el.dataset.medFold)medView.open='';
}
function medSetFilter(field,value){
 if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation()){render();return;}
 if(['behavior','audience'].includes(field)){medView[field]=String(value);medView.open='';if(field==='behavior'){medView.audience='';medView.tab='results';}render();}
}
function medSetTab(value){
 if(!['results','actions','surveys','learning'].includes(value))return;
 if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation())return;
 medView.tab=value;render();
}
function medDashboard(x,b,bi){
 const key=medKey(b,bi),indicators=medIndicators(x,b,bi),actions=medActions(x,b,bi),surveys=medArray(x.surveys).filter(s=>medSurveyKeys(x,s).includes(key));
 const completed=actions.filter(a=>a.status==='Completada').length;
 const tabs=[['results','Resultados'],['actions','Intervenciones · '+actions.length],['surveys','Encuestas · '+surveys.length],['learning','Aprendizaje']];
 let body='';
 if(medView.tab==='actions')body='<h3>¿Qué hicimos para este comportamiento?</h3>'+medActionList(actions)+medNav('Gestionar intervenciones','Intervenciones');
 else if(medView.tab==='surveys')body='<h3>¿Qué reportaron las personas?</h3>'+(surveys.length?surveys.map(s=>medSurveyCard(x,s)).join(''):medEmpty('No hay encuestas vinculadas a este comportamiento. Puedes asociar una fuente existente.'));
 else if(medView.tab==='learning')body='<h3>¿Qué aprendimos?</h3>'+medHypothesisList(x,medHypotheses(x,b,bi))+medReview(x,b,bi);
 else body=medVisualSummary(indicators,actions)+'<h3>¿Qué cambió?</h3>'+(indicators.length?'<div class="med-indicators">'+indicators.map(r=>medIndicatorCard(x,r)).join('')+'</div>':medEmpty('Este comportamiento aún no tiene indicadores asociados.'))+medAdoption(x,b);
 return '<section class="med-dashboard" data-med-behavior="'+safe(key)+'"><header class="med-dashboard-heading"><div><span class="med-eyebrow">COMPORTAMIENTO SELECCIONADO</span><h2>'+safe(b.name||'Comportamiento')+'</h2></div><button type="button" class="secondary" onclick="medSetFilter(\'behavior\',\'all\')">Quitar selección</button></header>'+
 '<div class="med-overview"><div><strong>'+indicators.filter(r=>medNumber(r.value)!==null).length+'/'+indicators.length+'</strong><span>indicadores con medición</span></div><div><strong>'+completed+'/'+actions.length+'</strong><span>intervenciones completadas</span></div><div><strong>'+surveys.length+'</strong><span>encuestas vinculadas</span></div></div>'+
 '<nav class="med-tabs" aria-label="Analítica del comportamiento">'+tabs.map(([id,label])=>'<button type="button" aria-pressed="'+(medView.tab===id)+'" onclick="medSetTab('+medArgs(id)+')">'+safe(label)+'</button>').join('')+'</nav><div class="med-tab-content" aria-live="polite">'+body+'</div>'+medLinkEditor(x,b,bi)+'</section>';
}
function medIndicatorKeys(x,r){
 if(Array.isArray(r.behaviorIds))return r.behaviorIds.map(id=>medBehaviorRef(x,id));
 // r.behavior es la asociación explícita del esquema anterior, no un hallazgo.
 return medArray(x.behaviors).flatMap((b,i)=>r.behavior&&r.behavior===b.name?[medKey(b,i)]:[]);
}
function medActionKeys(x,a){
 if(Array.isArray(a.behaviorIds))return a.behaviorIds.map(id=>medBehaviorRef(x,id));
 if(a.behaviorId!=null&&String(a.behaviorId)!=='')return [medBehaviorRef(x,a.behaviorId)];
 const scope=String(a.analysisOrigin?.scope||'');
 return scope.startsWith('behavior:')?[medBehaviorRef(x,scope.slice(9))]:[];
}
function medSurveyKeys(x,s){return medArray(x.measurementV1?.surveyLinks?.[String(s.id)]).map(String);}
function medIndicators(x,b,i){return medArray(x.indicators).filter(r=>medIndicatorKeys(x,r).includes(medKey(b,i)));}
function medActions(x,b,i){return medArray(x.actions).filter(a=>medActionKeys(x,a).includes(medKey(b,i)));}
function medHistory(rows){return medArray(rows).filter(r=>medNumber(r.value)!==null).map((r,i)=>({...r,value:medNumber(r.value),_order:i})).sort((a,b)=>{
 const at=medTime(a.date),bt=medTime(b.date);return at!==null&&bt!==null?at-bt||a._order-b._order:a._order-b._order;
});}

/* La tarjeta y su historial SIEMPRE resuelven la misma fuente. Una fuente de
 * encuesta sin respuestas no cae silenciosamente en un valor manual previo. */
function medCoreSeries(x,key){
 const selected=x.surveyHomeSources?.[key];
 let surveyMetric=null;
 try{surveyMetric=typeof eeHomeMetric==='function'?eeHomeMetric(x,key):null;}
 catch(_){return {kind:'survey',source:selected||null,label:'Fuente de encuesta no disponible',note:'Revisa la configuración del instrumento.',rows:[],current:null,date:'',n:0};}
 if(!selected?.manual&&surveyMetric){
  let source=selected;
  if(!source&&typeof eeHomeSourceOptions==='function'){
   const type=key==='ins_personas'?'nps':key==='cnps'?'cnps':null;
   const candidates=eeHomeSourceOptions(x).filter(o=>o.type===type);
   if(candidates.length===1)source=candidates[0];
  }
  const s=medArray(x.surveys).find(s=>String(s.id)===String(source?.surveyId));
  let rows=[];
  if(s&&typeof EE!=='undefined'){
   const evo=EE.evolution(s);
   rows=medArray(evo.series).map(moment=>{
    const scoped={...s,responses:medArray(s.responses).filter(r=>String(r.wave||'Base')===String(moment.wave))};
    const view={...x,surveyHomeSources:{...x.surveyHomeSources,[key]:source},surveys:medArray(x.surveys).map(v=>v===s?scoped:v)};
    const point=eeHomeMetric(view,key);
    return {date:moment.date||point?.date||'',period:moment.wave,value:medNumber(point?.value),n:point?.n??0,source:s.title};
   }).filter(r=>r.value!==null&&r.n>0);
  }
  return {kind:'survey',source:source||null,label:s?.title||'Encuesta de origen',note:surveyMetric.note||'',rows,
   current:medNumber(surveyMetric.value),date:surveyMetric.date||rows.at(-1)?.date||'',n:surveyMetric.n??0};
 }
 const rows=medHistory(x.metricHistory?.[key]);
 return {kind:'manual',label:'Registro manual',rows,current:rows.length?rows.at(-1).value:medNumber(x.metrics?.[key]),date:rows.at(-1)?.date||'',n:null,note:''};
}
function medSeriesChart(rows,options={}){
 const all=medArray(rows).filter(r=>medNumber(r.value)!==null);
 if(!all.length)return medEmpty('Sin mediciones disponibles en esta fuente.');
 const dated=all.filter(r=>medTime(r.date)!==null),points=dated.slice().sort((a,b)=>medTime(a.date)-medTime(b.date));
 const refs=[['Línea base',medNumber(options.baseline)],['Meta',medNumber(options.target)]].filter(([,v])=>v!==null);
 const definitions=new Set(all.map(r=>String(r.definition||'').trim()).filter(Boolean));
 let svg='';
 if(points.length){
  const values=points.map(p=>Number(p.value)).concat(refs.map(([,v])=>v));
  const rawLo=Math.min(...values),rawHi=Math.max(...values);
  const pad=rawHi===rawLo?Math.max(1,Math.abs(rawLo)*.1):(rawHi-rawLo)*.15;
  const lo=rawLo-pad,hi=rawHi+pad,span=hi-lo;
  const first=medTime(points[0].date),last=medTime(points.at(-1).date);
  const px=p=>last===first?285:55+(medTime(p.date)-first)*460/(last-first);
  const py=v=>145-(v-lo)*100/span;
  svg='<svg class="med-chart" viewBox="0 0 570 190" role="img" aria-label="'+safe(options.label||'Evolución de mediciones')+'">'+
   [lo,(lo+hi)/2,hi].map(v=>'<line class="med-gridline" x1="55" y1="'+py(v)+'" x2="515" y2="'+py(v)+'"/><text x="45" y="'+(py(v)+4)+'" text-anchor="end">'+safe(medValue(v))+'</text>').join('')+
   '<line x1="55" y1="155" x2="515" y2="155" stroke="currentColor" opacity=".3"/>'+
   refs.map(([label,v])=>'<line x1="55" y1="'+py(v)+'" x2="515" y2="'+py(v)+'" stroke="'+(label==='Meta'?'#f5c56c':'#87b2d0')+'" stroke-dasharray="5 5"/><text x="55" y="'+(py(v)-5)+'">'+label+' '+safe(medValue(v))+'</text>').join('')+
   (definitions.size>1||points.length<2||last===first?'':'<polygon class="med-area" points="55,155 '+points.map(p=>px(p)+','+py(p.value)).join(' ')+' 515,155"/>')+
   (definitions.size>1?'':'<polyline points="'+points.map(p=>px(p)+','+py(p.value)).join(' ')+'" class="med-line" fill="none" stroke-width="3"/>')+
   points.map(p=>'<circle cx="'+px(p)+'" cy="'+py(p.value)+'" r="5" class="med-point" tabindex="0" role="img" aria-label="'+safe(medDate(p.date)+' · '+medValue(p.value))+'"><title>'+safe(medDate(p.date)+' · '+medValue(p.value))+'</title></circle>').join('')+
   '<text x="55" y="178">'+safe(medDate(points[0].date))+'</text><text x="515" y="178" text-anchor="end">'+safe(medDate(points.at(-1).date))+'</text></svg>';
 }
 if(options.chartOnly)return svg;
 return svg+(definitions.size>1?'<p class="med-caption">Hay definiciones diferentes en este historial. Se muestran los puntos sin unirlos como una tendencia comparable.</p>':'')+(all.length!==dated.length?'<p class="med-caption">Las mediciones sin fecha válida se conservan en la tabla y no se colocan en la línea temporal.</p>':'')+
  '<div class="med-table-wrap"><table><thead><tr><th>Fecha / momento</th><th>Valor</th><th>Muestra</th><th>Fuente / observación</th></tr></thead><tbody>'+all.slice().reverse().map(r=>'<tr><td>'+safe(medDate(r.date))+(r.period?'<small>'+safe(r.period)+'</small>':'')+'</td><td>'+safe(medValue(r.value))+'</td><td>'+safe(r.n===null||r.n===undefined?'No registrada':r.n)+'</td><td>'+safe([r.source,r.definition,r.notes].filter(Boolean).join(' · ')||'Registro del indicador')+'</td></tr>').join('')+'</tbody></table></div>';
}
/* Visuales derivados: cuentan registros, nunca promedian escalas diferentes. */
function medIndicatorState(r){
 const value=medNumber(r.value),base=medNumber(r.baseline),target=medNumber(r.target);
 if(value===null)return 'missing';
 if(base===null||target===null)return 'unconfigured';
 return (target>base?value>=target:target<base?value<=target:value===target)?'met':'pending';
}
function medVisualSummary(indicators,actions){
 const completed=actions.filter(a=>a.status==='Completada').length,total=actions.length;
 const pct=total?100*completed/total:null;
 const groups=[['met','Alcanzan la meta'],['pending','Meta por alcanzar'],['unconfigured','Base o meta pendiente'],['missing','Sin medición actual']].map(([key,label])=>({key,label,count:indicators.filter(r=>medIndicatorState(r)===key).length}));
 const ring='<svg class="med-ring" viewBox="0 0 120 120" role="img" aria-label="'+completed+' de '+total+' intervenciones completadas"><circle class="med-ring-track" cx="60" cy="60" r="48"/>'+(completed?'<circle class="med-ring-value" cx="60" cy="60" r="48" pathLength="100" stroke-dasharray="'+pct+' 100" transform="rotate(-90 60 60)"/>':'')+'<text x="60" y="60" text-anchor="middle">'+(total?Math.round(pct)+'%':'—')+'</text><text class="med-ring-label" x="60" y="77" text-anchor="middle">completadas</text></svg>';
 return '<section class="med-visual-summary" aria-label="Lectura gráfica del seguimiento"><article class="med-visual-card med-execution-chart"><div class="med-section-heading"><h3>Intervenciones</h3><span class="med-chip">Ejecución</span></div><div class="med-ring-layout">'+ring+'<div><strong>'+completed+' <small>de '+total+'</small></strong><p>intervenciones completadas</p><small>Describe la ejecución de acciones.</small></div></div></article>'+
 '<article class="med-visual-card med-coverage-chart"><div class="med-section-heading"><h3>Estado de los indicadores</h3><span class="med-chip">'+indicators.length+' indicadores</span></div>'+(indicators.length?'<div class="med-stacked" role="img" aria-label="'+safe(groups.map(g=>g.label+': '+g.count).join('; '))+'">'+groups.filter(g=>g.count).map(g=>'<span class="med-segment med-state-'+g.key+'" style="width:'+100*g.count/indicators.length+'%"></span>').join('')+'</div><ul class="med-legend">'+groups.map(g=>'<li><i class="med-state-'+g.key+'" aria-hidden="true"></i><span>'+g.label+'</span><strong>'+g.count+'</strong></li>').join('')+'</ul>':medEmpty('Agrega indicadores para ver su seguimiento.'))+'</article></section>';
}
function medTrendPill(series){
 const rows=medArray(series.rows).filter(r=>medNumber(r.value)!==null&&medTime(r.date)!==null).slice().sort((a,b)=>medTime(a.date)-medTime(b.date));
 if(rows.length<2)return '<span class="med-trend med-trend-muted">'+(series.current===null?'Pendiente de medición':'Primera lectura disponible')+'</span>';
 const definitions=new Set(rows.map(r=>String(r.definition||'').trim()).filter(Boolean));
 if(definitions.size>1)return '<span class="med-trend med-trend-muted">Revisar comparabilidad</span>';
 const delta=rows.at(-1).value-rows.at(-2).value;
 return '<span class="med-trend">'+(delta>0?'↗ +':delta<0?'↘ ':'→ ')+safe(medValue(delta))+' respecto a la lectura anterior</span>';
}
function medSourceControl(x,key,resolved){
 let options=[];try{options=typeof eeHomeSourceOptions==='function'?eeHomeSourceOptions(x):[];}catch(_){}
 const selected=x.surveyHomeSources?.[key];
 const value=selected?.manual?'manual':selected?.surveyId?JSON.stringify({surveyId:selected.surveyId,key:selected.key}):'auto';
 return '<details class="med-source"><summary>Fuente del indicador</summary><label>Origen del valor y de su historial<select data-initiative="'+safe(String(x.id))+'" onchange="medSetCoreSource(this,'+medArgs(key)+')"><option value="auto"'+(value==='auto'?' selected':'')+'>Selección automática existente</option><option value="manual"'+(value==='manual'?' selected':'')+'>Registro manual</option>'+options.map(o=>{const v=JSON.stringify({surveyId:o.surveyId,key:o.key});return '<option value="'+safe(v)+'"'+(value===v?' selected':'')+'>'+safe(o.label||o.title||o.key)+'</option>';}).join('')+'</select></label><p class="med-caption">Cambiar la fuente conserva todos los registros anteriores. No combina escalas ni historiales.</p></details>';
}
function medSetCoreSource(select,key){
 const x=current();if(!x||String(x.id)!==select.dataset.initiative||!['cnps','ins_personas','ins_proceso'].includes(key))return;
 let value=null;
 if(select.value==='manual')value={manual:true};
 else if(select.value!=='auto'){
  try{value=JSON.parse(select.value);}catch(_){return;}
  const valid=typeof eeHomeSourceOptions==='function'&&eeHomeSourceOptions(x).some(o=>String(o.surveyId)===String(value.surveyId)&&o.key===value.key);
  if(!valid)return;
 }
 x.surveyHomeSources={...x.surveyHomeSources};if(value)x.surveyHomeSources[key]=value;else delete x.surveyHomeSources[key];
 save();render();
}
function medCoreCard(x,label,key){
 const s=medCoreSeries(x,key);
 return '<article class="med-core-card" data-metric="'+safe(key)+'"><div class="med-metric-heading"><span class="med-metric-symbol" aria-hidden="true">'+(key==='ins_personas'?'◉':key==='ins_proceso'?'⌘':'✦')+'</span><span class="med-chip">'+(s.kind==='survey'?'Encuesta':'Registro manual')+'</span></div><h3>'+safe(label)+'</h3><strong class="med-big">'+safe(medValue(s.current))+'</strong>'+medTrendPill(s)+'<p>'+safe(s.label)+'</p><small>'+safe(s.date?medDate(s.date):s.note||'Sin fecha registrada')+(s.n!==null?' · n = '+safe(s.n):'')+'</small>'+
  (s.kind==='survey'?'<p class="med-caption">Resultado declarado en encuesta.</p>':'<p class="med-caption">'+safe(x.metrics?.[key+'_definition']||'Escala por definir')+'</p><button type="button" class="secondary" data-metric-entry="'+key+'" onclick="openMetricEntry('+medArgs(key)+')">Registrar medición</button>')+
  (s.rows.length>1?medSeriesChart(s.rows,{label:label,chartOnly:true}):'<div class="med-chart-placeholder"><span aria-hidden="true">⌁</span><small>'+safe(s.current===null?'La evolución aparecerá al registrar mediciones.':'Registra otra medición para ver la evolución.')+'</small></div>')+
  '<details><summary>Historial de esta fuente</summary>'+medSeriesChart(s.rows,{label:label})+'</details>'+medSourceControl(x,key,s)+'</article>';
}
function medIndicatorCard(x,r){
 const history=medHistory(r.history),current=medNumber(r.value);
 const date=history.at(-1)?.date||'';
 const unit=typeof indicatorUnitLabel==='function'?indicatorUnitLabel(r):r.unit||'';
 const baseline=medNumber(r.baseline),target=medNumber(r.target);
 const comparable=current!==null&&baseline!==null;
 const met=comparable&&target!==null?(target>baseline?current>=target:target<baseline?current<=target:current===target):null;
 const delta=comparable?current-baseline:null;
 const state=medIndicatorState(r),status={met:'Meta alcanzada',pending:'En seguimiento',unconfigured:'Base o meta pendiente',missing:'Sin medición'};
 return '<article class="med-indicator" data-state="'+state+'"><span class="med-status med-status-'+state+'">'+status[state]+'</span><h4>'+safe(r.name||'Indicador sin nombre')+'</h4><p class="med-caption">'+safe(r.type||'Sin categoría')+' · '+safe(unit||'Unidad sin definir')+(medView.audience?' · Valor general, sin segmentación por audiencia':'')+'</p>'+
  '<div class="med-values">'+[['Base',r.baseline],['Meta',r.target],['Actual',current]].map(([label,value])=>'<div><small>'+label+'</small><strong>'+safe(medValue(value))+'</strong></div>').join('')+'</div>'+
  (comparable?'<p class="med-caption">Diferencia respecto a la base: '+safe((delta>0?'+':'')+medValue(delta))+' '+safe(/porcentaje|%/i.test(unit)?'pp':unit||'unidades')+'. '+(met===null?'Meta sin definir.':met?'Alcanza la meta registrada en esta medición.':'Meta aún no alcanzada en esta medición.')+'</p>':'')+
  '<p class="med-caption">'+safe(current===null?'Sin valor actual registrado':date?'Último registro: '+medDate(date):'Valor actual sin fecha registrada')+'</p>'+
  (history.length>1?medSeriesChart(history,{baseline:r.baseline,target:r.target,label:r.name,chartOnly:true}):'')+
  '<details><summary>Mediciones y trazabilidad</summary><p>'+safe(r.measureType||r.definition||'Método de medición pendiente')+'</p>'+medSeriesChart(history,{baseline:r.baseline,target:r.target,label:r.name})+
  (medArray(r.revisionHistory).some(rev=>medArray(rev.changes).some(c=>['definition','unit','measureType','scale','scaleMin','scaleMax'].includes(c.field)))?'<p class="med-caption">Hay cambios de definición o configuración registrados. Revisa su comparabilidad antes de interpretar la tendencia.</p>':'')+medNav('Actualizar indicador','Indicadores')+'</details></article>';
}
function medSurveyEvolution(s,audience=''){
 if(typeof EE==='undefined')return null;
 try{return EE.evolution(s,audience);}catch(_){return null;}
}
function medSurveyCard(x,s){
 const e=medSurveyEvolution(s,medView.audience),responses=medArray(s.responses).filter(r=>!medView.audience||String(r.audienceId)===medView.audience);
 const metrics=medArray(e?.comparisons).filter(m=>medNumber(m.latestValue)!==null&&m.latestN>0);
 const series=medArray(e?.series);
 return '<article class="med-survey"><h4>'+safe(s.title||'Encuesta')+'</h4><p class="med-caption">'+safe(s.kind||'Instrumento')+' · '+responses.length+' respuestas'+(medView.audience?' de la audiencia seleccionada':'')+'</p>'+
  (metrics.length?'<div class="med-table-wrap"><table><thead><tr><th>Medida</th><th>Base</th><th>Último momento</th><th>Diferencia</th></tr></thead><tbody>'+metrics.map(m=>'<tr><td>'+safe(m.label)+'<small>'+safe(m.unit||'')+'</small></td><td>'+safe(medValue(m.baselineValue))+'<small>n = '+safe(m.baselineN||0)+'</small></td><td>'+safe(medValue(m.latestValue))+'<small>n = '+safe(m.latestN)+'</small></td><td>'+safe(medValue(m.delta))+'</td></tr>').join('')+'</tbody></table></div>':medEmpty(responses.length?'Esta fuente requiere lectura cualitativa o no tiene puntuaciones comparables.':'Sin respuestas en este alcance.'))+
  (series.length?'<details><summary>Momentos y fechas</summary><ul class="med-list">'+series.map(m=>'<li>'+safe(m.wave)+' · '+safe(medDate(m.date))+' · n = '+safe(m.n)+'</li>').join('')+'</ul></details>':'')+
  '<p class="med-caption">Las diferencias son descriptivas. No garantizan seguimiento de las mismas personas ni efecto causal.</p><button type="button" class="secondary" onclick="medOpenSurvey('+medArgs(s.id)+')">Abrir resultados de esta encuesta ↗</button></article>';
}
function medOpenSurvey(id){const x=current();if(!medArray(x?.surveys).some(s=>String(s.id)===String(id)))return;eeSelected=id;eeTab='resultados';go('Encuestas y experiencias');}
function medAdoption(x,b){
 if(typeof abmV2EvidenceSummary!=='function')return medEmpty('El registro de adopción no está disponible.');
 const e=abmV2EvidenceSummary(x,b,medView.audience?[medView.audience]:null);
 const stageLabels={unknown:'Sin evidencia suficiente',understands:'Comprende',tries:'Prueba',performs:'Realiza',sustains:'Sostiene'};
 const distribution=e.eligible?'<div class="med-stacked med-adoption-bar" role="img" aria-label="'+safe(Object.entries(stageLabels).map(([key,label])=>label+': '+(e.stages[key]||0)).join('; '))+'">'+Object.entries(stageLabels).filter(([key])=>e.stages[key]).map(([key,label])=>'<span class="med-stage-'+key+'" style="width:'+100*e.stages[key]/e.eligible+'%" title="'+safe(label+': '+e.stages[key])+'"></span>').join('')+'</div><ul class="med-legend med-stage-legend">'+Object.entries(stageLabels).map(([key,label])=>'<li><i class="med-stage-'+key+'" aria-hidden="true"></i><span>'+label+'</span><strong>'+e.stages[key]+'</strong></li>').join('')+'</ul>':'';
 return '<div class="med-adoption"><h4>Comportamiento registrado en personas</h4><p><strong>'+e.measured+' de '+e.eligible+'</strong> personas registradas tienen un estado evaluado.</p>'+
  (e.measured?'<p><strong>'+e.confirmed+'</strong> con ejecución registrada (Realiza o Sostiene). '+e.unknown+' sin evidencia suficiente.</p>':medEmpty('Sin evidencia suficiente para describir la ejecución. No significa cero adopción.'))+
  distribution+'<small>Fuente: Gestión de audiencias · '+safe(e.latestDate?medDate(e.latestDate):'Sin fecha de evaluación')+'. Es el último estado registrado; no una curva de primeras adopciones.</small>'+medNav('Actualizar estados de adopción','Gestión de audiencias')+'</div>';
}
function medActionList(actions){return actions.length?'<ul class="med-list">'+actions.map(a=>'<li><strong>'+safe(a.name||a.title||'Intervención')+'</strong><span>'+safe(a.status||'Pendiente')+' · '+safe(a.owner||'Sin responsable')+'</span><small>'+safe(a.start||'Inicio sin fecha')+' → '+safe(a.end||'Fin sin fecha')+'</small>'+(a.hypothesis?'<p>Queremos comprobar: '+safe(a.hypothesis)+'</p>':'')+(a.measurement?'<p>Medición prevista: '+safe(a.measurement)+'</p>':'')+'</li>').join('')+'</ul>':medEmpty('No hay intervenciones vinculadas explícitamente a este comportamiento.');}
function medLinkEditor(x,b,bi){
 const key=medKey(b,bi),chosen=(rows,fn,name)=>rows.map((r,i)=>'<label><input type="checkbox" name="'+name+'" value="'+i+'"'+(fn(r).includes(key)?' checked':'')+'><span>'+safe(r.name||r.title||'Sin nombre')+'</span></label>').join('');
 return '<details class="med-link-editor"><summary>Vincular indicadores, intervenciones y encuestas</summary><form data-initiative="'+safe(String(x.id))+'" onsubmit="medSaveLinks(event,'+bi+')"><p class="med-caption">Asocia fuentes existentes. No se crean copias ni se infieren relaciones por sus nombres.</p><div class="med-link-grid"><fieldset><legend>Indicadores</legend>'+chosen(medArray(x.indicators),r=>medIndicatorKeys(x,r),'indicators')+'</fieldset><fieldset><legend>Intervenciones</legend>'+chosen(medArray(x.actions),r=>medActionKeys(x,r),'actions')+'</fieldset><fieldset><legend>Encuestas</legend>'+chosen(medArray(x.surveys),r=>medSurveyKeys(x,r),'surveys')+'</fieldset></div><button type="submit" class="primary">Guardar vínculos</button></form></details>';
}
function medSaveLinks(event,bi){
 event.preventDefault();const x=current(),f=event.target,b=x?.behaviors?.[bi];if(!b||String(x.id)!==f.dataset.initiative)return;
 const oldKeys=medArray(x.behaviors).map(medKey),oldIndicators=medArray(x.indicators).map(r=>medIndicatorKeys(x,r)),oldActions=medArray(x.actions).map(a=>medActionKeys(x,a));ensureBehaviorIds(x);
 const config=x.measurementV1||={surveyLinks:{},reviews:{}};config.surveyLinks||={};config.reviews||={};
 const migrate=ids=>medArray(ids).map(id=>{const i=oldKeys.indexOf(String(id));return i>=0?String(x.behaviors[i].id):String(id);});
 // Migrar referencias propias si un comportamiento antiguo aún no tenía ID.
 for(const [id,ids] of Object.entries(config.surveyLinks))config.surveyLinks[id]=migrate(ids);
 oldKeys.forEach((old,i)=>{const key=String(x.behaviors[i].id);if(old!==key)for(const stored of Object.keys(config.reviews))if(stored===old||stored.startsWith(old+'|audience:')){config.reviews[key+stored.slice(old.length)]=config.reviews[stored];delete config.reviews[stored];}});
 const data=new FormData(f),key=String(b.id);
 const selected=name=>new Set(data.getAll(name).map(String));
 const set=(ids,on)=>[...new Set(migrate(ids).filter(id=>id!==key).concat(on?[key]:[]))];
 const indicators=selected('indicators'),actions=selected('actions'),surveys=selected('surveys');
 medArray(x.indicators).forEach((r,i)=>writeIndicatorBehaviorIds(x,r,set(oldIndicators[i],indicators.has(String(i)))));
 medArray(x.actions).forEach((a,i)=>{a.behaviorIds=set(oldActions[i],actions.has(String(i)));});
 medArray(x.surveys).forEach((s,i)=>{config.surveyLinks[String(s.id)]=set(medSurveyKeys(x,s),surveys.has(String(i)));});
 if(typeof hcxRememberForm==='function')hcxRememberForm(f);save();render();
}
function medHypotheses(x,b,bi){
 const key=medKey(b,bi),s=x.systemV23||{},actions=medActions(x,b,bi);
 const actionIds=new Set(actions.filter(a=>a.id!=null).map(a=>String(a.id)));
 const conditionIds=new Set(medArray(s.conditions).filter(c=>String(c.behaviorId)===key).map(c=>String(c.id)));
 medArray(x.diagnosisPossibleCauses).filter(c=>medBehaviorRef(x,c.behaviorId)===key).forEach(c=>conditionIds.add('cause:'+String(c.id)));
 return medArray(s.hypotheses).filter(h=>conditionIds.has(String(h.conditionId))||h.actionId!=null&&actionIds.has(String(h.actionId)));
}
function medHypothesisList(x,items){return items.length?items.map(h=>'<article class="med-hypothesis"><strong>'+safe(h.statement||h.title||'Hipótesis')+'</strong><p>'+safe(h.status||'Pendiente')+'</p>'+(h.learning?'<p>Aprendizaje: '+safe(h.learning)+'</p>':'')+
 '<details><summary>Revisar hipótesis con la evidencia</summary><form onsubmit="medSaveHypothesis(event,'+medArgs(h.id)+')" data-initiative="'+safe(String(x.id))+'"><label>Estado<select name="status">'+['Pendiente','Respaldada parcialmente','Respaldada','Contradicha','Sin evidencia suficiente'].map(v=>'<option'+(v===h.status?' selected':'')+'>'+v+'</option>').join('')+'</select></label><label>Decisión<input name="decision" maxlength="1000" value="'+safe(h.decision||'')+'"></label><label>Evidencia revisada y aprendizaje<textarea name="learning" maxlength="4000" required>'+safe(h.learning||'')+'</textarea></label><p class="med-caption">Revisión del analista. No se calcula automáticamente a partir de las cifras.</p><button class="primary">Guardar revisión en Pensamiento sistémico</button></form></details></article>').join(''):medEmpty('Sin hipótesis sistémicas vinculadas a este comportamiento.');}
function medSaveHypothesis(event,id){event.preventDefault();if(String(current()?.id)!==event.target.dataset.initiative)return;if(typeof hcxRememberForm==='function')hcxRememberForm(event.target);sysUpdateHypothesis(event,id);}
function medReviewKey(b,bi){return medKey(b,bi)+(medView.audience?'|audience:'+medView.audience:'');}
function medReview(x,b,bi){
 const r=x.measurementV1?.reviews?.[medReviewKey(b,bi)]||{};
 return '<details class="med-review"><summary>Conclusión del seguimiento'+(r.reviewedAt?' · '+safe(medDate(r.reviewedAt)):'')+'</summary>'+(r.status?'<p><strong>'+safe(r.status)+'</strong> · '+safe(r.decision||'Sin decisión registrada')+'</p>':'')+
 '<form data-initiative="'+safe(String(x.id))+'" onsubmit="medSaveReview(event,'+bi+')"><label>Lectura de la evidencia<select name="status">'+['Sin evidencia suficiente','Avance observado','Sin cambio observado','Retroceso observado'].map(v=>'<option'+(r.status===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label><label>Qué evidencia revisaste y qué aprendimos<textarea name="learning" required maxlength="4000">'+safe(r.learning||'')+'</textarea></label><label>Decisión<select name="decision">'+['Continuar observando','Mantener','Ajustar','Detener'].map(v=>'<option'+(r.decision===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label><button class="primary">Guardar aprendizaje</button></form>'+
 (medArray(r.history).length?'<details><summary>Revisiones anteriores</summary><ul class="med-list">'+r.history.slice().reverse().map(h=>'<li>'+safe(medDate(h.reviewedAt))+' · '+safe(h.status)+' · '+safe(h.decision)+'<p>'+safe(h.learning)+'</p></li>').join('')+'</ul></details>':'')+'</details>';
}
function medSaveReview(event,bi){
 event.preventDefault();const x=current(),f=event.target,b=x?.behaviors?.[bi];if(!b||String(x.id)!==f.dataset.initiative)return;
 const data=new FormData(f),status=String(data.get('status')),decision=String(data.get('decision')),learning=String(data.get('learning')||'').trim().slice(0,4000);
 if(!learning||!['Sin evidencia suficiente','Avance observado','Sin cambio observado','Retroceso observado'].includes(status)||!['Continuar observando','Mantener','Ajustar','Detener'].includes(decision))return;
 x.measurementV1||={};x.measurementV1.reviews||={};const key=medReviewKey(b,bi),previous=x.measurementV1.reviews[key];
 const history=previous?[...medArray(previous.history),{status:previous.status,decision:previous.decision,learning:previous.learning,reviewedAt:previous.reviewedAt,evidence:previous.evidence}].slice(-40):[];
 const evidence=medIndicators(x,b,bi).map(r=>({indicatorId:r.id||null,value:medNumber(r.value),date:medHistory(r.history).at(-1)?.date||null}));
 x.measurementV1.reviews[key]={status,decision,learning,reviewedAt:new Date().toISOString(),evidence,audienceId:medView.audience||null,history};
 if(typeof hcxRememberForm==='function')hcxRememberForm(f);save();render();
}
function medModelRuns(x){return medArray(x.modelRuns).slice(-12).reverse().map(r=>'<li><strong>'+safe(r.behavior||'Comportamiento sin identificar')+'</strong><small>'+safe(medDate(r.date))+' · '+safe(r.result?.model_version||r.engine||'Modelo sin versión')+'</small><p>Diferencia simulada: '+safe(medValue(medNumber(r.result?.final?.difference?.mean)===null?null:r.result.final.difference.mean*100))+' pp. No es un efecto observado.</p></li>').join('')||'<li>Sin simulaciones guardadas.</li>';}
function medTimeline(x){
 const events=[];const add=(date,source,text)=>{if(medTime(date)!==null)events.push({date,source,text});};
 medArray(x.indicators).forEach(r=>medArray(r.history).forEach(h=>add(h.date,'Indicador',(r.name||'Indicador')+': '+medValue(h.value))));
 medArray(x.systemV23?.events).forEach(e=>add(e.date,'Pensamiento sistémico',e.detail||e.kind||'Actualización registrada'));
 medArray(x.modelRuns).forEach(r=>add(r.date,'Simulación exploratoria',r.behavior||'Escenario registrado'));
 medArray(x.observations).forEach(r=>add(r.date,'Aprendizaje',r.learning||r.scenario||'Contraste registrado'));
 Object.entries(x.metricHistory||{}).forEach(([key,rows])=>medArray(rows).forEach(r=>add(r.date,'Medición manual',key+': '+medValue(r.value))));
 medArray(x.surveys).forEach(s=>medArray(medSurveyEvolution(s)?.series).filter(m=>m.n>0).forEach(m=>add(m.date,'Encuesta',(s.title||'Instrumento')+' · '+m.wave+' · '+m.n+' respuestas')));
 Object.entries(x.measurementV1?.reviews||{}).forEach(([,r])=>add(r.reviewedAt,'Revisión de evidencia',r.status+' · '+r.decision));
 medArray(x.actions).forEach(a=>add(a.updatedAt||a.createdAt,'Intervención',a.name||'Intervención actualizada'));
 return events.sort((a,b)=>medTime(b.date)-medTime(a.date)).slice(0,30).map(e=>'<li><small>'+safe(medDate(e.date))+' · '+safe(e.source)+'</small><span>'+safe(e.text)+'</span></li>').join('')||'<li>Sin eventos fechados en las fuentes consultadas.</li>';
}
function medExternalKey(x){return [typeof cloudOrgId==='undefined'?'':cloudOrgId,medSessionIdentity,x._cloudId||''].join('|');}
function medLabProfiles(rows){
 return '<ul class="med-list">'+rows.map(r=>'<li><strong>'+safe(r.simulator_id==='cultura-cvf'?'Radar de cultura':'Experiencia del Laboratorio')+'</strong><small>'+safe(medDate(r.captured_at))+' · n = '+safe(r.sample_size)+'</small>'+
  (r.simulator_id==='cultura-cvf'&&r.data?'<div class="med-table-wrap"><table><thead><tr><th>Orientación</th><th>Actual</th><th>Deseada</th></tr></thead><tbody>'+['Colaborar','Crear','Lograr','Organizar'].map((label,i)=>'<tr><td>'+label+'</td><td>'+safe(medValue(r.data.current?.[i]))+'</td><td>'+safe(medValue(r.data.preferred?.[i]))+'</td></tr>').join('')+'</tbody></table></div><p class="med-caption">Perfil descriptivo agregado; no es una medición de adopción.</p>':'')+'</li>').join('')+'</ul>';
}
function medExternalBody(x){
 if(!x._cloudId)return medEmpty('La iniciativa aún no está sincronizada. Las fuentes externas estarán disponibles después de confirmar su guardado.');
 const record=medExternalCache.get(x),valid=record?.key===medExternalKey(x);
 if(!valid)return '<p class="med-caption">Consulta los resultados disponibles del Centro de activación y del Laboratorio para esta iniciativa.</p>';
 const content=(entry,renderRows)=>entry.status==='loading'?medEmpty('Consultando…'):entry.status==='error'?medEmpty('No fue posible consultar esta fuente. Puedes reintentar.'):renderRows(entry.rows);
 return (record.updatedAt?'<p class="med-caption">Última consulta de fuentes: '+safe(new Date(record.updatedAt).toLocaleString('es-CO'))+'</p>':'')+'<h3>Comunicaciones y reconocimiento</h3>'+content(record.sends,rows=>rows.length?(typeof cacHistoryMetricsHTML==='function'?cacHistoryMetricsHTML(rows):'<p>'+rows.length+' registros consultados.</p>'):medEmpty('Sin envíos registrados en los últimos resultados consultados.'))+
  '<p class="med-caption">Hasta 30 envíos. Entregas, aperturas y clics describen comunicaciones; no prueban adopción.</p>'+medNav('Ver Centro de activación','Centro de activación')+
  '<h3>Experiencias del Laboratorio</h3>'+content(record.lab,rows=>rows.length?medLabProfiles(rows):medEmpty('Sin resultados del Laboratorio vinculados a esta iniciativa.'))+
  '<p class="med-caption">Hasta 100 resultados agregados. Se mantienen sus instrumentos y alcances originales.</p>'+medNav('Consultar perfiles y resultados','Laboratorio');
}
async function medLoadExternal(force=false){
 const x=current();if(!x?._cloudId||typeof cloudReady==='undefined'||!cloudReady||typeof cloudOrgId==='undefined'||!cloudOrgId)return;
 const key=medExternalKey(x),existing=medExternalCache.get(x);if(!force&&existing?.key===key)return;
 const org=cloudOrgId,record={key,sends:{status:'loading',rows:[]},lab:{status:'loading',rows:[]}};medExternalCache.set(x,record);medUpdateExternal(x);
 await Promise.allSettled([
  ['sends','activation_sends','id,recipient_count,accepted_count,delivered_count,opened_count,clicked_count,bounced_count,complained_count,suppressed_count,failed_delivery_count,event_updated_at,delivery_check_at,status','submitted_at',30],
  ['lab','lab_experience_results','id,initiative_id,simulator_id,sample_size,captured_at,measurement_type,data','captured_at',100]
 ].map(async([name,table,fields,date,limit])=>{
  try{const {data,error}=await sb.from(table).select(fields).eq('organization_id',org).eq('initiative_id',x._cloudId).order(date,{ascending:false}).limit(limit);if(error)throw error;
   record[name]={status:'ready',rows:medArray(data)};record.updatedAt=new Date().toISOString();
  }catch(_){record[name]={status:'error',rows:[]};}
  if(record===medExternalCache.get(x)&&key===medExternalKey(x))medUpdateExternal(x);
 }));
}
function medUpdateExternal(x){if(current()!==x)return;const target=document.getElementById('med-external-body');if(target)target.innerHTML=medExternalBody(x);}
function medGlobalIndicator(x){
 const id=x.measurementV1?.globalIndicatorId;
 const r=medArray(x.indicators).find(r=>id&&String(r.id)===String(id));
 return (r?'<div class="med-global-current"><small>Indicador asociado al resultado global</small><strong>'+safe(r.name)+'</strong><p>Valor actual: <b>'+safe(medValue(r.value))+'</b> · '+safe(r.unit||'Unidad por definir')+'</p>'+medIndicatorCard(x,r)+'</div>':medEmpty('Aún no hay un indicador asociado para contrastar el resultado global.'))+
  '<details><summary>Asociar indicador del resultado global</summary><label>Indicador existente<select data-initiative="'+safe(String(x.id))+'" onchange="medSetGlobalIndicator(this)"><option value="">Sin asociación</option>'+medArray(x.indicators).map((r,i)=>'<option value="'+i+'"'+(id&&String(r.id)===String(id)?' selected':'')+'>'+safe(r.name)+'</option>').join('')+'</select></label><small>Selecciona una medida coherente con la definición y unidad del resultado. No se combinan indicadores automáticamente.</small></details>';
}
function medSetGlobalIndicator(select){
 const x=current();if(!x||String(x.id)!==select.dataset.initiative)return;
 x.measurementV1||={};
 if(select.value==='')delete x.measurementV1.globalIndicatorId;
 else{const index=Number(select.value),r=Number.isInteger(index)?x.indicators?.[index]:null;if(!r)return;r.id||=crypto.randomUUID();x.measurementV1.globalIndicatorId=String(r.id);}
 save();render();
}
function renderMeasurementPage(x,embedded=false){
 if(!x)return medEmpty('Selecciona una iniciativa para consultar sus resultados.');
 const identity=String(x._cloudId||x.id);if(medView.key!==identity)medView={key:identity,behavior:'all',audience:'',open:'',tab:'results'};
 const behaviors=medArray(x.behaviors),surveys=medArray(x.surveys),indicators=medArray(x.indicators),actions=medArray(x.actions),s=x.systemV23||{};
 if(medView.audience&&!medArray(x.audiences).some(a=>String(a.id)===medView.audience))medView.audience='';
 if(medView.behavior!=='all'&&!behaviors[Number(medView.behavior)])medView.behavior='all';
 const selected=medView.behavior==='all'?null:behaviors[Number(medView.behavior)];
 const unlinkedIndicators=indicators.filter(r=>!medIndicatorKeys(x,r).some(id=>behaviors.some((b,i)=>medKey(b,i)===id)));
 const unlinkedSurveys=surveys.filter(r=>!medSurveyKeys(x,r).some(id=>behaviors.some((b,i)=>medKey(b,i)===id)));
 const r=x.globalResult||{},completed=actions.filter(a=>a.status==='Completada').length;
 const hypotheses=medArray(s.hypotheses),conditions=medArray(s.conditions),findings=medArray(x.diagnosisFindings);
 const general=
  '<h3>Encuestas sin vínculo explícito · '+unlinkedSurveys.length+'</h3>'+unlinkedSurveys.map(s=>medSurveyCard(x,s)).join('')+
  '<p class="med-caption">Las encuestas vinculadas se muestran dentro de sus comportamientos.</p>'+medNav('Consultar todos los instrumentos','Encuestas y experiencias')+medNav('Gestionar indicadores','Indicadores')+
  '<details><summary>Dimensiones registradas</summary><p class="med-caption">Valores descriptivos de la iniciativa; no equivalen a un porcentaje de adopción observado.</p><ul class="med-list">'+Object.entries(x.dimensions||{}).map(([name,value])=>'<li>'+safe(name)+': '+safe(medValue(value))+'</li>').join('')+'</ul></details>'+
  (typeof portfolioMetricSummary==='function'?'<details><summary>Consolidado del portafolio</summary>'+portfolioMetricSummary()+'</details>':'');
 const linkedGroups=new Set();const comparisons=surveys.flatMap(s=>{
  if(!s.measurementGroupId||linkedGroups.has(s.measurementGroupId)||typeof eeLinkedEvolutionData!=='function')return [];
  linkedGroups.add(s.measurementGroupId);let e;try{e=eeLinkedEvolutionData(x,s,medView.audience);}catch(_){return [];}
  if(!e)return [];
  return ['<article class="med-survey"><h4>'+safe(s.title||'Encuestas conectadas')+'</h4><p>'+safe(e.baseline)+' → '+safe(e.latest)+'</p>'+medArray(e.comparisons).filter(m=>medNumber(m.latestValue)!==null).map(m=>'<p>'+safe(m.label)+': '+safe(medValue(m.baselineValue))+' → '+safe(medValue(m.latestValue))+' '+safe(m.unit)+' · diferencia '+safe(medValue(m.delta))+' · n = '+safe(m.baselineN)+' / '+safe(m.latestN)+'</p>').join('')+(e.hasComparison?'':medEmpty('Todavía no hay momentos o medidas comparables suficientes.'))+'<p class="med-caption">Comparación de la iniciativa; no se atribuye automáticamente a un comportamiento o intervención.</p></article>'];
 }).join('');
 return '<div class="med-page">'+(embedded?'':hcxHero('Medición y aprendizaje',x,'Conecta lo que hicimos, lo que observamos y lo que decidimos.','RDAIM · MEDICIÓN','◷'))+
  '<section class="med-selector"><div><span class="med-eyebrow">EXPLORAR MEDICIÓN</span><h2>'+safe(selected?'Analítica del comportamiento':'Panorama de la iniciativa')+'</h2></div><div class="med-filters"><label for="med-behavior-select">Comportamiento<select id="med-behavior-select" onchange="medSetFilter(\'behavior\',this.value)"><option value="all">Vista general de la iniciativa</option>'+behaviors.map((b,i)=>'<option value="'+i+'"'+(medView.behavior===String(i)?' selected':'')+'>'+safe(b.name)+'</option>').join('')+'</select></label>'+(selected?'<label for="med-audience-select">Audiencia<select id="med-audience-select" onchange="medSetFilter(\'audience\',this.value)"><option value="">Todas las audiencias</option>'+medArray(x.audiences).filter(a=>selected.scope!=='specific'||medArray(selected.audienceIds).map(String).includes(String(a.id))).map(a=>'<option value="'+safe(a.id)+'"'+(medView.audience===String(a.id)?' selected':'')+'>'+safe(a.name)+'</option>').join('')+'</select></label>':'')+'</div></section>'+
  (selected?medDashboard(x,selected,Number(medView.behavior)):
  '<section class="med-headline" aria-label="Indicadores generales de la iniciativa"><div class="med-section-heading"><h2>¿Cómo va la iniciativa?</h2><span>INS y CNPS</span></div><div class="med-instruments">'+[['INS personas','ins_personas'],['INS proceso','ins_proceso'],['CNPS','cnps']].map(([label,key])=>medCoreCard(x,label,key)).join('')+'</div></section>'+
  medVisualSummary(indicators,actions)+
  '<section class="med-outcome"><div class="med-section-heading"><span class="med-eyebrow">RESULTADO ESPERADO</span>'+medNav('Ver resultado','Resultado global')+'</div><h2>'+safe([r.verb,r.complement].filter(Boolean).join(' ')||x.expected||'Resultado global por definir')+'</h2><details><summary>Meta y seguimiento del resultado</summary><div class="med-values">'+[['Base',r.baseline],['Meta',r.target]].map(([label,value])=>'<div><small>'+label+'</small><strong>'+safe(medValue(value))+'</strong></div>').join('')+'<div><small>Fecha meta</small><strong>'+safe(medDate(r.dueDate))+'</strong></div></div><p class="med-caption">'+safe(r.unit||'Unidad por definir')+' · '+safe(r.measureType||'Método por definir')+'</p>'+medGlobalIndicator(x)+'</details></section>'+
  '<div class="med-overview"><div><strong>'+behaviors.length+'</strong><span>comportamientos definidos</span></div><div><strong>'+indicators.filter(r=>medNumber(r.value)!==null).length+'/'+indicators.length+'</strong><span>indicadores con medición</span></div><div><strong>'+completed+'/'+actions.length+'</strong><span>intervenciones completadas</span></div></div>'+
  '<section class="med-initiative-indicators"><div class="med-section-heading"><h2>Indicadores de la iniciativa</h2>'+medNav('Gestionar indicadores','Indicadores')+'</div><div class="med-indicators">'+indicators.map(r=>medIndicatorCard(x,r)).join('')+'</div>'+(indicators.length?'':medEmpty('Aún no hay indicadores configurados.'))+'</section>')+
  (selected?'':'<div class="med-supporting">'+
  medFold('general','Evidencia general e instrumentos',unlinkedIndicators.length+' indicadores y '+unlinkedSurveys.length+' encuestas sin vínculo específico',general+'<h3>Comparaciones entre encuestas conectadas</h3>'+(comparisons||medEmpty('Sin comparaciones conectadas disponibles.')))+
  medFold('analysis','Diagnóstico, sistema y escenarios',findings.length+' hallazgos · '+conditions.length+' condiciones · '+medArray(x.modelRuns).length+' simulaciones',
   '<h3>Diagnóstico</h3><p>'+findings.length+' hallazgos registrados. Las barreras y facilitadores explican hipótesis; no son medidas de adopción.</p><ul class="med-list">'+findings.slice(-8).map(f=>'<li>'+safe(f.text||f.title||f.finding||'Hallazgo registrado')+'</li>').join('')+'</ul><details><summary>Causas e hipótesis del diagnóstico</summary><ul class="med-list">'+medArray(x.diagnosisPossibleCauses).map(c=>'<li>'+safe(c.statement||'Posible causa')+'<small>'+safe(c.status||'Por comprobar')+'</small></li>').join('')+medArray(x.diagnosisHypotheses).map(h=>'<li>'+safe(h.text||h.statement||h.title||'Hipótesis registrada')+'</li>').join('')+'</ul></details>'+medNav('Examinar diagnóstico','Diagnóstico')+
   '<h3>Grafo y pensamiento sistémico</h3><p>'+medArray(x.nodes).length+' nodos · '+medArray(x.edges).length+' relaciones · '+conditions.length+' condiciones registradas.</p>'+medNav('Consultar grafo','Grafo de adopción')+medNav('Consultar sistema e histórico','Pensamiento sistémico')+
   '<details><summary>Hipótesis de la iniciativa · '+hypotheses.length+'</summary>'+medHypothesisList(x,hypotheses)+'</details><details><summary>Propuestas del grafo y del sistema</summary><ul class="med-list">'+medArray(x.actionExplorationsV1).map(p=>'<li><strong>'+safe(p.name)+'</strong><small>'+safe(p.origin==='graph'?'Grafo de adopción':'Pensamiento sistémico')+'</small><p>'+safe(p.expected||'')+'</p><small>'+safe(p.measurement||'Medición por definir')+'</small></li>').join('')+'</ul></details><details><summary>Últimos escenarios guardados</summary><ul class="med-list">'+medModelRuns(x)+'</ul>'+medNav('Explorar simulaciones','Simulación de agentes')+'</details>')+
  medFold('execution','Ejecución, activación y Laboratorio',completed+' de '+actions.length+' intervenciones completadas','<p class="med-caption">Completar una acción no demuestra que haya cambiado un comportamiento.</p>'+medActionList(actions)+medNav('Gestionar implementación','Intervenciones')+'<button type="button" class="secondary" onclick="medLoadExternal(true)">Actualizar fuentes conectadas</button><div id="med-external-body" aria-live="polite">'+medExternalBody(x)+'</div>')+
  medFold('learning','Aprendizaje e histórico','Revisiones y eventos con fecha, conservando su procedencia','<h3>Contrastes registrados en Inteligencia integrada</h3><ul class="med-list">'+medArray(x.observations).map(o=>'<li>'+safe(medDate(o.date))+' · '+safe(o.scenario||'Contraste')+'<p>Esperado: '+safe(o.expected||'Sin registrar')+' · Observado: '+safe(o.observed||'Sin registrar')+'</p><p>'+safe(o.learning||'')+'</p></li>').join('')+'</ul>'+medNav('Consultar experimentos y aprendizajes','Inteligencia integrada')+'<h3>Últimos 30 eventos fechados</h3><ul class="med-list">'+medTimeline(x)+'</ul>')+
  '</div>')+
  '<p class="med-caption med-footer">Cada fuente conserva su escala, fecha y alcance. Las hipótesis se revisan con evidencia; las simulaciones permanecen como escenarios exploratorios.</p></div>';
}
