/* HACERLO V2 — Home de audiencias. Capa de presentación: respeta importación,
   asignaciones, formularios, grafo, segmentación y seguimiento existentes. */
(function () {
  'use strict';
  if (typeof audienceManagementPage !== 'function' || typeof audienceRegistration !== 'function') return;

  var originalRegistration = audienceRegistration;
  var QUADRANTS = [
    {key:'Q1',label:'Colaborar',note:'Alta incidencia · Alto interés',tone:'teal'},
    {key:'Q2',label:'Consultar',note:'Alta incidencia · Menor interés',tone:'blue'},
    {key:'Q3',label:'Informar',note:'Menor incidencia · Menor interés',tone:'slate'},
    {key:'Q4',label:'Involucrar',note:'Menor incidencia · Alto interés',tone:'amber'}
  ];

  function esc(s){return safe(s == null ? '' : s);}
  function number(n){return Number(n||0).toLocaleString('es-CO');}
  function jump(selector){
    var target=document.querySelector(selector);
    if (target) target.scrollIntoView({behavior:'smooth',block:'start'});
  }
  window.audHomeImport=function(){
    audienceTab='registro';audienceEditing=null;render();
    var form=document.querySelector('#ah-aud-setup .aud-setup details:nth-of-type(2)');
    if(form){form.open=true;jump('#ah-aud-setup .aud-setup details:nth-of-type(2)');}
  };
  window.audHomeAll=function(){
    audienceTab='registro';render();
    var list=document.querySelector('#ah-aud-setup .aud-setup details:nth-of-type(3)');
    if(list){list.open=true;jump('#ah-aud-setup .aud-setup details:nth-of-type(3)');}
  };
  window.audHomeEdit=function(id){
    audienceTab='registro';audienceEditing=id;audQuickCreateOpen=true;render();
    var form=document.querySelector('#ah-aud-setup .aud-setup details:first-of-type');
    if(form){form.open=true;jump('#ah-aud-setup .aud-setup details:first-of-type');}
  };
  window.audHomePeople=function(){
    audienceTab='registro';audPeopleExpanded=true;render();
    var people=document.querySelector('#ah-aud-setup .aud-people-panel details');
    if(people){people.open=true;jump('#ah-aud-setup .aud-people-panel');}
  };
  window.audHomeTab=function(tab){
    audienceTab=tab==='mapa'?'mapa':'registro';
    render();
    jump('#ah-workmode');
  };

  window.audienceRegistration=function(x){
    return '<div class="ah-workspace" id="ah-aud-setup">'+originalRegistration(x)+'</div>';
  };

  window.audienceManagementPage=function(x){
    audInitPeopleUI(x);
    if(typeof graphSyncAudiences==='function'&&graphSyncAudiences(x))save();
    var audiences=x.audiences||[], people=x.audiencePeople||[], behaviors=x.behaviors||[];
    var individualClassified=people.filter(function(p){return !!audQuadrant(p);}).length;
    var classifiedPct=people.length?Math.round(individualClassified*100/people.length):null;
    var linked=behaviors.filter(function(b){
      return (b.audienceIds||[]).some(function(id){return audiences.some(function(a){return String(a.id)===String(id);});});
    }).length;
    var assigned={};
    people.forEach(function(p){if(p.audienceId!=null){var k=String(p.audienceId);assigned[k]=(assigned[k]||0)+1;}});
    var qsource=people.length?people:audiences;
    var qcounts={Q1:0,Q2:0,Q3:0,Q4:0,none:0};
    qsource.forEach(function(item){var key=audQuadrant(item);if(key)qcounts[key]++;else qcounts.none++;});
    var total=qsource.length||1;
    var scopeLabel=people.length?'personas':'audiencias';
    var cards=audiences.slice(0,6).map(function(a,i){
      var assignedCount=assigned[String(a.id)]||0;
      var q=audQuadrant(a);
      var group=q&&QUADRANTS.find(function(c){return c.key===q;});
      var population=a.kind==='Grupo'&&Number(a.population)>0?' · Población '+number(a.population):'';
      var share=people.length?Math.min(100,assignedCount*100/people.length):0;
      return '<button type="button" class="ah-audience-card" onclick="audHomeEdit('+esc(JSON.stringify(String(a.id)))+')" aria-label="Editar audiencia '+esc(a.name)+'">'+
        '<span class="ah-audience-top"><span class="ah-audience-index">'+String(i+1).padStart(2,'0')+'</span><span class="ah-audience-type">'+esc(a.kind||'Audiencia')+'</span></span>'+
        '<strong class="ah-audience-name">'+esc(a.name||'Sin nombre')+'</strong>'+
        '<span class="ah-audience-meta">'+number(assignedCount)+' '+(assignedCount===1?'persona asignada':'personas asignadas')+population+'</span>'+
        '<span class="ah-audience-progress" aria-hidden="true"><i style="width:'+share.toFixed(1)+'%"></i></span>'+
        '<span class="ah-audience-bottom"><span class="ah-quadrant-label '+(group?'ah-'+group.tone:'ah-unset')+'">'+(group?esc(q+' · '+group.label):'Sin clasificar')+'</span><span class="ah-chevron" aria-hidden="true">↗</span></span>'+
        '</button>';
    }).join('');
    if(!cards)cards='<div class="ah-empty"><strong>Tu red empieza aquí.</strong><span>Crea la primera audiencia o importa tu archivo para construir el mapa.</span><button class="primary" type="button" onclick="audQuickNew()">Crear primera audiencia</button></div>';

    var qitems=QUADRANTS.map(function(q){
      var pct=qcounts[q.key]*100/total;
      return '<div class="ah-quadrant-item"><div class="ah-quadrant-copy"><span class="ah-color-dot ah-'+q.tone+'"></span><span><b>'+q.label+'</b><small>'+q.note+'</small></span><strong>'+number(qcounts[q.key])+'</strong></div><div class="ah-track"><i class="ah-'+q.tone+'" style="width:'+pct.toFixed(1)+'%"></i></div></div>';
    }).join('');
    var audienceSummary='<section class="ah-focus" aria-label="Audiencias registradas">'+
       '<div class="ah-heading"><div><span class="ah-eyebrow">01 / TU RED</span><h2>Audiencias registradas</h2><p>Una vista clara de quiénes forman parte del cambio.</p></div>'+
       '<button class="ah-text-link" onclick="audHomeAll()" type="button">Administrar todas <span aria-hidden="true">↗</span></button></div>'+
       '<div class="ah-audiences">'+cards+'</div>'+
       (audiences.length>6?'<button type="button" class="ah-more" onclick="audHomeAll()">Ver las '+number(audiences.length)+' audiencias →</button>':'')+
       '</section>';
    var quadrantSummary='<section class="ah-insight" aria-label="Distribución estratégica">'+
      '<div class="ah-heading"><div><span class="ah-eyebrow">02 / LECTURA ESTRATÉGICA</span><h2>Mapa de influencia</h2><p>Distribución de '+esc(scopeLabel)+' por cuadrante.</p></div></div>'+
      '<div class="ah-total"><span><i class="ah-pulse"></i>'+number(qsource.length)+' '+esc(scopeLabel)+'</span><small>'+number(qcounts.none)+' sin clasificar</small></div>'+
      '<div class="ah-quadrant-stack">'+qitems+'</div>'+
      '<button class="ah-view-map" type="button" onclick="audHomeTab(\'mapa\')"><span>Explorar mapa estratégico</span><span aria-hidden="true">↗</span></button>'+
      '</section>';
    var overview='<section class="ah-overview" aria-label="Indicadores de audiencias">'+
      '<div class="ah-overview-header"><span class="ah-eyebrow"><span class="ah-live-dot"></span> PANORAMA DE AUDIENCIAS</span><span class="ah-overview-tag">Datos de esta iniciativa</span></div>'+
      '<div class="ah-kpi-grid">'+
      '<div class="ah-kpi"><span class="ah-kpi-icon">◈</span><span class="ah-kpi-caption">Audiencias</span><strong>'+number(audiences.length)+'</strong><small>Grupos y segmentos definidos</small></div>'+
      '<div class="ah-kpi"><span class="ah-kpi-icon">♙</span><span class="ah-kpi-caption">Personas asignadas</span><strong>'+number(people.length)+'</strong><small>Vinculadas a audiencias</small></div>'+
      '<div class="ah-kpi"><span class="ah-kpi-icon">◎</span><span class="ah-kpi-caption">Clasificación individual</span><strong>'+(classifiedPct===null?'—':classifiedPct+'%')+'</strong><small>'+(people.length?number(individualClassified)+' de '+number(people.length)+' clasificadas':'Aún no hay personas')+'</small></div>'+
      '<div class="ah-kpi"><span class="ah-kpi-icon">⌁</span><span class="ah-kpi-caption">Comportamientos asociados</span><strong>'+number(linked)+'</strong><small>Con audiencias vinculadas</small></div>'+
      '</div></section>';
    var navigation='<div class="ah-nav" id="ah-workmode" role="group" aria-label="Vista de gestión">'+
      '<div class="ah-nav-tabs"><button type="button" aria-pressed="'+(audienceTab==='registro')+'" class="'+(audienceTab==='registro'?'is-active':'')+'" onclick="audHomeTab(\'registro\')">Personas</button>'+
      '<button type="button" aria-pressed="'+(audienceTab!=='registro')+'" class="'+(audienceTab!=='registro'?'is-active':'')+'" onclick="audHomeTab(\'mapa\')">Distribución y estrategias</button></div>'+
      '<div class="ah-nav-actions"><button class="ah-action-secondary" type="button" onclick="audHomeImport()">↑ Importar Excel</button>'+
      '<button class="ah-action-primary" type="button" onclick="audQuickNew()">＋ Nueva audiencia</button></div></div>';

    var content=audienceTab==='registro'
      ?'<div class="ah-main-grid">'+audienceSummary+quadrantSummary+'</div>'+
        '<div class="ah-detail-heading"><span class="ah-eyebrow">03 / ESPACIO DE TRABAJO</span><h2>Gestionar información</h2><p>Crea, importa, clasifica y consulta personas desde un mismo lugar.</p></div>'+
        audienceRegistration(x)
      :'<div class="ah-map-content">'+audienceMap(x,{Q1:qcounts.Q1,Q2:qcounts.Q2,Q3:qcounts.Q3,Q4:qcounts.Q4})+audDrawerHTML(x)+'</div>';

    return hcxHero('Gestión de audiencias',x,'Personas y grupos que hacen posible el cambio.','RDAIM · DISEÑO','◎')+
      '<div class="ah-home">'+overview+navigation+content+'</div>';
  };
})();
