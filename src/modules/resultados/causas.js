/* HACERLO · Diagnóstico: múltiples posibles causas y sesgos dentro del mismo flujo. */
const DIAG_CAUSE_PATTERNS=[
 ['statu','Preferencia por lo conocido','Sesgo de statu quo','Facilitar una prueba breve y reversible, sin imponer la nueva alternativa.'],
 ['presente','Priorizar lo inmediato','Sesgo del presente','Reducir el primer paso y ofrecer un beneficio cercano y verificable.'],
 ['perdida','Temor a perder algo','Aversión a la pérdida','Aclarar costos y beneficios reales y permitir una prueba segura.'],
 ['confirmacion','Buscar lo que confirma la creencia','Sesgo de confirmación','Presentar evidencia a favor y en contra y contrastarla.'],
 ['disponibilidad','Recordar los casos llamativos','Heurística de disponibilidad','Mostrar datos de frecuencia junto con ejemplos representativos.'],
 ['anclaje','Depender de la primera referencia','Anclaje','Utilizar referentes verificables y datos comparables.'],
 ['planificacion','Subestimar el esfuerzo','Falacia de planificación','Planificar utilizando tiempos históricos realistas.'],
 ['predeterminada','Mantener la opción inicial','Efecto de opción predeterminada','Ofrecer una configuración inicial útil, transparente y fácil de cambiar.'],
 ['social','Seguir lo que hace el grupo','Influencia de normas sociales','Mostrar ejemplos reales de colegas, sin inventar cifras o generar presión.'],
 ['saliencia','Atender a lo más visible','Saliencia','Ubicar recordatorios claros en el momento de actuar.'],
 ['encuadre','Influirse por la presentación','Efecto de encuadre','Presentar costos y beneficios de manera equilibrada y completa.'],
 ['eleccion','Dificultad ante muchas opciones','Sobrecarga de elección','Agrupar opciones y hacer visibles las más pertinentes sin ocultar alternativas.']
];
const DIAG_CAUSE_STATES=['Por comprobar','Con evidencia','Comprobada','Descartada'];
const DIAG_CAUSE_METHODS=['','Experimento o comparación controlada','Análisis longitudinal','Triangulación documentada','Otro método documentado'];
let diagCauseEditId=null,diagCauseFormOpen=false;
function diagCausesInit(x){
 x.diagnosisPossibleCauses=x.diagnosisPossibleCauses||[];
 for(const h of (x.diagnosisHypotheses||[])){
  if(h.kind!=='guided-primary'||!h.id||h.migratedCauseDismissed)continue;
  if(x.diagnosisPossibleCauses.some(c=>String(c.legacySourceId)===String(h.id)))continue;
  x.diagnosisPossibleCauses.push({id:'cause-from-'+h.id,legacySourceId:h.id,behaviorId:String(h.behaviorId||''),factorKey:String(h.factorKey||''),patternId:'',findingId:String(h.findingId||''),relation:String(h.relation||'influir'),statement:String(h.text||''),status:'Por comprobar',validationMethod:'',validationNote:'',application:'',createdAt:h.createdAt||'',updatedAt:h.updatedAt||''});
 }
 return x.diagnosisPossibleCauses;
}
function diagCausePattern(id){return DIAG_CAUSE_PATTERNS.find(p=>p[0]===id)}
function diagCauseBehavior(x,id){return (x.behaviors||[]).find((b,i)=>String(b.id||'index:'+i)===String(id))}
function diagCauseOpt(rows,selected){return rows.map(([val,label])=>'<option value="'+diagEsc(val)+'"'+(String(val)===String(selected)?' selected':'')+'>'+diagEsc(label)+'</option>').join('')}
function diagCauseData(form){let z=Object.fromEntries(new FormData(form));return {behaviorId:String(z.behaviorId||''),factorKey:String(z.factorKey||''),patternId:String(z.patternId||''),relation:String(z.relation||'influir'),findingId:String(z.findingId||''),statement:String(z.statement||'').trim(),status:String(z.status||'Por comprobar'),validationMethod:String(z.validationMethod||''),validationNote:String(z.validationNote||'').trim().slice(0,1800),application:String(z.application||'').trim().slice(0,1200)}}
function diagCauseSuggested(x,z){
 const b=diagCauseBehavior(x,z.behaviorId),f=x.behaviorDiagnosis?.[z.factorKey],p=diagCausePattern(z.patternId);
 if(!b||(!f&&!p))return '';
 const parts=[];
 if(f)parts.push('el factor «'+f.factor+'»'+(f.role&&f.role!=='Por explorar'?' (interpretado como '+f.role.toLowerCase()+')':''));
 if(p)parts.push('el patrón «'+p[1]+'» ('+p[2]+')');
 const plural=parts.length>1;
 const verb=z.relation==='dificultar'?(plural?'dificulten':'dificulte'):z.relation==='facilitar'?(plural?'faciliten':'facilite'):(plural?'influyan en':'influya en');
 let text='Es posible que '+parts.join(' y ')+' '+verb+' la realización del comportamiento «'+b.name+'».';
 const finding=(x.diagnosisFindings||[]).find(v=>String(v.id)===String(z.findingId));
 if(finding)text+=' Para explorar esta relación se seleccionó el hallazgo: «'+String(finding.text||'').slice(0,200)+'».';
 return text+' Esta posible causa debe contrastarse; no se considera comprobada.';
}
function diagCausePreview(force){
 const form=document.getElementById('diag-cause-form');if(!form)return;
 const z=diagCauseData(form),field=form.elements.namedItem('statement'),pattern=diagCausePattern(z.patternId);
 if(field&&(force||field.dataset.edited!=='1')){field.value=diagCauseSuggested(current(),z);field.dataset.edited='0'}
 const hint=document.getElementById('diag-cause-pattern-help');
 if(hint)hint.textContent=pattern?pattern[2]+' · Posible mecanismo de decisión, no diagnóstico confirmado.':'Opcional: selecciona un sesgo si podría estar influyendo en la conducta.';
 if(pattern){
  const leverage=form.elements.namedItem('application');
  if(leverage&&(!leverage.value.trim()||leverage.dataset.suggested==='1')){leverage.value=pattern[3];leverage.dataset.suggested='1'}
 }
 diagCauseSearch();
}
function diagCauseEvidenceOptions(x,z,term){
 const all=(x.diagnosisFindings||[]).filter(f=>f.id&&String(f.text||'').trim());
 const selected=all.find(f=>String(f.id)===String(z.findingId));
 const search=String(term||'').trim().toLocaleLowerCase('es');
 let matches=search?all.filter(f=>[f.text,f.source,...(f.categories||[])].join(' ').toLocaleLowerCase('es').includes(search)).slice(0,7):all.filter(f=>z.factorKey&&(f.factors||[]).includes(z.factorKey)).slice(0,5);
 if(selected&&!matches.includes(selected))matches=[selected,...matches].slice(0,7);
 return '<button type="button" class="diag-cause-evidence-opt'+(!z.findingId?' selected':'')+'" data-id="" onclick="diagCauseChooseEvidence(this.dataset.id)">Sin hallazgo seleccionado</button>'+
 (matches.length?matches.map(f=>'<button type="button" class="diag-cause-evidence-opt'+(String(f.id)===String(z.findingId)?' selected':'')+'" data-id="'+diagEsc(f.id)+'" onclick="diagCauseChooseEvidence(this.dataset.id)">'+diagEsc(String(f.text||'').slice(0,150))+'</button>').join(''):'<small class="muted">Busca un hallazgo o continúa sin evidencia vinculada.</small>');
}
function diagCauseSearch(){
 const form=document.getElementById('diag-cause-form');if(!form)return;
 const options=document.getElementById('diag-cause-evidence-list'),input=document.getElementById('diag-cause-search');
 if(options)options.innerHTML=diagCauseEvidenceOptions(current(),diagCauseData(form),input?.value||'');
}
function diagCauseChooseEvidence(id){
 const form=document.getElementById('diag-cause-form'),x=current();if(!form||!x)return;
 const f=(x.diagnosisFindings||[]).find(z=>String(z.id)===String(id));
 form.elements.namedItem('findingId').value=f?String(f.id):'';
 const label=document.getElementById('diag-cause-evidence-current');
 if(label)label.textContent=f?'Hallazgo seleccionado: '+String(f.text||'').slice(0,140):'Sin hallazgo vinculado';
 diagCauseSearch();diagCausePreview(false);
}
function diagCauseOpen(id){
 const x=current();if(!x)return;diagCausesInit(x);
 diagCauseEditId=x.diagnosisPossibleCauses.some(c=>String(c.id)===String(id))?String(id):null;
 diagCauseFormOpen=true;render();
 document.getElementById('diag-builder')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function diagCauseClose(){diagCauseEditId=null;diagCauseFormOpen=false;render()}
function diagCauseSave(event){
 event.preventDefault();const x=current();if(!x)return;diagCausesInit(x);
 const z=diagCauseData(event.target);
 if(!diagCauseBehavior(x,z.behaviorId))return alert('Selecciona un comportamiento registrado.');
 if(!x.behaviorDiagnosis?.[z.factorKey])z.factorKey='';
 if(!diagCausePattern(z.patternId))z.patternId='';
 if(!z.factorKey&&!z.patternId)return alert('Selecciona al menos un factor o un sesgo o atajo de decisión.');
 if(!['dificultar','facilitar','influir'].includes(z.relation))return alert('Selecciona cómo podría influir.');
 if(z.findingId&&!(x.diagnosisFindings||[]).some(f=>String(f.id)===String(z.findingId)))z.findingId='';
 if(!z.statement)return alert('Completa o genera la explicación.');
 if(!DIAG_CAUSE_STATES.includes(z.status))return alert('Selecciona un estado válido.');
 if(z.status==='Con evidencia'&&!z.findingId&&!z.validationNote)return alert('Vincula un hallazgo o describe la evidencia.');
 if(z.status==='Comprobada'&&(!DIAG_CAUSE_METHODS.slice(1).includes(z.validationMethod)||z.validationNote.length<20))return alert('Para marcar Comprobada, documenta el método de contraste y una justificación de al menos 20 caracteres.');
 if(z.status==='Descartada'&&z.validationNote.length<20)return alert('Para marcar Descartada, explica el contraste realizado en al menos 20 caracteres.');
 const now=new Date().toISOString(),old=x.diagnosisPossibleCauses.find(c=>String(c.id)===String(diagCauseEditId));
 if(old)Object.assign(old,z,{updatedAt:now});else x.diagnosisPossibleCauses.push({id:diagId(),...z,createdAt:now,updatedAt:now});
 diagCauseEditId=null;diagCauseFormOpen=false;save();render();
}
function diagCauseRemove(id){
 if(!confirm('¿Eliminar esta posible causa? Los hallazgos originales se conservarán.'))return;
 const x=current();if(!x)return;diagCausesInit(x);
 x.diagnosisPossibleCauses=x.diagnosisPossibleCauses.filter(c=>String(c.id)!==String(id));
 const h=(x.diagnosisHypotheses||[]).find(v=>v.kind==='guided-primary'&&String('cause-from-'+v.id)===String(id));
 if(h)h.migratedCauseDismissed=true;
 if(diagCauseEditId===String(id))diagCauseEditId=null;
 save();render();
}
function diagCauseItem(x,c){
 const factor=x.behaviorDiagnosis?.[c.factorKey],bias=diagCausePattern(c.patternId);
 const behavior=diagCauseBehavior(x,c.behaviorId),finding=(x.diagnosisFindings||[]).find(z=>String(z.id)===String(c.findingId));
 const name=[factor?.factor,bias?.[1]].filter(Boolean).join(' + ')||'Posible causa';
 const css={'Por comprobar':'pending','Con evidencia':'evidence','Comprobada':'confirmed','Descartada':'dismissed'}[c.status]||'pending';
 return '<article class="diag-cause-item"><div class="diag-cause-item-head"><div><strong>'+diagEsc(name)+'</strong><small>'+diagEsc(behavior?.name||'Comportamiento no disponible')+'</small></div><span class="diag-cause-state '+css+'">'+diagEsc(c.status||'Por comprobar')+'</span></div><p>'+diagEsc(c.statement)+'</p>'+
 '<details><summary>Ver evidencia y decisiones</summary><div class="diag-cause-details">'+
 (finding?'<p><b>Hallazgo:</b> '+diagEsc(String(finding.text||'').slice(0,220))+'</p>':'<p>Sin hallazgo vinculado.</p>')+
 (c.validationNote?'<p><b>Contraste:</b> '+diagEsc(c.validationNote)+'</p>':'')+
 (c.validationMethod?'<p><b>Método:</b> '+diagEsc(c.validationMethod)+'</p>':'')+
 (c.application?'<p><b>Cómo podríamos aprovecharlo:</b> '+diagEsc(c.application)+'</p>':'')+
 '</div></details><div class="diag-cause-item-actions"><button type="button" class="secondary" data-id="'+diagEsc(c.id)+'" onclick="diagCauseOpen(this.dataset.id)">Editar</button><button type="button" class="secondary" data-id="'+diagEsc(c.id)+'" onclick="diagCauseRemove(this.dataset.id)">Eliminar</button></div></article>';
}
function diagCauseStatusChanged(select){
 const state=select?.value||'Por comprobar';
 const extra=document.getElementById('diag-cause-validation-extra');
 const method=document.getElementById('diag-cause-validation-method');
 if(extra)extra.hidden=state==='Por comprobar';
 if(method)method.hidden=state!=='Comprobada';
}
function diagCausesPanel(x){
 const causes=diagCausesInit(x),editing=causes.find(c=>String(c.id)===String(diagCauseEditId));
 const opened=diagCauseFormOpen,prefill=diagBuilderInit(x);
 const values=editing||{behaviorId:prefill.behaviorId,factorKey:prefill.factorKey,patternId:'',relation:prefill.relation,findingId:'',status:'Por comprobar',application:'',validationMethod:'',validationNote:''};
 const behaviors=(x.behaviors||[]).map((b,i)=>[String(b.id||'index:'+i),b.name||'Comportamiento sin nombre']);
 const factors=Object.entries(x.behaviorDiagnosis||{}).filter(([key,v])=>v).map(([key,v])=>[key,v.factor+' · '+(v.role||'Por explorar')]);
 const finding=(x.diagnosisFindings||[]).find(f=>String(f.id)===String(values.findingId));
 const bias=diagCausePattern(values.patternId),historic=(x.diagnosisHypotheses||[]).filter(h=>h.kind!=='guided-primary');
 const count=DIAG_CAUSE_STATES.map(state=>[state,causes.filter(c=>c.status===state).length]);
 const status=DIAG_CAUSE_STATES.includes(values.status)?values.status:'Por comprobar';
 let out='<section class="panel diag-causes-panel diag-step-panel" id="diag-builder"><div class="diag-causes-heading"><div><div class="diag-step-label">02 · ¿CUÁLES SON LAS POSIBLES CAUSAS?</div><h2>Posibles causas del comportamiento</h2><p class="muted">Registra qué podría dificultar o facilitar una conducta. Profundiza solo si necesitas explorar sesgos o vincular evidencia.</p></div><button type="button" class="primary" onclick="diagCauseOpen(null)">+ Agregar posible causa</button></div>';
 if(opened&&behaviors.length){
  out+='<div class="diag-cause-editor"><div class="diag-cause-editor-head"><h3>'+(editing?'Editar posible causa':'Nueva posible causa')+'</h3><button type="button" class="secondary" onclick="diagCauseClose()">Cerrar</button></div><form id="diag-cause-form" onsubmit="diagCauseSave(event)">';
  out+='<div class="diag-cause-grid"><label>Comportamiento<select name="behaviorId" onchange="diagCausePreview(false)">'+diagCauseOpt(behaviors,values.behaviorId)+'</select></label>';
  out+='<label>Factor conductual<select name="factorKey" onchange="diagCausePreview(false)">'+diagCauseOpt([['','Sin factor específico'],...factors],values.factorKey)+'</select></label>';
  out+='<label>¿Cómo podría influir?<select name="relation" onchange="diagCausePreview(false)">'+diagCauseOpt([['dificultar','Podría dificultar'],['facilitar','Podría facilitar'],['influir','Podría influir en']],values.relation||'influir')+'</select></label></div>';
  out+='<details class="diag-cause-optional"'+(values.patternId||values.application?' open':'')+'><summary>Explorar sesgos, atajos de decisión u oportunidades (opcional)</summary><div class="diag-cause-optional-body"><label>Sesgo o atajo de decisión<select name="patternId" onchange="diagCausePreview(false)">'+diagCauseOpt([['','Sin sesgo o heurística'],...DIAG_CAUSE_PATTERNS.map(p=>[p[0],p[1]+' ('+p[2]+')'])],values.patternId)+'</select><small id="diag-cause-pattern-help">'+diagEsc(bias?bias[2]+' · Mecanismo por investigar.':'Selecciona uno solo cuando resulte relevante, sin etiquetar a las personas.')+'</small></label>';
  out+='<label>¿Cómo podríamos aprovecharlo?<textarea name="application" rows="2" oninput="this.dataset.suggested=0" placeholder="Una opción transparente, voluntaria y útil">'+diagEsc(values.application||bias?.[3]||'')+'</textarea><small>Favorecer decisiones informadas, sin manipulación ni información oculta.</small></label></div></details>';
  out+='<div class="diag-cause-statement"><div><strong>Posible causa formulada</strong><button type="button" class="secondary" onclick="diagCausePreview(true)">Regenerar</button></div><textarea name="statement" rows="3" required placeholder="Selecciona un factor o un sesgo para generar la explicación" oninput="this.dataset.edited=1">'+diagEsc(editing?.statement||diagCauseSuggested(x,values))+'</textarea><small>Es una explicación provisional, no una causa demostrada.</small></div>';
  out+='<details class="diag-cause-optional"'+(values.findingId?' open':'')+'><summary>Vincular hallazgos existentes (opcional)</summary><div class="diag-cause-optional-body"><div class="diag-cause-evidence"><strong>Evidencia seleccionada</strong><input type="hidden" name="findingId" value="'+diagEsc(values.findingId||'')+'"><small id="diag-cause-evidence-current">'+(finding?'Hallazgo: '+diagEsc(String(finding.text||'').slice(0,140)):'Sin hallazgo seleccionado')+'</small><input id="diag-cause-search" type="search" placeholder="Buscar en los hallazgos" oninput="diagCauseSearch()"><div id="diag-cause-evidence-list">'+diagCauseEvidenceOptions(x,values,'')+'</div></div></div></details>';
  out+='<div class="diag-cause-validation"><div class="diag-cause-grid"><label>Estado de la posible causa<select name="status" onchange="diagCauseStatusChanged(this)">'+diagCauseOpt(DIAG_CAUSE_STATES.map(z=>[z,z]),status)+'</select></label></div><div id="diag-cause-validation-extra"'+(status==='Por comprobar'?' hidden':'')+'>';
  out+='<div id="diag-cause-validation-method"'+(status!=='Comprobada'?' hidden':'')+'><label>Método de comprobación<select name="validationMethod">'+diagCauseOpt(DIAG_CAUSE_METHODS.map(z=>[z,z||'Sin método documentado']),values.validationMethod||'')+'</select></label></div>';
  out+='<label>¿Qué evidencia o contraste respalda este estado?<textarea name="validationNote" rows="2" placeholder="Describe brevemente qué observaste o cómo se contrastó">'+diagEsc(values.validationNote||'')+'</textarea></label><small>Los hallazgos pueden respaldar una explicación, pero no demuestran por sí solos causalidad.</small></div></div>';
  out+='<div class="diag-cause-actions"><button class="primary" type="submit">'+(editing?'Guardar cambios':'Guardar posible causa')+'</button><button class="secondary" type="button" onclick="diagCauseClose()">Cancelar</button></div></form></div>';
 }else if(opened)out+='<p class="muted">Primero registra un comportamiento en Diseño.</p>';
 out+='</section>';
 out+='<section class="panel diag-cause-review diag-step-panel"><div class="diag-step-label">03 · ¿QUÉ HEMOS COMPROBADO?</div><h2>Seguimiento de las posibles causas</h2><p class="muted">Revisa el estado de cada explicación y actualiza su evidencia cuando tengas nuevos datos.</p>';
 if(causes.length){
  out+='<div class="diag-causes-count"><b>'+causes.length+' '+(causes.length===1?'posible causa':'posibles causas')+'</b>'+count.map(([state,n])=>'<span>'+n+' '+diagEsc(state.toLowerCase())+'</span>').join('')+'</div>';
  out+='<div class="diag-causes-list">'+causes.map(c=>diagCauseItem(x,c)).join('')+'</div>';
 }else out+='<p class="diag-causes-empty">Aún no hay posibles causas registradas. Puedes comenzar con una sola y agregar más cuando sea necesario.</p>';
 if(historic.length)out+='<details class="diag-cause-history"><summary>Formulaciones anteriores ('+historic.length+')</summary>'+historic.map(h=>'<p>'+diagEsc(h.text)+'</p>').join('')+'</details>';
 return out+'</section>';
}
