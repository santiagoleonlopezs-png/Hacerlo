/* HACERLO 2.17 — Centro de iniciativas
   Una nueva experiencia visual sin alterar el modelo de datos, los banners o RDAIM. */
let portfolioFilter='all',portfolioQuery='';
let portfolioView='initiatives',portfolioListMode='cards';
let portfolioCreateOpen=false;
const pfShapes={
 flag:'<path d="M4 22V4m0 1c5-4 10 4 16 0v12c-6 4-11-4-16 0"/>',
 activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 layers:'<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
 people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 chart:'<path d="M3 3v18h18M8 17v-5M13 17V8M18 17v-9"/>',
 pencil:'<path d="M4 21h16M6 17l10-10 3 3-10 10H6v-3ZM14 9l3 3"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function pfIcon(n){return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(pfShapes[n]||pfShapes.flag)+'</svg>'}
function pfRunning(i){return (i.actions||[]).some(a=>normalizedStatus(a.status)==='En ejecución')}
function pfStrategic(i){return priority(i).label==='Proyecto estratégico'}
function pfPending(i){return priority(i).label==='Por evaluar'}
function pfNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim()}
function pfMatches(i){
 const group=portfolioFilter;
 if(!(group==='all'||(group==='running'&&pfRunning(i))||(group==='strategic'&&pfStrategic(i))||(group==='pending'&&pfPending(i))))return false;
 const q=pfNorm(portfolioQuery);
 return !q||pfNorm([i.name,i.description,priority(i).label,i.scope].join(' ')).includes(q);
}
function pfDate(d){if(!d)return 'Sin fecha';const date=new Date(String(d)+'T12:00:00');return Number.isNaN(date.getTime())?'Sin fecha':new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric'}).format(date)}
function pfOpen(btn){const key=btn.closest('[data-pf-id]')?.getAttribute('data-pf-id');const i=db.initiatives.find(z=>String(z.id)===key);if(i)choose(i.id)}
function pfApply(){
 const input=document.getElementById('pf-search');if(input)portfolioQuery=input.value;
 let n=0;
 document.querySelectorAll('#pf-list [data-pf-id]').forEach(card=>{
   const i=db.initiatives.find(x=>String(x.id)===card.getAttribute('data-pf-id'));
   const show=!!i&&pfMatches(i);card.hidden=!show;if(show)n++;
 });
 const count=document.getElementById('pf-count');if(count)count.textContent=n+' '+(n===1?'iniciativa':'iniciativas');
 const empty=document.getElementById('pf-empty');if(empty)empty.hidden=n!==0;
}
function pfSetFilter(filter){
 if(!['all','running','strategic','pending'].includes(filter))return;
 portfolioFilter=filter;
 document.querySelectorAll('[data-pf-filter]').forEach(btn=>{
   const yes=btn.getAttribute('data-pf-filter')===filter;
   btn.classList.toggle('active',yes);btn.setAttribute('aria-pressed',String(yes));
 });
 pfApply();
}
function pfToggleCreate(force){
 const next=typeof force==='boolean'?force:!portfolioCreateOpen;
 portfolioCreateOpen=next;
 const form=document.getElementById('pf-create-form'),container=document.getElementById('pf-create');
 const layout=document.getElementById('pf-layout'),trigger=document.getElementById('pf-create-toggle');
 const icon=document.getElementById('pf-create-icon'),hint=document.getElementById('pf-create-hint');
 if(form)form.hidden=!next;
 if(container)container.classList.toggle('is-open',next);
 if(layout)layout.classList.toggle('pf-compact',!next);
 if(trigger){trigger.setAttribute('aria-expanded',String(next));trigger.setAttribute('aria-label',next?'Ocultar formulario para nueva iniciativa':'Crear nueva iniciativa');}
 if(icon)icon.innerHTML=pfIcon(next?'minus':'plus');
 if(hint)hint.textContent=next?'Completa los datos para crearla.':'Pulsa + para añadir una iniciativa.';
 if(next){
   if(container&&typeof container.scrollIntoView==='function')container.scrollIntoView({behavior:'smooth',block:'nearest'});
   const name=form?.querySelector('[name="name"]');if(name&&typeof name.focus==='function')name.focus({preventScroll:true});
 }
}
function pfClear(){
 portfolioFilter='all';portfolioQuery='';
 const input=document.getElementById('pf-search');if(input)input.value='';
 pfSetFilter('all');if(input)input.focus();
}
function pfCard(i,idx){
 const p=priority(i),actions=i.actions||[],running=pfRunning(i),done=actions.filter(a=>normalizedStatus(a.status)==='Completada').length;
 const stage=Math.min(4,Math.max(0,Number.isFinite(Number(i.phase))?Math.trunc(Number(i.phase)):0));
 const impact=Number(i.impact)||0,effort=Number(i.effort)||0;
 const ratio=actions.length?Math.round(done/actions.length*100):0;
 const scope=i.scope==='outside'?'Outside':'Inside';
 return '<article class="pf-card" data-pf-id="'+safe(String(i.id))+'"'+(pfMatches(i)?'':' hidden')+'>'+
   '<div class="pf-card-top"><span class="pf-card-icon">'+pfIcon(idx%3===0?'people':idx%3===1?'layers':'target')+'</span>'+
   '<div class="pf-card-main"><div class="pf-title-line"><h3>'+safe(i.name)+'</h3><span class="pf-chip">'+scope+'</span></div>'+
   '<p>'+safe(i.description||'Sin descripción registrada.')+'</p></div>'+
   '<div class="pf-card-badges"><span class="pf-chip pf-priority'+(pfStrategic(i)?' strategic':'')+'">'+safe(p.label)+'</span>'+
   (running?'<span class="pf-chip pf-running"><i></i>En ejecución</span>':'')+'</div></div>'+
   '<div class="pf-card-info"><div class="pf-facts">'+
     '<span>'+pfIcon('people')+safe(Number(i.population)||0)+' personas</span>'+
     '<span>'+pfIcon('calendar')+safe(pfDate(i.createdAt))+'</span>'+
     '<span>'+pfIcon('chart')+'Impacto '+(impact?impact+'/5':'—')+'</span>'+
     '<span>'+pfIcon('pencil')+'Esfuerzo '+(effort?effort+'/5':'—')+'</span>'+
   '</div><div class="pf-stage"><small>Etapa RDAIM</small><strong>'+safe(phases[stage][1])+'</strong>'+
   '<div class="pf-stage-markers" aria-label="Etapa '+(stage+1)+' de 5">'+phases.map((_,n)=>'<i class="'+(n===stage?'current':'')+'"></i>').join('')+'</div>'+
   '<small>Etapa '+(stage+1)+' de 5</small></div>'+
   '<button type="button" class="pf-open" onclick="pfOpen(this)">Abrir iniciativa '+pfIcon('arrow')+'</button></div>'+
   '<div class="pf-card-foot"><div class="pf-actions"><span>'+pfIcon(actions.length?'check':'clock')+
    (actions.length?done+' de '+actions.length+' acciones completadas':'Sin acciones registradas')+'</span>'+
    (actions.length?'<div class="pf-actions-track" role="progressbar" aria-label="Acciones completadas" aria-valuenow="'+done+'" aria-valuemin="0" aria-valuemax="'+actions.length+'"><i style="width:'+ratio+'%"></i></div>':'')+
   '</div><details class="pf-edit"><summary>Editar prioridad <b aria-hidden="true">···</b></summary><div class="pf-edit-inner">'+priorityEditor(i)+'</div></details></div></article>';
}

function pfSwitchView(next){
 if(!['initiatives','priority'].includes(next))return;
 portfolioView=next;render();
}
function pfSwitchListMode(next){
 if(!['cards','table'].includes(next))return;
 portfolioListMode=next;render();
}
function pfConsolidatedTable(items){
 return '<div class="pf-table-wrap"><table class="pf-table"><thead><tr>'+
 ['Iniciativa','Etapa RDAIM','Prioridad / ruta','Audiencias','Comportamientos','Indicadores','Pendientes','En ejecución','Completadas','Abrir'].map(h=>'<th scope="col">'+h+'</th>').join('')+
 '</tr></thead><tbody>'+
 items.map(i=>{
  const status=(i.actions||[]),stage=Math.min(4,Math.max(0,Number.isFinite(Number(i.phase))?Math.trunc(Number(i.phase)):0)),p=priority(i);
  const value=s=>status.filter(x=>normalizedStatus(x.status)===s).length;
  return '<tr data-pf-id="'+safe(String(i.id))+'"'+(pfMatches(i)?'':' hidden')+'>'+
   '<th scope="row"><strong>'+safe(i.name)+'</strong><small>'+safe(i.scope==='outside'?'Outside':'Inside')+'</small></th>'+
   '<td>'+safe(phases[stage][1])+'</td><td><span class="pf-table-priority">'+safe(p.label)+'</span></td>'+
   '<td>'+((i.audiences||[]).length)+'</td><td>'+((i.behaviors||[]).length)+'</td><td>'+((i.indicators||[]).length)+'</td>'+
   ['Pendiente','En ejecución','Completada'].map(s=>'<td>'+value(s)+'</td>').join('')+
   '<td><button type="button" class="pf-table-open" onclick="pfOpen(this)" aria-label="Abrir '+safe(i.name)+'">Abrir ↗</button></td></tr>';
 }).join('')+'</tbody></table></div>';
}
function renderInitiativesHome(){
 const initiatives=db.initiatives||[],running=initiatives.filter(pfRunning).length,strategic=initiatives.filter(pfStrategic).length;
 const pending=initiatives.filter(pfPending).length;
 const population=initiatives.reduce((sum,i)=>sum+Math.max(0,Number(i.population)||0),0);
 const showing=initiatives.filter(pfMatches).length;
 const metrics=[
 ['flag','Total de iniciativas',initiatives.length,'En el portafolio'],
 ['activity','Con acciones en ejecución',running,'Con intervención en curso'],
 ['layers','Proyectos estratégicos',strategic,'Según impacto y esfuerzo'],
 ['people','Población estimada',population.toLocaleString('es-CO'),'Suma de iniciativas, sin deduplicar']
 ];
 const categories=[['all','Todas',initiatives.length],['running','En ejecución',running],['strategic','Estratégicas',strategic],['pending','Por evaluar',pending]];
 return '<section class="pf-home" aria-label="Centro de iniciativas">'+
  '<div class="pf-heading"><div><span class="pf-eyebrow">HACERLO · PORTAFOLIO</span><h2>Centro de iniciativas</h2>'+
  '<p>Diseña, prioriza y acompaña iniciativas que transforman comportamientos.</p></div>'+
  '<div class="pf-heading-aside">'+pfIcon('target')+'<div><strong>Del comportamiento al resultado</strong><small>Una vista clara para decidir y actuar.</small></div></div></div>'+
  '<div class="pf-metrics">'+metrics.map(([icon,label,value,hint])=>'<div class="pf-metric"><div class="pf-metric-icon">'+pfIcon(icon)+'</div><div><span>'+label+'</span><strong>'+value+'</strong><small>'+hint+'</small></div></div>').join('')+'</div>'+
  '<nav class="pf-main-tabs" aria-label="Vistas de Iniciativas">'+
  '<button type="button" class="'+(portfolioView==='initiatives'?'active':'')+'" aria-current="'+(portfolioView==='initiatives'?'page':'false')+'" onclick="pfSwitchView(\'initiatives\')">Mis iniciativas</button>'+
  '<button type="button" class="'+(portfolioView==='priority'?'active':'')+'" aria-current="'+(portfolioView==='priority'?'page':'false')+'" onclick="pfSwitchView(\'priority\')">Priorización</button></nav>'+
 (portfolioView==='priority'?'<section class="pf-priority-view" aria-label="Matriz de priorización">'+portfolioPriority(true)+'</section>':
 '<div class="pf-layout'+(portfolioCreateOpen?'':' pf-compact')+'" id="pf-layout"><section class="pf-initiatives" aria-label="Mis iniciativas">'+
   '<div class="pf-section-heading"><div><h2>Mis iniciativas</h2><p>Accede a tus proyectos y revisa su priorización.</p></div><button type="button" class="pf-jump" onclick="pfToggleCreate(true)">'+pfIcon('plus')+'Nueva iniciativa</button></div>'+
   '<div class="pf-list-modes" role="group" aria-label="Vista de iniciativas">'+
  '<button type="button" aria-pressed="'+(portfolioListMode==='cards')+'" class="'+(portfolioListMode==='cards'?'active':'')+'" onclick="pfSwitchListMode(\'cards\')">Tarjetas</button>'+
  '<button type="button" aria-pressed="'+(portfolioListMode==='table')+'" class="'+(portfolioListMode==='table'?'active':'')+'" onclick="pfSwitchListMode(\'table\')">Consolidado</button></div>'+
 '<div class="pf-toolbar"><div class="pf-filters" role="group" aria-label="Filtrar iniciativas">'+
    categories.map(([key,label,n])=>'<button type="button" data-pf-filter="'+key+'" aria-pressed="'+(key===portfolioFilter)+'" class="'+(key===portfolioFilter?'active':'')+'" onclick="pfSetFilter(\''+key+'\')">'+label+' <span>'+n+'</span></button>').join('')+'</div>'+
    '<label class="pf-search">'+pfIcon('search')+'<span class="pf-sr-only">Buscar iniciativa</span>'+
    '<input type="search" id="pf-search" value="'+safe(portfolioQuery)+'" placeholder="Buscar iniciativa…" oninput="pfApply()" autocomplete="off"></label></div>'+
   '<p class="pf-count" id="pf-count" role="status">'+showing+' '+(showing===1?'iniciativa':'iniciativas')+'</p>'+
   (portfolioListMode==='cards'?'<div class="pf-cards" id="pf-list">'+initiatives.map(pfCard).join('')+'</div>':
 '<div id="pf-list">'+pfConsolidatedTable(initiatives)+'</div>')+
   '<div class="pf-empty" id="pf-empty"'+(showing?' hidden':'')+'>'+pfIcon('search')+
    '<strong>'+(initiatives.length?'No hay iniciativas con ese criterio.':'Aún no hay iniciativas.')+'</strong>'+
    '<p>'+(initiatives.length?'Prueba con otra búsqueda o filtro.':'Empieza creando tu primera iniciativa.')+'</p>'+
    (initiatives.length?'<button type="button" onclick="pfClear()">Limpiar filtros</button>':'<button type="button" onclick="pfToggleCreate(true)">Crear iniciativa</button>')+'</div></section>'+
   '<section class="pf-create'+(portfolioCreateOpen?' is-open':'')+'" id="pf-create" aria-labelledby="pf-create-title">'+
    '<button class="pf-create-toggle" type="button" id="pf-create-toggle" onclick="pfToggleCreate()" aria-expanded="'+portfolioCreateOpen+'" aria-controls="pf-create-form" aria-label="'+(portfolioCreateOpen?'Ocultar formulario para nueva iniciativa':'Crear nueva iniciativa')+'">'+
      '<span class="pf-create-icon" id="pf-create-icon">'+pfIcon(portfolioCreateOpen?'minus':'plus')+'</span>'+
      '<span class="pf-create-copy"><strong id="pf-create-title">Nueva iniciativa</strong><small id="pf-create-hint">'+(portfolioCreateOpen?'Completa los datos para crearla.':'Pulsa + para añadir una iniciativa.')+'</small></span>'+
      '<span class="pf-create-toggle-label" aria-hidden="true">'+(portfolioCreateOpen?'Ocultar':'Abrir')+'</span></button>'+
   '<form class="pf-form" id="pf-create-form" onsubmit="createInitiative(event)"'+(portfolioCreateOpen?'':' hidden')+'>'+
    '<label>Nombre de la iniciativa <em>*</em><input name="name" required placeholder="Ej. Adopción de CRM" maxlength="180" autocomplete="off"></label>'+
    '<label>Objetivo y contexto <em>*</em><textarea name="description" rows="3" required placeholder="¿Qué quieres transformar y por qué?"></textarea></label>'+
    '<div class="pf-form-pair"><label>Ámbito<select name="scope"><option value="inside">Inside · Interno</option><option value="outside">Outside · Externo</option></select></label>'+
    '<label>Población estimada<input type="number" name="population" min="0" step="1" placeholder="Ej. 310"></label></div>'+
    '<label>Fecha de ingreso <em>*</em><input type="date" name="createdAt" required></label>'+
    '<div class="pf-form-pair"><label>Impacto (1–5)<select name="impact"><option value="">Sin evaluar</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'">'+n+'</option>').join('')+'</select></label>'+
    '<label>Esfuerzo (1–5)<select name="effort"><option value="">Sin evaluar</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'">'+n+'</option>').join('')+'</select></label></div>'+
    '<p class="pf-form-helper">La prioridad puede definirse o editarse después.</p>'+
    '<button class="pf-submit" type="submit">Crear iniciativa '+pfIcon('arrow')+'</button></form></section></div>')+'</section>';
}
