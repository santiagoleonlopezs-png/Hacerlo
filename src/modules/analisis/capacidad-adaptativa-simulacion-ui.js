/* HACERLO · Capacidad Adaptativa · experiencia de tres pasos.
   Mediciones reales se mantienen separadas de simulaciones hipotéticas. */
let caDynDraft=null;
function caDynSession(x){
 if(!caDynDraft||String(caDynDraft.initiativeId)!==String(x.id)){
  caDynDraft={initiativeId:x.id,tab:'medicion',source:'observed',
   invertDesgaste:false,weeks:52,inputs:CA_DYN.inputs({})};
 }
 return caDynDraft;
}
function caDynTab(id){
 if(!['medicion','escenarios','comparar'].includes(id))return;
 caDynSession(current()).tab=id;render();
}
function caDynSource(v){
 if(!['observed','model'].includes(v))return;
 caDynSession(current()).source=v;render();
}
function caDynInvert(checked){caDynSession(current()).invertDesgaste=!!checked;render();}
function caDynWeeks(value){
 const d=caDynSession(current());d.weeks=Math.max(4,Math.min(104,Math.round(Number(value)||52)));render();
}
function caDynInput(id,value){
 if(!CA_DYN.controls.some(c=>c.id===id))return;
 const d=caDynSession(current());d.inputs[id]=CA_DYN.inputs({[id]:value})[id];
 const counter=document.getElementById('ca-dyn-value-'+id);
 if(counter)counter.textContent=String(d.inputs[id]);
}
function caDynResetScenario(){caDynSession(current()).inputs=CA_DYN.inputs({});render();}
function caDynInitial(x){
 const draft=caDynSession(x),observed=caReadObserved(x,caObservedWave,caObservedAudience);
 const initial={...CA_DYN.defaults},sources={};
 for(const dim of CA_DIMENSIONS){
  const d=observed.dimensions[dim.id],modelValue=CA_DYN.defaults[dim.id];
  if(draft.source==='model'){
   sources[dim.id]={value:modelValue,kind:'model',label:'Modelo AnyLogic · valor original'};
   continue;
  }
  if(d.needsOrientation){
   if(draft.invertDesgaste&&Number.isFinite(d.rawValue)){
    initial[dim.id]=100-d.rawValue;
    sources[dim.id]={value:initial[dim.id],kind:'proxy',
     label:'Encuesta · inversión explícita de Desgaste',n:d.sources.reduce((n,q)=>Math.max(n,q.n||0),0)};
   }else{
    sources[dim.id]={value:modelValue,kind:'model',label:'Modelo AnyLogic · requiere validar inversión de Desgaste'};
   }
   continue;
  }
  if(Number.isFinite(d.value)){
   initial[dim.id]=d.value;
   sources[dim.id]={value:d.value,kind:'observed',label:'Encuesta · '+caObservedWave,n:d.sources.reduce((n,q)=>Math.max(n,q.n||0),0)};
  }else{
   sources[dim.id]={value:modelValue,kind:'model',label:'Modelo AnyLogic · sin evidencia compatible'};
  }
 }
 return {initial,sources,observed,wave:caObservedWave,audienceId:caObservedAudience};
}
function caDynView(x){
 const d=caDynSession(x),last=x.capacityAdaptive?.simulationRuns?.at(-1);
 const labels=[['medicion','01','Medición inicial'],['escenarios','02','Simulación de escenarios'],['comparar','03','Comparar resultados']];
 return `<div class="ca-dyn-root">
  <nav class="ca-dyn-steps" aria-label="Pasos de Capacidad Adaptativa">
   ${labels.map(([id,no,label])=>`<button type="button" class="${d.tab===id?'is-active':''}" aria-current="${d.tab===id?'step':'false'}" onclick="caDynTab('${id}')"><small>${no}</small>${label}</button>`).join('')}
  </nav>
  ${d.tab==='medicion'?caDynMeasurement(x,d):d.tab==='escenarios'?caDynScenario(x,d):caDynComparison(x,last)}
 </div>`;
}
function caDynMeasurement(x,d){
 const init=caDynInitial(x),sources=init.sources;
 return `<div class="ca-dyn-workspace">
  <section class="ca-dyn-panel">
   <div class="ca-dyn-section-heading"><div><small>01 · PUNTO DE PARTIDA</small><h2>Medición inicial</h2>
   <p>Define desde dónde comienza la simulación, utilizando la evidencia disponible o los valores originales del modelo.</p></div></div>
   <div class="ca-dyn-source-row">
    <label>Fuente de valores iniciales<select onchange="caDynSource(this.value)">
     <option value="observed" ${d.source==='observed'?'selected':''}>Encuestas (usar donde haya datos)</option>
     <option value="model" ${d.source==='model'?'selected':''}>Modelo AnyLogic original</option>
    </select></label>
   </div>
   <div class="ca-dyn-stocks">${CA_DIMENSIONS.map(dim=>{const s=sources[dim.id];
    return `<article class="ca-dyn-stock"><span>${safe(dim.name)}</span><b>${s.value.toFixed(2)}</b>
     <small>${safe(s.label)}</small></article>`}).join('')}</div>
   ${d.source==='observed'&&init.observed.dimensions.energia.needsOrientation?
    `<label class="ca-dyn-assumption"><input type="checkbox" style="width:auto" ${d.invertDesgaste?'checked':''} onchange="caDynInvert(this.checked)">
     <span><strong>Utilizar Desgaste como aproximación inversa de Energía</strong><small>Supuesto explícito: Energía = 100 − Desgaste. No es equivalencia validada entre constructos.</small></span></label>`:''}
   <div class="ca-dyn-footer-actions"><button type="button" class="primary" onclick="caDynTab('escenarios')">Continuar a escenarios →</button></div>
  </section>
  <section class="ca-dyn-panel">
   <div class="ca-dyn-section-heading"><div><small>FUENTES</small><h2>Encuestas vinculadas</h2>
    <p>Revisa las mediciones por audiencia y momento, y configura las preguntas de cada dimensión.</p></div></div>
   ${caObservedView(x)}
   ${caMarkup(x)}
  </section>
 </div>`;
}
function caDynScenario(x,d){
 const init=caDynInitial(x),last=x.capacityAdaptive?.simulationRuns?.at(-1);
 return `<section class="ca-dyn-panel">
  <div class="ca-dyn-section-heading"><div><small>02 · HIPÓTESIS DE CAMBIO</small><h2>Simulación de escenarios</h2>
   <p>Ajusta seis variables del modelo y contrasta su evolución frente a un escenario de referencia con entradas en cero.</p></div></div>
  <div class="ca-dyn-settings">
   <label>Horizonte (semanas)<select onchange="caDynWeeks(this.value)">${[4,12,26,52,78,104].map(n=>`<option value="${n}" ${n===d.weeks?'selected':''}>${n} semanas</option>`).join('')}</select></label>
   <div class="ca-dyn-data-note"><strong>Inicio</strong><span>${d.source==='model'?'Modelo AnyLogic':'Encuestas con respaldo del modelo cuando falten datos'} · ${safe(caObservedWave)}</span></div>
  </div>
  <div class="ca-dyn-sliders">${CA_DYN.controls.map(c=>`<label class="ca-dyn-slider">
   <span class="ca-dyn-slider-head"><strong>${safe(c.label)}</strong><output id="ca-dyn-value-${c.id}">${d.inputs[c.id]}</output></span>
   <input type="range" min="-100" max="100" step="5" value="${d.inputs[c.id]}"
    oninput="caDynInput('${c.id}',this.value)">
   <span class="ca-dyn-slider-ends"><small>−100</small><small>0</small><small>+100</small></span>
  </label>`).join('')}</div>
  <p class="ca-dyn-footnote">Los controles representan las entradas originales de AnyLogic (−100 a +100), mantenidas constantes durante el horizonte. Sus valores describen escenarios hipotéticos, no efectos causales demostrados.</p>
  <div class="ca-dyn-footer-actions">
   <button class="secondary" type="button" onclick="caDynResetScenario()">Restablecer controles</button>
   <button class="primary" type="button" onclick="caDynSimulate()">Simular y comparar →</button>
  </div>
  ${last?`<div class="ca-dyn-prior">Última simulación guardada: ${safe(last.createdAt.slice(0,16).replace('T',' · '))} · ${last.weeks} semanas</div>`:''}
 </section>`;
}
function caDynSimulate(){
 const x=current();if(!x)return;
 const d=caDynSession(x),info=caDynInitial(x);
 try{
  const base=CA_DYN.run({initial:info.initial,inputs:CA_DYN.inputs({}),weeks:d.weeks});
  const scenario=CA_DYN.run({initial:info.initial,inputs:d.inputs,weeks:d.weeks});
  const st=caStore(x);st.simulationRuns=st.simulationRuns||[];
  st.simulationRuns.push({id:Date.now().toString(36),createdAt:new Date().toISOString(),
   version:1,initiativeId:x.id,weeks:d.weeks,initial:info.initial,
   provenance:info.sources,wave:info.wave,audienceId:info.audienceId,
   source:d.source,invertDesgaste:d.invertDesgaste,inputs:{...d.inputs},
   baseline:base.series,scenario:scenario.series,model:'Modelo_Medición_Madurez_Cambio2.alp',
   integration:'Euler',stepWeeks:0.001});
  if(st.simulationRuns.length>15)st.simulationRuns=st.simulationRuns.slice(-15);
  save();d.tab='comparar';render();
 }catch(err){alert('No fue posible ejecutar la simulación: '+err.message);}
}
function caDynLineChart(base,scenario,key,label){
 if(!base?.length||!scenario?.length)return '';
 const width=660,height=185,L=39,R=18,T=14,B=32;
 const values=[...base,...scenario].map(r=>Number(r[key])).filter(Number.isFinite);
 if(!values.length)return '';
 let low=Math.min(...values),high=Math.max(...values),pad=Math.max(3,(high-low)*0.14);
 low-=pad;high+=pad;
 const n=Math.max(1,Math.max(base.at(-1).week,scenario.at(-1).week));
 const X=wk=>L+(width-L-R)*wk/n,Y=v=>T+(height-T-B)*(high-v)/(high-low);
 const poly=rows=>rows.map(r=>X(r.week).toFixed(1)+','+Y(r[key]).toFixed(1)).join(' ');
 const ticks=[low,(low+high)/2,high];
 return `<div class="ca-dyn-chart"><div class="ca-dyn-chart-title">${safe(label)}</div>
  <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${safe(label)}: referencia frente al escenario por semanas">
   ${ticks.map(v=>`<line x1="${L}" x2="${width-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#33516a" stroke-width="1" opacity=".55"/>
    <text x="${L-7}" y="${Y(v)+4}" text-anchor="end" fill="#92b4c4" font-size="11">${v.toFixed(1)}</text>`).join('')}
   <polyline points="${poly(base)}" fill="none" stroke="#8396a7" stroke-width="2" stroke-dasharray="6 5"/>
   <polyline points="${poly(scenario)}" fill="none" stroke="#4fe0c7" stroke-width="3"/>
   <text x="${L}" y="${height-8}" fill="#9dbccb" font-size="11">Semana 0</text>
   <text x="${width-R}" y="${height-8}" text-anchor="end" fill="#9dbccb" font-size="11">Semana ${n}</text>
  </svg></div>`;
}
function caDynComparison(x,last){
 if(!last)return `<section class="ca-dyn-panel ca-dyn-empty"><h2>Comparar resultados</h2>
  <p>Primero crea un escenario para visualizar cómo evolucionan las cuatro dimensiones y su índice compuesto.</p>
  <button type="button" class="primary" onclick="caDynTab('escenarios')">Crear escenario →</button></section>`;
 const scenario=last.scenario,base=last.baseline,s=scenario.at(-1),b=base.at(-1);
 const fmt=v=>(v>=0?'+':'')+v.toFixed(2);
 const stocks=[['energia','Energía adaptativa'],['preparacion','Preparación para el cambio'],['apertura','Apertura adaptativa'],['memoria','Memoria adaptativa']];
 return `<div class="ca-dyn-results">
  <section class="ca-dyn-panel"><div class="ca-dyn-section-heading"><div><small>03 · ESCENARIOS CONTRASTADOS</small>
   <h2>Comparar resultados</h2><p>Referencia sin cambios frente al escenario definido; ambos parten de las mismas condiciones iniciales.</p></div></div>
   <div class="ca-dyn-result-summary">
    <article><small>Madurez · referencia</small><b>${b.madurez.toFixed(2)}</b></article>
    <article><small>Madurez · escenario</small><b>${s.madurez.toFixed(2)}</b></article>
    <article><small>Diferencia</small><b>${fmt(s.madurez-b.madurez)}</b></article>
    <article><small>Brecha entre stocks</small><b>${s.brecha.toFixed(2)}</b></article>
   </div>
   <div class="ca-dyn-legend"><span><i class="ca-dyn-legend-base"></i> Referencia · entradas en cero</span><span><i class="ca-dyn-legend-sim"></i> Escenario · entradas ajustadas</span></div>
   ${caDynLineChart(base,scenario,'madurez','Índice compuesto de madurez adaptativa')}
   <div class="ca-dyn-chart-grid">${stocks.map(([key,label])=>caDynLineChart(base,scenario,key,label)).join('')}</div>
   <div class="ca-dyn-comparison-table"><div class="ca-dyn-comp-head"><b>Dimensión</b><b>Referencia</b><b>Escenario</b><b>Diferencia</b></div>
   ${stocks.map(([key,label])=>`<div><span>${safe(label)}</span><span>${b[key].toFixed(2)}</span><span>${s[key].toFixed(2)}</span><strong>${fmt(s[key]-b[key])}</strong></div>`).join('')}</div>
   <p class="ca-dyn-footnote">Simulación exploratoria, no predicción validada. Motor: ecuaciones del archivo AnyLogic 8.9.9; integración Euler de 0,001 semanas; horizonte ${last.weeks} semanas. Las entradas no cambian durante la simulación. La madurez combina los stocks 35/30/20/15 %.</p>
   <details class="ca-dyn-trace"><summary>Ver supuestos y trazabilidad</summary>
    <p>Inicio: ${last.source==='model'?'Valores originales de AnyLogic':'Encuestas con sustitución explícita de faltantes'} · Momento: ${safe(last.wave)} · Audiencia: ${safe(last.audienceId||'Todas')}</p>
    ${CA_DIMENSIONS.map(dim=>`<p><strong>${safe(dim.name)}:</strong> ${safe(last.provenance[dim.id]?.label||'Sin fuente')}</p>`).join('')}
    <p>Entradas (−100 a 100): ${CA_DYN.controls.map(c=>safe(c.label)+': '+last.inputs[c.id]).join(' · ')}</p>
   </details>
   <div class="ca-dyn-footer-actions">
    <button type="button" class="secondary" onclick="caDynTab('escenarios')">Ajustar escenario</button>
    <button type="button" class="primary" onclick="caDynTab('medicion')">Revisar medición inicial</button>
   </div>
  </section>
 </div>`;
}
