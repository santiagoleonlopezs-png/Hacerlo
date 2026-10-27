/* HACERLO V2 · Experiencia guiada para usuarios no expertos.
   Capa de interacción separada del motor ABM, del grafo y de la calibración.
   No predice adopción real; visualiza escenarios condicionales a supuestos. */

const ABM_SCENARIO_CARDS=[
  {id:'training',icon:'book-open',symbol:'✧',step:'Aprendizaje',title:'Ayudar a aprender',intro:'¿Y si las personas supieran mejor cómo hacerlo?',detail:'Explora una mejora de capacidad.',color:'blue'},
  {id:'friction',icon:'unlock',symbol:'↗',step:'Entorno',title:'Quitar obstáculos',intro:'¿Y si hacer lo correcto fuera más fácil?',detail:'Explora la reducción de fricciones.',color:'mint'},
  {id:'incentives',icon:'target',symbol:'◎',step:'Motivación',title:'Cambiar incentivos',intro:'¿Y si hubiera más razones para actuar?',detail:'Explora una mejora de motivación.',color:'amber'},
  {id:'ambassadors',icon:'network',symbol:'◇',step:'Influencia',title:'Activar referentes',intro:'¿Y si otras personas ayudaran a difundir el cambio?',detail:'Explora influencia entre pares.',color:'violet'}
];

function abmMarkPreviewStale(){
  const output=document.getElementById('abm-output');
  if(output&&typeof output.querySelector==='function'&&output.querySelector('.abm-outcome-ready')){
    output.innerHTML='<div class="abm-result-placeholder"><h3>Tu próximo escenario está por descubrirse</h3><p>Cambiaste una decisión o un supuesto. Ejecuta otra simulación para comparar de nuevo.</p></div>';
  }
}
function abmScenarioSelect(value){
  const form=document.getElementById('abm-form');
  if(!form||!ABM_SCENARIO_CARDS.some(s=>s.id===value))return;
  form.elements.scenario.value=value;
  form.querySelectorAll('[data-abm-scenario]').forEach(btn=>{
    const active=btn.dataset.abmScenario===value;
    btn.setAttribute('aria-pressed',String(active));
    btn.classList.toggle('is-active',active);
    const marker=btn.querySelector('.abm-scenario-check');
    if(marker)marker.textContent=active?'✓':'○';
  });
  const subtitle=document.getElementById('abm-choice-hint');
  if(subtitle)subtitle.textContent=ABM_SCENARIO_CARDS.find(s=>s.id===value).detail+' Se compara con no aplicar esa palanca.';
  abmMarkPreviewStale();
}

function abmSyncAdoptionPreview(value){
  const form=document.getElementById('abm-form');
  if(!form)return;
  const input=form.elements.initialPct;
  const num=Number(value);
  if(!Number.isFinite(num)||num<0||num>100)return;
  input.value=String(num);
  input.dataset.source='manual_hypothesis';
  const output=document.getElementById('abm-initial-value');
  if(output)output.textContent=Math.round(num)+'%';
  const track=document.getElementById('abm-initial-track');
  if(track)track.style.setProperty('--abm-pct',num+'%');
  abmMarkPreviewStale();
}
function abmUpdateObservedPreview(value){
  const output=document.getElementById('abm-initial-value');
  if(output)output.textContent=Math.round(Number(value))+'%';
  const track=document.getElementById('abm-initial-track');
  if(track)track.style.setProperty('--abm-pct',Number(value)+'%');
}

function abmReadablePct(fraction){
  const n=Number(fraction);
  return Number.isFinite(n)?(n*100).toFixed(1)+'%':'—';
}
function abmSafeStat(value){
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—';
}

