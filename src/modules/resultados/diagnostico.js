// HACERLO V2.1 — Diagnóstico independiente, persistido en app_state de cada iniciativa.
// Nombres originales conservados; preguntas orientativas en lenguaje claro y temporalmente neutro.
// Redacción temporalmente neutra: sirve para iniciativas pasadas, presentes o futuras.
const DIAG_FACTORS={
 'Capacidad':[
 ['🧠','Habilidades cognitivas','¿Se cuenta con los conocimientos y la capacidad para aplicarlos en la práctica?'],
 ['🤝','Habilidades interpersonales','¿Se cuenta con las habilidades para relacionarse, colaborar y trabajar con otras personas?'],
 ['⚖️','Evaluación y toma de decisión','¿Se pueden evaluar opciones y tomar decisiones acordes con lo que se busca lograr?'],
 ['🎯','Capacidad de atención','¿Se logra mantener la atención en las actividades y prioridades importantes?'],
 ['💡','Conciencia','¿Se comprende el sentido, alcance e implicaciones del cambio o comportamiento?'],
 ['🎭','Habilidad psicológica','¿Se pueden manejar las emociones y dificultades asociadas al comportamiento sin afectar el desempeño?'],
 ['🧩','Memoria','¿Se recuerda y pone en práctica lo necesario para realizar el comportamiento?'],
 ['⚡','Energía','¿Se cuenta con la energía física y mental necesaria para realizar y sostener el comportamiento?']],
 'Motivación':[
 ['🪪','Identidad','¿El comportamiento esperado es coherente con la forma en que las personas se ven a sí mismas y con su rol?'],
 ['💡','Creencias','¿Se cree que realizar el comportamiento puede generar resultados positivos y útiles?'],
 ['💚','Emociones','¿Las emociones relacionadas con el comportamiento ayudan o dificultan su realización?'],
 ['🎯','Meta','¿Está claro qué se busca lograr y se considera una prioridad?'],
 ['🌟','Capacidad percibida','¿Las personas confían en su capacidad para realizar el comportamiento?'],
 ['🔁','Hábito','¿El comportamiento forma parte de las prácticas habituales del día a día?'],
 ['🧭','Responsabilidad','¿Está claro quién tiene la responsabilidad de realizar y sostener el comportamiento?'],
 ['⚙️','Respuesta automática','¿Las reacciones que surgen de manera automática favorecen el comportamiento esperado?']],
 'Entorno':[
 ['📋','Normas sociales y culturales','¿Las normas y costumbres compartidas favorecen el comportamiento esperado?'],
 ['⚙️','Oportunidades en el entorno','¿El entorno ofrece condiciones que facilitan realizar el comportamiento?'],
 ['🗓️','Recursos y tiempo','¿Se dispone del tiempo y los recursos necesarios para realizar el comportamiento?'],
 ['💬','Avisos en el entorno','¿Existen señales o recordatorios que ayudan a realizar el comportamiento?'],
 ['🌟','Modelos a seguir','¿Existen personas que sirven de ejemplo para realizar el comportamiento esperado?']]
};
// Compatibilidad con los factores guardados en versiones anteriores.
const DIAG_FACTOR_RENAMES={
 'Capacidad::Conocimiento':'Capacidad::Conciencia',
 'Capacidad::Habilidad procedimental':'Capacidad::Habilidad psicológica',
 'Capacidad::Evaluación y toma de decisiones':'Capacidad::Evaluación y toma de decisión',
 'Motivación::Metas':'Motivación::Meta',
 'Motivación::Regulación automática':'Motivación::Respuesta automática',
 'Entorno::Oportunidades del entorno':'Entorno::Oportunidades en el entorno',
 'Entorno::Ambiente de trabajo':'Entorno::Avisos en el entorno'
};
const DIAG_CATEGORIES=['Creencias y supuestos','Atributos culturales','Mitos','Lenguaje y símbolos de comunicación','Ceremonias y rituales','Tabúes','Héroes','Normas formales','Procesos','Comportamiento organizacional','Equipamiento e infraestructura física','Actitud de los líderes','Políticas y prácticas en la gestión de personas','Tecnología','Entorno','Proveedor'];
let diagTab='conductual',diagDim='Capacidad',diagEditId=null,diagTriad=null,diagFactorCatalogExpanded=null,diagFactorCatalogInitiative=null;
const diagId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
function diagInit(x){
 x.behaviorDiagnosis=x.behaviorDiagnosis||{};x.diagnosisFindings=x.diagnosisFindings||[];x.diagnosisHypotheses=x.diagnosisHypotheses||[];
 // Migrar selecciones y vínculos previos sin eliminar datos ni modificar roles.
 for(const [oldKey,newKey] of Object.entries(DIAG_FACTOR_RENAMES)){
  if(!x.behaviorDiagnosis[oldKey])continue;
  if(!x.behaviorDiagnosis[newKey])x.behaviorDiagnosis[newKey]={...x.behaviorDiagnosis[oldKey],factor:newKey.split('::')[1]};
  delete x.behaviorDiagnosis[oldKey];
  for(const finding of x.diagnosisFindings){if(Array.isArray(finding.factors))finding.factors=[...new Set(finding.factors.map(k=>k===oldKey?newKey:k))]}
 }
}
function diagSwitch(t){diagTab=t;render()}
function diagSetDim(d){diagDim=d;render()}
function diagFactorKey(d,n){return d+'::'+n}
function diagToggle(d,n){let x=current();diagInit(x);let k=diagFactorKey(d,n);if(x.behaviorDiagnosis[k])delete x.behaviorDiagnosis[k];else x.behaviorDiagnosis[k]={dimension:d,factor:n,role:'Por explorar'};save();render()}
function diagRole(d,n,v){let x=current(),k=diagFactorKey(d,n);if(x.behaviorDiagnosis[k]){x.behaviorDiagnosis[k].role=v;save();render()}}
function diagRemoveFinding(id){if(!confirm('¿Eliminar este hallazgo?'))return;let x=current();x.diagnosisFindings=x.diagnosisFindings.filter(z=>z.id!==id);save();render()}
function diagRemoveHypothesis(id){if(!confirm('¿Eliminar esta hipótesis?'))return;let x=current();x.diagnosisHypotheses=x.diagnosisHypotheses.filter(z=>z.id!==id);save();render()}
function diagEditFinding(id){diagEditId=id;diagTab='hallazgos';render();document.getElementById('diag-finding-form')?.scrollIntoView({behavior:'smooth',block:'center'})}
function diagTriadSelect(ev){let svg=ev.currentTarget,rect=svg.getBoundingClientRect(),px=(ev.clientX-rect.left)/rect.width*360,py=(ev.clientY-rect.top)/rect.height*320;
 const A=[180,25],B=[32,290],C=[328,290],den=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1]);let a=((B[1]-C[1])*(px-C[0])+(C[0]-B[0])*(py-C[1]))/den,b=((C[1]-A[1])*(px-C[0])+(A[0]-C[0])*(py-C[1]))/den,c=1-a-b;
 if(Math.min(a,b,c)<-0.01)return;diagTriad={capacidad:Math.round(a*100),motivacion:Math.round(b*100),entorno:Math.round(c*100)};document.getElementById('diag-triad-values').textContent=`Capacidad ${diagTriad.capacidad}% · Motivación ${diagTriad.motivacion}% · Entorno ${diagTriad.entorno}%`;document.getElementById('diag-triad-dot').setAttribute('cx',px);document.getElementById('diag-triad-dot').setAttribute('cy',py)
}
function diagSaveFinding(e){e.preventDefault();let x=current();diagInit(x);let f=e.target,z=Object.fromEntries(new FormData(f));let categories=Array.from(f.querySelectorAll('[name="category"]:checked')).map(q=>q.value),behaviors=Array.from(f.querySelectorAll('[name="behavior"]:checked')).map(q=>q.value),factors=Array.from(f.querySelectorAll('[name="factorLink"]:checked')).map(q=>q.value);let old=x.diagnosisFindings.find(v=>v.id===diagEditId);
 let record={id:old?.id||diagId(),text:z.text.trim(),evidenceType:z.evidenceType,role:z.role,source:z.source.trim(),indicator:z.indicator.trim(),categories,behaviors,factors,triad:diagTriad||old?.triad||null,updatedAt:new Date().toISOString()};if(!record.text)return;
 if(old)Object.assign(old,record);else x.diagnosisFindings.push(record);diagEditId=null;diagTriad=null;save();render()}
