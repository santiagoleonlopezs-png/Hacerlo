// HACERLO — Resultados / Indicadores
let editingIndicatorIndex = null;
let indicatorCreateOpen=false;
function indicatorGroupKey(type){
 const v=String(type||'').trim().toLocaleLowerCase('es');
 if(v==='resultados'||v==='resultado')return 'Resultados';
 if(v==='predictivos'||v==='predictivo')return 'Predictivos';
 if(v==='gestión'||v==='gestion')return 'Gestión';
 return 'Otros';
}

function indicatorBoardCard(x,r,i){
 const actual=r.value!==undefined&&r.value!==null&&String(r.value).trim()!=='';
 const category=indicatorGroupKey(r.type);
 return `<article class="indicator-board-card indicator-compact-card" data-name="${safe(String(r.name||'').toLocaleLowerCase('es'))}" data-type="${safe(category)}">
  <h4 title="${safe(r.name||'Sin nombre')}">${safe(r.name||'Sin nombre')}</h4>
  <div class="indicator-board-values">
   <div><span>Línea base</span><strong>${safe(r.baseline??'—')}</strong></div>
   <div><span>Meta</span><strong>${safe(r.target??'—')}</strong></div>
   <div class="indicator-board-current"><span>Actual</span><strong>${actual?safe(r.value):'—'}</strong></div>
  </div>
  <div class="indicator-board-card-actions">
   <details class="indicator-board-detail">
    <summary>Detalles y actualización <span aria-hidden="true">⌄</span></summary>
    <div class="indicator-board-detail-body">
     <p><strong>Comportamientos asociados</strong><span>${safe(indicatorBehaviorLabel(x,r)||'General')}</span></p>
     ${r.definition?`<p><strong>Definición / fórmula</strong><span>${safe(r.definition)}</span></p>`:''}
     <label>Registrar valor actual<input type="number" step="any" value="${safe(r.value??'')}" onchange="updateIndicator(${i},this.value)" placeholder="Sin registro" aria-label="Valor actual de ${safe(r.name||'indicador')}"></label>
    </div>
   </details>
   <button class="indicator-board-edit" type="button" onclick="editIndicator(${i})">Editar</button>
  </div>
 </article>`;
}

function indicatorBoardGroups(x){
 const categories=[
  {key:'Resultados',title:'Resultados',subtitle:'Impacto y resultados',glyph:'◎'},
  {key:'Predictivos',title:'Predictivos',subtitle:'Señales de avance',glyph:'↗'},
  {key:'Gestión',title:'Gestión',subtitle:'Seguimiento operativo',glyph:'▤'},
  {key:'Otros',title:'Otros indicadores',subtitle:'Categorías no clasificadas',glyph:'◈'}
 ];
 return categories.map(group=>{
  const items=(x.indicators||[]).map((r,i)=>({r,i})).filter(({r})=>indicatorGroupKey(r.type)===group.key);
  if(!items.length)return '';
  return `<section class="indicator-board-group" data-category="${safe(group.key)}" aria-label="${safe(group.title)}">
   <header class="indicator-board-group-head">
    <span class="indicator-board-group-icon" aria-hidden="true">${group.glyph}</span>
    <span class="indicator-board-group-titles"><strong>${group.title}</strong><small>${group.subtitle}</small></span>
    <span class="indicator-board-group-count" data-count="${items.length}">${items.length}</span>
   </header>
   <div class="indicator-board-group-cards">${items.map(({r,i})=>indicatorBoardCard(x,r,i)).join('')}</div>
  </section>`;
 }).join('');
}

