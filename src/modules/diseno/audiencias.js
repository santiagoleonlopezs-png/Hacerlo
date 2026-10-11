let audienceImportRows=[];
function downloadAudienceTemplate(){
 const csv='nombre,poblacion,impacto,barreras\r\nLíderes,35,Alto,Disponibilidad\r\nOperaciones,120,Medio,Capacitación';
 const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='HACERLO_plantilla_audiencias.csv';a.click();URL.revokeObjectURL(url);
}
function parseAudienceCSV(text){
 text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
 else if(c===','&&!quoted){row.push(cell.trim());cell=''}
 else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);row=[];cell=''}else cell+=c}
 if(quoted)throw Error('Hay comillas sin cerrar en el archivo');row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);
 return rows;
}
async function previewAudienceCSV(input){
 const target=document.getElementById('audience-import-preview');audienceImportRows=[];
 if(!input.files.length)return;
 try{
 const file=input.files[0];if(file.size>2e6)throw Error('El archivo supera 2 MB');
 const lines=parseAudienceCSV(await file.text());if(lines.length<2)throw Error('No hay filas para importar');
 const headers=lines.shift().map(x=>x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim());
 if(!['nombre','poblacion','impacto','barreras'].every(h=>headers.includes(h)))throw Error('Encabezados requeridos: nombre,poblacion,impacto,barreras');
 if(lines.length>2000)throw Error('Máximo 2.000 audiencias por archivo');
 const existing=new Set(current().audiences.map(a=>a.name.trim().toLocaleLowerCase('es'))),seen=new Set();
 audienceImportRows=lines.map((line,index)=>{
 let obj=Object.fromEntries(headers.map((h,i)=>[h,(line[i]||'').trim()]));
 let key=obj.nombre.toLocaleLowerCase('es'),pop=obj.poblacion;
 let errors=[];if(!obj.nombre)errors.push('Nombre vacío');if(pop&&!/^[0-9]+$/.test(pop))errors.push('Población inválida');
 if(obj.impacto&&!['Alto','Medio','Bajo'].includes(obj.impacto))errors.push('Impacto debe ser Alto, Medio o Bajo');
 if(seen.has(key))errors.push('Duplicada dentro del archivo');seen.add(key);
 return {row:index+2,name:obj.nombre,population:pop,impact:obj.impacto,barriers:obj.barreras,existing:existing.has(key),errors};
 });
 let valid=audienceImportRows.filter(r=>!r.errors.length);
 target.innerHTML=`<p>${valid.length} registros válidos; ${audienceImportRows.length-valid.length} con errores; ${valid.filter(r=>r.existing).length} existentes.</p>`+
 `<div style="max-height:270px;overflow:auto"><table><tr><th>Fila</th><th>Audiencia</th><th>Población</th><th>Impacto</th><th>Resultado</th></tr>`+
 audienceImportRows.map(r=>`<tr><td>${r.row}</td><td>${safe(r.name)}</td><td>${safe(r.population)}</td><td>${safe(r.impact)}</td><td>${r.errors.length?safe(r.errors.join('; ')):r.existing?'Existente':'Nueva'}</td></tr>`).join('')+'</table></div>'+
 `<label>Registros existentes<select id="audience-duplicate-mode"><option value="skip">Omitir (conservar datos actuales)</option><option value="update">Actualizar con valores importados</option></select></label>`+
 `<button type="button" class="primary" ${valid.length?'':'disabled'} onclick="commitAudienceImport()">Importar ${valid.length} registros válidos</button>`;
 }catch(e){target.textContent='Error: '+e.message}
}
function commitAudienceImport(){
 let x=current(),mode=document.getElementById('audience-duplicate-mode').value,added=0,updated=0,skipped=0;
 for(let r of audienceImportRows.filter(r=>!r.errors.length)){
 let old=x.audiences.find(a=>a.name.trim().toLocaleLowerCase('es')===r.name.trim().toLocaleLowerCase('es'));
 if(old&&mode==='skip'){skipped++;continue}
 if(old){Object.assign(old,{population:r.population,impact:r.impact,barriers:r.barriers});updated++}
 else{x.audiences.push({id:'aud-'+Date.now()+'-'+added+'-'+Math.random().toString(36).slice(2,7),name:r.name,population:r.population,impact:r.impact,barriers:r.barriers});added++}
 }
 save();alert(`Importación terminada: ${added} nuevas, ${updated} actualizadas, ${skipped} omitidas. Las filas con errores no se importaron.`);audienceImportRows=[];render();
}

function audienceChecks(x){return x.audiences.length?x.audiences.map(a=>`<label style="display:block"><input style="width:auto" type="checkbox" name="audienceIds" value="${a.id}"> ${safe(a.name)}</label>`).join(''):'<p class="muted">Crea una audiencia antes de seleccionar.</p>'}
function audienceForm(){return `<div class="panel"><h3>Nueva audiencia</h3><div class="audience-fields"><input data-field="name" required placeholder="Nombre de la audiencia"><input data-field="population" type="number" min="0" placeholder="Número de personas"><select data-field="impact"><option value="">Impacto sin evaluar</option><option>Alto</option><option>Medio</option><option>Bajo</option></select><textarea data-field="barriers" placeholder="Barreras y facilitadores (opcional)"></textarea><button type="button" class="primary" onclick="addAudienceFromButton(this)">Guardar audiencia</button></div></div>`}
function audienceList(x){return x.audiences.length?x.audiences.map(a=>`<div class="panel"><strong>${safe(a.name)}</strong><p class="muted">${safe(a.population||'—')} personas · Impacto: ${safe(a.impact||'Sin evaluar')}</p></div>`).join(''):'<div class="empty">No hay audiencias registradas.</div>'}
function behaviorAudienceLabel(x,b){return b.scope!=='specific'?'Todas las audiencias':(b.audienceIds||[]).map(id=>x.audiences.find(a=>a.id===id)?.name||'Audiencia eliminada').map(safe).join(', ')||'Sin audiencia seleccionada'}
function showAudienceForm(id){$(id).classList.toggle('hide')}
function addAudienceFromButton(button){let fields=button.closest(".audience-fields");let a=Object.fromEntries([...fields.querySelectorAll("[data-field]")].map(el=>[el.dataset.field,el.value]));if(!a.name.trim())return alert("Indica el nombre de la audiencia");a.id='aud-'+Date.now();current().audiences.push(a);save();render()}
