const GRAPH_RELATIONS=['Consulta a','Informa a','Colabora con','Apoya a','Comparte conocimiento con','Utiliza','Depende de','Influye en','Supervisa a','Reporta a','Pertenece a','Otra'];
function normalizeRelation(v){return String(v||'Otra').trim()}
function edgeRelation(e){return e.relation||e.label||'Otra'}
function relationMeasureConfig(r){
 r=normalizeRelation(r);
 if(['Consulta a','Informa a','Colabora con','Apoya a','Comparte conocimiento con','Utiliza'].includes(r))return {type:'frequency',label:r==='Utiliza'?'Frecuencia de uso':'Frecuencia',kind:'frequency'};
 if(r==='Depende de')return {type:'dependency',label:'Grado de dependencia',kind:'scale'};
 if(r==='Influye en')return {type:'influence',label:'Fuerza de influencia',kind:'scale'};
 return null;
}
function updateRelationMeasure(sel){
 const f=sel.form,r=sel.value,custom=f.querySelector('.custom-relation'),box=f.querySelector('.relation-measure'),cfg=relationMeasureConfig(r);
 custom.hidden=r!=='Otra';custom.querySelector('input').disabled=r!=='Otra';
 if(!cfg){box.hidden=true;box.querySelectorAll('input,select').forEach(v=>v.disabled=true);return}
 box.hidden=false;box.querySelectorAll('input,select').forEach(v=>v.disabled=false);
 box.querySelector('.measure-label').textContent=cfg.label;
 box.querySelector('[name=measureType]').value=cfg.type;
 const freq=box.querySelector('.frequency-unit'),scale=box.querySelector('.scale-help');
 freq.hidden=cfg.kind!=='frequency';freq.disabled=cfg.kind!=='frequency';
 scale.hidden=cfg.kind!=='scale';
 box.querySelector('[name=measureValue]').min=cfg.kind==='scale'?'1':'0';
 box.querySelector('[name=measureValue]').max=cfg.kind==='scale'?'5':'';
 box.querySelector('[name=measureValue]').step=cfg.kind==='scale'?'1':'any';
 box.querySelector('[name=measureValue]').placeholder=cfg.kind==='scale'?'1–5':'Cantidad';
}
function migrateLegacyGraphEdges(x){
 if(x.graphEdgeModelVersion===2)return;
 const catalog=GRAPH_RELATIONS.filter(v=>v!=='Otra'),out=[];
 for(const e of (x.edges||[])){
  if(e.relation){out.push(e);continue}
  const raw=(e.label||'Otra').trim(),relation=catalog.includes(raw)?raw:raw||'Otra';
  const base={s:Number(e.s),t:Number(e.t),relation,relationKey:normalizeRelation(relation),evidence:e.evidence||'Declarada',legacy:{strength:e.strength,frequency:e.frequency,confidence:e.confidence,sign:e.sign}};
  out.push(base);
  if(e.direction==='bidirectional')out.push({s:Number(e.t),t:Number(e.s),relation,relationKey:normalizeRelation(relation),evidence:e.reverseEvidence||e.evidence||'Declarada',legacy:{strength:e.reverseStrength??e.strength,frequency:e.reverseFrequency??e.frequency,confidence:e.reverseConfidence??e.confidence,sign:e.reverseSign??e.sign}});
 }
 x.edges=out;x.graphEdgeModelVersion=2;
}
function setGraphRelationFilter(v){let x=current();x.networkRelationFilter=v;save();render()}
function deleteGraphEdge(index){let x=current(),e=x.edges?.[index];if(!e)return;let ns=x.nodes||[],label=`${ns[e.s]?.name||'Origen'} → ${ns[e.t]?.name||'Destino'} · ${edgeRelation(e)}`;if(!confirm('¿Eliminar esta conexión?\n\n'+label))return;x.edges.splice(index,1);x.networkAnalysis=null;save();render()}
function deleteGraphNode(index){let x=current(),n=x.nodes?.[index];if(!n)return;let count=(x.edges||[]).filter(e=>Number(e.s)===index||Number(e.t)===index).length;let msg=`¿Eliminar el nodo “${n.name||'Sin nombre'}”?`+(count?`\n\nTambién se eliminarán ${count} conexión${count===1?'':'es'} asociada${count===1?'':'s'}.`:'');if(!confirm(msg))return;x.edges=(x.edges||[]).filter(e=>Number(e.s)!==index&&Number(e.t)!==index).map(e=>({...e,s:Number(e.s)>index?Number(e.s)-1:Number(e.s),t:Number(e.t)>index?Number(e.t)-1:Number(e.t)}));x.nodes.splice(index,1);x.networkAnalysis=null;save();render()}
function measureText(e){
 if(!e.measureType||e.measureValue==null)return '';
 if(e.measureType==='frequency')return `${e.measureValue} vez${Number(e.measureValue)===1?'':'es'} por ${e.measureUnit||'período'}`;
 if(e.measureType==='dependency')return `Dependencia ${e.measureValue}/5`;
 if(e.measureType==='influence')return `Influencia ${e.measureValue}/5`;
 return `${e.measureValue}`;
}
function evidenceDash(e){return ['Declarada','Hipótesis','Hipotética'].includes(e.evidence)?'3 5':'none'}
function renderAdoptionGraphPage(a,head,x){
 migrateLegacyGraphEdges(x);
 const ns=x.nodes||[],all=x.edges||[],types=[...new Set(all.map(edgeRelation).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 const filter=x.networkRelationFilter||'Todas';
 const edges=all.filter(e=>filter==='Todas'||normalizeRelation(edgeRelation(e))===filter);
 const coords=ns.map((n,i)=>({x:240+175*Math.cos(i*2*Math.PI/Math.max(ns.length,1)),y:175+120*Math.sin(i*2*Math.PI/Math.max(ns.length,1))}));
 const key=(e)=>`${e.s}|${e.t}|${normalizeRelation(edgeRelation(e))}`;
 const done=new Set(),draw=[];
 for(const e of edges){const k=key(e);if(done.has(k))continue;const rk=`${e.t}|${e.s}|${normalizeRelation(edgeRelation(e))}`,rev=edges.find(q=>key(q)===rk);draw.push({e,rev:rev&&e.s!==e.t?rev:null});done.add(k);if(rev)done.add(rk)}
 const line=(e,rev)=>{let p=coords[e.s],q=coords[e.t];if(!p||!q)return '';let dashed=evidenceDash(e),both=!!rev,dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,r=16,x1=p.x+ux*r,y1=p.y+uy*r,x2=q.x-ux*r,y2=q.y-uy*r;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${both?'#53cdb5':'#8fc7d8'}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${dashed}" ${both?'marker-start="url(#edgeArrowStart)"':''} marker-end="url(#edgeArrow)"><title>${safe(ns[e.s]?.name||'Origen')} ${both?'↔':'→'} ${safe(ns[e.t]?.name||'Destino')} · ${safe(edgeRelation(e))}</title></line>`};
 const relationOptions=GRAPH_RELATIONS.map(r=>`<option value="${safe(r)}">${safe(r)}</option>`).join('');
 const filterOptions=['Todas',...types].map(r=>`<option value="${safe(r)}" ${r===filter?'selected':''}>${safe(r)}</option>`).join('');
 a.innerHTML=head+`<div class="grid"><section class="panel"><h2>Grafo editable</h2>
 <form onsubmit="addNode(event)"><input name="name" placeholder="Persona, equipo, barrera..." required><select name="type"><option>Equipo</option><option>Persona</option><option>Barrera</option><option>Facilitador</option><option>Intervención</option><option>Tecnología</option><option>Plataforma</option><option>Base de datos</option><option>Repositorio</option><option>Documento</option><option>Herramienta</option><option>Conocimiento</option><option>Proceso</option><option>Indicador</option></select><button class="primary">Agregar nodo</button></form>
 <div style="max-height:190px;overflow:auto;margin:10px 0">${ns.map((n,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #20435a;padding:8px 0"><span><b>${safe(n.name)}</b> <span class="muted">· ${safe(n.type||'Nodo')}</span></span><button type="button" class="secondary" style="width:auto;padding:6px 10px" onclick="deleteGraphNode(${i})">Eliminar nodo</button></div>`).join('')||'<p class="muted">Aún no hay nodos.</p>'}</div>
 <form onsubmit="addEdge(event)">
  <label>Origen<select name="source" required>${ns.map((n,i)=>`<option value="${i}">${safe(n.name)}</option>`).join('')}</select></label>
  <label>Relación<select name="relation" required onchange="updateRelationMeasure(this)"><option value="" selected disabled>Selecciona una relación</option>${relationOptions}</select></label>
  <label>Destino<select name="target" required>${ns.map((n,i)=>`<option value="${i}">${safe(n.name)}</option>`).join('')}</select></label>
  <label class="custom-relation" hidden>Nombre de la relación<input name="customRelation" disabled placeholder="Ej. transfiere conocimiento a"></label>
  <div class="relation-measure" hidden style="border:1px solid #2c566e;border-radius:10px;padding:10px">
   <input type="hidden" name="measureType" disabled>
   <label><span class="measure-label">Medida</span><input name="measureValue" type="number" disabled></label>
   <label>Período<select class="frequency-unit" name="measureUnit" disabled><option value="día">día</option><option value="semana" selected>semana</option><option value="mes">mes</option><option value="trimestre">trimestre</option><option value="año">año</option></select></label>
   <p class="muted scale-help" hidden>1 = baja · 3 = media · 5 = muy alta.</p>
  </div>
  <label>Evidencia<select name="evidence"><option>Registrada</option><option>Observada</option><option selected>Declarada</option><option>Estimada</option><option>Hipotética</option></select></label>
  <button class="secondary" ${ns.length<2?'disabled':''}>Conectar</button>
 </form>
 <p class="muted">La dirección se define por Origen → Destino. La reciprocidad se detecta automáticamente cuando existe la misma relación en ambos sentidos.</p>
 </section>
 <section class="panel"><h2>Visualización de relaciones</h2>
 <label>Ver capa de relación<select onchange="setGraphRelationFilter(this.value)">${filterOptions}</select></label>
 <svg viewBox="0 0 480 350" role="img" aria-label="Grafo de nodos y conexiones"><defs>
  <marker id="edgeArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker>
  <marker id="edgeArrowStart" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="strokeWidth"><path d="M 10 0 L 0 5 L 10 10 z" fill="context-stroke"/></marker>
 </defs>${draw.map(d=>line(d.e,d.rev)).join('')}${ns.map((n,i)=>`<circle cx="${coords[i].x}" cy="${coords[i].y}" r="13" fill="${['#17b3d2','#8855ce','#e9a52e','#20b789','#d76e9c','#4bc4e5','#4bc4e5','#4bc4e5','#4bc4e5','#4bc4e5','#4bc4e5','#4bc4e5','#e4b864','#e4b864'][['Equipo','Persona','Barrera','Facilitador','Intervención','Tecnología','Plataforma','Base de datos','Repositorio','Documento','Herramienta','Conocimiento','Proceso','Indicador'].indexOf(n.type)]||'#58b6bb'}"/><text x="${coords[i].x}" y="${coords[i].y+27}" fill="white" font-size="11" text-anchor="middle">${safe(n.name).slice(0,20)}</text>`).join('')}</svg>
 <p class="muted">${ns.length} nodos · ${edges.length} aristas en ${filter==='Todas'?'la vista global':'la capa '+safe(filter)}</p>
 <p class="muted" style="font-size:11px;line-height:1.25;margin-top:4px;opacity:.72">→ dirigida · ↔ recíproca · ━ observada/registrada/estimada · ┄ declarada/hipotética</p>
 <div style="max-height:290px;overflow:auto">${draw.map(({e,rev})=>`<div style="border-top:1px solid #20435a;padding:9px 0"><b>${safe(ns[e.s]?.name||'Origen')} ${rev?'↔':'→'} ${safe(ns[e.t]?.name||'Destino')}</b> · ${safe(edgeRelation(e))}<br><span class="muted">${safe(ns[e.s]?.name||'Origen')} → ${safe(ns[e.t]?.name||'Destino')}${measureText(e)?' · '+safe(measureText(e)):''} · ${safe(e.evidence||'Sin clasificar')}</span> <button type="button" class="secondary" style="width:auto;padding:4px 8px;margin-left:6px" onclick="deleteGraphEdge(${all.indexOf(e)})">Eliminar conexión</button>${rev?`<br><span class="muted">${safe(ns[rev.s]?.name||'Origen')} → ${safe(ns[rev.t]?.name||'Destino')}${measureText(rev)?' · '+safe(measureText(rev)):''} · ${safe(rev.evidence||'Sin clasificar')}</span> <button type="button" class="secondary" style="width:auto;padding:4px 8px;margin-left:6px" onclick="deleteGraphEdge(${all.indexOf(rev)})">Eliminar conexión</button>`:''}</div>`).join('')||'<div class="empty">No hay relaciones en esta capa.</div>'}</div>
 <section class="panel" style="margin-top:14px"><h3>Análisis computacional de la red</h3><p class="muted">NetworkX analiza ${filter==='Todas'?'la estructura completa':'la capa '+safe(filter)}. Las métricas describen estructura; no prueban causalidad.</p><button class="primary" onclick="analyzeAdoptionNetwork()">Analizar red con NetworkX</button><div id="network-analysis-status" class="notice" style="margin-top:10px"></div><div id="network-analysis-results" style="margin-top:12px"></div></section>
 <p class="notice">La vista global ayuda a explorar el sistema. Para interpretar centralidades con mayor claridad, analiza una capa de relación específica.</p>
 </section></div>`;
}
async function analyzeAdoptionNetwork(){
 const x=current(),s=document.getElementById('network-analysis-status'),b=document.getElementById('network-analysis-results');
 if(!x||!s||!b)return;
 migrateLegacyGraphEdges(x);
 if(!(x.nodes||[]).length){s.textContent='Agrega al menos un nodo antes de analizar la red.';b.innerHTML='';return}
 const filter=x.networkRelationFilter||'Todas';
 const selected=(x.edges||[]).filter(e=>filter==='Todas'||normalizeRelation(edgeRelation(e))===filter);
 const nodes=x.nodes.map((n,i)=>({id:String(i),label:n.name||('Nodo '+(i+1)),type:n.type||'Otro'}));
 const edges=selected.filter(e=>e.s!=null&&e.t!=null).map(e=>({
   source:String(e.s),target:String(e.t),relation:edgeRelation(e)||'Otra',
   evidence:e.evidence||null,measure_type:e.measureType||null,
   measure_value:e.measureValue==null?null:Number(e.measureValue),measure_unit:e.measureUnit||null
 }));
 s.textContent=filter==='Todas'?'Analizando la red multirrelacional…':'Analizando la capa «'+filter+'»…';b.innerHTML='';
 try{
   const resp=await fetch(HACERLO_ENGINE_URL+'/api/network/analyze',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({nodes,edges,mode:filter==='Todas'?'multiplex':'layer',relation_filter:filter==='Todas'?null:filter})
   });
   if(!resp.ok){let detail='';try{detail=await resp.text()}catch(_e){}throw Error('HTTP '+resp.status+(detail?' · '+detail.slice(0,180):''))}
   const r=await resp.json();x.networkAnalysis={...r,relationFilter:filter,runAt:new Date().toISOString()};save();renderNetworkAnalysis(r,x,b);
   s.textContent='Análisis completado ✓ · '+(filter==='Todas'?'multirrelacional':filter)
 }catch(e){console.error(e);s.textContent='No fue posible ejecutar NetworkX: '+e.message}
}
function pct(v){return Math.round(Number(v||0)*1000)/10+'%'}
function renderNetworkAnalysis(r,x,b){
 const safeArr=v=>Array.isArray(v)?v:[];
 const metricRows=safeArr(r.metrics);
 const summary=r.summary||{};
 const signals=safeArr(r.signals);
 const hypotheses=safeArr(r.intervention_hypotheses);
 const communities=safeArr(r.communities);
 const roles=safeArr(r.structural_roles);
 const composition=safeArr(r.relation_composition);
 const matrix=safeArr(r.layer_matrix);
 const mode=r.mode||'layer';
 const metricTable=metricRows.length?`<details style="margin-top:12px"><summary>Ver métricas por nodo</summary><div style="overflow-x:auto"><table><tr><th>Nodo</th><th>Tipo</th><th>Entrada</th><th>Salida</th><th>Intermediación</th><th>PageRank</th><th>Capas</th></tr>${metricRows.map(v=>`<tr><td>${safe(v.label||v.id)}</td><td>${safe(v.type||'')}</td><td>${v.in_degree_centrality??0}</td><td>${v.out_degree_centrality??0}</td><td>${v.betweenness_centrality??0}</td><td>${v.pagerank??0}</td><td>${v.layer_count??0}</td></tr>`).join('')}</table></div></details>`:'';
 if(mode==='multiplex'){
   b.innerHTML=`<div class="triple"><div class="kpi"><span class="muted">Nodos</span><div class="num">${summary.nodes??r.nodes??0}</div></div><div class="kpi"><span class="muted">Relaciones</span><div class="num">${summary.edges??r.edges??0}</div></div><div class="kpi"><span class="muted">Capas</span><div class="num">${summary.layers??0}</div></div></div>
   <div class="grid" style="margin-top:12px"><section class="panel"><h3>Composición de la red</h3>${composition.map(v=>`<p><b>${safe(v.relation)}</b> · ${v.edges} conexiones · ${pct(v.share)}</p>`).join('')||'<p class="muted">Sin relaciones registradas.</p>'}</section><section class="panel"><h3>Actores / nodos transversales</h3>${roles.slice(0,6).map(v=>`<p><b>${safe(v.label)}</b> · ${v.layer_count} capas<br><small class="muted">${safe((v.roles||[]).join(' · ')||'Participación estructural')}</small></p>`).join('')||'<p class="muted">Se requieren más relaciones para identificar transversalidad.</p>'}</section></div>
   <div class="grid" style="margin-top:12px"><section class="panel"><h3>Comunidades estructurales</h3>${communities.map((c,i)=>`<p><b>Comunidad ${i+1}</b> · ${c.size} nodos<br><small class="muted">${safe((c.labels||[]).join(', '))}</small></p>`).join('')||'<p class="muted">No se identificaron comunidades diferenciadas.</p>'}</section><section class="panel"><h3>Señales estructurales</h3>${signals.map(v=>`<p>• ${safe(v)}</p>`).join('')||'<p class="muted">Sin señales destacadas con los datos actuales.</p>'}</section></div>
   ${matrix.length?`<details style="margin-top:12px"><summary>Matriz nodo × capa</summary><div style="overflow-x:auto"><table><tr><th>Nodo</th>${safeArr(r.layers).map(l=>`<th>${safe(l)}</th>`).join('')}</tr>${matrix.map(row=>`<tr><td><b>${safe(row.label)}</b><br><small class="muted">${safe(row.type||'')}</small></td>${safeArr(r.layers).map(l=>`<td>${row.layers&&row.layers[l]?row.layers[l]:'—'}</td>`).join('')}</tr>`).join('')}</table></div></details>`:''}
   ${hypotheses.length?`<section class="panel" style="margin-top:12px"><h3>Hipótesis y oportunidades de intervención</h3>${hypotheses.map(h=>`<p><b>${safe(h.title)}</b><br><span class="muted">${safe(h.rationale)}</span><br><small>${safe(h.action)}</small></p>`).join('')}<div class="notice">Son hipótesis para diseñar y contrastar en RDAIM; no son recomendaciones causales demostradas.</div></section>`:''}
   ${metricTable}<p class="notice">La vista «Todas» conserva las capas por separado. PageRank, comunidades y roles describen estructura; no equivalen por sí solos a influencia, causalidad o desempeño.</p>`;
 }else{
   const topIn=safeArr(r.top_in),topOut=safeArr(r.top_out),topBetween=safeArr(r.top_betweenness),topPR=safeArr(r.top_pagerank);
   b.innerHTML=`<div class="triple"><div class="kpi"><span class="muted">Nodos</span><div class="num">${summary.nodes??r.nodes??0}</div></div><div class="kpi"><span class="muted">Relaciones</span><div class="num">${summary.edges??r.edges??0}</div></div><div class="kpi"><span class="muted">Densidad</span><div class="num">${summary.density??r.density??0}</div></div></div>
   <div class="triple" style="margin-top:12px"><div class="kpi"><span class="muted">Reciprocidad</span><div class="num">${pct(summary.reciprocity)}</div></div><div class="kpi"><span class="muted">Componentes</span><div class="num">${summary.weak_components??0}</div></div><div class="kpi"><span class="muted">Aislados</span><div class="num">${summary.isolates??0}</div></div></div>
   <div class="grid" style="margin-top:12px"><section class="panel"><h3>Más receptores</h3>${topIn.map(v=>`<p><b>${safe(v.label)}</b> · ${v.value}</p>`).join('')||'<p class="muted">Sin datos.</p>'}<h3>Más emisores</h3>${topOut.map(v=>`<p><b>${safe(v.label)}</b> · ${v.value}</p>`).join('')||'<p class="muted">Sin datos.</p>'}</section><section class="panel"><h3>Puentes estructurales</h3>${topBetween.map(v=>`<p><b>${safe(v.label)}</b> · ${v.value}</p>`).join('')||'<p class="muted">Sin datos.</p>'}<h3>Prominencia · PageRank</h3>${topPR.map(v=>`<p><b>${safe(v.label)}</b> · ${v.value}</p>`).join('')||'<p class="muted">Sin datos.</p>'}</section></div>
   <div class="grid" style="margin-top:12px"><section class="panel"><h3>Comunidades</h3>${communities.map((c,i)=>`<p><b>Comunidad ${i+1}</b> · ${c.size} nodos<br><small class="muted">${safe((c.labels||[]).join(', '))}</small></p>`).join('')||'<p class="muted">No se identificaron comunidades diferenciadas.</p>'}</section><section class="panel"><h3>Señales estructurales</h3>${signals.map(v=>`<p>• ${safe(v)}</p>`).join('')||'<p class="muted">Sin señales destacadas con los datos actuales.</p>'}</section></div>
   ${hypotheses.length?`<section class="panel" style="margin-top:12px"><h3>Hipótesis y oportunidades de intervención</h3>${hypotheses.map(h=>`<p><b>${safe(h.title)}</b><br><span class="muted">${safe(h.rationale)}</span><br><small>${safe(h.action)}</small></p>`).join('')}<div class="notice">Deben contrastarse mediante intervención y medición; no prueban causalidad.</div></section>`:''}
   ${metricTable}<p class="notice">El significado de entrada/salida depende de la relación seleccionada. PageRank se presenta como prominencia estructural, no como «influencia» automática.</p>`;
 }
}

