function portfolioMetricSummary(){if(!db.initiatives.length)return '';return `<section class="panel"><h2>Seguimiento de indicadores · Portafolio</h2><p class="muted">Últimas mediciones por iniciativa. No se promedian indicadores con escalas distintas.</p><div style="overflow:auto"><table><thead><tr><th>Iniciativa</th><th>INS personas</th><th>INS proceso</th><th>CNPS</th></tr></thead><tbody>${db.initiatives.map(i=>`<tr><td>${safe(i.name)}</td>${['ins_personas','ins_proceso','cnps'].map(k=>{let h=((i.metricHistory||{})[k]||[]),v=typeof eeHomeMetric==='function'?eeHomeMetric(i,k):null;v=v||(h.length?h[h.length-1]:null);return `<td>${v?(v.value===null?'—':safe(v.value))+'<br><small class="muted">'+safe(v.note||v.date||'')+'</small>':'—'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div></section>`}
const coreMetricNames={ins_personas:'INS personas',ins_proceso:'INS proceso',cnps:'CNPS'};
function metricCard(x,label,key){let history=(x.metricHistory||{})[key]||[],latest=(typeof eeHomeMetric==='function'?eeHomeMetric(x,key):null)||(history.length?history[history.length-1]:null);return `<section class="panel"><h3>${label}</h3><div class="metric">${safe(latest?(latest.value??'—'):(x.metrics[key]??'—'))}</div><small class="muted">${safe(x.metrics[key+'_definition']||'Escala por definir')}</small><p class="subtle">${latest?safe(latest.note||('Última medición: '+latest.date)):'Sin historial de mediciones'}</p><button class="primary" onclick="openMetricEntry('${key}')">+ Registrar medición</button><button class="secondary" onclick="toggleMetricHistory('${key}')">Ver historial y tendencia</button><div id="metric-history-${key}" class="hide">${metricHistoryView(x,key)}</div></section>`}
function openMetricEntry(key){let x=current(),form=$('metric-entry');if(!form){document.body.insertAdjacentHTML('beforeend',`<div id="metric-entry" class="metric-overlay"><form class="metric-dialog" onsubmit="recordCoreMetric(event)"><div class="flex" style="justify-content:space-between"><h2 id="metric-title">Registrar medición</h2><button type="button" class="secondary" onclick="closeMetricEntry()">Cerrar ×</button></div><input name="key" type="hidden"><label>Fecha<input name="date" type="date" required></label><label>Valor<input name="value" type="number" step="any" required></label><label>Período (opcional)<input name="period" placeholder="Ej. Octubre 2026"></label><label>Definición y escala<input name="definition" placeholder="Ej. Porcentaje, escala de -100 a 100"></label><label>Observaciones<textarea name="notes" placeholder="Contexto de esta medición"></textarea></label><button class="primary" type="submit">Guardar medición</button></form></div>`);form=$('metric-entry')}let f=form.querySelector('form');f.elements.key.value=key;f.elements.date.value=new Date().toISOString().slice(0,10);f.elements.value.value='';f.elements.period.value='';f.elements.notes.value='';f.elements.definition.value=x.metrics[key+'_definition']||'';$('metric-title').textContent='Registrar · '+coreMetricNames[key];form.style.display='flex'}
function closeMetricEntry(){let m=$('metric-entry');if(m)m.style.display='none'}
function recordCoreMetric(e){e.preventDefault();let f=e.target,x=current(),k=f.elements.key.value,v=Number(f.elements.value.value);if(!Number.isFinite(v))return alert('Ingresa un valor válido');x.metricHistory=x.metricHistory||{};x.metricHistory[k]=x.metricHistory[k]||[];x.metricHistory[k].push({date:f.elements.date.value,value:v,period:f.elements.period.value,notes:f.elements.notes.value});x.metricHistory[k].sort((a,b)=>a.date.localeCompare(b.date));x.metrics[k]=x.metricHistory[k].at(-1).value;x.metrics[k+'_definition']=f.elements.definition.value;save();closeMetricEntry();render()}
function toggleMetricHistory(k){let el=$('metric-history-'+k);if(el)el.classList.toggle('hide')}
function metricHistoryView(x,k){let h=((x.metricHistory||{})[k]||[]);if(!h.length)return '<p class="muted">Aún no hay mediciones.</p>';let nums=h.map(v=>Number(v.value)),min=Math.min(...nums),max=Math.max(...nums),points=h.map((v,i)=>`${18+i*440/Math.max(1,h.length-1)},${112-(v.value-min)*85/(max-min||1)}`).join(' ');return `<div style="overflow:auto"><svg viewBox="0 0 480 135" aria-label="Tendencia de ${coreMetricNames[k]}"><line x1="18" y1="117" x2="460" y2="117" stroke="#42677c"/><polyline fill="none" stroke="#23c9c1" stroke-width="3" points="${points}"/>${h.map((v,i)=>`<circle cx="${18+i*440/Math.max(1,h.length-1)}" cy="${112-(v.value-min)*85/(max-min||1)}" r="4" fill="#e4f9ff"/>`).join('')}</svg><table><thead><tr><th>Fecha</th><th>Valor</th><th>Período</th><th>Observaciones</th></tr></thead><tbody>${h.slice().reverse().map(v=>`<tr><td>${safe(v.date)}</td><td>${safe(v.value)}</td><td>${safe(v.period||'—')}</td><td>${safe(v.notes||'—')}</td></tr>`).join('')}</tbody></table></div>`}
function setObjective(v){current().objective=v;save()}function setField(k,v){current()[k]=v;save()}function setMetric(k,v){current().metrics[k]=v;save()}
function addBehavior(e){e.preventDefault();let fd=new FormData(e.target),z=Object.fromEntries(fd);z.audienceIds=fd.getAll('audienceIds');z.observableReviewed=fd.get('observableReviewed')==='on';z.id='beh-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);if(z.scope==='specific'&&!z.audienceIds.length)return alert('Selecciona al menos una audiencia o utiliza Todas las audiencias');const selected=fd.getAll('existingIndicators');delete z.existingIndicators;current().behaviors.push(z);linkBehaviorIndicators(current(),z,selected);if(z.kind&&z.indicator){current().indicators.push({name:z.indicator,type:z.kind,behavior:z.name,behaviorIds:[z.id],definition:'',baseline:'',target:z.target||'',value:'',history:[]})}behaviorDesignFormOpen=false;save();render()}
function removeBehavior(i){if(confirm('¿Eliminar este comportamiento? Los indicadores ya creados se conservarán.')){let x=current(),b=x.behaviors[i];linkBehaviorIndicators(x,b,[]);x.behaviors.splice(i,1);save();render()}}
function addSystemVariable(e){e.preventDefault();current().systemVariables.push(Object.fromEntries(new FormData(e.target)));save();render()}
function addSystemLink(e){e.preventDefault();let z=Object.fromEntries(new FormData(e.target));if(z.from===z.to)return alert('Elige dos variables diferentes');current().systemLinks.push({from:Number(z.from),to:Number(z.to),sign:Number(z.sign),delay:!!z.delay,evidence:z.evidence});save();render()}
function setNote(v){let x=current();x.notes=x.notes||{};x.notes[phase]=v;save()}function xPhase(){current().phase=phase;save();render()}function setDim(d,v){current().dimensions[d]=Number(v);save();render()}
function addIndicator(e){e.preventDefault();let z=Object.fromEntries(new FormData(e.target));z.history=z.value!==''?[{date:new Date().toISOString(),value:Number(z.value)}]:[];current().indicators.push(z);save();render()}function updateIndicator(i,v){let z=current().indicators[i];z.value=v;z.history=z.history||[];if(v!=='')z.history.push({date:new Date().toISOString(),value:Number(v)});save();render()}function addAction(e){
 e.preventDefault();
 const x=current(),f=e.target;
 if(!x||!f)return;
 const z=Object.fromEntries(new FormData(f));
 const rawIndex=String(z.editIndex??'').trim();
 delete z.editIndex; // El índice de edición es estado de UI, no un dato de la acción.
 z.name=String(z.name||'').trim();
 if(!z.name)return alert('Escribe el nombre de la acción.');
 if(z.start&&z.end&&z.end<z.start)return alert('La fecha final debe ser igual o posterior a la inicial');
 if(rawIndex!==''){
   const i=Number(rawIndex);
   if(!Number.isSafeInteger(i)||i<0||!x.actions?.[i])
     return alert('Esta acción ya no está disponible. Vuelve a seleccionarla.');
   // Actualiza en el mismo registro y conserva estado, origen, medición, ID,
   // fechas de creación y vínculos utilizados por el análisis sistémico o la IA.
   Object.assign(x.actions[i],z,{updatedAt:new Date().toISOString()});
 }else{
   x.actions.push({...z,status:'Pendiente'});
 }
 save();render();
}
function editAction(i){
 const x=current(),action=x?.actions?.[i],f=document.getElementById('action-form');
 if(!action||!f)return;
 f.elements.namedItem('editIndex').value=String(i);
 for(const field of ['name','dimension','owner','start','end','source','hypothesis']){
   const control=f.elements.namedItem(field);
   if(control)control.value=String(action[field]??'');
 }
 const title=document.getElementById('action-form-title');
 if(title)title.textContent='Editar acción';
 const submit=document.getElementById('action-submit');
 if(submit)submit.textContent='Guardar cambios';
 document.getElementById('action-cancel')?.classList.remove('hide');
 f.closest('.panel')?.scrollIntoView({behavior:'smooth',block:'start'});
 f.elements.namedItem('name')?.focus({preventScroll:true});
}
function cancelActionEdit(){
 const f=document.getElementById('action-form');
 if(!f)return;
 f.reset();
 f.elements.namedItem('editIndex').value='';
 const title=document.getElementById('action-form-title');
 if(title)title.textContent='Nueva acción';
 const submit=document.getElementById('action-submit');
 if(submit)submit.textContent='+ Crear acción';
 document.getElementById('action-cancel')?.classList.add('hide');
}
function setAction(i,v){current().actions[i].status=v;save();render()}
function toggleReverse(sel){let form=sel.form,group=form.querySelector('.reverse-fields'),on=sel.value==='bidirectional';group.hidden=!on;group.querySelectorAll('input,select').forEach(el=>el.disabled=!on)}
function addNode(e){e.preventDefault();let x=current(),n=Object.fromEntries(new FormData(e.target));n.name=String(n.name||'').trim();if(!n.name)return alert('Indica un nombre');if((n.type==='Persona'||n.type==='Equipo')&&typeof graphAudienceKey==='function'){let match=(x.nodes||[]).find(v=>(v.type==='Persona'||v.type==='Equipo')&&graphAudienceKey(v.name)===graphAudienceKey(n.name));if(match)return alert('Este nombre ya existe en el grafo. Puedes editar o vincular el registro existente.')}x.nodes.push(n);if(typeof graphSyncAudiences==='function')graphSyncAudiences(x);x.graphSelectedNode=x.nodes.length-1;x.graphSelectedEdge=null;x.networkAnalysis=null;save();render()}
function addEdge(e){e.preventDefault();let z=Object.fromEntries(new FormData(e.target));if(z.source===z.target)return alert('Selecciona dos nodos diferentes');let relation=z.relation==='Otra'?(z.customRelation||'Otra').trim():z.relation;let edge={s:Number(z.source),t:Number(z.target),relation,relationKey:normalizeRelation(relation),evidence:z.evidence||'Declarada'};if(z.measureType&&z.measureValue!==''){edge.measureType=z.measureType;edge.measureValue=Number(z.measureValue);if(z.measureUnit)edge.measureUnit=z.measureUnit}current().edges.push(edge);save();render()}
function addCausal(e){e.preventDefault();current().causal.push(Object.fromEntries(new FormData(e.target)));save();render()}
function exportData(){let b=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='HACERLO_respaldo.json';a.click();URL.revokeObjectURL(u)}
function importData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let d=JSON.parse(r.result);if(!Array.isArray(d.initiatives))throw Error();if(confirm('¿Reemplazar los datos locales por el archivo importado?')){db=d;save();go('Inicio')}}catch(e){alert('Archivo de respaldo no válido')}};r.readAsText(f)}

// Relaciones múltiples por ID; lectura compatible con asociaciones antiguas por nombre.
function ensureBehaviorIds(x){(x.behaviors||[]).forEach(b=>{if(!b.id)b.id='beh-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);});}
function indicatorBehaviorIds(x,r){ensureBehaviorIds(x);return Array.isArray(r.behaviorIds)?r.behaviorIds.map(String):(x.behaviors||[]).filter(b=>r.behavior&&b.name===r.behavior).map(b=>String(b.id));}
function indicatorHasBehavior(x,r,b){return indicatorBehaviorIds(x,r).includes(String(b.id));}
function indicatorBehaviorLabel(x,r){const ids=indicatorBehaviorIds(x,r);return (x.behaviors||[]).filter(b=>ids.includes(String(b.id))).map(b=>b.name).join(', ')||(!Array.isArray(r.behaviorIds)?r.behavior||'':'');}
function writeIndicatorBehaviorIds(x,r,ids){const valid=new Set((x.behaviors||[]).map(b=>String(b.id)));r.behaviorIds=[...new Set(ids.map(String))].filter(id=>valid.has(id));r.behavior=(x.behaviors||[]).find(b=>r.behaviorIds.includes(String(b.id)))?.name||'';}
function behaviorIndicatorChoices(x,b){ensureBehaviorIds(x);const selected=x.indicators.filter(r=>b&&indicatorHasBehavior(x,r,b));return x.indicators.length?`<details class="association-picker"><summary>Seleccionar indicadores · ${selected.length} seleccionados</summary><div class="association-options">${x.indicators.map((r,i)=>`<label><input type="checkbox" name="existingIndicators" value="${i}"${b&&indicatorHasBehavior(x,r,b)?' checked':''} onchange="updateAssociationCount(this)"><span>${safe(r.name)} <small class="muted">· ${safe(r.type||'Sin tipo')}</small></span></label>`).join('')}</div><p class="muted">Puedes seleccionar varios. Cada indicador puede asociarse también a otros comportamientos.</p></details>`:'<p class="muted">Aún no hay indicadores. Puedes crearlos en Resultados → Indicadores o utilizar el formulario de indicador nuevo.</p>';}
function updateAssociationCount(input){const picker=input.closest('.association-picker');picker.querySelector('summary').textContent='Seleccionar '+(input.name==='behaviorIds'?'comportamientos':'indicadores')+' · '+picker.querySelectorAll('input:checked').length+' seleccionados';}
function linkBehaviorIndicators(x,b,selected){ensureBehaviorIds(x);const indexes=new Set(selected.map(String));x.indicators.forEach((r,i)=>{const ids=indicatorBehaviorIds(x,r).filter(id=>id!==String(b.id));if(indexes.has(String(i)))ids.push(String(b.id));writeIndicatorBehaviorIds(x,r,ids);});}
function saveBehaviorIndicators(e,i){e.preventDefault();const x=current(),b=x.behaviors[i];if(!b)return;linkBehaviorIndicators(x,b,new FormData(e.target).getAll('existingIndicators'));save();render();}
function indicatorBehaviorChoices(x,r){ensureBehaviorIds(x);const ids=indicatorBehaviorIds(x,r);return `<details class="association-picker"><summary>Seleccionar comportamientos · ${ids.length} seleccionados</summary><div class="association-options">${(x.behaviors||[]).map(b=>`<label><input type="checkbox" name="behaviorIds" value="${safe(b.id)}"${ids.includes(String(b.id))?' checked':''} onchange="updateAssociationCount(this)"><span>${safe(b.name)}</span></label>`).join('')||'<p class="muted">Aún no hay comportamientos.</p>'}</div><p class="muted">Sin selección: indicador general de la iniciativa.</p></details>`;}

function behaviorEditForm(x,b,i){return `<details id="behavior-edit-${i}" class="behavior-edit"><summary>Editar comportamiento</summary><form onsubmit="saveBehaviorEdit(event,${i})"><label>Comportamiento observable<input name="name" required value="${safe(b.name)}"></label><label>Descripción y contexto<textarea name="description">${safe(b.description||'')}</textarea></label><label class="behavior-observable-review"><input name="observableReviewed" type="checkbox" ${b.observableReviewed===true?'checked':''}><span>Revisé que describe una acción observable y verificable.</span></label><label>Alcance<select name="scope" onchange="this.form.querySelector('[data-edit-audiences]').hidden=this.value!=='specific'"><option value="all"${b.scope!=='specific'?' selected':''}>Todas las audiencias (incluidas las futuras)</option><option value="specific"${b.scope==='specific'?' selected':''}>Audiencias específicas</option></select></label><div data-edit-audiences${b.scope!=='specific'?' hidden':''}>${x.audiences.map(a=>`<label class="behavior-audience-option"><input type="checkbox" name="audienceIds" value="${safe(a.id)}"${(b.audienceIds||[]).includes(a.id)?' checked':''}><span>${safe(a.name)}</span></label>`).join('')||'<p class="muted">Crea primero una audiencia.</p>'}</div><h3>Indicadores asociados</h3>${behaviorIndicatorChoices(x,b)}<div class="flex"><button class="primary" type="submit">Guardar cambios</button><button class="secondary" type="button" onclick="cancelBehaviorEdit(${i})">Cancelar</button></div></form></details>`;}
function editBehavior(i){const el=document.getElementById('behavior-edit-'+i);if(!el)return;const card=el.closest('.behavior-registered');if(card)card.open=true;el.open=true;el.querySelector('input[name="name"]').focus();}
function cancelBehaviorEdit(i){const el=document.getElementById('behavior-edit-'+i);if(el){el.querySelector('form').reset();el.open=false;}render();}
function saveBehaviorEdit(e,i){e.preventDefault();const x=current(),b=x.behaviors[i];if(!b)return;const fd=new FormData(e.target),name=String(fd.get('name')||'').trim(),scope=fd.get('scope'),audiences=fd.getAll('audienceIds');if(!name)return alert('Indica el comportamiento observable');if(scope==='specific'&&!audiences.length)return alert('Selecciona al menos una audiencia o utiliza Todas las audiencias');ensureBehaviorIds(x);x.indicators.forEach(r=>writeIndicatorBehaviorIds(x,r,indicatorBehaviorIds(x,r)));b.name=name;b.description=String(fd.get('description')||'');b.observableReviewed=fd.get('observableReviewed')==='on';b.scope=scope;b.audienceIds=audiences;b.updatedAt=new Date().toISOString();linkBehaviorIndicators(x,b,fd.getAll('existingIndicators'));save();render();}

// Detalle de comportamiento cerrado inicialmente; conserva edición y eliminación.
function behaviorRegisteredCard(x,b,i){
 const indicators=(x.indicators||[]).filter(r=>indicatorHasBehavior(x,r,b));
 const number=indicators.length, plural=number===1?'indicador':'indicadores';
 return `<details class="behavior-registered behavior-design-row"><summary class="behavior-design-row-summary"><span class="behavior-design-row-copy"><strong>${safe(b.name)}</strong><small>${behaviorAudienceLabel(x,b)} · ${number} ${plural}</small></span><span class="behavior-design-chevron" aria-hidden="true">⌄</span></summary><div class="behavior-design-row-details">${b.description?`<p class="muted">${safe(b.description)}</p>`:''}<p class="behavior-design-linked"><strong>Indicadores:</strong> ${safe(indicators.map(r=>r.name).join(', ')||'Sin asociar')}</p>${behaviorEditForm(x,b,i)}<div class="behavior-design-row-actions"><button class="secondary" type="button" onclick="editBehavior(${i})">Editar comportamiento</button><button class="secondary" type="button" onclick="removeBehavior(${i})">Eliminar</button></div></div></details>`;
}
let behaviorDesignFormOpen=false,behaviorDesignFormInitiative=null;
function behaviorDesignFormState(x){
 const currentId=String(x.id);
 if(behaviorDesignFormInitiative!==currentId){
  behaviorDesignFormInitiative=currentId;
  behaviorDesignFormOpen=!(x.behaviors||[]).length;
 }
 return behaviorDesignFormOpen;
}
function behaviorDesignFormToggle(el){behaviorDesignFormOpen=!el.open}
function behaviorDesignFormShow(){
 behaviorDesignFormOpen=true;
 const el=document.getElementById('behavior-design-creator');
 if(el){el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});el.querySelector('input[name="name"]')?.focus()}
}
let behaviorExploreInitiative=null,behaviorExploreAudience='__all__',behaviorExploreSearch='',behaviorExploreSelected=null,behaviorExploreMatrixOpen=false,behaviorExploreDetailOpen=true;

function behaviorExploreRef(b,i){return String(b.id||"index:"+i)}

function behaviorExploreEnsure(x){
 ensureBehaviorIds(x);
 if(behaviorExploreInitiative!==String(x.id)){
  behaviorExploreInitiative=String(x.id);
  behaviorExploreAudience="__all__";
  behaviorExploreSearch="";
  behaviorExploreSelected=null;
  behaviorExploreMatrixOpen=false;
  behaviorExploreDetailOpen=!(typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(max-width: 710px)').matches);
 }
 if(behaviorExploreAudience!=="__all__"&&!(x.audiences||[]).some(a=>String(a.id)===String(behaviorExploreAudience)))behaviorExploreAudience="__all__";
}

function behaviorExploreMatchesAudience(b,audience){
 return audience==="__all__"||b.scope!=="specific"||(b.audienceIds||[]).some(id=>String(id)===String(audience));
}

function behaviorExploreVisible(x){
 behaviorExploreEnsure(x);
 const term=behaviorExploreSearch.trim().toLocaleLowerCase("es");
 return (x.behaviors||[]).map((b,i)=>({b,i,ref:behaviorExploreRef(b,i)})).filter(({b})=>
  behaviorExploreMatchesAudience(b,behaviorExploreAudience)&&
  (!term||[b.name,b.description].some(v=>String(v||"").toLocaleLowerCase("es").includes(term)))
 );
}

function behaviorExploreSelectedRecord(x,visible){
 if(!visible.length){behaviorExploreSelected=null;return null}
 const selection=visible.find(row=>row.ref===behaviorExploreSelected)||visible[0];
 behaviorExploreSelected=selection.ref;
 return selection;
}


/* Completitud orientativa del diseño: comprueba registros, no garantiza calidad científica.
   La observabilidad requiere confirmación explícita, nunca inferida por el título. */
function behaviorDesignQuality(x,b){
 const audienceValid=b.scope!=='specific'||(b.audienceIds||[]).some(id=>(x.audiences||[]).some(a=>String(a.id)===String(id)));
 const indicators=(x.indicators||[]).filter(ind=>indicatorHasBehavior(x,ind,b));
 const steps=[
  {name:'Acción observable',done:!!String(b.name||'').trim()&&b.observableReviewed===true,
    hint:'Confirmar que el título describe una acción que puede observarse y verificarse.'},
  {name:'Descripción y contexto',done:!!String(b.description||'').trim(),
    hint:'Precisar en qué actividad o situación debe ocurrir el comportamiento.'},
  {name:'Audiencia definida',done:audienceValid,
    hint:'Seleccionar audiencias existentes o usar el alcance general.'},
  {name:'Indicador asociado',done:indicators.length>0,
    hint:'Asociar al menos un indicador para observar la ejecución.'}
 ];
 const completed=steps.filter(step=>step.done).length;
 const started=!!String(b.description||'').trim()||indicators.length>0||b.observableReviewed===true||
   (b.scope==='specific'&&(b.audienceIds||[]).length>0);
 const status=completed===steps.length?'Diseño completo':started?'Por completar':'Borrador';
 return {status,completed,total:steps.length,steps,css:status==='Diseño completo'?'complete':status==='Por completar'?'partial':'draft'};
}
function behaviorDesignQualityBadge(quality){
 return '<span class="behavior-quality-tag is-'+quality.css+'">'+safe(quality.status)+'</span>';
}
function behaviorDesignQualityPanel(quality){
 return '<details class="behavior-quality-review"><summary>'+
   behaviorDesignQualityBadge(quality)+
   '<span class="behavior-quality-review-progress">'+quality.completed+' de '+quality.total+' criterios</span>'+
   '<span class="behavior-quality-review-more">Revisar diseño <span aria-hidden="true">⌄</span></span></summary>'+
   '<div class="behavior-quality-review-body">'+quality.steps.map(step=>
    '<div class="behavior-quality-step '+(step.done?'is-done':'is-pending')+'"><span aria-hidden="true">'+(step.done?'✓':'○')+'</span><div><strong>'+safe(step.name)+'</strong>'+
    (!step.done?'<small>'+safe(step.hint)+'</small>':'')+'</div></div>'
   ).join('')+
   '<p>El estado indica que se registraron los elementos del diseño; no certifica que el comportamiento o sus indicadores sean científicamente válidos.</p></div></details>';
}

function behaviorExploreEntries(x,visible,selected){
 return visible.length?visible.map(({b,i,ref})=>{
  const n=(x.indicators||[]).filter(ind=>indicatorHasBehavior(x,ind,b)).length;
  const quality=behaviorDesignQuality(x,b);
  return `<button type="button" class="behavior-explore-entry ${selected&&selected.ref===ref?'is-active':''}" data-ref="${safe(ref)}" aria-pressed="${!!selected&&selected.ref===ref}" onclick="behaviorExploreSelect(this.dataset.ref)">
    <span class="behavior-explore-entry-title">${safe(b.name||"Sin título")}</span>
    <span class="behavior-explore-entry-foot">${behaviorAudienceLabel(x,b)}<span aria-hidden="true">·</span>${n} ${n===1?'indicador':'indicadores'}${behaviorDesignQualityBadge(quality)}</span>
  </button>`;
 }).join(""):`<div class="behavior-explore-no-results">No se encontraron comportamientos. Prueba otra audiencia o búsqueda.</div>`;
}

function behaviorExploreInspector(x,selection){
 if(!selection)return `<div class="behavior-explore-inspector-empty"><span aria-hidden="true">◎</span><strong>Selecciona un comportamiento</strong><p>Cuando elijas uno, verás sus audiencias, indicadores y opciones de edición.</p><button type="button" class="behavior-explore-hide" id="behavior-explore-hide" onclick="behaviorExploreSetDetailOpen(false)">Ocultar ficha <span aria-hidden="true">→</span></button></div>`;
 const {b,i}=selection;
 const linked=(x.indicators||[]).filter(ind=>indicatorHasBehavior(x,ind,b));
 const quality=behaviorDesignQuality(x,b);
 return `<div class="behavior-registered behavior-explore-detail">
 <div class="behavior-explore-detail-top"><span class="behavior-explore-kicker">COMPORTAMIENTO SELECCIONADO</span><div class="behavior-explore-detail-tools"><span class="behavior-explore-detail-number">${i+1} de ${(x.behaviors||[]).length}</span><button type="button" class="behavior-explore-hide" id="behavior-explore-hide" aria-label="Ocultar ficha del comportamiento" title="Ocultar ficha y ampliar lista" onclick="behaviorExploreSetDetailOpen(false)">Ocultar ficha <span aria-hidden="true">→</span></button></div></div>
 <h3>${safe(b.name||"Sin título")}</h3>
 ${behaviorDesignQualityPanel(quality)}
 ${b.description?`<p class="behavior-explore-description">${safe(b.description)}</p>`:""}
 <div class="behavior-explore-detail-meta">
  <div><span>Audiencias</span><strong>${behaviorAudienceLabel(x,b)}</strong></div>
  <div><span>Indicadores asociados</span><strong>${linked.length}</strong></div>
 </div>
 <div class="behavior-explore-indicators"><strong>Indicadores vinculados</strong>${linked.length?`<div class="behavior-explore-indicator-tags">${linked.map(ind=>`<span title="${safe(ind.type||'Sin tipo')}">${safe(ind.name)}</span>`).join("")}</div>`:`<p class="muted">Sin indicadores vinculados por ahora.</p>`}</div>
 ${behaviorEditForm(x,b,i)}
 <div class="behavior-explore-detail-actions"><button type="button" class="primary" onclick="editBehavior(${i})">Editar comportamiento</button><button type="button" class="secondary" onclick="removeBehavior(${i})">Eliminar</button></div>
 </div>`;
}

function behaviorExploreApplyDetailVisibility(){
 const grid=document.getElementById('behavior-explore-grid');
 const panel=document.getElementById('behavior-explore-inspector');
 const show=document.getElementById('behavior-explore-show');
 if(grid)grid.classList.toggle('is-detail-collapsed',!behaviorExploreDetailOpen);
 if(panel)panel.setAttribute('aria-hidden',String(!behaviorExploreDetailOpen));
 if(show)show.setAttribute('aria-expanded',String(behaviorExploreDetailOpen));
}
function behaviorExploreSetDetailOpen(open){
 behaviorExploreDetailOpen=!!open;
 behaviorExploreApplyDetailVisibility();
 if(!behaviorExploreDetailOpen)document.getElementById('behavior-explore-show')?.focus({preventScroll:true});
 else document.getElementById('behavior-explore-hide')?.focus({preventScroll:true});
}
function behaviorExploreRefresh(){
 const x=current();if(!x)return;
 const visible=behaviorExploreVisible(x),selected=behaviorExploreSelectedRecord(x,visible);
 const list=document.getElementById("behavior-explore-entries");
 const inspector=document.getElementById("behavior-explore-inspector");
 const count=document.getElementById("behavior-explore-count");
 if(list)list.innerHTML=behaviorExploreEntries(x,visible,selected);
 if(inspector)inspector.innerHTML=behaviorExploreInspector(x,selected);
 if(count)count.textContent=visible.length+" de "+(x.behaviors||[]).length;
 behaviorExploreApplyDetailVisibility();
}

function behaviorExploreSelect(ref){
 behaviorExploreSelected=String(ref);
 behaviorExploreDetailOpen=true;
 behaviorExploreRefresh();
 if(typeof window!=='undefined'&&window.matchMedia?.('(max-width: 710px)').matches)
  document.getElementById('behavior-explore-hide')?.focus({preventScroll:true});
}

function behaviorExploreSetAudience(ref){behaviorExploreAudience=String(ref);behaviorExploreRefresh()}

function behaviorExploreSetSearch(value){behaviorExploreSearch=String(value||"");behaviorExploreRefresh()}

function behaviorExploreFromMatrix(ref){
 behaviorExploreAudience="__all__";
 behaviorExploreSearch="";
 behaviorExploreSelected=String(ref);
 behaviorExploreDetailOpen=true;
 const audience=document.getElementById("behavior-explore-audience");
 const search=document.getElementById("behavior-explore-search");
 if(audience)audience.value="__all__";
 if(search)search.value="";
 behaviorExploreRefresh();
 if(typeof window!=='undefined'&&window.matchMedia?.('(max-width: 710px)').matches)
  document.getElementById('behavior-explore-hide')?.focus({preventScroll:true});
 else document.getElementById("behavior-explore-browser")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function behaviorExploreMatrix(x){
 const audiences=x.audiences||[],rows=x.behaviors||[];
 const tableRows=rows.map((b,i)=>{
  const general=b.scope!=="specific";
  const ref=behaviorExploreRef(b,i);
  const cell=(on,label)=>`<td class="${on?'behavior-matrix-yes':'behavior-matrix-no'}"><span aria-label="${safe(label)}">${on?'✓':'—'}</span></td>`;
  return `<tr><th scope="row"><button type="button" title="${safe(b.name||'Comportamiento')}" data-ref="${safe(ref)}" onclick="behaviorExploreFromMatrix(this.dataset.ref)">${safe(b.name||'Sin título')}</button></th>
   ${cell(general,general?'Aplica a todas las audiencias':'Solo a las audiencias seleccionadas')}
   ${audiences.map(a=>{const applies=general||(b.audienceIds||[]).some(id=>String(id)===String(a.id));return cell(applies,applies?'Aplica a '+a.name:'No asignado a '+a.name)}).join("")}
  </tr>`;
 }).join("");
 return `<details class="panel behavior-matrix-panel" id="behavior-design-matrix" ${behaviorExploreMatrixOpen?'open':''}>
 <summary onclick="behaviorExploreMatrixOpen=!this.parentElement.open"><span class="behavior-matrix-glyph" aria-hidden="true">▦</span><span class="behavior-matrix-summary-text"><strong>Matriz de cobertura</strong><small>Consulta qué comportamientos corresponden a cada audiencia. Despliega solo cuando la necesites.</small></span><span class="behavior-design-chevron" aria-hidden="true">⌄</span></summary>
 <div class="behavior-matrix-body">${rows.length?`<div class="behavior-matrix-scroll"><table><thead><tr><th scope="col">Comportamiento</th><th scope="col">General</th>${audiences.map(a=>`<th scope="col" title="${safe(a.name)}">${safe(a.name)}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></div>`:`<p class="muted">No hay comportamientos registrados.</p>`}
 <p class="behavior-matrix-footnote">✓ indica que el comportamiento aplica a esa audiencia, no que ya haya sido adoptado. «General» significa todas las audiencias, incluidas las futuras. Un comportamiento compartido sigue siendo un único registro.</p>
 </div></details>`;
}

function behaviorDesignPage(x){
 const expanded=behaviorDesignFormState(x),count=(x.behaviors||[]).length;
 behaviorExploreEnsure(x);
 const visible=behaviorExploreVisible(x),selected=behaviorExploreSelectedRecord(x,visible);
 return `<div class="behavior-design-layout">
 <details class="panel behavior-create-panel" id="behavior-design-creator" ${expanded?'open':''}>
  <summary onclick="behaviorDesignFormToggle(this.parentElement)"><span class="behavior-create-icon" aria-hidden="true">＋</span><span class="behavior-create-summary-text"><strong>Crear comportamiento</strong><small>Empieza por una acción observable. Las demás opciones son voluntarias.</small></span><span class="behavior-design-chevron" aria-hidden="true">⌄</span></summary>
  <div class="behavior-create-content">
   <form class="behavior-create-form" onsubmit="addBehavior(event)">
    <label class="behavior-create-main-label">¿Qué comportamiento queremos observar?<input name="name" required maxlength="260" placeholder="Ej. Registrar correctamente cada solicitud"></label>
    <details class="behavior-create-optional">
     <summary>Descripción y contexto <small>Opcional</small></summary>
     <label>¿En qué situación debe ocurrir?<textarea name="description" rows="2" placeholder="Contexto, actividad y observaciones"></textarea></label><label class="behavior-observable-review"><input name="observableReviewed" type="checkbox"><span>Revisé que la conducta describe una acción observable y verificable.</span></label>
    </details>
    <details class="behavior-create-optional">
     <summary>Audiencias e indicadores <small>Opcional</small></summary>
     <div class="behavior-create-settings">
      <label>Alcance<select name="scope" onchange="document.getElementById('audienceChoices').hidden=this.value!=='specific'"><option value="all">Todas las audiencias (incluidas las futuras)</option><option value="specific">Audiencias específicas</option></select></label>
      <div id="audienceChoices" hidden><strong>Seleccionar audiencias</strong><div class="behavior-create-audience-list">${audienceChecks(x)}</div></div>
      <div class="behavior-create-extra-actions"><button type="button" class="secondary" onclick="showAudienceForm('designAudience')">+ Crear audiencia</button></div>
      <div id="designAudience" class="hide">${audienceForm()}</div>
      <div class="behavior-create-indicators"><h3>Indicadores existentes</h3>${behaviorIndicatorChoices(x)}</div>
      <details class="behavior-create-optional behavior-create-indicator-new">
       <summary>Crear un indicador nuevo <small>Opcional</small></summary>
       <div class="behavior-create-indicator-fields">
        <label>Tipo de indicador<select name="kind"><option value="">Sin indicador nuevo</option><option>Predictivo</option><option>Gestión</option></select></label>
        <label>Nombre del indicador<input name="indicator" placeholder="Nombre del indicador"></label>
        <label>Meta<input name="target" placeholder="Meta" type="number" step="any"></label>
       </div>
      </details>
     </div>
    </details>
    <div class="behavior-create-actions"><button class="primary" type="submit">Guardar comportamiento</button><span>Solo el nombre es obligatorio.</span></div>
   </form>
  </div>
 </details>
 <section class="panel behavior-explorer" id="behavior-explore-browser">
  <div class="behavior-explorer-header"><div><h2>Explorar comportamientos <span class="behavior-design-count">${count}</span></h2><p class="muted">Selecciona una audiencia y abre la ficha de cada comportamiento.</p></div></div>
  <div class="behavior-explorer-controls"><label>Audiencia<select id="behavior-explore-audience" aria-label="Filtrar por audiencia" onchange="behaviorExploreSetAudience(this.value)">
   <option value="__all__" ${behaviorExploreAudience==='__all__'?'selected':''}>Todas las audiencias</option>
   ${(x.audiences||[]).map(a=>`<option value="${safe(a.id)}" ${String(a.id)===behaviorExploreAudience?'selected':''}>${safe(a.name)}</option>`).join("")}
  </select></label>
  <label>Buscar comportamiento<input id="behavior-explore-search" type="search" autocomplete="off" value="${safe(behaviorExploreSearch)}" placeholder="Buscar por nombre o descripción" oninput="behaviorExploreSetSearch(this.value)"></label></div>
  <div class="behavior-explorer-grid ${behaviorExploreDetailOpen?'':'is-detail-collapsed'}" id="behavior-explore-grid">
   <div class="behavior-explorer-list-panel"><div class="behavior-explorer-list-head"><strong>Comportamientos</strong><div class="behavior-explore-list-tools"><small id="behavior-explore-count">${visible.length} de ${count}</small><button type="button" class="behavior-explore-show" id="behavior-explore-show" aria-controls="behavior-explore-inspector" aria-expanded="${behaviorExploreDetailOpen}" onclick="behaviorExploreSetDetailOpen(true)">Mostrar ficha <span aria-hidden="true">←</span></button></div></div><div id="behavior-explore-entries" class="behavior-explore-entries">${behaviorExploreEntries(x,visible,selected)}</div></div>
   <div class="behavior-explore-backdrop" aria-hidden="true" onclick="behaviorExploreSetDetailOpen(false)"></div>
   <div id="behavior-explore-inspector" class="behavior-explore-inspector" aria-hidden="${!behaviorExploreDetailOpen}">${behaviorExploreInspector(x,selected)}</div>
  </div>
 </section>
 ${behaviorExploreMatrix(x)}
 </div>`;
}
