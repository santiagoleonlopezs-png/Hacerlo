// HACERLO — Resultados / Indicadores
let editingIndicatorIndex = null;
function renderIndicatorsEditor(x,head){
 const idx=editingIndicatorIndex, editing=Number.isInteger(idx)&&idx>=0&&idx<x.indicators.length;
 const v=editing?x.indicators[idx]:{};
 const val=k=>safe(v[k]??'');
 const option=(value,selected)=>`<option value="${safe(value)}"${String(value)===String(selected??'')?' selected':''}>${safe(value)}</option>`;
 return head+`<div class="grid"><section class="panel"><h2>${editing?'Editar indicador':'Crear indicador'}</h2>
 <form onsubmit="saveIndicatorEditor(event)"><input name="name" placeholder="Nombre" value="${val('name')}" required>
 <select name="type">${['Gestión','Predictivos','Resultados'].map(t=>option(t,editing?v.type:'Gestión')).join('')}</select>
 <input name="definition" placeholder="Definición / fórmula" value="${val('definition')}">
 <label>Comportamientos asociados</label>${indicatorBehaviorChoices(x,v)}
 <input name="baseline" type="number" step="any" placeholder="Línea base" value="${val('baseline')}">
 <input name="target" type="number" step="any" placeholder="Meta" value="${val('target')}">
 <input name="value" type="number" step="any" placeholder="Valor actual" value="${val('value')}">
 <div class="flex"><button class="primary" type="submit">${editing?'Guardar cambios':'Agregar indicador'}</button>${editing?'<button class="secondary" type="button" onclick="cancelIndicatorEditor()">Cancelar</button>':''}</div></form></section>
 <section class="panel"><h2>Indicadores registrados</h2>${x.indicators.length?`<div style="overflow-x:auto"><table><tr><th>Nombre</th><th>Tipo</th><th>Comportamientos</th><th>Base</th><th>Meta</th><th>Actual</th><th>Acciones</th></tr>${x.indicators.map((r,i)=>`<tr><td>${safe(r.name)}</td><td>${safe(r.type)}</td><td>${safe(indicatorBehaviorLabel(x,r)||'General')}</td><td>${safe(r.baseline)}</td><td>${safe(r.target)}</td><td><input style="width:85px" type="number" step="any" value="${safe(r.value)}" onchange="updateIndicator(${i},this.value)"></td><td><button class="secondary" type="button" onclick="editIndicator(${i})">Editar</button></td></tr>`).join('')}</table></div>`:'<div class="empty">Sin indicadores</div>'}</section></div>`;
}
function editIndicator(i){if(!current()?.indicators?.[i])return;editingIndicatorIndex=i;render();document.querySelector('form[onsubmit="saveIndicatorEditor(event)"] input[name="name"]')?.focus()}
function cancelIndicatorEditor(){editingIndicatorIndex=null;render()}
function saveIndicatorEditor(e){e.preventDefault();const x=current();if(!x)return;const fd=new FormData(e.target);const data=Object.fromEntries(fd);delete data.behaviorIds;ensureBehaviorIds(x);const association={};writeIndicatorBehaviorIds(x,association,fd.getAll('behaviorIds'));Object.assign(data,association);const idx=editingIndicatorIndex;const existing=Number.isInteger(idx)?x.indicators[idx]:null;const now=new Date().toISOString();
 if(existing){const changes=Object.keys(data).filter(k=>String(existing[k]??'')!==String(data[k]??''));if(changes.length){existing.revisionHistory=existing.revisionHistory||[];existing.revisionHistory.push({date:now,changes:changes.map(k=>({field:k,previous:existing[k]??'',current:data[k]}))});if(changes.includes('value')&&data.value!==''){existing.history=existing.history||[];existing.history.push({date:now,value:Number(data.value)})}Object.assign(existing,data)}}
 else{data.id=crypto.randomUUID();data.history=data.value!==''?[{date:now,value:Number(data.value)}]:[];data.revisionHistory=[];x.indicators.push(data)}
 editingIndicatorIndex=null;save();render();
}
