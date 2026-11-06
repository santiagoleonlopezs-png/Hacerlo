/* HACERLO · Plan de cambio ejecutivo
   Vista de lectura: transforma datos existentes en un relato para líderes.
   No guarda otro plan ni sustituye la fuente de verdad de RDAIM. */
let planExecSlideIndex=0;
let planExecPresentationOpen=false;
let planExecKeyboardBound=false;
function planExecEsc(value){
 return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function planExecText(value,fallback='Por definir'){
 const text=String(value??'').trim();
 return text?planExecEsc(text):'<span class="plan-pending">'+planExecEsc(fallback)+'</span>';
}
function planExecDate(s){
 const value=String(s||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'Sin fecha';
 const [y,m,d]=value.split('-');
 return d+'/'+m+'/'+y;
}
function planExecNumber(value){
 const n=Number(value);
 return value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(n)?
  n.toLocaleString('es-CO',{maximumFractionDigits:2}):'—';
}
function planExecResult(x){
 const r=x?.globalResult||{};
 const title=[r.verb,r.complement].filter(Boolean).join(' ').trim()||String(x?.expected||'');
 return {title,baseline:r.baseline,target:r.target,unit:r.unit,measureType:r.measureType,dueDate:r.dueDate};
}
function planExecObjective(x){
 const b=x?.objectiveBehavior||{};
 const bits=[b.actor,b.action,b.context?('en '+b.context):'',b.frequency?('· '+b.frequency.toLowerCase()):''].filter(Boolean);
 return bits.join(' ').trim()||String(x?.objective||'');
}
function planExecDiagnosis(x){
 const findings=(x?.diagnosisFindings||[]).filter(f=>f&&String(f.text||f.title||'').trim());
 const factorRows=Object.entries(x?.behaviorDiagnosis||{}).filter(([,v])=>v);
 const barriers=factorRows.filter(([,v])=>v.role==='Barrera').map(([key,v])=>({key,label:v.factor||key.split('::').at(-1),dimension:v.dimension||''}));
 const facilitators=factorRows.filter(([,v])=>v.role==='Facilitador').map(([key,v])=>({key,label:v.factor||key.split('::').at(-1),dimension:v.dimension||''}));
 const evidence=findings.slice(0,4).map(f=>({text:String(f.text||f.title||''),source:String(f.source||f.evidenceType||'')}));
 return {barriers,facilitators,evidence,findingsCount:findings.length};
}
function planExecActivities(x){
 const actions=x?.actions||[];
 return actions.map((a,index)=>{
  const mechs=typeof actionMechanisms==='function'?actionMechanisms(a):
   (Array.isArray(a.mechanisms)?a.mechanisms:['ninguno']);
  const mechLabels={comunicacion:'Comunicaciones',reconocimiento:'Reconocimiento',laboratorio:'Laboratorio',otro:'Otro mecanismo',ninguno:'Sin mecanismo específico'};
  const counts={prepared:0,declared:0};
  for(const k of ['comunicacion','reconocimiento']){
   const rows=Array.isArray(a.mechanismRecords?.[k])?a.mechanismRecords[k]:[];
   counts.prepared+=rows.length;
   counts.declared+=rows.filter(p=>p.status==='realizada').length;
  }
  return {index,name:String(a.name||'Acción'),owner:String(a.owner||''),status:String(a.status||'Pendiente'),
   start:String(a.start||''),end:String(a.end||''),mechanisms:mechs.filter(v=>v!=='ninguno').map(v=>mechLabels[v]||v),
   lab:!!a.learningLabExperience,prepared:counts.prepared,declared:counts.declared};
 });
}
function planExecIndicators(x){
 return (x?.indicators||[]).map(r=>({
  name:String(r.name||'Indicador'),
  type:String(r.type||''),
  baseline:r.baseline,target:r.target,current:r.value,
  unit:String(r.unit||''),date:String(r.dueDate||r.targetDate||'')
 }));
}
function planExecEmpty(label){
 return '<div class="plan-empty"><span class="plan-empty-symbol">◇</span><span>'+planExecEsc(label)+'</span></div>';
}
function planExecPill(value,cls=''){
 return '<span class="plan-chip '+cls+'">'+planExecEsc(value)+'</span>';
}
function planExecList(items,limit=5){
 return items.length?
 '<div class="plan-signal-list">'+items.slice(0,limit).map(s=>'<div class="plan-signal"><span class="plan-signal-dot"></span><span>'+planExecEsc(s)+'</span></div>').join('')+
 (items.length>limit?'<small class="plan-more">+'+(items.length-limit)+' adicionales en HACERLO</small>':'')+'</div>':
 planExecEmpty('Sin registros disponibles');
}
function planExecKpi(value,label){
 return '<div class="plan-kpi"><strong>'+planExecEsc(value)+'</strong><span>'+planExecEsc(label)+'</span></div>';
}
function planExecMetricCell(label,value){
 return '<div class="plan-result-metric"><span>'+planExecEsc(label)+'</span><strong>'+planExecEsc(value)+'</strong></div>';
}
function planExecStatus(status){
 const norm=status==='Completada'?'done':status==='En ejecución'?'progress':'pending';
 return '<span class="plan-status plan-status-'+norm+'">'+planExecEsc(status)+'</span>';
}
function planExecAgenda(activities){
 const dated=activities.filter(a=>a.start||a.end).slice().sort((a,b)=>String(a.start||a.end).localeCompare(String(b.start||b.end)));
 return dated.length?
 '<div class="plan-steps">'+dated.slice(0,5).map(a=>'<article class="plan-step"><div class="plan-step-date">'+planExecEsc(planExecDate(a.start||a.end))+'</div>'+
 '<div class="plan-step-content"><strong>'+planExecEsc(a.name)+'</strong><small>'+
 planExecEsc((a.owner?('Responsable: '+a.owner+' · '):'')+(a.end?'Hasta '+planExecDate(a.end):'Sin cierre definido'))+
 '</small></div>'+planExecStatus(a.status)+'</article>').join('')+
 (dated.length>5?'<small class="plan-more">+'+(dated.length-5)+' acciones con fechas adicionales</small>':'')+'</div>':
 planExecEmpty('No hay acciones programadas con fechas');
}
function planExecDecisions(x,result,diagnosis,activities,indicators){
 const points=[];
 if(!result.title)points.push('Acordar el resultado global que se espera lograr.');
 if(!planExecObjective(x))points.push('Validar el comportamiento observable que se quiere movilizar.');
 if(!diagnosis.barriers.length&&!diagnosis.evidence.length)points.push('Contrastar las barreras y los hallazgos antes de intervenir.');
 if(!(x?.audiences||[]).length)points.push('Definir las audiencias que requieren acompañamiento.');
 if(!activities.length)points.push('Priorizar las acciones que permitirán activar el cambio.');
 const ownership=activities.filter(a=>!a.owner).length;
 if(ownership)points.push('Asignar responsables a '+ownership+' acción'+(ownership===1?'':'es')+' pendiente'+(ownership===1?'':'s')+'.');
 const dates=activities.filter(a=>!a.start||!a.end).length;
 if(dates)points.push('Completar fechas de inicio o cierre en '+dates+' acción'+(dates===1?'':'es')+'.');
 if(!indicators.length)points.push('Definir indicadores para contrastar los resultados del cambio.');
 if(activities.some(a=>a.status==='Pendiente'))points.push('Acordar las condiciones para iniciar las acciones pendientes.');
 if(!points.length){
  points.push('Confirmar que el plan y sus responsables siguen alineados con el resultado esperado.');
  points.push('Definir el próximo momento de revisión de indicadores y barreras.');
 }
 return points.slice(0,5);
}
function planExecMakeSlides(x){
 if(!x)return [];
 const result=planExecResult(x),objective=planExecObjective(x),diagnosis=planExecDiagnosis(x);
 const audiences=x.audiences||[],activities=planExecActivities(x),indicators=planExecIndicators(x);
 const completed=activities.filter(a=>a.status==='Completada').length;
 const active=activities.filter(a=>a.status==='En ejecución').length;
 const hasTarget=result.target!==undefined&&result.target!==null&&String(result.target).trim()!=='';
 const ordered=activities.slice().sort((a,b)=>String(a.start||a.end||'9999').localeCompare(String(b.start||b.end||'9999')));
 const activated=activities.reduce((sum,a)=>sum+a.declared,0);
 const prepared=activities.reduce((sum,a)=>sum+a.prepared,0);
 const laboratory=activities.filter(a=>a.lab).length;
 const titled=(label,text)=>'<div class="plan-section-caption">'+label+'</div><div class="plan-statement">'+text+'</div>';
 const cover='<div class="plan-cover-layout"><div class="plan-cover-eyebrow">HACERLO · FÁBRICA DEL COMPORTAMIENTO</div>'+
  '<h2>'+planExecEsc(x.name||'Iniciativa de cambio')+'</h2>'+
  '<p class="plan-cover-sub">Plan ejecutivo de cambio comportamental</p>'+
  '<div class="plan-cover-rule"></div><p class="plan-cover-objective">'+
  (result.title?planExecEsc(result.title):'Resultado global pendiente de formulación')+'</p>'+
  '<div class="plan-cover-bottom"><span>RDAIM · Implementación</span><span>'+
  ((x.scope==='outside')?'Usuarios y mercado':'Organización y colaboradores')+
  '</span></div></div>';
 const direction='<div class="plan-two-columns">'+
  '<div class="plan-highlight">'+titled('RESULTADO GLOBAL',planExecText(result.title,'Resultado global no registrado'))+
  '<div class="plan-metric-row">'+planExecMetricCell('Línea base',planExecNumber(result.baseline))+
  planExecMetricCell('Meta',planExecNumber(result.target))+planExecMetricCell('Fecha objetivo',result.dueDate?planExecDate(result.dueDate):'—')+
  '</div><div class="plan-small-context">'+planExecText(result.measureType,'Tipo de medición sin definir')+
  (result.unit?' · '+planExecEsc(result.unit):'')+'</div></div>'+
  '<div class="plan-column-card">'+titled('COMPORTAMIENTO OBJETIVO',planExecText(objective,'Comportamiento objetivo no registrado'))+
  '<div class="plan-focus-note">El comportamiento es el puente entre la intervención y el resultado esperado.</div></div></div>';
 const diagnosisBody='<div class="plan-three-grid"><div class="plan-column-card"><div class="plan-section-caption">BARRERAS IDENTIFICADAS</div>'+
  planExecList(diagnosis.barriers.map(a=>a.label),5)+'</div>'+
  '<div class="plan-column-card"><div class="plan-section-caption">FACILITADORES</div>'+
  planExecList(diagnosis.facilitators.map(a=>a.label),5)+'</div>'+
  '<div class="plan-column-card"><div class="plan-section-caption">HALLAZGOS REGISTRADOS</div>'+
  (diagnosis.evidence.length?'<div class="plan-evidence">'+diagnosis.evidence.slice(0,3).map(e=>
   '<div><p>'+planExecEsc(e.text)+'</p>'+(e.source?'<small>'+planExecEsc(e.source)+'</small>':'')+'</div>').join('')+'</div>':
   planExecEmpty('No se han registrado hallazgos'))+'</div></div>'+
  '<p class="plan-note">Factores y hallazgos registrados; su clasificación no equivale necesariamente a una causa comprobada.</p>';
 const groupCount=audiences.filter(a=>a.kind==='Grupo').length;
 const audienceBody='<div class="plan-audience-intro">'+
  planExecKpi(audiences.length,'Audiencias registradas')+planExecKpi((x.audiencePeople||[]).length,'Personas con registro individual')+
  planExecKpi((x.behaviors||[]).length,'Comportamientos diseñados')+'</div>'+
  '<div class="plan-section-caption">AUDIENCIAS DEL CAMBIO</div>'+
  (audiences.length?'<div class="plan-audience-grid">'+audiences.slice(0,8).map(a=>
   '<div class="plan-audience"><strong>'+planExecEsc(a.name||'Audiencia')+'</strong>'+
   '<small>'+planExecEsc(a.kind||'Audiencia')+(a.kind==='Grupo'&&a.population?' · '+planExecEsc(a.population)+' registrados en el grupo':'')+
   '</small></div>').join('')+'</div>'+ (audiences.length>8?'<small class="plan-more">+'+(audiences.length-8)+' audiencias adicionales</small>':''):
   planExecEmpty('Registra audiencias en Diseño para incorporarlas al plan'))+
  '<p class="plan-note">Los registros individuales y las poblaciones de grupos son cifras distintas; no se suman como personas únicas.</p>';
 const actionBody='<div class="plan-activity-stats">'+
  planExecKpi(activities.length,'Acciones')+planExecKpi(active,'En ejecución')+planExecKpi(completed,'Completadas')+'</div>'+
  (ordered.length?'<div class="plan-action-table"><div class="plan-action-head"><span>ACCIÓN</span><span>RESPONSABLE</span><span>ESTADO</span></div>'+
  ordered.slice(0,6).map(a=>'<div class="plan-action-line"><div><strong>'+planExecEsc(a.name)+'</strong>'+
   (a.mechanisms.length?'<small>'+planExecEsc(a.mechanisms.join(' · '))+'</small>':'')+'</div>'+
   '<span>'+planExecText(a.owner,'Pendiente')+'</span>'+planExecStatus(a.status)+'</div>').join('')+
   '</div>'+(ordered.length>6?'<small class="plan-more">+'+(ordered.length-6)+' acciones adicionales en Intervenciones</small>':''):
   planExecEmpty('Aún no se han registrado acciones en Intervenciones'))+
  '<p class="plan-note">Los estados representan ejecución de acciones, no adopción conductual ni impacto.</p>';
 const routeBody='<div class="plan-two-columns"><div class="plan-column-card"><div class="plan-section-caption">CALENDARIO DE EJECUCIÓN</div>'+
  planExecAgenda(activities)+'</div><div class="plan-column-card"><div class="plan-section-caption">MECANISMOS VINCULADOS</div>'+
  '<div class="plan-mechanism-kpis">'+planExecKpi(prepared,'Piezas preparadas')+
  planExecKpi(activated,'Ejecuciones declaradas')+planExecKpi(laboratory,'Experiencias de laboratorio asignadas')+'</div>'+
  '<p class="plan-note">Los datos de activación son registros de preparación o ejecución declarada, no pruebas de recepción o cambio de conducta.</p></div></div>';
 const metricBody='<div class="plan-metrics-heading">'+planExecKpi(indicators.length,'Indicadores registrados')+
  '<div class="plan-metrics-heading-copy">La lectura ejecutiva utiliza la línea base, meta y último valor registrado de cada indicador.</div></div>'+
  (indicators.length?'<div class="plan-measures"><div class="plan-measures-head"><span>INDICADOR</span><span>BASE</span><span>ACTUAL</span><span>META</span></div>'+
   indicators.slice(0,6).map(m=>'<div class="plan-measures-row"><span><strong>'+planExecEsc(m.name)+'</strong>'+
    (m.type?'<small>'+planExecEsc(m.type)+'</small>':'')+'</span>'+
   '<span>'+planExecNumber(m.baseline)+'</span><span>'+planExecNumber(m.current)+'</span><span>'+planExecNumber(m.target)+'</span></div>').join('')+
   '</div>'+(indicators.length>6?'<small class="plan-more">+'+(indicators.length-6)+' indicadores adicionales en HACERLO</small>':''):
   planExecEmpty('No hay indicadores registrados'))+
  '<p class="plan-note">Los valores se muestran en su unidad original; no se promedian escalas heterogéneas.</p>';
 const decisions=planExecDecisions(x,result,diagnosis,activities,indicators);
 const decisionBody='<div class="plan-decision-card"><div class="plan-section-caption">TEMAS PARA LA CONVERSACIÓN CON LÍDERES</div>'+
  '<div class="plan-decision-list">'+decisions.map((d,i)=>'<div class="plan-decision"><span>'+String(i+1).padStart(2,'0')+'</span><p>'+planExecEsc(d)+'</p></div>').join('')+
  '</div><p class="plan-note">Puntos de revisión derivados de registros del plan; no equivalen a acuerdos aprobados por los líderes.</p></div>';
 return [
  {id:'portada',label:'Portada',eyebrow:'01 · PROPÓSITO',title:'Plan de cambio',html:cover,mode:'cover'},
  {id:'norte',label:'Norte del cambio',eyebrow:'02 · RESULTADOS',title:'Qué queremos lograr',html:direction},
  {id:'diagnostico',label:'Diagnóstico',eyebrow:'03 · EVIDENCIA',title:'Qué está influyendo',html:diagnosisBody},
  {id:'audiencias',label:'Audiencias',eyebrow:'04 · DISEÑO',title:'A quiénes movilizamos',html:audienceBody},
  {id:'acciones',label:'Intervenciones',eyebrow:'05 · IMPLEMENTACIÓN',title:'Qué vamos a hacer',html:actionBody},
  {id:'ruta',label:'Ruta de ejecución',eyebrow:'06 · ACTIVACIÓN',title:'Cuándo y cómo actuaremos',html:routeBody},
  {id:'medicion',label:'Medición',eyebrow:'07 · MEDICIÓN',title:'Cómo conoceremos el avance',html:metricBody},
  {id:'decisiones',label:'Decisiones',eyebrow:'08 · GOBERNANZA',title:'Qué debemos acordar',html:decisionBody}
 ];
}
function planExecSlideHTML(slide,index,total,options={}){
 return '<article class="plan-slide '+(slide.mode==='cover'?'plan-slide-cover':'')+
  '" data-plan-slide="'+index+'" aria-label="Diapositiva '+(index+1)+' de '+total+'">'+
  '<div class="plan-slide-top"><span class="plan-slide-kicker">'+planExecEsc(slide.eyebrow)+'</span>'+
  '<span class="plan-slide-index">'+String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')+'</span></div>'+
  (slide.mode==='cover'?'':'<h2 class="plan-slide-title">'+planExecEsc(slide.title)+'</h2>')+
  '<div class="plan-slide-body">'+slide.html+'</div>'+
  '<footer class="plan-slide-foot"><span>HACERLO · Fábrica del Comportamiento</span>'+
  '<span>Plan de cambio · '+planExecEsc(slide.label)+'</span></footer></article>';
}
function planExecPreviewPage(x){
 const slides=planExecMakeSlides(x);
 if(!slides.length)return '<section class="panel">Selecciona una iniciativa para construir su plan de cambio.</section>';
 planExecSlideIndex=Math.min(planExecSlideIndex,slides.length-1);
 const ready=[!!planExecResult(x).title,!!planExecObjective(x),(x.diagnosisFindings||[]).length>0||(Object.keys(x.behaviorDiagnosis||{}).length>0),(x.audiences||[]).length>0,(x.actions||[]).length>0,(x.indicators||[]).length>0].filter(Boolean).length;
 return '<div class="plan-exec-page">'+
  hcxHero('Plan de cambio',x,'Una presentación ejecutiva construida con la información registrada en tu iniciativa.','RDAIM · IMPLEMENTACIÓN','◈')+
  '<section class="plan-exec-intro"><div><span class="plan-overline">PLAN EJECUTIVO · ACTUALIZACIÓN EN TIEMPO REAL</span>'+
  '<h2>Tu estrategia, lista para presentar</h2><p>Del resultado esperado a las intervenciones y las decisiones para líderes. Sin volver a diligenciar información.</p>'+
  '<div class="plan-progress"><span>'+ready+'/6 fuentes principales con información</span>'+
  '<div class="plan-progress-track"><span style="width:'+(ready/6*100)+'%"></span></div></div></div>'+
  '<div class="plan-exec-actions"><button type="button" class="primary" onclick="planExecOpenPresentation()">▶ Presentar</button>'+
  '<button type="button" class="secondary" onclick="planExecPrint()">Imprimir / Guardar PDF</button></div></section>'+
  '<div class="plan-overview-heading"><div><span class="plan-overline">HISTORIA DEL CAMBIO</span><h3>Vista previa de las 8 diapositivas</h3></div>'+
  '<span>La presentación refleja los últimos datos guardados</span></div>'+
  '<div class="plan-slide-grid">'+slides.map((slide,index)=>'<button type="button" class="plan-thumb" onclick="planExecOpenPresentation('+index+')" aria-label="Presentar '+planExecEsc(slide.label)+'">'+
  '<div class="plan-thumb-head"><span>'+String(index+1).padStart(2,'0')+'</span><span>↗</span></div>'+
  '<div class="plan-thumb-content"><span>'+planExecEsc(slide.eyebrow)+'</span><strong>'+
  planExecEsc(index===0?(x.name||slide.title):slide.title)+'</strong><small>'+planExecEsc(slide.label)+'</small></div>'+
  '</button>').join('')+'</div>'+
  '<p class="plan-exec-note">Este plan es una vista de lectura: no modifica resultados, diagnósticos, acciones ni indicadores. Los campos pendientes se señalan sin inventar datos. Las pantallas contienen información organizacional; preséntalas solo ante audiencias autorizadas.</p></div>';
}
function planExecEnsureOverlay(){
 let root=document.getElementById('plan-exec-overlay');
 if(!root){root=document.createElement('div');root.id='plan-exec-overlay';root.className='plan-exec-overlay';root.setAttribute('role','dialog');
 root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Presentación del plan de cambio');document.body.appendChild(root);}
 return root;
}
function planExecOpenPresentation(index=0){
 const x=typeof current==='function'?current():null;
 if(!x)return;
 const slides=planExecMakeSlides(x);
 if(!slides.length)return;
 planExecSlideIndex=Number.isInteger(index)?Math.max(0,Math.min(index,slides.length-1)):0;
 planExecPresentationOpen=true;
 planExecRenderOverlay();
 if(!planExecKeyboardBound){document.addEventListener('keydown',planExecKeydown);planExecKeyboardBound=true;}
 const root=document.getElementById('plan-exec-overlay');
 root?.querySelector('.plan-control-close')?.focus();
 const body=document.body;if(body)body.classList.add('plan-exec-active');
}
function planExecRenderOverlay(){
 if(!planExecPresentationOpen)return;
 const x=typeof current==='function'?current():null,root=planExecEnsureOverlay(),slides=planExecMakeSlides(x);
 if(!slides.length)return planExecClosePresentation();
 planExecSlideIndex=Math.max(0,Math.min(planExecSlideIndex,slides.length-1));
 root.innerHTML='<div class="plan-present-head"><div><span>HACERLO</span><strong>'+
  planExecEsc(x.name||'Plan de cambio')+'</strong></div><div class="plan-controls">'+
  '<button type="button" onclick="planExecPrint()">Guardar PDF</button>'+
  '<button type="button" onclick="planExecFullscreen()">Pantalla completa</button>'+
  '<button class="plan-control-close" type="button" onclick="planExecClosePresentation()">Cerrar ×</button></div></div>'+
  '<div class="plan-stage">'+planExecSlideHTML(slides[planExecSlideIndex],planExecSlideIndex,slides.length)+'</div>'+
  '<div class="plan-present-foot"><div class="plan-present-dots">'+slides.map((s,i)=>
  '<button type="button" title="'+planExecEsc(s.label)+'" class="'+(i===planExecSlideIndex?'active':'')+
  '" onclick="planExecShowSlide('+i+')" aria-label="Ir a diapositiva '+(i+1)+'"></button>').join('')+'</div>'+
  '<div class="plan-present-navigation"><button type="button" onclick="planExecShowSlide('+(planExecSlideIndex-1)+')"'+
  (planExecSlideIndex===0?' disabled':'')+'>← Anterior</button>'+
  '<span>'+String(planExecSlideIndex+1)+' de '+String(slides.length)+'</span>'+
  '<button type="button" onclick="planExecShowSlide('+(planExecSlideIndex+1)+')"'+
  (planExecSlideIndex===slides.length-1?' disabled':'')+'>Siguiente →</button></div></div>';
}
function planExecShowSlide(index){
 if(!planExecPresentationOpen)return;
 const count=planExecMakeSlides(current()).length;
 if(!Number.isInteger(index)||index<0||index>=count)return;
 planExecSlideIndex=index;planExecRenderOverlay();
}
function planExecClosePresentation(){
 planExecPresentationOpen=false;
 const overlay=document.getElementById('plan-exec-overlay');
 if(document.fullscreenElement===overlay&&document.exitFullscreen)void document.exitFullscreen();
 overlay?.remove();document.body?.classList.remove('plan-exec-active');
 if(planExecKeyboardBound){document.removeEventListener('keydown',planExecKeydown);planExecKeyboardBound=false;}
 document.querySelector('.plan-exec-actions .primary')?.focus();
}
function planExecFullscreen(){
 const root=document.getElementById('plan-exec-overlay');
 if(!root)return;
 if(document.fullscreenElement===root){if(document.exitFullscreen)void document.exitFullscreen();}
 else if(root.requestFullscreen){void root.requestFullscreen().catch(()=>{});}
}
function planExecKeydown(event){
 if(!planExecPresentationOpen)return;
 const name=String(event?.target?.tagName||'').toLowerCase();
 if(['input','textarea','select'].includes(name))return;
 if(event.key==='Escape'){event.preventDefault();planExecClosePresentation();}
 else if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();planExecShowSlide(planExecSlideIndex+1);}
 else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();planExecShowSlide(planExecSlideIndex-1);}
 else if(event.key==='Home'){event.preventDefault();planExecShowSlide(0);}
 else if(event.key==='End'){event.preventDefault();planExecShowSlide(planExecMakeSlides(current()).length-1);}
}
function planExecPrint(){
 const x=typeof current==='function'?current():null;
 if(!x)return;
 document.getElementById('plan-exec-print')?.remove();
 const slides=planExecMakeSlides(x);
 const root=document.createElement('div');
 root.id='plan-exec-print';root.className='plan-exec-print';
 root.innerHTML=slides.map((s,i)=>planExecSlideHTML(s,i,slides.length)).join('');
 document.body.appendChild(root);
 const cleanup=()=>{root.remove();window.removeEventListener('afterprint',cleanup)};
 window.addEventListener('afterprint',cleanup,{once:true});
 window.print();
}
