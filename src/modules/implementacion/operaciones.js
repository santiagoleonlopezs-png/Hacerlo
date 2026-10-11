function portfolioMetricSummary(){if(!db.initiatives.length)return '';return `<section class="panel"><h2>Seguimiento de indicadores · Portafolio</h2><p class="muted">Últimas mediciones por iniciativa. No se promedian indicadores con escalas distintas.</p><div style="overflow:auto"><table><thead><tr><th>Iniciativa</th><th>INS personas</th><th>INS proceso</th><th>CNPS</th></tr></thead><tbody>${db.initiatives.map(i=>`<tr><td>${safe(i.name)}</td>${['ins_personas','ins_proceso','cnps'].map(k=>{let h=((i.metricHistory||{})[k]||[]),v=h.length?h[h.length-1]:null;return `<td>${v?safe(v.value)+'<br><small class="muted">'+safe(v.date)+'</small>':'—'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div></section>`}
const coreMetricNames={ins_personas:'INS personas',ins_proceso:'INS proceso',cnps:'CNPS'};
function metricCard(x,label,key){let history=(x.metricHistory||{})[key]||[],latest=history.length?history[history.length-1]:null;return `<section class="panel"><h3>${label}</h3><div class="metric">${safe(latest?latest.value:(x.metrics[key]??'—'))}</div><small class="muted">${safe(x.metrics[key+'_definition']||'Escala por definir')}</small><p class="subtle">${latest?'Última medición: '+safe(latest.date):'Sin historial de mediciones'}</p><button class="primary" onclick="openMetricEntry('${key}')">+ Registrar medición</button><button class="secondary" onclick="toggleMetricHistory('${key}')">Ver historial y tendencia</button><div id="metric-history-${key}" class="hide">${metricHistoryView(x,key)}</div></section>`}
function openMetricEntry(key){let x=current(),form=$('metric-entry');if(!form){document.body.insertAdjacentHTML('beforeend',`<div id="metric-entry" class="metric-overlay"><form class="metric-dialog" onsubmit="recordCoreMetric(event)"><div class="flex" style="justify-content:space-between"><h2 id="metric-title">Registrar medición</h2><button type="button" class="secondary" onclick="closeMetricEntry()">Cerrar ×</button></div><input name="key" type="hidden"><label>Fecha<input name="date" type="date" required></label><label>Valor<input name="value" type="number" step="any" required></label><label>Período (opcional)<input name="period" placeholder="Ej. Octubre 2026"></label><label>Definición y escala<input name="definition" placeholder="Ej. Porcentaje, escala de -100 a 100"></label><label>Observaciones<textarea name="notes" placeholder="Contexto de esta medición"></textarea></label><button class="primary" type="submit">Guardar medición</button></form></div>`);form=$('metric-entry')}let f=form.querySelector('form');f.elements.key.value=key;f.elements.date.value=new Date().toISOString().slice(0,10);f.elements.value.value='';f.elements.period.value='';f.elements.notes.value='';f.elements.definition.value=x.metrics[key+'_definition']||'';$('metric-title').textContent='Registrar · '+coreMetricNames[key];form.style.display='flex'}
function closeMetricEntry(){let m=$('metric-entry');if(m)m.style.display='none'}
function recordCoreMetric(e){e.preventDefault();let f=e.target,x=current(),k=f.elements.key.value,v=Number(f.elements.value.value);if(!Number.isFinite(v))return alert('Ingresa un valor válido');x.metricHistory=x.metricHistory||{};x.metricHistory[k]=x.metricHistory[k]||[];x.metricHistory[k].push({date:f.elements.date.value,value:v,period:f.elements.period.value,notes:f.elements.notes.value});x.metricHistory[k].sort((a,b)=>a.date.localeCompare(b.date));x.metrics[k]=x.metricHistory[k].at(-1).value;x.metrics[k+'_definition']=f.elements.definition.value;save();closeMetricEntry();render()}
function toggleMetricHistory(k){let el=$('metric-history-'+k);if(el)el.classList.toggle('hide')}
function metricHistoryView(x,k){let h=((x.metricHistory||{})[k]||[]);if(!h.length)return '<p class="muted">Aún no hay mediciones.</p>';let nums=h.map(v=>Number(v.value)),min=Math.min(...nums),max=Math.max(...nums),points=h.map((v,i)=>`${18+i*440/Math.max(1,h.length-1)},${112-(v.value-min)*85/(max-min||1)}`).join(' ');return `<div style="overflow:auto"><svg viewBox="0 0 480 135" aria-label="Tendencia de ${coreMetricNames[k]}"><line x1="18" y1="117" x2="460" y2="117" stroke="#42677c"/><polyline fill="none" stroke="#23c9c1" stroke-width="3" points="${points}"/>${h.map((v,i)=>`<circle cx="${18+i*440/Math.max(1,h.length-1)}" cy="${112-(v.value-min)*85/(max-min||1)}" r="4" fill="#e4f9ff"/>`).join('')}</svg><table><thead><tr><th>Fecha</th><th>Valor</th><th>Período</th><th>Observaciones</th></tr></thead><tbody>${h.slice().reverse().map(v=>`<tr><td>${safe(v.date)}</td><td>${safe(v.value)}</td><td>${safe(v.period||'—')}</td><td>${safe(v.notes||'—')}</td></tr>`).join('')}</tbody></table></div>`}
function setObjective(v){current().objective=v;save()}function setField(k,v){current()[k]=v;save()}function setMetric(k,v){current().metrics[k]=v;save()}
function addBehavior(e){e.preventDefault();let fd=new FormData(e.target),z=Object.fromEntries(fd);z.audienceIds=fd.getAll('audienceIds');if(z.scope==='specific'&&!z.audienceIds.length)return alert('Selecciona al menos una audiencia o utiliza Todas las audiencias');current().behaviors.push(z);if(z.kind&&z.indicator){current().indicators.push({name:z.indicator,type:z.kind,behavior:z.name,definition:'',baseline:'',target:z.target||'',value:'',history:[]})}save();render()}
function removeBehavior(i){if(confirm('¿Eliminar este comportamiento? Los indicadores ya creados se conservarán.')){current().behaviors.splice(i,1);save();render()}}
function addSystemVariable(e){e.preventDefault();current().systemVariables.push(Object.fromEntries(new FormData(e.target)));save();render()}
function addSystemLink(e){e.preventDefault();let z=Object.fromEntries(new FormData(e.target));if(z.from===z.to)return alert('Elige dos variables diferentes');current().systemLinks.push({from:Number(z.from),to:Number(z.to),sign:Number(z.sign),delay:!!z.delay,evidence:z.evidence});save();render()}
function setNote(v){let x=current();x.notes=x.notes||{};x.notes[phase]=v;save()}function xPhase(){current().phase=phase;save();render()}function setDim(d,v){current().dimensions[d]=Number(v);save();render()}
function addIndicator(e){e.preventDefault();let z=Object.fromEntries(new FormData(e.target));z.history=z.value!==''?[{date:new Date().toISOString(),value:Number(z.value)}]:[];current().indicators.push(z);save();render()}function updateIndicator(i,v){let z=current().indicators[i];z.value=v;z.history=z.history||[];if(v!=='')z.history.push({date:new Date().toISOString(),value:Number(v)});save();render()}function addAction(e){
 e.preventDefault();const f=e.target,z=Object.fromEntries(new FormData(f)),index=z.editIndex;
 delete z.editIndex;
 if(z.start&&z.end&&z.end<z.start)return alert('La fecha final debe ser igual o posterior a la inicial');
 const x=current();if(!x)return;
 if(index!==''&&Number.isInteger(Number(index))&&x.actions[Number(index)]){
  x.actions[Number(index)]={...x.actions[Number(index)],...z};
 }else{x.actions.push({...z,status:'Pendiente',createdAt:new Date().toISOString()})}
 save();render();
}
function editAction(index){
 const x=current(),z=x?.actions?.[index],f=document.getElementById('action-form');if(!z||!f)return;
 f.elements.editIndex.value=String(index);
 for(const key of ['name','dimension','owner','start','end','source','hypothesis']){
  if(!f.elements[key])continue;
  let value=z[key]||'';
  if(key==='source'&&!['Manual','Inteligencia artificial','Diagnóstico'].includes(value))value=value.toLowerCase().includes('inteligencia')?'Inteligencia artificial':'Manual';
  if(key==='dimension'&&!dims.includes(value))value=dims[0];
  f.elements[key].value=value;
 }
 document.getElementById('action-submit').textContent='Guardar cambios';
 document.getElementById('action-cancel').classList.remove('hide');
 f.closest('.panel').scrollIntoView({behavior:'smooth',block:'start'});
 f.elements.name.focus({preventScroll:true});
}
function cancelActionEdit(){
 const f=document.getElementById('action-form');if(!f)return;
 f.reset();f.elements.editIndex.value='';
 document.getElementById('action-submit').textContent='+ Crear acción';
 document.getElementById('action-cancel').classList.add('hide');
}
function prepareAIAction(index){
 const x=current(),a=x?.integratedAIAnalysis?.interventions?.[index];if(!a)return;
 go('Intervenciones');
 const f=document.getElementById('action-form');if(!f)return;
 f.elements.name.value=a.name||'';
 f.elements.source.value='Inteligencia artificial';
 f.elements.hypothesis.value=a.why||'';
 f.closest('.panel').scrollIntoView({behavior:'smooth',block:'start'});
 f.elements.name.focus({preventScroll:true});
}
function setAction(i,v){current().actions[i].status=v;save();render()}
function toggleReverse(sel){let form=sel.form,group=form.querySelector('.reverse-fields'),on=sel.value==='bidirectional';group.hidden=!on;group.querySelectorAll('input,select').forEach(el=>el.disabled=!on)}
function addNode(e){e.preventDefault();current().nodes.push(Object.fromEntries(new FormData(e.target)));save();render()}
function addEdge(e){e.preventDefault();let z=Object.fromEntries(new FormData(e.target));if(z.source===z.target)return alert('Selecciona dos nodos diferentes');let relation=z.relation==='Otra'?(z.customRelation||'Otra').trim():z.relation;let edge={s:Number(z.source),t:Number(z.target),relation,relationKey:normalizeRelation(relation),evidence:z.evidence||'Declarada'};if(z.measureType&&z.measureValue!==''){edge.measureType=z.measureType;edge.measureValue=Number(z.measureValue);if(z.measureUnit)edge.measureUnit=z.measureUnit}current().edges.push(edge);save();render()}
function addCausal(e){e.preventDefault();current().causal.push(Object.fromEntries(new FormData(e.target)));save();render()}
function exportData(){let b=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='HACERLO_respaldo.json';a.click();URL.revokeObjectURL(u)}
function importData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let d=JSON.parse(r.result);if(!Array.isArray(d.initiatives))throw Error();if(confirm('¿Reemplazar los datos locales por el archivo importado?')){db=d;save();go('Inicio')}}catch(e){alert('Archivo de respaldo no válido')}};r.readAsText(f)}