function renderABMVisualResult(r){
  if(!r||!Array.isArray(r.series)||!r.series.length||!r.final)return '<div class="abm-no-result">El experimento no devolvió una trayectoria válida.</div>';
  const b=Number(r.final.baseline?.mean), t=Number(r.final.intervention?.mean), d=100*Number(r.final.difference?.mean);
  const hasDelta=Number.isFinite(d),effect=Math.abs(d);
  const status=hasDelta?(d>0.05?'La palanca mejora la adopción en este modelo':d<-.05?'La palanca reduce la adopción en este modelo':'Diferencia casi nula en este modelo'):'Resultado sin diferencia calculable';
  const risk=r.parameter_origin==='provided_unvalidated'?'Parámetros proporcionados o ajustados retrospectivamente; aún sin validación prospectiva.':'Parámetros hipotéticos: es una exploración, no un pronóstico.';
  const points=(key)=>r.series.map((v,i)=>{
    const x=45+(i*574/Math.max(1,r.series.length-1));
    const y=158-Math.max(0,Math.min(1,Number(v[key]?.mean)||0))*125;
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  const names=Object.fromEntries(ABM_SCENARIO_CARDS.map(s=>[s.id,s.title]));
  return '<div class="abm-outcome-ready" aria-live="polite">'+
    '<div class="abm-outcome-top"><span class="abm-pill">✓ Escenarios comparados</span>'+
      '<span class="abm-science-mark">Simulación · no predicción</span></div>'+
    '<div class="abm-impact-number '+(d>0.05?'is-positive':d<-.05?'is-negative':'')+'">'+
      (hasDelta?(d>0?'+':'')+d.toFixed(1):'—')+
      '<span> puntos porcentuales</span></div>'+
    '<h3>'+safe(status)+'</h3>'+
    '<p class="abm-result-caption">Si probáramos <strong>'+safe(names[r.scenario]||'esta intervención')+
      '</strong>, el modelo produciría esta comparación bajo los supuestos elegidos.</p>'+
    '<div class="abm-comparison"><div class="abm-compare-row"><div><small>Sin cambiar nada</small><strong>'+abmReadablePct(b)+'</strong></div>'+
      '<div class="abm-compare-track"><span class="abm-bar-base" style="width:'+Math.max(0,Math.min(100,b*100))+'%"></span></div></div>'+
    '<div class="abm-compare-row"><div><small>Probando la decisión</small><strong>'+abmReadablePct(t)+'</strong></div>'+
      '<div class="abm-compare-track"><span class="abm-bar-scenario" style="width:'+Math.max(0,Math.min(100,t*100))+'%"></span></div></div></div>'+
    '<div class="abm-curve-wrap"><div class="abm-curve-header"><b>Cómo podría evolucionar</b><span>'+Number(r.periods||0)+' periodos</span></div>'+
      '<svg viewBox="0 0 650 185" role="img" aria-label="Dos trayectorias de adopción simulada: sin cambio y con la intervención">' +
       [0,.5,1].map(v=>'<line x1="45" x2="619" y1="'+(158-v*125)+'" y2="'+(158-v*125)+'" stroke="currentColor" opacity=".12" stroke-dasharray="3 5"/><text x="4" y="'+(162-v*125)+'" fill="currentColor" opacity=".6" font-size="11">'+(v*100)+'%</text>').join('')+
       '<polyline points="'+points('baseline')+'" fill="none" stroke="#8cacc3" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+
       '<polyline points="'+points('intervention')+'" fill="none" stroke="#42ddbc" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>'+
       '<text x="45" y="179" fill="currentColor" opacity=".65" font-size="12">Inicio</text>'+
       '<text x="575" y="179" fill="currentColor" opacity=".65" font-size="12">Final</text></svg>'+
      '<div class="abm-legend"><span><i class="abm-key-base"></i> Sin cambios</span><span><i class="abm-key-scenario"></i> Con decisión</span></div></div>'+
    '<p class="abm-caveat">'+safe(risk)+' Las curvas muestran resultados posibles del mecanismo simulado, no certeza sobre personas reales.</p>'+
    '<details class="abm-result-deep"><summary>Ver resultados por audiencia y detalle científico</summary>'+renderABMResult(r)+'</details>'+
    '</div>';
}

function renderABMExperiencePage(x){
  if(!x)return '<section class="panel">Primero selecciona una iniciativa.</section>';
  const behaviors=x.behaviors||[], audiences=x.audiences||[], settings=x.abmSettings||{};
  const index=Number(settings.behaviorIndex??0);
  const bi=index>=0&&index<behaviors.length?index:0;
  const behavior=behaviors[bi];
  const target=behavior?audiences.filter(a=>behavior.scope!=='specific'||(behavior.audienceIds||[]).map(String).includes(String(a.id))):[];
  const last=(x.modelRuns||[]).filter(r=>r.engine==='abm-v1'&&behavior&&
    (r.behaviorId===abmV2BehaviorKey(behavior,bi)||(!r.behaviorId&&r.behavior===behavior.name))).at(-1);
  const scenario=ABM_SCENARIO_CARDS.some(s=>s.id===settings.scenario)?settings.scenario:'friction';
  const value=(v,d)=>v===undefined||v===null?d:v;
  const initial=value(settings.initialPct,10);
  const personNodes=(x.nodes||[]).map((n,i)=>({...n,idx:i})).filter(n=>n.type==='Persona');
  const evid=behavior?abmV2EvidenceSummary(x,behavior):null;
  const dimensions=audiences.map((a,i)=>{
    const row=(settings.dimensions||{})[String(a.id)]||{};
    return '<tr><td>'+safe(a.name||'Audiencia')+'</td>'+
      ['capability','opportunity','motivation'].map(k=>
        '<td><input aria-label="'+safe(k+' de '+a.name)+'" name="'+k+'_'+i+'" type="number" min="0" max="1" step="0.05" value="'+
          safe(value(row[k],0.5))+'"></td>').join('')+'</tr>';
  }).join('');
  const mappings=personNodes.map(n=>'<label class="abm-person-row"><span>'+safe(n.name||'Persona')+'</span>'+
      '<select aria-label="Audiencia de '+safe(n.name||'persona')+'" onchange="setABMAudienceMapping('+n.idx+',this.value)">'+
      '<option value="">Sin asignar</option>'+audiences.map(a=>'<option value="'+safe(a.id)+'"'+(abmV2AudienceId(x,n,n.idx)===String(a.id)?' selected':'')+'>'+safe(a.name)+'</option>').join('')+
      '</select></label>').join('');
  const behaviorsOptions=behaviors.map((b,i)=>'<option value="'+i+'"'+(i===bi?' selected':'')+'>'+safe(b.name||'Sin nombre')+'</option>').join('');
  const currentCard=ABM_SCENARIO_CARDS.find(s=>s.id===scenario);
  const scenarioCards=ABM_SCENARIO_CARDS.map(s=>
    '<button type="button" data-abm-scenario="'+s.id+'" aria-pressed="'+(s.id===scenario)+'" class="abm-scenario '+(s.id===scenario?'is-active ':'')+'is-'+s.color+'" onclick="abmScenarioSelect(&quot;'+s.id+'&quot;)">'+
      '<span class="abm-scenario-icon" aria-hidden="true">'+s.symbol+'</span>'+
      '<span class="abm-scenario-content"><span class="abm-scenario-label">'+s.step+'</span><strong>'+s.title+'</strong><small>'+s.intro+'</small></span>'+
      '<span class="abm-scenario-check" aria-hidden="true">'+(s.id===scenario?'✓':'○')+'</span></button>').join('');
  const info=(evid&&evid.eligible)?
    'Registros disponibles: '+evid.measured+' de '+evid.eligible+' personas elegibles con un estado evaluado.':
    'Puedes empezar aunque aún no tengas mediciones; todo será exploratorio.';
  const research=behaviors.length&&audiences.length?renderABMResearchPanel(x,bi):'';
  return '<div class="abm-ux">'+
    '<header class="abm-hero"><div><span class="abm-eyebrow">HACERLO · LABORATORIO DE DECISIONES</span>'+
      '<h1>¿Qué pasaría si…?</h1><p>Prueba decisiones antes de implementarlas. Elige un comportamiento, mueve una palanca y compara lo que podría pasar.</p>'+
      '<span class="abm-hero-tag">Basado en mecanismos de ciencia del comportamiento · Resultados exploratorios</span></div>'+
      '<div class="abm-orbit" aria-hidden="true"><span class="abm-orbit-core">H</span><i class="abm-node-1"></i><i class="abm-node-2"></i><i class="abm-node-3"></i><i class="abm-node-4"></i></div></header>'+
    '<div class="abm-roadmap" aria-label="Tres pasos"><span><b>01</b> Define el cambio</span><i></i><span><b>02</b> Elige una acción</span><i></i><span><b>03</b> Compara resultados</span></div>'+
    (!behaviors.length||!audiences.length?
      '<section class="abm-empty-setup"><h2>Preparemos tu primer experimento</h2><p>Solo necesitas definir al menos un comportamiento y una audiencia en Diseño. No tienes que programar ningún modelo.</p>'+
      '<button class="primary" onclick="go(&quot;Diseño de comportamientos&quot;)">Ir a Diseño</button> <button class="secondary" onclick="go(&quot;Gestión de audiencias&quot;)">Gestionar audiencias</button></section>':
      '<div class="abm-workspace"><form id="abm-form" class="abm-form" onsubmit="runAgentSimulation(event)">'+
       '<section class="abm-block"><div class="abm-step-title"><span>01</span><div><h2>¿Qué quieres que cambie?</h2><p>Escoge el comportamiento diseñado en esta iniciativa.</p></div></div>'+
       '<label class="abm-field">Comportamiento<select name="behaviorIndex" onchange="setABMBehavior(this.value)">'+behaviorsOptions+'</select></label>'+
       '<div class="abm-audiences"><span class="abm-aud-dot"></span><span>'+target.length+' audiencias relacionadas</span><strong>'+safe(target.map(a=>a.name).slice(0,3).join(' · ')+(target.length>3?' y otras':''))+'</strong></div></section>'+
       '<section class="abm-block"><div class="abm-step-title"><span>02</span><div><h2>¿Qué harías para impulsar el cambio?</h2><p>Elige una decisión. Después podrás probar otra y compararlas.</p></div></div>'+
       '<div class="abm-scenario-grid" role="group" aria-label="Decisiones para simular">'+scenarioCards+'</div>'+
       '<select name="scenario" class="abm-visually-hidden" aria-label="Escenario seleccionado">'+ABM_SCENARIO_CARDS.map(s=>'<option value="'+s.id+'"'+(s.id===scenario?' selected':'')+'>'+s.title+'</option>').join('')+'</select>'+
       '<p class="abm-choice-hint" id="abm-choice-hint">'+safe(currentCard.detail)+' Se compara con no aplicar esa palanca.</p></section>'+
       '<section class="abm-block"><div class="abm-step-title"><span>03</span><div><h2>¿Desde dónde empezamos?</h2><p>Ajusta cuántas personas estimas que ya realizan el comportamiento.</p></div></div>'+
       '<div class="abm-initial-header"><div><span>Adopción inicial</span><small>Tu mejor estimación actual</small></div><output id="abm-initial-value" for="abm-initial-track">'+Math.round(Number(initial))+'%</output></div>'+
       '<input id="abm-initial-track" class="abm-range" name="initialPct" type="range" min="0" max="100" step="1" value="'+safe(initial)+'" style="--abm-pct:'+safe(initial)+'%" oninput="abmSyncAdoptionPreview(this.value)" aria-label="Porcentaje de adopción inicial">'+
       '<div class="abm-range-scale"><span>Nadie aún</span><span>Toda la población</span></div>'+
       '<p class="abm-reality-note">ⓘ '+safe(info)+'</p>'+
       (target.length===0?'<p class="notice">Asigna este comportamiento a una audiencia antes de simular.</p>':'')+
       '<div class="abm-run-row"><button class="abm-run" id="abm-start" type="submit"'+(!target.length?' disabled':'')+'><span>▶</span> Simular esta decisión</button><p id="abm-status" role="status" aria-live="polite">Explora escenarios con supuestos ajustables.</p></div></section>'+
       '<details class="abm-tech-settings"><summary><span>⚙</span><span><strong>Ajustar el modelo</strong><small>Red, tiempo, población y supuestos · opcional</small></span><span class="abm-chevron">⌄</span></summary>'+
       '<div class="abm-advanced-inner" oninput="abmMarkPreviewStale()" onchange="abmMarkPreviewStale()"><p class="abm-caveat">Puedes simular sin tocar nada aquí. Los valores iniciales son hipótesis, no datos estimados del diagnóstico.</p>'+
       '<div class="abm-input-grid"><label>Origen de las conexiones<select name="mode" onchange="switchABMMode(this.value)"><option value="synthetic"'+(settings.mode!=='observed'?' selected':'')+'>Red ilustrativa (recomendada al empezar)</option><option value="observed"'+(settings.mode==='observed'?' selected':'')+'>Usar vínculos registrados en el Grafo</option></select></label>'+
       '<label>Periodos de simulación<input name="periods" type="number" min="1" max="24" value="'+safe(value(settings.periods,12))+'"></label>'+
       '<label>Repeticiones del modelo<input name="runs" type="number" min="5" max="80" value="'+safe(value(settings.runs,40))+'"></label>'+
       '<label>Población simulada (red ilustrativa)<input name="sampleSize" type="number" min="2" max="500" value="'+safe(value(settings.sampleSize,150))+'"></label>'+
       '<label>Semilla de reproducción<input name="seed" type="number" min="0" max="2147483647" value="'+safe(value(settings.seed,2026))+'"></label></div>'+
       '<details id="abm-mapping" '+(settings.mode==='observed'?'':'hidden')+'><summary>Asociar nodos del grafo con audiencias</summary><p class="muted">Se usan solo personas y vínculos de influencia observados o registrados.</p><div class="abm-person-mapping">'+(mappings||'<p>No hay nodos Persona. Selecciona una red ilustrativa.</p>')+'</div></details>'+
       '<details class="abm-comb"><summary>Condiciones de capacidad, oportunidad y motivación</summary><p class="muted">COM-B. 0 = desfavorable, 1 = favorable. El 0,5 inicial es una hipótesis neutral.</p><div style="overflow:auto"><table><thead><tr><th>Audiencia</th><th>Capacidad</th><th>Oportunidad</th><th>Motivación</th></tr></thead><tbody>'+dimensions+'</tbody></table></div></details>'+
       '<label class="abm-parameter-choice"><input type="checkbox" name="useCalibrated" '+(x.abmCalibration?.behaviorKey===String(bi)?(settings.useCalibrated?'checked':''):'disabled')+'> Usar parámetros de un ajuste retrospectivo existente (no significa validación prospectiva)</label>'+
       '</div></details></form>'+
       '<aside class="abm-results" id="abm-results"><div class="abm-results-heading"><div><span class="abm-eyebrow">TU EXPERIMENTO</span><h2>¿Qué cambia con tu decisión?</h2></div><span class="abm-results-icon">↗</span></div>'+
       '<div id="abm-output">'+(last?renderABMVisualResult(last.result):
       '<div class="abm-result-placeholder"><div class="abm-placeholder-paths"><span><i></i><i></i><i></i><i></i></span><span><i></i><i></i><i></i><i></i></span></div>'+
       '<h3>Dos caminos. Una decisión.</h3><p>Cuando simules, verás qué pasa si mantienes las condiciones actuales y qué cambia al probar tu intervención.</p><div class="abm-placeholder-legend"><span>○ Sin intervenir</span><span>✧ Con tu decisión</span></div></div>')+'</div>'+
       '</aside></div>')+
     (behavior?'<details class="abm-evidence-drawer"><summary><span>◉</span><span><strong>¿Con qué evidencia contamos?</strong><small>Registros de adopción, diagnóstico y condiciones del sistema</small></span><span>⌄</span></summary>'+
       renderABMV2Evidence(x,behavior)+renderABMV2Hypotheses(x,behavior)+'</details>':'')+
     (research?'<details class="abm-science-drawer"><summary><span>⚗</span><span><strong>Profundizar con datos y ciencia</strong><small>Calibración retrospectiva, sensibilidad y límites del modelo</small></span><span>⌄</span></summary>'+research+'</details>':'')+
     '<p class="abm-footnote">HACERLO utiliza mecanismos de capacidad, oportunidad, motivación, umbrales de adopción e influencia social. Los escenarios son exploratorios; una decisión real necesita medición y contraste posterior.</p>'+
  '</div>';
}