function diagSaveHypothesis(e){e.preventDefault();let x=current();diagInit(x);let t=new FormData(e.target).get('text').trim();if(!t)return;x.diagnosisHypotheses.push({id:diagId(),text:t,createdAt:new Date().toISOString()});save();render()}
function diagEsc(v){return safe(v||'')}
function diagTabButton(key,label){return `<button type="button" class="secondary ${diagTab===key?'active':''}" onclick="diagSwitch('${key}')">${label}</button>`}
function diagBehaviorOptions(x,selected=[]){return x.behaviors.length?`<div class="diag-linklist">${x.behaviors.map((b,i)=>`<label><input type="checkbox" name="behavior" value="${i}" ${selected.includes(String(i))?'checked':''}>${diagEsc(b.name)}</label>`).join('')}</div>`:'<p class="diag-hint">Los comportamientos se recuperan de Diseño cuando estén disponibles.</p>'}
function diagFactorOptions(x,selected=[]){let list=Object.entries(x.behaviorDiagnosis).filter(([k,v])=>v);return list.length?`<div class="diag-linklist">${list.map(([k,v])=>`<label><input type="checkbox" name="factorLink" value="${diagEsc(k)}" ${selected.includes(k)?'checked':''}>${diagEsc(v.factor)}</label>`).join('')}</div>`:'<p class="diag-hint">Puedes registrar hallazgos sin seleccionar factores conductuales.</p>'}
function diagConductual(x){
 if(diagFactorCatalogInitiative!==String(x.id)){diagFactorCatalogInitiative=String(x.id);diagFactorCatalogExpanded=null}
 const active=Object.entries(x.behaviorDiagnosis).filter(([k,v])=>v);
 const items=DIAG_FACTORS[diagDim];
 const dimensions=['Capacidad','Motivación','Entorno'];
 const valued=active.filter(([k,v])=>v.role&&v.role!=='Por explorar').length;
 const options=['Por explorar','Barrera','Facilitador','Ambivalente'];
 const groups=dimensions.map(d=>{
  const factors=active.filter(([k,v])=>v.dimension===d);
  const color=d==='Capacidad'?'#57a7ed':d==='Motivación'?'#53d6a9':'#edb15e';
  return `<div class="diag-matrix-column" style="--diag-column-accent:${color}">
   <div class="diag-matrix-heading"><span class="diag-matrix-heading-title">${diagEsc(d)}</span><span class="diag-matrix-count">${factors.length}</span></div>
   <div class="diag-matrix-factors">${factors.length?factors.map(([k,v])=>`<div class="diag-matrix-factor" data-role="${diagEsc(v.role||'Por explorar')}">
      <div class="diag-matrix-factor-title"><b title="${diagEsc(v.factor)}">${diagEsc(v.factor)}</b><span class="diag-matrix-state ${v.role&&v.role!=='Por explorar'?'is-valued':''}" title="${v.role&&v.role!=='Por explorar'?'Con interpretación':'Por explorar'}" aria-hidden="true"></span></div>
      <select aria-label="Interpretación de ${diagEsc(v.factor)}" onchange="diagRole('${d}','${diagEsc(v.factor)}',this.value)">${options.map(role=>`<option value="${role}" ${v.role===role?'selected':''}>${role}</option>`).join('')}</select>
     </div>`).join(''):'<p class="diag-matrix-empty">Aún no hay factores seleccionados.</p>'}</div>
  </div>`;
 }).join('');
 return `<section class="panel diag-step-panel"><div class="diag-step-label">01 · ¿QUÉ INFLUYE?</div><h2>Factores conductuales</h2><p class="muted">Selecciona los factores relevantes y clasifica cómo podrían influir.</p><details class="diag-factor-catalog" ${(diagFactorCatalogExpanded===null?!active.length:diagFactorCatalogExpanded)?'open':''}><summary onclick="diagFactorCatalogExpanded=!this.parentElement.open">${active.length?'Modificar selección de factores':'Elegir factores conductuales'}</summary><div class="diag-factor-catalog-body"><div class="diag-tabs">${Object.keys(DIAG_FACTORS).map(d=>`<button class="secondary ${diagDim===d?'active':''}" onclick="diagSetDim('${d}')">${d}</button>`).join('')}</div><div class="diag-cards">${items.map(([icon,n,desc])=>{let v=x.behaviorDiagnosis[diagFactorKey(diagDim,n)];return `<button type="button" class="diag-card ${v?'selected':''}" style="--diag-accent:${diagDim==='Capacidad'?'#4a9ded':diagDim==='Motivación'?'#29c696':'#f3a336'}" onclick="diagToggle('${diagDim}','${n}')"><span class="diag-icon">${icon}</span><b>${diagEsc(n)} ${v?'✓':''}</b><small>${diagEsc(desc)}</small></button>`}).join('')}</div></div></details></section>
 <section class="panel diag-matrix-panel"><div class="diag-matrix-overview"><div><h2>Factores seleccionados <span class="diag-matrix-total">(${active.length})</span></h2><p class="muted">Clasifica cada factor según la evidencia disponible.</p></div>${active.length?`<span class="diag-matrix-progress" title="Factores interpretados, no validez del diagnóstico">${valued} de ${active.length} interpretados</span>`:''}</div>
 ${active.length?`<div class="diag-matrix-columns">${groups}</div>`:'<div class="empty">Selecciona uno o varios factores en la sección superior para interpretarlos.</div>'}</section>
 ${diagCausesPanel(x)}`;
}
function diagTriadHTML(v){let t=v||null,xx=t?180*t.capacidad/100+32*t.motivacion/100+328*t.entorno/100:180,yy=t?25*t.capacidad/100+290*(t.motivacion+t.entorno)/100:205;return `<div class="diag-triad"><svg viewBox="0 0 360 320" onclick="diagTriadSelect(event)" role="img" aria-label="Tríada opcional: capacidad, motivación y entorno"><polygon points="180,25 32,290 328,290" fill="#0c4053" stroke="#4ac9d1" stroke-width="2"/><text x="180" y="17" text-anchor="middle">Capacidad</text><text x="32" y="309" text-anchor="start">Motivación</text><text x="328" y="309" text-anchor="end">Entorno</text><circle id="diag-triad-dot" cx="${xx}" cy="${yy}" r="8" fill="#f4c776" stroke="#fff" stroke-width="2"/></svg><div class="diag-hint" id="diag-triad-values">${t?`Capacidad ${t.capacidad}% · Motivación ${t.motivacion}% · Entorno ${t.entorno}%`:'Haz clic dentro del triángulo para interpretar la experiencia (opcional).'}</div></div>`}
function diagHallazgos(x){let edit=x.diagnosisFindings.find(z=>z.id===diagEditId)||null;diagTriad=edit?.triad||null;return `<section class="panel"><h2>${edit?'Editar hallazgo':'Registrar hallazgo o micronarrativa'}</h2><p class="muted">Registra qué ocurrió, dónde y con qué evidencia.</p><form id="diag-finding-form" onsubmit="diagSaveFinding(event)"><label>Descripción / Micronarrativa<textarea name="text" required placeholder="Describe una situación, experiencia, observación o hallazgo relevante para la iniciativa.">${diagEsc(edit?.text)}</textarea></label><div class="grid"><label>Tipo de evidencia<select name="evidenceType">${['Cualitativa','Cuantitativa','Mixta'].map(t=>`<option ${edit?.evidenceType===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Interpretación<select name="role">${['Sin determinar','Barrera','Facilitador','Observación'].map(t=>`<option ${edit?.role===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Fuente<input name="source" placeholder="Encuesta, entrevista, observación, indicador…" value="${diagEsc(edit?.source)}"></label><label>Indicador / dato de soporte (opcional)<input name="indicator" placeholder="Ej. 65 % de respuestas; índice 3,8/5" value="${diagEsc(edit?.indicator)}"></label></div><h3>Categorías del hallazgo</h3><p class="diag-hint">Selecciona las categorías pertinentes, si las hay.</p><div class="diag-linklist">${DIAG_CATEGORIES.map(c=>`<label><input type="checkbox" name="category" value="${diagEsc(c)}" ${edit?.categories?.includes(c)?'checked':''}>${diagEsc(c)}</label>`).join('')}</div><details><summary class="dash-link" style="margin:14px 0">Relacionar con comportamientos y factores (opcional)</summary><h3>Comportamientos de Diseño</h3>${diagBehaviorOptions(x,edit?.behaviors||[])}<h3>Factores conductuales</h3>${diagFactorOptions(x,edit?.factors||[])}</details><details><summary class="dash-link" style="margin:14px 0">Interpretación visual de la experiencia · Tríada (opcional)</summary><p class="diag-hint">Adaptación inspirada en instrumentos narrativos de SenseMaker. No sustituye la interpretación de quien vivió la experiencia.</p>${diagTriadHTML(edit?.triad)}</details><div class="flex"><button class="primary">${edit?'Guardar cambios':'+ Guardar hallazgo'}</button>${edit?'<button type="button" class="secondary" onclick="diagEditId=null;diagTriad=null;render()">Cancelar</button>':''}</div></form></section>${diagRegisteredFindings(x)}` }
function diagHallazgosRadar(categories){
 const registered=categories.filter(([,count])=>Number(count)>0);
 if(!registered.length)return '<div class="diag-radar-empty" role="status">Aún no hay hallazgos categorizados.</div>';
 // El radar se mantiene como única visualización. Los ejes vacíos no muestran cifras.
 const displayed=registered.slice(0,10);
 const fallback=DIAG_CATEGORIES.filter(c=>!displayed.some(([name])=>name===c)).slice(0,Math.max(0,5-displayed.length)).map(name=>[name,0]);
 const axes=[...displayed,...fallback],len=axes.length;
 const largest=Math.max(1,...displayed.map(([,n])=>n)),cx=360,cy=200,radius=126,labelRadius=169;
 const coord=(i,dist)=>{const angle=-Math.PI/2+(Math.PI*2*i/len);return [cx+Math.cos(angle)*dist,cy+Math.sin(angle)*dist]};
 const point=(i,dist)=>coord(i,dist).map(v=>v.toFixed(1)).join(',');
 const grid=[0.25,0.5,0.75,1].map(k=>`<polygon points="${axes.map((v,i)=>point(i,radius*k)).join(' ')}" fill="${k===1?'rgba(30,97,115,.10)':'none'}" stroke="#2d5365" stroke-width="1"/>`).join('');
 const spokes=axes.map((v,i)=>{const [x,y]=coord(i,radius);return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2b5364" stroke-width="1"/>`}).join('');
 const polygon=axes.map(([name,n],i)=>point(i,radius*n/largest)).join(' ');
 const splitLabel=(label)=>{const words=String(label).split(/\s+/),lines=[];let current='';for(const w of words){if(current&&current.length+w.length+1>21){lines.push(current);current=w}else current+=(current?' ':'')+w;}if(current)lines.push(current);if(lines.length>3){lines.length=3;lines[2]=lines[2].slice(0,17).trimEnd()+'…'}return lines};
 const labels=axes.map(([name,count],i)=>{
  const [px,py]=coord(i,labelRadius);const anchor=px>cx+28?'start':px<cx-28?'end':'middle';
  const lines=splitLabel(name);const baseline=Math.max(21,Math.min(348,py-(lines.length-1)*6));
  const countLabel=count>0?`<tspan fill="#83e4d7" font-weight="750"> · ${count}</tspan>`:'';
  const spans=lines.map((line,j)=>`<tspan x="${px.toFixed(1)}" dy="${j===0?0:14}">${diagEsc(line)}${j===lines.length-1?countLabel:''}</tspan>`).join('');
  return `<text x="${px.toFixed(1)}" y="${baseline.toFixed(1)}" fill="#c0dce8" font-size="12" text-anchor="${anchor}"><title>${diagEsc(name)}${count>0?' · '+count+' hallazgos':''}</title>${spans}</text>`;
 }).join('');
 const dots=axes.map(([name,count],i)=>{if(count<=0)return '';const [px,py]=coord(i,radius*count/largest);return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.3" fill="#6de5d2" stroke="#082335" stroke-width="1.4"><title>${diagEsc(name)}: ${count} ${count===1?'hallazgo':'hallazgos'}</title></circle>`}).join('');
 return `<div class="diag-radar-wrap"><svg class="diag-hallazgos-radar" viewBox="0 0 720 400" role="img" aria-label="Mapa de hallazgos por categoría, con la cantidad de registros en cada etiqueta"><title>Frecuencia de hallazgos por categoría</title>${grid}${spokes}<polygon points="${polygon}" fill="rgba(83,214,195,.23)" stroke="#70e4d5" stroke-width="2.5" stroke-linejoin="round"/>${dots}${labels}</svg>${registered.length>displayed.length?`<p class="diag-radar-note">Se muestran las 10 categorías con mayor frecuencia de ${registered.length} con registros.</p>`:''}<p class="diag-radar-note">Cantidad de hallazgos por categoría. Un hallazgo puede pertenecer a más de una.</p></div>`;
}

function diagBarComparativo(factors){
 if(!factors.length)return '<div class="diag-chart-empty">Aún no hay factores seleccionados.</div>';
 const values=Object.keys(DIAG_FACTORS).map(d=>({dimension:d,quantity:factors.filter(f=>f.dimension===d).length,available:DIAG_FACTORS[d].length}));
 const max=Math.max(1,...values.map(row=>row.quantity));
 return `<div class="diag-count-bars" role="img" aria-label="Cantidad de factores seleccionados por dimensión">
 ${values.map(({dimension,quantity,available})=>`<div class="diag-count-row"><div class="diag-count-head"><span>${diagEsc(dimension)}</span><strong>${quantity} <small>de ${available}</small></strong></div><div class="diag-count-track"><span class="diag-count-fill" style="width:${(quantity/max*100).toFixed(2)}%" title="${quantity} factores seleccionados"></span></div></div>`).join('')}</div><p class="diag-chart-caption">Comparación de cantidades seleccionadas; no representa influencia ni magnitud.</p>`;
}
function diagFactoresApilados(factors){
 if(!factors.length)return '<div class="diag-chart-empty">Selecciona factores para ver su distribución.</div>';
 const roles=[['Barrera','#e58a74'],['Facilitador','#59d6b2'],['Ambivalente','#f1c270'],['Por explorar','#769bb2']];
 const total=factors.length,rows=roles.map(([name,color])=>({name,color,quantity:factors.filter(f=>(f.role||'Por explorar')===name).length}));
 const pct=n=>((n/total)*100).toLocaleString('es-CO',{maximumFractionDigits:1});
 return `<div class="diag-stacked-layout"><div class="diag-role-stack" role="img" aria-label="Composición de las interpretaciones de los ${total} factores seleccionados">
 ${rows.filter(row=>row.quantity>0).map(row=>`<span class="diag-role-segment" style="width:${(row.quantity/total*100).toFixed(5)}%;background:${row.color}" title="${row.name}: ${row.quantity} (${pct(row.quantity)} %)"></span>`).join('')}</div>
 <div class="diag-role-legend">${rows.map(row=>`<div class="diag-role-legend-item ${row.quantity?'':'is-empty'}"><span class="diag-legend-dot" style="background:${row.color}"></span><span>${row.name}</span><strong>${row.quantity} <small>· ${pct(row.quantity)} %</small></strong></div>`).join('')}</div></div><p class="diag-chart-caption">Distribución de los factores seleccionados según su interpretación.</p>`;
}
function diagEvidenciasDonut(findings){
 if(!findings.length)return '<div class="diag-chart-empty">Todavía no hay registros de evidencia.</div>';
 const types=[['Cualitativa','#5fd5bd'],['Cuantitativa','#8faafa'],['Mixta','#f2bf75']];
 const rows=types.map(([name,color])=>({name,color,quantity:findings.filter(f=>f.evidenceType===name).length}));
 const unclassified=findings.length-rows.reduce((sum,row)=>sum+row.quantity,0);
 if(unclassified>0)rows.push({name:'Sin clasificar',color:'#758b9e',quantity:unclassified});
 const count=findings.length,radius=53,circ=2*Math.PI*radius;
 let accumulated=0;
 const segments=rows.filter(row=>row.quantity).map(row=>{
  const portion=row.quantity/count*circ;
  const offset=-accumulated;accumulated+=portion;
  return `<circle cx="78" cy="78" r="${radius}" fill="none" stroke="${row.color}" stroke-width="19" stroke-dasharray="${portion.toFixed(5)} ${(circ-portion).toFixed(5)}" stroke-dashoffset="${offset.toFixed(5)}" transform="rotate(-90 78 78)"><title>${diagEsc(row.name)}: ${row.quantity}</title></circle>`;
 }).join('');
 const pct=n=>(n/count*100).toLocaleString('es-CO',{maximumFractionDigits:1});
 return `<div class="diag-donut-layout"><div class="diag-donut-viz"><svg viewBox="0 0 156 156" role="img" aria-label="Distribución de ${count} registros de evidencia"><circle cx="78" cy="78" r="${radius}" fill="none" stroke="#1a4357" stroke-width="19"/>${segments}<text x="78" y="74" text-anchor="middle" fill="#eefaff" font-size="28" font-weight="800">${count}</text><text x="78" y="94" text-anchor="middle" fill="#a1c4d3" font-size="10">registros</text></svg></div><div class="diag-donut-legend">${rows.map(row=>`<div class="diag-donut-legend-row ${row.quantity?'':'is-empty'}"><span class="diag-legend-dot" style="background:${row.color}"></span><span>${row.name}</span><strong>${row.quantity} <small>(${pct(row.quantity)} %)</small></strong></div>`).join('')}</div></div><p class="diag-chart-caption">Proporción de registros según su tipo de evidencia.</p>`;
}

let diagBuilderState=null;
function diagBuilderBehavior(x,ref){return (x.behaviors||[]).find((b,i)=>String(b.id||'index:'+i)===String(ref))}
function diagBuilderDefaultRelation(role){return role==='Barrera'?'dificultar':role==='Facilitador'?'facilitar':'influir'}
function diagBuilderInit(x){
 if(diagBuilderState&&diagBuilderState.initiativeId===String(x.id))return diagBuilderState;
 const saved=(x.diagnosisHypotheses||[]).find(h=>h.kind==='guided-primary');
 const keys=Object.keys(x.behaviorDiagnosis||{}).filter(k=>x.behaviorDiagnosis[k]);
 const firstLinked=keys.find(k=>(x.diagnosisFindings||[]).some(f=>(f.factors||[]).includes(k)));
 const factorKey=keys.includes(saved?.factorKey)?saved.factorKey:(firstLinked||keys[0]||'');
 const behaviorId=diagBuilderBehavior(x,saved?.behaviorId)?String(saved.behaviorId):String(x.behaviors?.[0]?.id||(x.behaviors?.length?'index:0':''));
 const linked=(x.diagnosisFindings||[]).find(f=>(f.factors||[]).includes(factorKey));
 const findingId=(x.diagnosisFindings||[]).some(f=>String(f.id)===String(saved?.findingId))?String(saved.findingId):String(linked?.id||'');
 const relation=['dificultar','facilitar','influir'].includes(saved?.relation)?saved.relation:diagBuilderDefaultRelation(x.behaviorDiagnosis?.[factorKey]?.role);
 diagBuilderState={initiativeId:String(x.id),factorKey,behaviorId,findingId,relation,customText:saved?.text||null,search:''};
 return diagBuilderState;
}
function diagBuilderFocus(){document.getElementById('diag-builder')?.scrollIntoView({behavior:'smooth',block:'start'})}
function diagBuilderSet(field,value){
 const x=current();if(!x)return;const d=diagBuilderInit(x);
 if(field==='factorKey'){
  if(!x.behaviorDiagnosis?.[value])return;
  d.factorKey=value;d.relation=diagBuilderDefaultRelation(x.behaviorDiagnosis[value].role);
  d.findingId=String((x.diagnosisFindings||[]).find(f=>(f.factors||[]).includes(value))?.id||'');d.search='';
 }else if(field==='behaviorId'){
  if(!diagBuilderBehavior(x,value))return;d.behaviorId=value;
 }else if(field==='relation'){
  if(!['dificultar','facilitar','influir'].includes(value))return;d.relation=value;
 }else if(field==='findingId'){
  if(value&&!(x.diagnosisFindings||[]).some(f=>String(f.id)===String(value)))return;d.findingId=String(value||'');d.search='';
 }else return;
 d.customText=null;if(typeof diagCauseFormOpen!=='undefined'){diagCauseEditId=null;diagCauseFormOpen=true;}diagTab='conductual';render();diagBuilderFocus();
}
function diagBuilderText(x,d){
 const f=x.behaviorDiagnosis?.[d.factorKey],b=diagBuilderBehavior(x,d.behaviorId);
 if(!f||!b)return '';
 const verb={dificultar:'dificultando',facilitar:'facilitando',influir:'influyendo en'}[d.relation]||'influyendo en';
 let text='Planteamos que '+f.factor+', interpretado como '+(f.role||'Por explorar').toLowerCase()+', podría estar '+verb+' la realización del comportamiento «'+b.name+'».';
 const finding=(x.diagnosisFindings||[]).find(z=>String(z.id)===String(d.findingId));
 if(finding)text+=' '+((finding.factors||[]).includes(d.factorKey)?'El hallazgo vinculado indica: ':'Para contrastarlo, se seleccionó el hallazgo: ')+'«'+String(finding.text||'').trim().slice(0,260)+'».';
 return text+' Esta explicación es provisional y no demuestra causalidad.';
}
function diagBuilderOptions(x,query){
 const d=diagBuilderInit(x),term=String(query||'').trim().toLocaleLowerCase('es');
 const all=(x.diagnosisFindings||[]).filter(f=>f.id&&String(f.text||'').trim());
 const linked=all.filter(f=>(f.factors||[]).includes(d.factorKey));
 let matches=term?all.filter(f=>[f.text,f.source,...(f.categories||[])].join(' ').toLocaleLowerCase('es').includes(term)).slice(0,8):linked.slice(0,5);
 const selected=all.find(f=>String(f.id)===String(d.findingId));
 if(selected&&!matches.includes(selected))matches=[selected,...matches].slice(0,8);
 const button=(f)=>{
  const linked=(f.factors||[]).includes(d.factorKey),isSelected=String(f.id)===String(d.findingId);
  return '<button type="button" class="diag-bld-finding '+(isSelected?'is-selected':'')+'" data-value="'+diagEsc(f.id)+'" onclick="diagBuilderSet(\'findingId\',this.dataset.value)"><span>'+diagEsc(String(f.text||'').slice(0,145))+'</span><small>'+(linked?'Vinculado al factor':'No vinculado al factor')+'</small></button>';
 };
 return '<button type="button" class="diag-bld-finding '+(!d.findingId?'is-selected':'')+'" onclick="diagBuilderSet(\'findingId\',\'\')">Sin evidencia seleccionada</button>'+
 (matches.length?matches.map(button).join(''):'<p class="muted">No hay resultados. Prueba otra búsqueda.</p>');
}
function diagBuilderSearch(value){
 const x=current();if(!x)return;const d=diagBuilderInit(x);d.search=String(value||'');
 const container=document.getElementById('diag-bld-results');if(container)container.innerHTML=diagBuilderOptions(x,d.search);
}
function diagBuilderRestore(){
 const x=current();if(!x)return;const d=diagBuilderInit(x);d.customText=null;
 const textarea=document.getElementById('diag-bld-text');if(textarea)textarea.value=diagBuilderText(x,d);
}
function diagBuilderSave(e){
 e.preventDefault();const x=current();if(!x)return;diagInit(x);const d=diagBuilderInit(x);
 if(!x.behaviorDiagnosis?.[d.factorKey]||!diagBuilderBehavior(x,d.behaviorId))return alert('Selecciona un factor y un comportamiento.');
 const text=String(new FormData(e.target).get('text')||'').trim();
 if(!text)return alert('La hipótesis no puede estar vacía.');
 const now=new Date().toISOString();let primary=x.diagnosisHypotheses.find(h=>h.kind==='guided-primary');
 const fields={text,factorKey:d.factorKey,behaviorId:d.behaviorId,findingId:d.findingId,relation:d.relation,updatedAt:now};
 if(primary)Object.assign(primary,fields);
 else x.diagnosisHypotheses.push({id:diagId(),kind:'guided-primary',createdAt:now,...fields});
 d.customText=text;save();render();diagBuilderFocus();
}
function diagRelationsCompact(x){
 const findings=x.diagnosisFindings||[],d=diagBuilderInit(x);
 const factors=Object.entries(x.behaviorDiagnosis||{}).filter(([k,v])=>v).map(([key,v])=>({key,name:v.factor,role:v.role,kind:'factor',related:findings.filter(f=>(f.factors||[]).includes(key))}));
 const behaviors=(x.behaviors||[]).map((b,i)=>({key:String(b.id||'index:'+i),name:b.name,role:'',kind:'behavior',related:findings.filter(f=>(f.behaviors||[]).some(ref=>String(ref)===String(i)||String(ref)===String(b.id)))}));
 const row=item=>{
  const chosen=item.kind==='factor'?d.factorKey===item.key:d.behaviorId===item.key;
  const action=item.kind==='factor'?'factorKey':'behaviorId';
  return '<div class="diag-rel-compact-row"><button type="button" class="diag-rel-use '+(chosen?'selected':'')+'" data-value="'+diagEsc(item.key)+'" onclick="diagBuilderSet(\''+action+'\',this.dataset.value)"><span>'+diagEsc(item.name)+'</span>'+(item.role?'<small>'+diagEsc(item.role)+'</small>':'')+'<em>'+(chosen?'✓':'Usar')+'</em></button>'+
  (item.related.length?'<details class="diag-rel-evidence"><summary>'+item.related.length+' '+(item.related.length===1?'hallazgo vinculado':'hallazgos vinculados')+'</summary>'+item.related.slice(0,5).map(f=>'<p>'+diagEsc(String(f.text||'').slice(0,180))+'</p>').join('')+(item.related.length>5?'<small>Otros '+(item.related.length-5)+' disponibles en Hallazgos.</small>':'')+'</details>':'')+'</div>';
 };
 const group=(name,items)=>{
  const withLinks=items.filter(z=>z.related.length).sort((a,b)=>b.related.length-a.related.length);
  const without=items.filter(z=>!z.related.length);
  return '<div class="diag-rel-compact-group"><div class="diag-rel-compact-heading"><h3>'+name+'</h3><small>'+withLinks.length+' de '+items.length+' con vínculos</small></div>'+
   (items.length?withLinks.map(row).join('')+(without.length?'<details class="diag-rel-hidden"><summary>'+without.length+' sin vínculos registrados</summary>'+without.map(row).join('')+'</details>':''):'<p class="muted">Aún no hay registros.</p>')+'</div>';
 };
 return '<section class="panel diag-rel-compact"><h2>Relaciones de evidencia</h2><p class="muted">Revisa los vínculos registrados. Al elegir un factor o comportamiento, podrás explorar sus posibles causas en Diagnóstico conductual. Sin vínculos no significa sin evidencia.</p><div class="diag-rel-compact-grid">'+group('Factores',factors)+group('Comportamientos',behaviors)+'</div></section>';
}
function diagBuilderPanel(x){
 const d=diagBuilderInit(x),factorKeys=Object.keys(x.behaviorDiagnosis||{}).filter(k=>x.behaviorDiagnosis[k]);
 const behaviors=x.behaviors||[],finding=(x.diagnosisFindings||[]).find(f=>String(f.id)===String(d.findingId));
 const primary=(x.diagnosisHypotheses||[]).find(h=>h.kind==='guided-primary');
 const previous=(x.diagnosisHypotheses||[]).filter(h=>h.kind!=='guided-primary');
 const options=(rows,currentValue)=>rows.map(([key,title])=>'<option value="'+diagEsc(key)+'" '+(String(key)===String(currentValue)?'selected':'')+'>'+diagEsc(title)+'</option>').join('');
 const factorOptions=factorKeys.map(key=>[key,x.behaviorDiagnosis[key].factor+' · '+(x.behaviorDiagnosis[key].role||'Por explorar')]);
 const behaviorOptions=behaviors.map((b,i)=>[String(b.id||'index:'+i),b.name||'Sin nombre']);
 const linked=finding&&(finding.factors||[]).includes(d.factorKey);
 const evidence=finding?'<div class="diag-bld-selected"><span>'+diagEsc(String(finding.text||'').slice(0,230))+'</span><small>'+(linked?'Hallazgo vinculado':'Hallazgo seleccionado sin vínculo con este factor')+'</small></div>':'<p class="muted">No hay evidencia seleccionada. Puedes contrastar esta hipótesis posteriormente.</p>';
 const preview=d.customText===null?diagBuilderText(x,d):d.customText;
 let html='<section class="panel diag-bld" id="diag-builder"><div class="diag-bld-head"><div><h2>Hipótesis de trabajo</h2><p class="muted">Elige los elementos; HACERLO propone la explicación automáticamente.</p></div><span class="diag-bld-tag">'+(primary?'Guardada':'Por contrastar')+'</span></div>';
 if(factorKeys.length&&behaviors.length){
  html+='<form onsubmit="diagBuilderSave(event)"><div class="diag-bld-columns"><label>Factor conductual<select onchange="diagBuilderSet(\'factorKey\',this.value)">'+options(factorOptions,d.factorKey)+'</select></label><label>Comportamiento<select onchange="diagBuilderSet(\'behaviorId\',this.value)">'+options(behaviorOptions,d.behaviorId)+'</select></label></div>';
  html+='<div class="diag-bld-columns"><label>Relación a explorar<select onchange="diagBuilderSet(\'relation\',this.value)">'+options([['dificultar','Podría dificultar'],['facilitar','Podría facilitar'],['influir','Podría influir en']],d.relation)+'</select></label><div class="diag-bld-evidence"><strong>Evidencia (opcional)</strong>'+evidence+'<details><summary>Buscar o cambiar el hallazgo</summary><input type="search" placeholder="Buscar hallazgos de la iniciativa" value="'+diagEsc(d.search)+'" oninput="diagBuilderSearch(this.value)"><div id="diag-bld-results">'+diagBuilderOptions(x,d.search)+'</div></details></div></div>';
  html+='<div class="diag-bld-preview"><div class="diag-bld-preview-head"><strong>Hipótesis propuesta</strong><span>Por contrastar</span></div><textarea id="diag-bld-text" name="text" rows="5" required oninput="diagBuilderInit(current()).customText=this.value">'+diagEsc(preview)+'</textarea><small>La evidencia seleccionada no crea vínculos nuevos ni demuestra causalidad.</small></div><div class="diag-bld-actions"><button class="primary" type="submit">'+(primary?'Actualizar hipótesis principal':'Guardar hipótesis principal')+'</button><button class="secondary" type="button" onclick="diagBuilderRestore()">Restaurar propuesta</button></div></form>';
 }else{
  html+='<p class="muted">Para construir la hipótesis, selecciona un factor y registra un comportamiento en Diseño.</p><div class="flex"><button class="secondary" onclick="diagSwitch(\'conductual\')">Explorar factores</button><button class="secondary" onclick="go(\'Diseño de comportamientos\')">Abrir Diseño</button></div>';
 }
 if(previous.length)html+='<details class="diag-bld-history"><summary>Hipótesis anteriores ('+previous.length+')</summary>'+previous.map(h=>'<div class="diag-bld-history-item"><p>'+diagEsc(h.text)+'</p><button type="button" class="secondary" data-id="'+diagEsc(h.id)+'" onclick="diagRemoveHypothesis(this.dataset.id)">Eliminar</button></div>').join('')+'</details>';
 return html+'</section>';
}
function diagVisual(x){
 const factors=Object.values(x.behaviorDiagnosis).filter(Boolean),findings=x.diagnosisFindings,beh=x.behaviors;
 const categories=DIAG_CATEGORIES.map(c=>[c,findings.filter(f=>(f.categories||[]).includes(c)).length]).filter(z=>z[1]).sort((a,b)=>b[1]-a[1]);
 return `<div class="triple"><section class="panel"><p class="muted">Factores explorados</p><div class="metric">${factors.length}/21</div></section><section class="panel"><p class="muted">Hallazgos</p><div class="metric">${findings.length}</div></section><section class="panel"><p class="muted">Comportamientos de Diseño</p><div class="metric">${beh.length}</div></section></div>
 <div class="diag-analytics-grid">
 <section class="panel diag-analytics-card"><h2>Mapa conductual</h2>${diagBarComparativo(factors)}</section>
 <section class="panel diag-analytics-card"><h2>Interpretación de factores</h2>${diagFactoresApilados(factors)}</section>
 <section class="panel diag-analytics-card diag-analytics-card--radar"><h2>Mapa de hallazgos</h2>${diagHallazgosRadar(categories)}</section>
 <section class="panel diag-analytics-card diag-analytics-card--evidence"><h2>Tipo de evidencia</h2>${diagEvidenciasDonut(findings)}</section>
 </div>${diagRelationsCompact(x)}<p class="notice">La cantidad de hallazgos no mide por sí misma la magnitud del efecto. Las asociaciones registradas no demuestran causalidad.</p>`}
function diagnosisPage(x){diagInit(x);return hcxHero('Diagnóstico',x,'Explora barreras, facilitadores y experiencias para comprender el comportamiento.','RDAIM · RESULTADOS','◈')+`<section class="panel"><div class="diag-tabs hcx-section-tabs"><button type="button" class="secondary" onclick="go('Encuestas y experiencias')">📋 Encuestas y experiencias</button>${diagTabButton('conductual','🧠 Diagnóstico conductual')}${diagTabButton('hallazgos','🔎 Hallazgos y micronarrativas')}${diagTabButton('visual','📊 Tablero integrado')}</div></section>${diagTab==='conductual'?diagConductual(x):diagTab==='hallazgos'?diagHallazgos(x):diagVisual(x)}`}

function diagFindingItem(z){return `<div class="diag-item"><div class="flex"><span class="diag-pill">${diagEsc(z.evidenceType)}</span><span class="diag-pill">${diagEsc(z.role)}</span>${(z.categories||[]).map(c=>`<span class="diag-pill">${diagEsc(c)}</span>`).join('')}</div><p>${diagEsc(z.text)}</p><div class="diag-mini">${diagEsc(z.source)}${z.indicator?' · '+diagEsc(z.indicator):''}</div><div class="flex"><button class="secondary" onclick="diagEditFinding('${diagEsc(z.id)}')">Editar</button><button class="secondary" onclick="diagRemoveFinding('${diagEsc(z.id)}')">Eliminar</button></div></div>`;}
function diagIsSurveyFinding(z){return !!z.surveyId&&String(z.sourceKey||'').startsWith('ee:'+z.surveyId+':');}
function diagSurveyFindingGroups(x,surveyId,questionId){const s=(x.surveys||[]).find(s=>s.id===surveyId);if(!s)return null;const q=s.questions.find(q=>q.id===questionId);if(!q)return null;const labels=new Set([q.label,...(s.questionTextHistory||[]).flatMap(h=>(h.changes||[]).filter(c=>c.questionId===q.id).flatMap(c=>[c.previous,c.current]))]),groups=new Map(),answered=new Set();for(const f of (x.diagnosisFindings||[]).filter(f=>f.surveyId===s.id&&String(f.sourceKey||'').startsWith('ee:'+s.id+':text:'))){const prefix='ee:'+s.id+':text:',r=s.responses.find(r=>String(f.sourceKey).startsWith(prefix+r.id+':'));if(!r)continue;const label=String(f.sourceKey).slice((prefix+r.id+':').length);if(f.questionId?f.questionId!==q.id:!labels.has(label))continue;const text=String(f.text||'').trim();if(!text)continue;answered.add(r.id);const normalized=text.normalize('NFC').replace(/\s+/g,' ').toLocaleLowerCase('es');if(!groups.has(normalized))groups.set(normalized,{text,responses:new Set(),findings:[]});const g=groups.get(normalized);g.responses.add(r.id);g.findings.push(f);}return {survey:s,question:q,total:s.responses.length,answered:answered.size,groups:[...groups.values()].map(g=>({text:g.text,count:g.responses.size,percent:s.responses.length?100*g.responses.size/s.responses.length:0,findings:g.findings})).sort((a,b)=>b.count-a.count||a.text.localeCompare(b.text,'es'))};}
function diagRegisteredFindings(x){const imported=(x.diagnosisFindings||[]).filter(diagIsSurveyFinding),manual=(x.diagnosisFindings||[]).filter(z=>!diagIsSurveyFinding(z)),surveys=(x.surveys||[]).filter(s=>imported.some(z=>z.surveyId===s.id));return `<section class="panel"><h2>Hallazgos registrados (${x.diagnosisFindings.length})</h2><details><summary>Hallazgos de encuestas · ${imported.length} registros</summary><label>Instrumento<select id="diag-survey-select" onchange="diagChooseSurvey(this.value)"><option value="">Selecciona una encuesta</option>${surveys.map(s=>`<option value="${diagEsc(s.id)}">${diagEsc(s.title)}</option>`).join('')}</select></label><div id="diag-survey-question"></div><div id="diag-survey-groups"></div></details><details><summary>Otros hallazgos y micronarrativas · ${manual.length}</summary><div class="diag-list">${manual.map(diagFindingItem).join('')||'<p class="muted">Sin otros hallazgos.</p>'}</div></details></section>`;}
function diagChooseSurvey(id){const x=current(),s=(x.surveys||[]).find(s=>s.id===id);document.getElementById('diag-survey-groups').innerHTML='';document.getElementById('diag-survey-question').innerHTML=s?`<small class="muted">${diagEsc(s.title)} · ${s.responses.length} respuestas en el instrumento</small><label>Pregunta<select id="diag-question-select" onchange="diagShowSurveyGroups(0)"><option value="">Selecciona una pregunta</option>${s.questions.filter(q=>diagSurveyFindingGroups(x,s.id,q.id)?.answered).map(q=>`<option value="${diagEsc(q.id)}">${diagEsc(q.label)}</option>`).join('')}<option value="__metrics__">Hallazgos numéricos del instrumento</option></select></label>`:'';}
function diagSurveyGroupsHTML(x,surveyId,questionId,page=0){const s=(x.surveys||[]).find(s=>s.id===surveyId);if(!s)return '';if(questionId==='__metrics__'){const ff=(x.diagnosisFindings||[]).filter(f=>diagIsSurveyFinding(f)&&f.surveyId===s.id&&!String(f.sourceKey).startsWith('ee:'+s.id+':text:'));return `<small class="muted">${diagEsc(s.title)}</small><div class="diag-list">${ff.map(diagFindingItem).join('')||'<p>Sin hallazgos numéricos.</p>'}</div>`;}const data=diagSurveyFindingGroups(x,surveyId,questionId);if(!data)return '';const pages=Math.max(1,Math.ceil(data.groups.length/8)),p=Math.max(0,Math.min(pages-1,Number(page)||0)),fmt=n=>Number(n).toLocaleString('es-CO',{maximumFractionDigits:1});return `<h4>${diagEsc(data.question.label)}</h4><small class="muted">${diagEsc(s.title)} · ${data.answered} respuestas en esta pregunta · ${data.total} en el instrumento</small><p class="diag-mini">Porcentaje sobre el total del instrumento. Se agrupan respuestas iguales, ignorando mayúsculas y espacios. Incluye todos los momentos.</p><div class="diag-list">${data.groups.slice(p*8,p*8+8).map(g=>`<article class="diag-item"><b>${g.count} de ${data.total} respuestas · ${fmt(g.percent)} %</b><p>${diagEsc(g.text)}</p><small class="muted">${diagEsc(s.title)} · ${diagEsc(data.question.label)}</small><details><summary>Ver registros de este grupo</summary><label>Registro<select onchange="if(this.value)diagEditFinding(this.value)"><option value="">Selecciona un registro para editar</option>${g.findings.map((f,i)=>`<option value="${diagEsc(f.id)}">Registro ${i+1}${f.wave?' · '+diagEsc(f.wave):''}</option>`).join('')}</select></label></details></article>`).join('')||'<p>Sin comentarios registrados.</p>'}</div>${pages>1?`<div class="flex"><button class="secondary" ${p===0?'disabled':''} onclick="diagShowSurveyGroups(${p-1})">Anterior</button><small>${p+1} de ${pages}</small><button class="secondary" ${p===pages-1?'disabled':''} onclick="diagShowSurveyGroups(${p+1})">Siguiente</button></div>`:''}`;}
function diagShowSurveyGroups(page=0){const surveyId=document.getElementById('diag-survey-select').value,questionId=document.getElementById('diag-question-select').value;document.getElementById('diag-survey-groups').innerHTML=diagSurveyGroupsHTML(current(),surveyId,questionId,page);}
