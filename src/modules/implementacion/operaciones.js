/* Seguimiento del portafolio: fuente única de mediciones dentro de Medición. */
function openPortfolioMetric(button){
 const row=button.closest('[data-portfolio-metric-id]');
 const item=db.initiatives.find(i=>String(i.id)===row?.getAttribute('data-portfolio-metric-id'));
 if(!item)return;
 db.selected=item.id;save();go('Analítica');
}
function portfolioMetricSummary(){
 const all=db.initiatives||[];
 if(!all.length)return '<section class="panel hcx-portfolio-metrics"><h2>Seguimiento de indicadores · Portafolio</h2><p class="muted">Aún no hay iniciativas con mediciones.</p><button class="secondary" type="button" onclick="go(\'Iniciativas\')">Ir a iniciativas</button></section>';
 const labels=[['ins_personas','INS personas'],['ins_proceso','INS proceso'],['cnps','CNPS']];
 const value=(i,k)=>{
   const h=((i.metricHistory||{})[k]||[]);
   let v=typeof eeHomeMetric==='function'?eeHomeMetric(i,k):null;
   v=v||(h.length?h[h.length-1]:null);
   if(!v||v.value===null||v.value===undefined||v.value==='')return '<span class="hcx-metric-missing">Sin registro</span>';
   return '<strong>'+safe(v.value)+'</strong>'+(v.note||v.date?'<small>'+safe(v.note||v.date)+'</small>':'');
 };
 return '<section class="panel hcx-portfolio-metrics"><div class="hcx-portfolio-metric-head"><div><span class="ci-eyebrow">MEDICIÓN · PORTAFOLIO</span>'+
  '<h2>Seguimiento de indicadores</h2><p class="muted">Última medición disponible por iniciativa. Abre una iniciativa para ver su historial y tendencias.</p></div></div>'+
  '<div class="hcx-portfolio-metric-table"><table><thead><tr><th scope="col">Iniciativa</th>'+
   labels.map(([,label])=>'<th scope="col">'+label+'</th>').join('')+'<th scope="col">Acción</th></tr></thead><tbody>'+
  all.map(i=>'<tr data-portfolio-metric-id="'+safe(String(i.id))+'"><th scope="row">'+safe(i.name)+'</th>'+
   labels.map(([k])=>'<td>'+value(i,k)+'</td>').join('')+
   '<td><button type="button" class="secondary" onclick="openPortfolioMetric(this)">Ver detalle ↗</button></td></tr>').join('')+
  '</tbody></table></div><p class="notice">Los valores mantienen sus escalas originales; no se calcula un promedio entre INS y CNPS.</p></section>';
}
const coreMetricNames={ins_personas:'INS personas',ins_proceso:'INS proceso',cnps:'CNPS'};
function metricCard(x,label,key){let history=(x.metricHistory||{})[key]||[],latest=(typeof eeHomeMetric==='function'?eeHomeMetric(x,key):null)||(history.length?history[history.length-1]:null);return `<section class="panel"><h3>${label}</h3><div class="metric">${safe(latest?(latest.value??'—'):(x.metrics[key]??'—'))}</div><small class="muted">${safe(x.metrics[key+'_definition']||'Escala por definir')}</small><p class="subtle">${latest?safe(latest.note||('Última medición: '+latest.date)):'Sin historial de mediciones'}</p><button class="primary" onclick="openMetricEntry('${key}')">+ Registrar medición</button><button class="secondary" onclick="toggleMetricHistory('${key}')">Ver historial y tendencia</button><div id="metric-history-${key}" class="hide">${metricHistoryView(x,key)}</div></section>`}
function openMetricEntry(key){let x=current(),form=$('metric-entry');if(!form){document.body.insertAdjacentHTML('beforeend',`<div id="metric-entry" class="metric-overlay"><form class="metric-dialog" onsubmit="recordCoreMetric(event)"><div class="flex" style="justify-content:space-between"><h2 id="metric-title">Registrar medición</h2><button type="button" class="secondary" onclick="closeMetricEntry()">Cerrar ×</button></div><input name="key" type="hidden"><label>Fecha<input name="date" type="date" required></label><label>Valor<input name="value" type="number" step="any" required></label><label>Período (opcional)<input name="period" placeholder="Ej. Octubre 2026"></label><label>Definición y escala<input name="definition" placeholder="Ej. Porcentaje, escala de -100 a 100"></label><label>Observaciones<textarea name="notes" placeholder="Contexto de esta medición"></textarea></label><button class="primary" type="submit">Guardar medición</button></form></div>`);form=$('metric-entry')}let f=form.querySelector('form');f.elements.key.value=key;f.elements.date.value=new Date().toISOString().slice(0,10);f.elements.value.value='';f.elements.period.value='';f.elements.notes.value='';f.elements.definition.value=x.metrics[key+'_definition']||'';$('metric-title').textContent='Registrar · '+coreMetricNames[key];form.style.display='flex'}
function closeMetricEntry(){let m=$('metric-entry');if(m)m.style.display='none'}
function recordCoreMetric(e){e.preventDefault();let f=e.target,x=current(),k=f.elements.key.value,v=Number(f.elements.value.value);if(!Number.isFinite(v))return alert('Ingresa un valor válido');x.metricHistory=x.metricHistory||{};x.metricHistory[k]=x.metricHistory[k]||[];x.metricHistory[k].push({date:f.elements.date.value,value:v,period:f.elements.period.value,notes:f.elements.notes.value});x.metricHistory[k].sort((a,b)=>a.date.localeCompare(b.date));x.metrics[k]=x.metricHistory[k].at(-1).value;x.metrics[k+'_definition']=f.elements.definition.value;save();closeMetricEntry();render()}
function toggleMetricHistory(k){let el=$('metric-history-'+k);if(el)el.classList.toggle('hide')}
function metricHistoryView(x,k){let h=((x.metricHistory||{})[k]||[]);if(!h.length)return '<p class="muted">Aún no hay mediciones.</p>';let nums=h.map(v=>Number(v.value)),min=Math.min(...nums),max=Math.max(...nums),points=h.map((v,i)=>`${18+i*440/Math.max(1,h.length-1)},${112-(v.value-min)*85/(max-min||1)}`).join(' ');return `<div style="overflow:auto"><svg viewBox="0 0 480 135" aria-label="Tendencia de ${coreMetricNames[k]}"><line x1="18" y1="117" x2="460" y2="117" stroke="#42677c"/><polyline fill="none" stroke="#23c9c1" stroke-width="3" points="${points}"/>${h.map((v,i)=>`<circle cx="${18+i*440/Math.max(1,h.length-1)}" cy="${112-(v.value-min)*85/(max-min||1)}" r="4" fill="#e4f9ff"/>`).join('')}</svg><table><thead><tr><th>Fecha</th><th>Valor</th><th>Período</th><th>Observaciones</th></tr></thead><tbody>${h.slice().reverse().map(v=>`<tr><td>${safe(v.date)}</td><td>${safe(v.value)}</td><td>${safe(v.period||'—')}</td><td>${safe(v.notes||'—')}</td></tr>`).join('')}</tbody></table></div>`}
function setObjective(v){current().objective=v;save()}function setField(k,v){current()[k]=v;save()}function setMetric(k,v){current().metrics[k]=v;save()}
function addBehavior(e){
 e.preventDefault();
 const x=current(),fd=new FormData(e.target),z=Object.fromEntries(fd);
 const name=String(fd.get('name')||'').trim(),selected=fd.getAll('existingIndicators');
 if(!name)return alert('Indica el comportamiento observable.');
 z.name=name;
 z.audienceIds=fd.getAll('audienceIds');
 z.observableReviewed=fd.get('observableReviewed')==='on';
 if(z.scope==='specific'&&!z.audienceIds.length)return alert('Selecciona al menos una audiencia o utiliza Todas las audiencias.');
 const panel=e.target.querySelector('.behavior-create-indicator-new');
 const indicator=panel?behaviorIndicatorFromFields(panel,true):null;
 if(indicator?.name){
  if(!indicator.measureType||!indicator.unit)return alert('Selecciona cómo vamos a medirlo y la unidad del indicador.');
  const error=behaviorIndicatorValidation(indicator);if(error)return alert(error);
 }
 for(const key of ['existingIndicators','kind','indicator','target','newIndicatorDefinition','newIndicatorMeasureType','newIndicatorUnit','newIndicatorScale','newIndicatorScaleMin','newIndicatorScaleMax','newIndicatorBaseline','newIndicatorValue'])delete z[key];
 z.id='beh-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
 x.behaviors.push(z);
 linkBehaviorIndicators(x,z,selected);
 if(indicator?.name){
  const now=new Date().toISOString();
  Object.assign(indicator,{id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'ind-'+Date.now(),behavior:z.name,behaviorIds:[String(z.id)],history:indicator.value!==''?[{date:now,value:Number(indicator.value)}]:[],revisionHistory:[]});
  x.indicators.push(indicator);
 }
 behaviorDesignFormOpen=false;save();render();
}
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
 const editor=document.getElementById('action-editor');
 if(editor)editor.open=true; // El formulario está plegado hasta que se crea o edita una acción.
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
 (editor||f.closest('.panel'))?.scrollIntoView({behavior:'smooth',block:'start'});
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
 const editor=document.getElementById('action-editor');
 if(editor)editor.open=false;
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
function behaviorIndicatorOptions(items,value){
 const list=[...items];if(value&&!list.includes(value))list.push(value);
 return list.map(item=>'<option value="'+safe(item)+'"'+(String(value||'')===String(item)?' selected':'')+'>'+safe(item)+'</option>').join('');
}
function behaviorIndicatorTypes(){
 return typeof indicatorMeasureTypes==='function'?indicatorMeasureTypes():typeof RESULT_TYPES!=='undefined'?RESULT_TYPES:['Conteo de eventos o casos','Porcentaje de cumplimiento','Impacto en resultados'];
}
function behaviorIndicatorUnits(){
 return typeof indicatorMeasureUnits==='function'?indicatorMeasureUnits():typeof RESULT_UNITS!=='undefined'?RESULT_UNITS:['Cantidad','Porcentaje (%)','Puntos / índice','Escala'];
}
function behaviorIndicatorFields(record={},newRecord=false){
 const data=record||{},field=(k)=>newRecord?{name:({name:'indicator',type:'kind',definition:'newIndicatorDefinition',measureType:'newIndicatorMeasureType',unit:'newIndicatorUnit',scale:'newIndicatorScale',scaleMin:'newIndicatorScaleMin',scaleMax:'newIndicatorScaleMax',baseline:'newIndicatorBaseline',target:'target',value:'newIndicatorValue'})[k]}:{dataIndField:k};
 const attr=k=>newRecord?'name="'+field(k).name+'"':'data-indicator-field="'+k+'"';
 const text=k=>safe(data[k]??'');
 const selectedType=data.type||(newRecord?'Gestión':'');
 const optionsType=behaviorIndicatorOptions(['Gestión','Predictivos','Resultados'],selectedType);
 const hasScale=data.unit==='Escala';
 return '<div class="behavior-indicator-fields'+(newRecord?' behavior-indicator-fields-new':'')+'">'+
  '<div class="behavior-indicator-form-grid"><label>Nombre del indicador<input '+attr('name')+' value="'+(newRecord?'':text('name'))+'" placeholder="Ej. Número de eventos de riesgo"></label>'+
  '<label>Tipo de indicador<select '+attr('type')+'>'+optionsType+'</select></label></div>'+
  '<label>Definición / fórmula<input '+attr('definition')+' value="'+text('definition')+'" placeholder="Qué se registra y cómo se calcula"></label>'+
  '<div class="behavior-indicator-form-grid"><label>¿Cómo vamos a medirlo?<select '+attr('measureType')+'><option value="">Seleccionar medición</option>'+behaviorIndicatorOptions(behaviorIndicatorTypes(),data.measureType)+'</select></label>'+
  '<label>Unidad de medición<select '+attr('unit')+' onchange="behaviorIndicatorToggleScale(this.closest(\'.behavior-indicator-fields\'))"><option value="">Seleccionar unidad</option>'+behaviorIndicatorOptions(behaviorIndicatorUnits(),data.unit)+'</select></label></div>'+
  '<div class="behavior-indicator-scale" data-indicator-scale'+(hasScale?'':' hidden')+'><label>Rango de escala<select '+attr('scale')+' onchange="behaviorIndicatorToggleScale(this.closest(\'.behavior-indicator-fields\'))">'+behaviorIndicatorOptions(['1-5','1-10','1-100','Personalizada'],data.scale||'1-5')+'</select></label>'+
  '<div class="behavior-indicator-form-grid" data-indicator-custom-scale'+(hasScale&&data.scale==='Personalizada'?'':' hidden')+'><label>Desde<input type="number" step="any" '+attr('scaleMin')+' value="'+text('scaleMin')+'"></label><label>Hasta<input type="number" step="any" '+attr('scaleMax')+' value="'+text('scaleMax')+'"></label></div></div>'+
  '<div class="behavior-indicator-form-grid behavior-indicator-values"><label>Línea base<input type="number" step="any" '+attr('baseline')+' value="'+text('baseline')+'"></label><label>Meta<input type="number" step="any" '+attr('target')+' value="'+text('target')+'"></label><label>Actual<input type="number" step="any" '+attr('value')+' value="'+text('value')+'"></label></div></div>';
}
function behaviorIndicatorToggleScale(fields){
 if(!fields)return;
 const unit=fields.querySelector('[data-indicator-field="unit"],[name="newIndicatorUnit"]')?.value||'';
 const scale=fields.querySelector('[data-indicator-field="scale"],[name="newIndicatorScale"]')?.value||'1-5';
 const box=fields.querySelector('[data-indicator-scale]'),custom=fields.querySelector('[data-indicator-custom-scale]');
 if(box)box.hidden=unit!=='Escala';
 if(custom)custom.hidden=unit!=='Escala'||scale!=='Personalizada';
}
function behaviorIndicatorValidation(data){
 if(typeof indicatorValidateMeasurement==='function')return indicatorValidateMeasurement(data);
 const vals=[data.baseline,data.target,data.value].filter(v=>String(v??'').trim()!=='');
 if(vals.some(v=>!Number.isFinite(Number(v))))return 'Los valores deben ser numéricos.';
 if(data.unit==='Porcentaje (%)'&&vals.some(v=>Number(v)<0||Number(v)>100))return 'El porcentaje debe estar entre 0 y 100.';
 if(data.unit==='Escala'){
  const range=data.scale==='Personalizada'?[Number(data.scaleMin),Number(data.scaleMax)]:String(data.scale||'1-5').split('-').map(Number);
  if(!Number.isFinite(range[0])||!Number.isFinite(range[1])||range[0]>=range[1]||vals.some(v=>Number(v)<range[0]||Number(v)>range[1]))return 'Revisa los límites de la escala.';
 }
 return '';
}
function behaviorIndicatorFromFields(container,newRecord){
 const pairs=newRecord?[
  ['name','indicator'],['type','kind'],['definition','newIndicatorDefinition'],['measureType','newIndicatorMeasureType'],['unit','newIndicatorUnit'],['scale','newIndicatorScale'],['scaleMin','newIndicatorScaleMin'],['scaleMax','newIndicatorScaleMax'],['baseline','newIndicatorBaseline'],['target','target'],['value','newIndicatorValue']
 ]:['name','type','definition','measureType','unit','scale','scaleMin','scaleMax','baseline','target','value'].map(k=>[k,k]);
 return Object.fromEntries(pairs.map(([k,name])=>[k,String(container.querySelector(newRecord?'[name="'+name+'"]':'[data-indicator-field="'+name+'"]')?.value??'').trim()]));
}
function behaviorSaveInlineIndicator(button,index){
 const x=current(),indicator=x?.indicators?.[index],panel=button.closest('.behavior-indicator-option');
 if(!indicator||!panel)return;
 const data=behaviorIndicatorFromFields(panel,false);
 if(!data.name)return alert('Indica el nombre del indicador.');
 if(!data.measureType||!data.unit)return alert('Selecciona cómo vamos a medirlo y la unidad.');
 const error=behaviorIndicatorValidation(data);if(error)return alert(error);
 const changes=Object.keys(data).filter(k=>String(indicator[k]??'')!==String(data[k]??''));
 if(changes.length){
  const date=new Date().toISOString();
  indicator.revisionHistory ||= [];
  indicator.revisionHistory.push({date,changes:changes.map(k=>({field:k,previous:indicator[k]??'',current:data[k]}))});
  if(changes.includes('value')&&data.value!==''){indicator.history ||= [];indicator.history.push({date,value:Number(data.value)});}
  Object.assign(indicator,data);
  save();
 }
 const label=panel.querySelector('.behavior-indicator-option-name');
 if(label)label.textContent=data.name;
 const meta=panel.querySelector('.behavior-indicator-option-meta');
 if(meta)meta.textContent=' · '+data.type+' · '+data.measureType+' · '+data.unit;
 const status=panel.querySelector('[data-indicator-status]');
 if(status){status.textContent=changes.length?'Indicador actualizado. Se refleja en todos los comportamientos vinculados.':'Sin cambios pendientes.';status.hidden=false;}
}
function behaviorNewIndicatorDetails(behaviorIndex=null){
 const saveButton=Number.isInteger(behaviorIndex)?'<button class="secondary" type="button" onclick="behaviorCreateIndicatorForBehavior(this,'+behaviorIndex+')">Crear y vincular indicador</button>':'';
 return '<details class="behavior-create-optional behavior-create-indicator-new"><summary>Crear un indicador nuevo <small>Opcional</small></summary>'+
  '<p class="behavior-indicator-help">Se guardará como un único indicador de la iniciativa, vinculado a este comportamiento.</p>'+
  behaviorIndicatorFields({},true)+saveButton+'</details>';
}
function behaviorIndicatorChoices(x,b){
 ensureBehaviorIds(x);
 const selected=(x.indicators||[]).filter(r=>b&&indicatorHasBehavior(x,r,b));
 if(!x.indicators.length)return '<div data-behavior-indicator-holder><p class="muted">Aún no hay indicadores. Puedes crear uno aquí o en Resultados → Indicadores.</p></div>';
 return '<div data-behavior-indicator-holder><details class="association-picker behavior-indicator-picker"><summary>Seleccionar indicadores · '+selected.length+' seleccionados</summary><div class="association-options behavior-indicator-options">'+
  x.indicators.map((r,i)=>{
   const linked=(x.behaviors||[]).filter(behavior=>indicatorHasBehavior(x,r,behavior)).length;
   return '<div class="behavior-indicator-option"><div class="behavior-indicator-option-head"><label><input type="checkbox" name="existingIndicators" value="'+i+'"'+(b&&indicatorHasBehavior(x,r,b)?' checked':'')+' onchange="updateAssociationCount(this)"><span><b class="behavior-indicator-option-name">'+safe(r.name)+'</b><small class="muted behavior-indicator-option-meta"> · '+safe(r.type||'Sin tipo')+' · '+safe(r.measureType||'Sin medición')+' · '+safe(r.unit||'Sin unidad')+'</small></span></label><button type="button" class="secondary behavior-indicator-edit-button" onclick="const d=this.closest(\'.behavior-indicator-option\').querySelector(\'.behavior-indicator-edit\');d.hidden=!d.hidden;this.setAttribute(\'aria-expanded\',String(!d.hidden));" aria-expanded="false">Editar indicador</button></div>'+
   '<div class="behavior-indicator-edit" hidden><small class="behavior-indicator-help">'+(linked>1?'Compartido por '+linked+' comportamientos. Los cambios se reflejarán en todos.':'Puedes modificar el indicador sin salir del comportamiento.')+'</small>'+
   behaviorIndicatorFields(r,false)+
   '<div class="behavior-indicator-inline-actions"><button type="button" class="primary" onclick="behaviorSaveInlineIndicator(this,'+i+')">Guardar indicador</button><small data-indicator-status hidden role="status"></small></div></div></div>';
  }).join('')+'</div><p class="muted">Selecciona los indicadores que correspondan. «Editar indicador» modifica su ficha original; no genera duplicados.</p></details></div>';
}
function behaviorRefreshIndicatorChoices(form,b){
 const holder=form?.querySelector('[data-behavior-indicator-holder]');if(!holder)return;
 const checked=new Set([...holder.querySelectorAll('input[name="existingIndicators"]:checked')].map(el=>el.value));
 const open=!!holder.querySelector('.behavior-indicator-picker')?.open;
 const wrapper=document.createElement('div');wrapper.innerHTML=behaviorIndicatorChoices(current(),b);
 const replacement=wrapper.firstElementChild;
 holder.replaceWith(replacement);
 const picker=replacement.querySelector('.behavior-indicator-picker');
 if(picker)picker.open=open||true;
 replacement.querySelectorAll('input[name="existingIndicators"]').forEach(input=>{
  if(checked.has(input.value))input.checked=true;
 });
 const input=replacement.querySelector('input[name="existingIndicators"]');
 if(input)updateAssociationCount(input);
}
function behaviorCreateIndicatorForBehavior(button,behaviorIndex){
 const x=current(),b=x?.behaviors?.[behaviorIndex];
 if(!b)return;
 const panel=button.closest('.behavior-create-indicator-new'),form=button.closest('form');
 const data=behaviorIndicatorFromFields(panel,true);
 if(!data.name)return alert('Indica el nombre del nuevo indicador.');
 if(!data.measureType||!data.unit)return alert('Selecciona cómo vamos a medirlo y la unidad.');
 const error=behaviorIndicatorValidation(data);if(error)return alert(error);
 ensureBehaviorIds(x);
 data.id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'ind-'+Date.now();
 data.behaviorIds=[String(b.id)];data.behavior=b.name;
 const now=new Date().toISOString();
 data.history=data.value!==''?[{date:now,value:Number(data.value)}]:[];
 data.revisionHistory=[];
 x.indicators.push(data);save();
 behaviorRefreshIndicatorChoices(form,b);
 panel.open=false;
 panel.querySelector('[name="indicator"]').value='';
 const hint=document.createElement('p');hint.className='behavior-indicator-help';hint.textContent='Indicador creado y vinculado. Puedes modificarlo desde la lista de indicadores asociados.';
 panel.appendChild(hint);
}

