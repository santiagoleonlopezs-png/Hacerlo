/* HACERLO V2 · Vista guiada de pensamiento sistémico.
   Capa de lectura; conserva condiciones, mecanismos, hipótesis y eventos del motor V2.
   NO supone relaciones causales ni cuantifica impactos automáticamente. */
let sysVisualEditorOpen=false;
function sysVisualOpen(tab='mapa',conditionId=null){
  sysTab=['mapa','mecanismos','hipotesis'].includes(tab)?tab:'mapa';
  if(conditionId!==null)sysSelected=conditionId;
  sysVisualEditorOpen=true;
  render();
  const element=document.getElementById('sys-advanced-editor');
  if(element)element.open=true;
}
function sysVisualHistory(){
  sysVisualEditorOpen=true;
  sysCompare=true;
  render();
  const element=document.getElementById('sys-advanced-editor');
  if(element)element.open=true;
}
function sysVisualScope(s,c){
  return !c.behaviorId||String(c.behaviorId)===String(s.selectedBehavior||'');
}
function sysVisualSummary(x,s){
  const conditions=(s.conditions||[]).filter(c=>sysVisualScope(s,c));
  const visible=conditions.filter(c=>c.state!=='Resuelta');
  const positive=visible.filter(c=>c.orientation==='Favorece');
  const negative=visible.filter(c=>c.orientation==='Dificulta');
  const other=visible.filter(c=>c.orientation!=='Favorece'&&c.orientation!=='Dificulta');
  const ids=new Set(conditions.map(c=>String(c.id)));
  const mechanisms=(s.mechanisms||[]).filter(m=>ids.has(String(m.conditionId)));
  const hypotheses=(s.hypotheses||[]).filter(h=>ids.has(String(h.conditionId)));
  const allEvents=s.events||[];
  const events=sysMoment==='Todos'?allEvents:allEvents.filter(e=>e.moment===sysMoment);
  return {conditions,visible,positive,negative,other,mechanisms,hypotheses,events,
    unassignedEvents:allEvents.filter(e=>!e.moment).length};
}
function sysVisualCard(title,explanation,list,theme,tab,empty){
  return '<section class="sv-card sv-'+theme+'"><div class="sv-card-top">'+
    '<span class="sv-card-icon">'+({positive:'↗',negative:'↘',mechanisms:'⟳',hypotheses:'◇'}[theme]||'◇')+'</span>'+
    '<span class="sv-card-count">'+list.length+' registro'+(list.length===1?'':'s')+'</span></div>'+
    '<h3>'+title+'</h3><p>'+explanation+'</p>'+
    '<div class="sv-mini-list">'+
      (list.length?list.slice(0,3).map(item=>
        '<button type="button" class="sv-mini-item" onclick="sysVisualOpen(&quot;'+tab+'&quot;,'+
        (tab==='mapa'?'&quot;'+safe(String(item.id))+'&quot;':'null')+')"><span>'+safe(item.name||item.statement||'Sin nombre')+
        '</span><small>'+safe(item.state||item.type||item.status||'Registrado')+'</small></button>'
      ).join(''):'<p class="sv-empty">'+empty+'</p>')+
    '</div><button type="button" class="sv-link" onclick="sysVisualOpen(&quot;'+tab+'&quot;)">Explorar y registrar <span aria-hidden="true">↗</span></button></section>';
}
function sysVisualMechanismPreview(m,s){
  const c=(s.conditions||[]).find(c=>String(c.id)===String(m.conditionId));
  return '<div class="sv-mechanism"><div class="sv-mechanism-type">'+safe(m.type||'Por clasificar')+
    ' · '+safe(m.certainty||'Hipótesis')+'</div><strong>'+safe(m.name||'Mecanismo')+'</strong>'+
    '<p><span>'+safe(c?.name||'Condición sin vínculo')+'</span><span class="sv-dotted">····</span>'+
    '<span>'+safe(m.name||'Mecanismo')+'</span></p>'+
    '<small>Relación registrada como hipótesis o evidencia; el sentido causal debe contrastarse.</small></div>';
}
function renderSystemVisualPage(x,s){
  const items=sysVisualSummary(x,s);
  const behaviors=sysBehaviorList(x),selected=behaviors.find(b=>b.id===s.selectedBehavior);
  const moments=['Antes','Durante','Después','Todos'];
  const indicators=[
    ['Condiciones activas',items.visible.length],
    ['Que dificultan',items.negative.length],
    ['Mecanismos registrados',items.mechanisms.length],
    ['Hipótesis para contrastar',items.hypotheses.length]
  ];
  const history=items.events.slice(-6).reverse();
  return '<div class="sv-shell">'+
    '<header class="sv-hero"><div><span class="sv-eyebrow">ANÁLISIS · SISTEMAS Y COMPORTAMIENTO · '+safe(x.name||'Iniciativa')+'</span>'+
      '<h1>¿Qué está sosteniendo este resultado?</h1>'+
      '<p>Explora las condiciones del sistema, identifica tensiones y contrasta cómo cambian después de tus decisiones.</p>'+
      '<span class="sv-tag">Lectura basada en evidencia e hipótesis · No es un pronóstico causal</span></div>'+
      '<div class="sv-orbit" aria-hidden="true"><span>◎</span><i>↗</i><b>⟳</b></div></header>'+
    '<section class="sv-focus"><div class="sv-focus-top"><div><small>01 · QUÉ ESTAMOS COMPRENDIENDO</small>'+
      '<h2>Selecciona el comportamiento y el momento</h2></div>'+
      '<button type="button" class="sv-outline" onclick="sysVisualOpen(&quot;mapa&quot;)">+ Registrar condición</button></div>'+
      '<div class="sv-focus-grid"><label>Comportamiento observable<select onchange="sysBehaviorGo(this.value)">'+
      (behaviors.length?behaviors.map(b=>'<option value="'+safe(b.id)+'"'+(b.id===s.selectedBehavior?' selected':'')+'>'+safe(b.name)+'</option>').join(''):'<option value="">Primero registra un comportamiento en Diseño</option>')+
      '</select></label><div><span class="sv-moment-caption">Momento del análisis</span><div class="sv-moments" role="group" aria-label="Momento del análisis">'+
      moments.map(m=>'<button type="button" aria-pressed="'+(sysMoment===m)+'" class="'+(sysMoment===m?'active':'')+
        '" onclick="sysMomentGo(&quot;'+m+'&quot;)">'+m+'</button>').join('')+'</div></div></div>'+
      '<p class="sv-note">Antes, Durante y Después filtran los eventos que se registren con ese momento. El histórico previo sin clasificación se conserva en «Todos».</p></section>'+
    '<div class="sv-metrics">'+indicators.map(([label,n],i)=>
      '<div class="sv-metric"><strong>'+n+'</strong><span>'+label+'</span><div class="sv-metric-line sv-color-'+i+'"></div></div>').join('')+'</div>'+
    '<section class="sv-reading"><div class="sv-section-title"><div><small>02 · LEER EL SISTEMA</small><h2>¿Qué empuja y qué frena el comportamiento?</h2></div>'+
      '<span class="sv-context">Basado en registros de la iniciativa · '+safe(selected?.name||'Sin comportamiento seleccionado')+'</span></div>'+
      '<div class="sv-reading-grid">'+
       sysVisualCard('Lo que favorece','Condiciones que pueden facilitar la conducta.',items.positive,'positive','mapa','Todavía no hay facilitadores registrados.')+
       sysVisualCard('Lo que dificulta','Barreras o restricciones que siguen activas.',items.negative,'negative','mapa','Aún no hay barreras registradas.')+
       sysVisualCard('Lo que mantiene el patrón','Bucles, incentivos, demoras y otros mecanismos registrados.',items.mechanisms,'mechanisms','mecanismos','Explora qué mecanismos podrían sostener la situación.')+
       sysVisualCard('Lo que debemos contrastar','Hipótesis y decisiones documentadas, no soluciones automáticas.',items.hypotheses,'hypotheses','hipotesis','Formula hipótesis vinculadas a las condiciones.')+
      '</div></section>'+
    '<section class="sv-pattern"><div class="sv-section-title"><div><small>03 · RELACIONES Y PATRONES</small>'+
      '<h2>¿Cómo se conecta lo que está ocurriendo?</h2></div>'+
      '<button type="button" class="sv-outline" onclick="sysVisualOpen(&quot;mecanismos&quot;)">Explorar mecanismos</button></div>'+
      (items.mechanisms.length?'<div class="sv-pattern-grid">'+items.mechanisms.slice(0,4).map(m=>sysVisualMechanismPreview(m,s)).join('')+'</div>':
       '<div class="sv-pattern-empty"><span>⟳</span><strong>El sistema todavía no tiene mecanismos documentados</strong>'+
       '<p>Registra una condición y explora relaciones de refuerzo, compensación, dependencia o demoras. No las inferiremos sin evidencia.</p>'+
       '<button type="button" class="sv-primary" onclick="sysVisualOpen(&quot;mecanismos&quot;)">Documentar un mecanismo</button></div>')+
      '<p class="sv-note">Un mecanismo registrado representa una explicación a contrastar. HACERLO no asume que todas las conexiones forman bucles causales.</p></section>'+
    '<section class="sv-evolution"><div class="sv-section-title"><div><small>04 · EVOLUCIÓN DEL SISTEMA</small>'+
      '<h2>¿Qué ha cambiado con nuestras decisiones?</h2></div>'+
      '<button type="button" class="sv-outline" onclick="sysVisualHistory()">Comparar fechas</button></div>'+
      '<div class="sv-event-list">'+
      (history.length?history.map(e=>'<div class="sv-event"><span class="sv-event-dot"></span><div><small>'+safe(e.date?.slice(0,10)||'Sin fecha')+
        ' · '+safe(e.moment||'Momento no clasificado')+'</small><strong>'+safe(e.kind||'Evento')+'</strong>'+
        '<p>'+safe(e.detail||'Registro sin descripción')+'</p></div></div>').join(''):
       '<p class="sv-note">No hay observaciones fechadas para este momento. Registra un cambio o consulta «Todos».</p>')+'</div>'+
      '<p class="sv-note">El historial conserva registros previos. Si una condición permanece, verla repetida no demuestra que una intervención haya funcionado.</p></section>'+
    '<section class="sv-action-band"><div><h2>Del entendimiento a una decisión contrastable</h2>'+
      '<p>Relaciona hipótesis con iniciativas de Implementación y verifica después si cambiaron las condiciones del sistema.</p></div>'+
      '<button type="button" class="sv-primary" onclick="sysVisualOpen(&quot;hipotesis&quot;)">Formular o revisar hipótesis ↗</button></section>'+
    '</div>';
}
