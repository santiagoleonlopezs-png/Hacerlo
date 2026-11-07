/* HACERLO V2.18: Inicio con RDAIM y señales trazables. */
const CI_STAGES=[
 ['R','Resultados','Definir el resultado esperado'],
 ['D','Diseño','Definir comportamientos y audiencias'],
 ['A','Análisis','Comprender las dinámicas del sistema'],
 ['I','Implementación','Movilizar acciones'],
 ['M','Medición','Contrastar resultados y aprender']
];
function ciGoProjects(){go('Iniciativas')}
function ciOpenInitiative(id,target){
 const item=(db.initiatives||[]).find(x=>String(x.id)===String(id));
 if(!item)return;
 db.selected=item.id;save();go(target);
}
function ciOpenSignal(button){
 const id=button.getAttribute('data-ci-id'),target=button.getAttribute('data-ci-target');
 if(['Indicadores','Intervenciones'].includes(target))ciOpenInitiative(id,target);
}
function ciOpenStage(step){
 if(!Number.isInteger(step)||step<0||step>=5)return;
 const all=db.initiatives||[];
 if(!all.length){go('Iniciativas');if(typeof pfToggleCreate==='function')pfToggleCreate(true);return}
 if(!all.some(i=>i.id===db.selected)){db.selected=all[0].id;save()}
 phase=step;expandedNavStep=step;go('RDAIM');
}
function ciDateKey(v){const s=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:''}
function ciDayLabel(v){
 const key=ciDateKey(v);if(!key)return 'Sin fecha';
 const d=new Date(key+'T12:00:00');
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short'}).format(d):'Sin fecha';
}
function ciLocalDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function ciSignals(){
 const now=new Date(),today=ciLocalDate(now),until=ciLocalDate(new Date(now.getFullYear(),now.getMonth(),now.getDate()+14)),result=[];
 for(const i of(db.initiatives||[])){
  for(const a of(i.actions||[])){
   if(normalizedStatus(a.status)==='Completada')continue;
   const date=ciDateKey(a.end);if(!date||date>until)continue;
   const overdue=date<today;
   result.push({id:i.id,target:'Intervenciones',category:overdue?'overdue':'upcoming',
    label:overdue?'Acción vencida':date===today?'Vence hoy':'Próximo vencimiento',title:String(a.name||'Acción sin nombre'),
    context:String(i.name||''),detail:ciDayLabel(date)+(a.owner?' · '+String(a.owner):''),rank:overdue?0:1,date});
  }
  for(const k of(i.indicators||[])){
   if(k.baseline!==null&&k.baseline!==undefined&&String(k.baseline).trim()!=='')continue;
   result.push({id:i.id,target:'Indicadores',category:'baseline',label:'Falta línea base',
    title:String(k.name||'Indicador sin nombre'),context:String(i.name||''),
    detail:'Definir medición inicial',rank:2,date:''});
  }
 }
 return result.sort((a,b)=>a.rank-b.rank||(a.date||'').localeCompare(b.date||'')||a.context.localeCompare(b.context,'es'));
}
function ciEvidence(){
 const counts={barriers:0,facilitators:0,ambivalent:0,findings:0,series:0};
 for(const i of(db.initiatives||[])){
  counts.findings+=(i.diagnosisFindings||[]).length;
  for(const f of Object.values(i.behaviorDiagnosis||{})){
   const role=String(f?.role||'').toLocaleLowerCase('es');
   if(role==='barrera')counts.barriers++;
   else if(role==='facilitador')counts.facilitators++;
   else if(role==='ambivalente')counts.ambivalent++;
  }
  for(const ind of(i.indicators||[])){
   const good=(Array.isArray(ind.history)?ind.history:[]).filter(m=>m&&m.value!==null&&m.value!==undefined&&m.value!==''&&Number.isFinite(Number(m.value)));
   if(good.length>=2)counts.series++;
  }
 }
 return counts;
}
function ciSignalRow(s){
 return '<button class="ci-signal ci-'+s.category+'" type="button" data-ci-id="'+safe(String(s.id))+'" data-ci-target="'+safe(s.target)+'" onclick="ciOpenSignal(this)">'+
 '<span class="ci-signal-type">'+safe(s.label)+'</span><span class="ci-signal-body"><strong>'+safe(s.title)+'</strong><small>'+safe(s.context)+' · '+safe(s.detail)+'</small></span>'+
 '<span class="ci-signal-arrow" aria-hidden="true">↗</span></button>';
}
/* Ejecución transversal: solo acciones realmente iniciadas y aún sin completar.
   No interpretar un plazo futuro o un estado "Pendiente" como prueba de ejecución. */