function updateAssociationCount(input){const picker=input.closest('.association-picker');picker.querySelector('summary').textContent='Seleccionar '+(input.name==='behaviorIds'?'comportamientos':'indicadores')+' · '+picker.querySelectorAll('input:checked').length+' seleccionados';}
function linkBehaviorIndicators(x,b,selected){ensureBehaviorIds(x);const indexes=new Set(selected.map(String));x.indicators.forEach((r,i)=>{const ids=indicatorBehaviorIds(x,r).filter(id=>id!==String(b.id));if(indexes.has(String(i)))ids.push(String(b.id));writeIndicatorBehaviorIds(x,r,ids);});}
function saveBehaviorIndicators(e,i){e.preventDefault();const x=current(),b=x.behaviors[i];if(!b)return;linkBehaviorIndicators(x,b,new FormData(e.target).getAll('existingIndicators'));save();render();}
function indicatorBehaviorChoices(x,r){ensureBehaviorIds(x);const ids=indicatorBehaviorIds(x,r);return `<details class="association-picker"><summary>Seleccionar comportamientos · ${ids.length} seleccionados</summary><div class="association-options">${(x.behaviors||[]).map(b=>`<label><input type="checkbox" name="behaviorIds" value="${safe(b.id)}"${ids.includes(String(b.id))?' checked':''} onchange="updateAssociationCount(this)"><span>${safe(b.name)}</span></label>`).join('')||'<p class="muted">Aún no hay comportamientos.</p>'}</div><p class="muted">Sin selección: indicador general de la iniciativa.</p></details>`;}

