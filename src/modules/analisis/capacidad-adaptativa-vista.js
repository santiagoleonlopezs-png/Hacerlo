/* HACERLO · Capacidad Adaptativa · lectura auditable por pregunta y dimensión.
   Los conteos son RESPUESTAS válidas, no personas únicas. */
let caObservedWave='Base',caObservedAudience='';
function caChangeObserved(wave,audience){
 caObservedWave=wave;caObservedAudience=audience;render();
}
function caObservedView(x){
 const inverted=typeof caDynSession==='function'?caDynSession(x).invertDesgaste:false;
 const reading=caReadObserved(x,caObservedWave,caObservedAudience,inverted);
 const responses=(x.surveys||[]).flatMap(s=>s.responses||[]);
 const ids=[...new Set(responses.map(r=>String(r.audienceId||'')).filter(Boolean))];
 const names=new Map((x.audiences||[]).map(a=>[String(a.id),a.name||a.title||String(a.id)]));
 const total=(x.capacityAdaptive?.observations||[]).length;
 const fmt=v=>Number.isFinite(v)?v.toFixed(2)+' puntos':'—';
 const stats=c=>c?.n?'Promotores: '+c.promoters+' · Pasivos: '+c.passives+' · Detractores: '+c.detractors+' · Total: '+c.n+' respuestas':'Sin respuestas válidas';
 return `<section class="panel ca-counts-panel" style="margin-top:12px">
 <div class="flex" style="align-items:center;justify-content:space-between;gap:12px">
  <div><h3 style="margin:0">Lectura de evidencia</h3>
   <p class="muted" style="margin:5px 0">Balance calculado mediante conteos de respuestas, no promedios de índices.</p></div>
  <button type="button" class="secondary" onclick="caSaveObserved()" ${!CA_DIMENSIONS.some(d=>reading.dimensions[d.id].ready)?'disabled':''}>Guardar lectura</button>
 </div>
 <div class="flex" style="gap:12px;margin:12px 0;flex-wrap:wrap">
  <label style="min-width:140px;max-width:200px">Momento
   <select onchange="caChangeObserved(this.value,caObservedAudience)">
   ${['Base','Durante','Después'].map(v=>`<option ${v===caObservedWave?'selected':''}>${v}</option>`).join('')}
   </select></label>
  <label style="min-width:180px;max-width:280px">Audiencia
   <select onchange="caChangeObserved(caObservedWave,this.value)">
   <option value="">Todas las audiencias</option>
   ${ids.map(id=>`<option value="${safe(id)}" ${id===caObservedAudience?'selected':''}>${safe(names.get(id)||id)}</option>`).join('')}
   </select></label>
 </div>
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
 ${CA_DIMENSIONS.map(dim=>{
   const d=reading.dimensions[dim.id],c=d.counts;
   return `<article class="dash-card ca-count-card" style="padding:14px">
    <div class="muted" style="font-size:12px">${safe(d.label)}</div>
    <div class="metric">${d.needsOrientation?'Por orientar':fmt(d.value)}</div>
    <small class="muted">${d.questionCount} pregunta(s) asignada(s) · ${safe(d.scale||'Escala pendiente')}</small>
    ${d.ready?`<div class="ca-count-summary">${stats(c)}</div>`:d.warning?`<p class="notice">${safe(d.warning)}</p>`:'<p class="muted">Sin preguntas o respuestas compatibles.</p>'}
    <details style="margin-top:11px"><summary style="cursor:pointer">Ver conteos por pregunta</summary>
     ${d.sources.length?d.sources.map(q=>`<div class="ca-count-question">
      <strong>${safe(q.label)}</strong>
      <small>${safe(q.survey)} · v${q.version} · escala ${safe(q.scale||'no compatible')}</small>
      <small>${q.counts.valid?stats(q.counts):safe(q.counts.reason)}</small>
      <small>${q.counts.valid?'Balance: '+fmt(q.value):'Balance: —'}</small>
     </div>`).join(''):'<p class="muted">No hay preguntas asignadas.</p>'}
    </details>
   </article>`}).join('')}
 </div>
 <p class="muted" style="font-size:11.5px;margin:11px 0 0">${total} lectura(s) guardada(s). Los totales contabilizan respuestas a preguntas: una misma persona puede contribuir a varios ítems.</p>
 <p class="notice" style="margin-top:10px">Escala 1–5: 1–2 detractores, 3 pasivos, 4–5 promotores. Escala 0–10: 0–6, 7–8 y 9–10, respectivamente. El balance es (% promotores − % detractores), entre −100 y +100. Para 1–5 es un balance adaptado, no un NPS estandarizado. No se consolidan escalas diferentes en una misma dimensión.</p>
 </section>`;
}