function renderIndicatorsEditor(x,head){
 const idx=editingIndicatorIndex,editing=Number.isInteger(idx)&&idx>=0&&idx<x.indicators.length;
 const v=editing?x.indicators[idx]:{};
 const val=k=>safe(v[k]??'');
 const option=(value,selected)=>`<option value="${safe(value)}"${String(value)===String(selected??'')?' selected':''}>${safe(value)}</option>`;
 const showEditor=indicatorCreateOpen||editing;
 const choices=['Gestión','Predictivos','Resultados'];
 if(editing&&v.type&&!choices.includes(v.type))choices.push(v.type);
 const types=[...new Set((x.indicators||[]).map(r=>indicatorGroupKey(r.type)))];
 return head+`<div class="indicator-board-shell">
  <section class="panel indicator-board-main">
   <div class="indicator-board-title-bar">
    <div><h2>Indicadores registrados <span class="indicator-board-total">${x.indicators.length}</span></h2>
    <p>Explora los indicadores por tipo y consulta su evolución.</p></div>
    <button class="${showEditor?'secondary':'primary'} indicator-board-create" type="button" onclick="indicatorCreateOpen=!indicatorCreateOpen;editingIndicatorIndex=null;render()">${showEditor?'Cerrar formulario':'+ Crear indicador'}</button>
   </div>
   ${showEditor?`<section class="indicator-board-editor" id="indicator-design-form">
    <div class="indicator-board-editor-head"><h3>${editing?'Editar indicador':'Crear indicador'}</h3><span>Define el indicador y sus asociaciones.</span></div>
    <form onsubmit="saveIndicatorEditor(event)">
     <div class="indicator-board-form-first">
      <label>Nombre del indicador<input name="name" placeholder="Nombre" value="${val('name')}" required></label>
      <label>Tipo de indicador<select name="type">${choices.map(t=>option(t,editing?v.type:'Gestión')).join('')}</select></label>
     </div>
     <label>Definición o fórmula<input name="definition" placeholder="Definición / fórmula" value="${val('definition')}"></label>
     <div class="indicator-board-behavior-select"><strong>Comportamientos asociados</strong>${indicatorBehaviorChoices(x,v)}</div>
     <div class="indicator-board-form-metrics">
      <label>Línea base<input name="baseline" type="number" step="any" placeholder="Línea base" value="${val('baseline')}"></label>
      <label>Meta<input name="target" type="number" step="any" placeholder="Meta" value="${val('target')}"></label>
      <label>Valor actual<input name="value" type="number" step="any" placeholder="Valor actual" value="${val('value')}"></label>
     </div>
     <div class="indicator-board-editor-buttons"><button class="primary" type="submit">${editing?'Guardar cambios':'Agregar indicador'}</button>
     <button class="secondary" type="button" onclick="cancelIndicatorEditor()">Cancelar</button></div>
    </form>
   </section>`:''}
   ${x.indicators.length?`<div class="indicator-board-filters">
    <label class="indicator-board-search">Buscar<input id="indicator-search" type="search" placeholder="Buscar por nombre..." oninput="filterIndicatorCards()" autocomplete="off"></label>
    <label class="indicator-board-type-filter">Tipo<select id="indicator-type-filter" onchange="filterIndicatorCards()"><option value="">Todos</option>${['Resultados','Predictivos','Gestión','Otros'].filter(t=>types.includes(t)).map(t=>`<option value="${safe(t)}">${safe(t)}</option>`).join('')}</select></label>
   </div>
   <div id="indicator-cards" class="indicator-board-groups">${indicatorBoardGroups(x)}</div>
   <p id="indicator-filter-empty" class="indicator-board-no-results" hidden>No hay indicadores con esos filtros.</p>`:
   '<div class="indicator-board-empty">Todavía no hay indicadores. Crea el primero para comenzar a medir.</div>'}
  </section>
 </div>`;
}
function editIndicator(i){if(!current()?.indicators?.[i])return;editingIndicatorIndex=i;indicatorCreateOpen=true;render();document.querySelector('form[onsubmit="saveIndicatorEditor(event)"] input[name="name"]')?.focus()}
function cancelIndicatorEditor(){editingIndicatorIndex=null;indicatorCreateOpen=false;render()}
function saveIndicatorEditor(e){e.preventDefault();const x=current();if(!x)return;const fd=new FormData(e.target);const data=Object.fromEntries(fd);delete data.behaviorIds;ensureBehaviorIds(x);const association={};writeIndicatorBehaviorIds(x,association,fd.getAll('behaviorIds'));Object.assign(data,association);const idx=editingIndicatorIndex;const existing=Number.isInteger(idx)?x.indicators[idx]:null;const now=new Date().toISOString();
 if(existing){const changes=Object.keys(data).filter(k=>String(existing[k]??'')!==String(data[k]??''));if(changes.length){existing.revisionHistory=existing.revisionHistory||[];existing.revisionHistory.push({date:now,changes:changes.map(k=>({field:k,previous:existing[k]??'',current:data[k]}))});if(changes.includes('value')&&data.value!==''){existing.history=existing.history||[];existing.history.push({date:now,value:Number(data.value)})}Object.assign(existing,data)}}
 else{data.id=crypto.randomUUID();data.history=data.value!==''?[{date:now,value:Number(data.value)}]:[];data.revisionHistory=[];x.indicators.push(data)}
 editingIndicatorIndex=null;indicatorCreateOpen=false;save();render();
}

function filterIndicatorCards(){
 const query=(document.getElementById('indicator-search')?.value||'').trim().toLocaleLowerCase('es');
 const type=document.getElementById('indicator-type-filter')?.value||'';
 let visible=0;
 document.querySelectorAll('.indicator-board-group').forEach(group=>{
  let groupVisible=0;
  group.querySelectorAll('.indicator-compact-card').forEach(card=>{
   const show=(!query||card.dataset.name.includes(query))&&(!type||card.dataset.type===type);
   card.hidden=!show;
   if(show){groupVisible++;visible++}
  });
  group.hidden=groupVisible===0;
 });
 const empty=document.getElementById('indicator-filter-empty');
 if(empty)empty.hidden=visible!==0;
}