function behaviorEditForm(x,b,i){return `<details id="behavior-edit-${i}" class="behavior-edit"><summary>Editar comportamiento</summary><form onsubmit="saveBehaviorEdit(event,${i})"><label>Comportamiento observable<input name="name" required value="${safe(b.name)}"></label><label>Descripción y contexto<textarea name="description">${safe(b.description||'')}</textarea></label><label class="behavior-observable-review"><input name="observableReviewed" type="checkbox" ${b.observableReviewed===true?'checked':''}><span>Revisé que describe una acción observable y verificable.</span></label><label>Alcance<select name="scope" onchange="this.form.querySelector('[data-edit-audiences]').hidden=this.value!=='specific'"><option value="all"${b.scope!=='specific'?' selected':''}>Todas las audiencias (incluidas las futuras)</option><option value="specific"${b.scope==='specific'?' selected':''}>Audiencias específicas</option></select></label><div data-edit-audiences${b.scope!=='specific'?' hidden':''}>${x.audiences.map(a=>`<label class="behavior-audience-option"><input type="checkbox" name="audienceIds" value="${safe(a.id)}"${(b.audienceIds||[]).includes(a.id)?' checked':''}><span>${safe(a.name)}</span></label>`).join('')||'<p class="muted">Crea primero una audiencia.</p>'}</div><h3>Indicadores asociados</h3>${behaviorIndicatorChoices(x,b)}${behaviorNewIndicatorDetails(i)}<div class="flex"><button class="primary" type="submit">Guardar cambios</button><button class="secondary" type="button" onclick="cancelBehaviorEdit(${i})">Cancelar</button></div></form></details>`;}
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
      ${behaviorNewIndicatorDetails()}
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
