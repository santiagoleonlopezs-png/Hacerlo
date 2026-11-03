/* HACERLO · Capacidad Adaptativa · Lectura de datos y trazabilidad. */
let caObservedWave='Base',caObservedAudience='';
function caChangeObserved(wave,audience){
 caObservedWave=wave;caObservedAudience=audience;render();
}
function caObservedView(x){
 const reading=caReadObserved(x,caObservedWave,caObservedAudience);
 const responses=(x.surveys||[]).flatMap(s=>s.responses||[]);
 const ids=[...new Set(responses.map(r=>String(r.audienceId||'')).filter(Boolean))];
 const names=new Map((x.audiences||[]).map(a=>[String(a.id),a.name||a.title||String(a.id)]));
 const total=(x.capacityAdaptive?.observations||[]).length;
 return `<section class="panel" style="margin-top:12px">
 <div class="flex" style="align-items:center;justify-content:space-between;gap:12px">
  <div><h3 style="margin:0">Lectura de evidencia</h3><p class="muted" style="margin:5px 0 0">Datos reales de encuestas vinculadas · sin estimaciones</p></div>
  <button type="button" class="secondary" onclick="caSaveObserved()">Guardar lectura</button>
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
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">
 ${CA_DIMENSIONS.map(dim=>{
  const d=reading.dimensions[dim.id];const val=d.value;
  return `<div class="dash-card" style="padding:14px">
   <div class="muted" style="font-size:12px">${safe(d.label)}</div>
   <div class="metric">${val===null?'—':val.toFixed(2)+'%'}</div>
   <small class="muted">${d.questionCount} pregunta(s) de escala con datos</small>
   <details style="margin-top:9px"><summary style="cursor:pointer">Ver fuentes</summary>
    ${d.sources.length?d.sources.map(q=>`<p class="muted" style="font-size:11px;margin:8px 0">
     ${safe(q.survey)} · v${q.version} · ${safe(q.label)}
     <br>${q.value===null?'Sin respuestas':q.value.toFixed(2)+' '+safe(q.unit)} · n=${q.n}
    </p>`).join(''):'<p class="muted">No hay preguntas vinculadas.</p>'}
   </details>
  </div>`}).join('')}
 </div>
 <p class="muted" style="font-size:12px;margin:11px 0 0">${total} lectura(s) guardada(s) · Las respuestas se consultan por iniciativa y audiencia. Las preguntas pueden tener tamaños de muestra distintos.</p>
 <p class="notice" style="margin-top:10px">Lectura descriptiva: CNPS/NPS (−100 a 100) no se promedia con escalas (0 a 100). Desgaste no se interpreta automáticamente como Energía. El modelo dinámico de AnyLogic aún no está conectado.</p>
 </section>`;
}
const caMarkupBeforeObserved=caMarkup;
caMarkup=function(x){return caMarkupBeforeObserved(x)+caObservedView(x);};