function ciActionsRunningToday(today=ciLocalDate(new Date())){
 const rows=[];
 for(const initiative of(db.initiatives||[])){
  (initiative.actions||[]).forEach((action,index)=>{
   if(normalizedStatus(action.status)!=='En ejecución')return;
   const start=ciDateKey(action.start),end=ciDateKey(action.end);
   if(!start||start>today)return;
   rows.push({
    initiativeId:initiative.id,initiativeName:String(initiative.name||'Sin nombre'),
    index,name:String(action.name||'Acción sin título'),owner:String(action.owner||'Sin responsable'),
    start,end,overdue:!!end&&end<today,finishesToday:end===today
   });
  });
 }
 return rows.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||
   (a.end||'9999-12-31').localeCompare(b.end||'9999-12-31')||
   a.initiativeName.localeCompare(b.initiativeName,'es')||
   a.name.localeCompare(b.name,'es'));
}
function ciRunningActionRow(a){
 const description=a.overdue?'Fecha de fin vencida':a.finishesToday?'Finaliza hoy':'En ejecución';
 return '<button class="ci-running-row'+(a.overdue?' is-late':'')+'" type="button"'+
  ' data-ci-id="'+safe(String(a.initiativeId))+'" data-ci-target="Intervenciones" onclick="ciOpenSignal(this)"'+
  ' aria-label="Abrir acción '+safe(a.name)+' de '+safe(a.initiativeName)+'">'+
  '<span class="ci-running-status'+(a.overdue?' is-late':'')+'">'+
    (a.overdue?'!':'↗')+'</span>'+
  '<span class="ci-running-info"><strong>'+safe(a.name)+'</strong>'+
    '<span class="ci-running-origin">'+safe(a.initiativeName)+'</span></span>'+
  '<span class="ci-running-details"><span>'+safe(a.owner)+'</span>'+
   '<small>Inicio '+ciDayLabel(a.start)+' · Fin '+(a.end?ciDayLabel(a.end):'Sin definir')+'</small></span>'+
  '<span class="ci-running-state'+(a.overdue?' is-late':'')+'">'+description+'</span>'+
  '<span class="ci-running-arrow" aria-hidden="true">↗</span></button>';
}
function ciRunningTodayPanel(){
 const today=ciLocalDate(new Date()),items=ciActionsRunningToday(today);
 const projects=new Set(items.map(i=>String(i.initiativeId))).size,late=items.filter(i=>i.overdue).length;
 const visible=items.slice(0,8),extra=items.slice(8);
 const formatted=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',year:'numeric'})
  .format(new Date(today+'T12:00:00'));
 return '<section class="ci-running" aria-label="Acciones en curso hoy · Todas las iniciativas">'+
  '<div class="ci-running-head"><div><span class="ci-eyebrow">EJECUCIÓN · PORTAFOLIO</span>'+
   '<h3>Acciones en curso <span>· Hoy</span></h3>'+
   '<p>Consolidadas de todas las iniciativas. Solo acciones en ejecución que ya tienen fecha de inicio.</p></div>'+
   '<div class="ci-running-summary"><strong>'+items.length+'</strong><span>en curso</span>'+
     '<i></i><strong>'+projects+'</strong><span>iniciativas</span>'+
     (late?'<i></i><strong class="ci-running-late-count">'+late+'</strong><span>vencidas</span>':'')+
   '</div></div>'+
  (items.length?
    '<div class="ci-running-list">'+visible.map(ciRunningActionRow).join('')+'</div>'+
    (extra.length?'<details class="ci-running-more"><summary>Ver las '+extra.length+' acciones restantes <span aria-hidden="true">⌄</span></summary>'+
     '<div class="ci-running-list">'+extra.map(ciRunningActionRow).join('')+'</div></details>':''):
    '<div class="ci-running-empty"><span aria-hidden="true">✓</span><div><strong>No hay acciones en curso registradas para hoy.</strong>'+
     '<small>Este espacio se actualizará cuando una acción tenga fecha de inicio y estado «En ejecución».</small></div></div>')+
  '<p class="ci-caveat">Corte: '+safe(formatted)+'. Las acciones completadas, futuras o pendientes no se incluyen. Las vencidas permanecen visibles hasta que se cierre su ejecución.</p>'+
  '</section>';
}
function renderIntelligenceHome(){
 const all=db.initiatives||[],signals=ciSignals(),e=ciEvidence();
 const behaviors=all.reduce((n,i)=>n+(i.behaviors||[]).length,0);
 const audiences=all.reduce((n,i)=>n+(i.audiences||[]).length,0);
 const running=all.reduce((n,i)=>n+(i.actions||[]).filter(a=>normalizedStatus(a.status)==='En ejecución').length,0);
 const total=e.barriers+e.facilitators+e.ambivalent;
 const kpis=[['target','Comportamientos objetivo',behaviors,'Registrados en iniciativas'],
 ['people','Audiencias caracterizadas',audiences,'Registros por iniciativa, no personas únicas'],
 ['activity','Acciones en ejecución',running,'Según estados registrados'],
 ['search','Hallazgos registrados',e.findings,'Evidencia registrada en diagnóstico']];
 const steps=CI_STAGES.map(([letter,name,description],i)=>
 '<button type="button" class="ci-stage ci-stage-'+i+'" onclick="ciOpenStage('+i+')">'+
 '<span class="ci-stage-letter">'+letter+'</span><span class="ci-stage-copy"><strong>'+name+'</strong><small>'+description+'</small></span>'+
 '<span class="ci-stage-next" aria-hidden="true">↗</span></button>').join('');
 const factor=(name,count,style)=>'<div class="ci-factor"><div><span>'+name+'</span><strong>'+count+'</strong></div>'+
 '<div class="ci-factor-track"><span class="'+style+'" style="width:'+(total?Math.round(count*100/total):0)+'%"></span></div></div>';
 return '<div class="ci-home">'+
 '<div class="ci-heading"><div><span class="ci-eyebrow">HACERLO · CENTRO DE INTELIGENCIA</span><h2>Panorama del comportamiento</h2>'+
 '<p>Comprende las señales del sistema y conecta la evidencia con tus decisiones.</p></div><span class="ci-heading-symbol">'+pfIcon('target')+'</span></div>'+
 '<section class="ci-cycle" aria-label="Marco RDAIM"><div class="ci-section-head"><div><span class="ci-eyebrow">NUESTRO MARCO</span>'+
 '<h3>RDAIM · Del resultado a la evidencia</h3></div><span class="ci-cycle-hint">Explora cada etapa</span></div>'+
 '<div class="ci-cycle-stages">'+steps+'</div>'+
 '<div class="ci-cycle-foot"><span aria-hidden="true">↻</span> La medición retroalimenta el diseño y las decisiones.</div></section>'+
 '<div class="ci-kpis">'+kpis.map(([icon,label,value,subtitle])=>
 '<div class="ci-kpi"><span class="ci-kpi-icon">'+pfIcon(icon)+'</span><div><small>'+label+'</small>'+
 '<strong>'+Number(value).toLocaleString('es-CO')+'</strong><span>'+subtitle+'</span></div></div>').join('')+'</div>'+
 '<div class="ci-layout"><section class="ci-panel ci-attention"><div class="ci-panel-head"><div><span class="ci-eyebrow">ACTUAR A TIEMPO</span>'+
 '<h3>Qué necesita atención</h3></div><span class="ci-panel-count">'+signals.length+' señales</span></div>'+
 (signals.length?'<div class="ci-signal-list">'+signals.slice(0,6).map(ciSignalRow).join('')+'</div>'+
 (signals.length>6?'<p class="ci-caveat">Se muestran las primeras seis señales por urgencia.</p>':''):
 '<div class="ci-zero">'+pfIcon('check')+'<div><strong>Sin alertas en los registros actuales.</strong>'+
 '<small>No hay acciones vencidas, próximas en 14 días ni indicadores sin línea base.</small></div></div>')+
 '<p class="ci-caveat">Estas señales provienen de estados, fechas y líneas base registrados; no son predicciones.</p></section>'+
 '<section class="ci-panel ci-evidence"><div class="ci-panel-head"><div><span class="ci-eyebrow">EVIDENCIA DISPONIBLE</span>'+
 '<h3>Lectura del sistema</h3></div></div>'+
 '<div class="ci-evidence-metrics"><div><small>Indicadores con 2+ mediciones</small><strong>'+e.series+'</strong></div>'+
 '<div><small>Factores clasificados</small><strong>'+total+'</strong></div></div>'+
 (total?'<div class="ci-factors">'+factor('Barreras',e.barriers,'barrier')+factor('Facilitadores',e.facilitators,'helper')+
 factor('Ambivalentes',e.ambivalent,'ambivalent')+'</div>':
 '<p class="ci-evidence-empty">Todavía no hay factores clasificados como barreras, facilitadores o ambivalentes.</p>')+
 '<p class="ci-caveat">Los conteos no indican magnitud del efecto ni demuestran causalidad.</p></section></div>'+
 '<div class="ci-next"><div><span class="ci-eyebrow">SIGUIENTE PASO</span><h3>De la evidencia a la decisión</h3>'+
 '<p>Profundiza en los sistemas, revisa las mediciones o continúa con la gestión de iniciativas.</p></div>'+
 '<div class="ci-next-actions"><button type="button" onclick="ciGoProjects()">Ver iniciativas ↗</button>'+
 '<button type="button" onclick="ciOpenStage(2)">Explorar análisis ↗</button>'+
 '<button type="button" onclick="ciOpenStage(4)">Ir a medición ↗</button></div></div>'+ciRunningTodayPanel()+atPanel('all')+'</div>';
}
