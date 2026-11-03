/* HACERLO · Capacidad Adaptativa · fase 1: vinculación auditable de preguntas.
   No altera las encuestas, ni simula ecuaciones de AnyLogic todavía. */
const CA_DIMENSIONS=[
 {id:'energia',name:'Energía adaptativa',aliases:['desgaste','energía','energia','fatiga','saturación','carga emocional','ánimo']},
 {id:'preparacion',name:'Preparación para el cambio',aliases:['preparación','preparacion','autoeficacia','claridad','control','influir','recursos']},
 {id:'apertura',name:'Apertura adaptativa',aliases:['apertura','disposición','disposicion','curiosidad','flexibilidad','aprender']},
 {id:'memoria',name:'Memoria adaptativa',aliases:['experiencia','memoria','confianza','expectativas','cambios recientes']}
];
let caExpanded=false,caSurveyFilter='';
function caClean(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function caCandidates(x){
 return (x.surveys||[]).flatMap(s=>(s.questions||[]).filter(q=>['scale','nps','cnps'].includes(q.type)).map(q=>({
  key:JSON.stringify([s.id,q.id]),surveyId:s.id,questionId:q.id,survey:s.title||'Encuesta',
  kind:s.kind||'',label:q.label||'',dimension:q.dimension||'',type:q.type,
  min:q.min,max:q.max,reverse:!!q.reverse,
  responses:(s.responses||[]).length
 })));
}
function caRecommend(q,d){
 const hay=caClean(q.dimension+' '+q.label),terms=d.aliases.map(caClean);
 const dimension=caClean(q.dimension);
 if(terms.some(t=>dimension.includes(t)))return 3;
 if(terms.some(t=>hay.includes(t)))return 1;
 return 0;
}
function caStore(x){return x.capacityAdaptive||(x.capacityAdaptive={version:1,mappings:{},updatedAt:null});}
function caSelection(x,d,candidates){
 const saved=caStore(x).mappings[d.id];
 if(Array.isArray(saved))return saved;
 const top=candidates.filter(q=>caRecommend(q,d)>=3);
 return top.map(q=>q.key);
}
function caToggleDimension(dim,key,checked){
 const x=current(),d=CA_DIMENSIONS.find(z=>z.id===dim);if(!x||!d)return;
 const candidates=caCandidates(x),valid=new Set(candidates.map(q=>q.key));
 const st=caStore(x),old=caSelection(x,d,candidates).filter(k=>valid.has(k));
 st.mappings[dim]=checked?[...new Set([...old,key])]:old.filter(k=>k!==key);
 st.updatedAt=new Date().toISOString();save();render();
}
function caReset(dim){
 const x=current();if(!x)return;delete caStore(x).mappings[dim];
 caStore(x).updatedAt=new Date().toISOString();save();render();
}
function caToggle(){caExpanded=!caExpanded;render();}
function caFilter(value){caSurveyFilter=value;render();}
function caMarkup(x){
 const qs=caCandidates(x),st=caStore(x),surveys=[...new Map(qs.map(q=>[q.surveyId,q.survey])).entries()];
 const chosen=qs.filter(q=>!caSurveyFilter||q.surveyId===caSurveyFilter);
 return `<section class="panel" id="ca-panel" style="margin-top:16px;border:1px solid rgba(119,187,221,.28)">
 <div class="flex" style="justify-content:space-between;align-items:center;gap:12px">
  <div><div class="muted" style="font-size:11px;letter-spacing:1px">PENSAMIENTO SISTÉMICO · SIMULACIÓN DINÁMICA</div>
  <h2 style="margin:5px 0">Capacidad Adaptativa</h2>
  <p class="muted" style="margin:0">Conecta preguntas reales de SENTIR y CNPS con las cuatro dimensiones del modelo.</p></div>
  <button class="secondary" type="button" onclick="caToggle()" aria-expanded="${caExpanded}">${caExpanded?'Ocultar configuración':'Configurar preguntas →'}</button>
 </div>
 ${caExpanded?`<div style="margin-top:16px">
  <label style="max-width:440px">Instrumento<select onchange="caFilter(this.value)"><option value="">Todos los instrumentos</option>${surveys.map(([id,title])=>`<option value="${safe(id)}" ${caSurveyFilter===id?'selected':''}>${safe(title)}</option>`).join('')}</select></label>
  ${!qs.length?'<p class="notice">No hay preguntas numéricas en las encuestas de esta iniciativa. Registra o importa SENTIR/CNPS primero.</p>':''}
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
  ${CA_DIMENSIONS.map(d=>{const selected=caSelection(x,d,qs),available=chosen.slice().sort((a,b)=>caRecommend(b,d)-caRecommend(a,d));
   return `<section class="panel" style="margin:0"><div class="flex" style="justify-content:space-between"><h3 style="margin:0">${safe(d.name)}</h3><button class="secondary" type="button" onclick="caReset('${d.id}')" style="font-size:11px">Restablecer</button></div>
    <p class="muted" style="font-size:12px">${selected.length} pregunta(s) vinculada(s) · Recomendación editable</p>
    <div style="max-height:280px;overflow:auto">
    ${available.map(q=>{const checked=selected.includes(q.key),score=caRecommend(q,d);
      return `<label style="display:flex;align-items:flex-start;gap:9px;margin:8px 0;padding:8px;border:1px solid rgba(140,170,195,.15);border-radius:8px;cursor:pointer">
       <input type="checkbox" style="width:auto;margin-top:3px" ${checked?'checked':''} onchange="caToggleDimension('${d.id}',${JSON.stringify(q.key).replace(/"/g,'&quot;')},this.checked)">
       <span style="font-size:12px"><b>${safe(q.label)}</b><small class="muted" style="display:block">${safe(q.survey)} · ${safe(q.dimension||'Sin dimensión')} · ${safe(q.type.toUpperCase())}${score>=3?' · Recomendada':''}</small></span>
      </label>`}).join('')||'<p class="muted">No hay preguntas en este filtro.</p>'}</div></section>`}).join('')}
  </div>
  <p class="notice" style="margin-top:12px">Configuración guardada por iniciativa. La selección no calcula aún los stocks ni ejecuta el modelo AnyLogic. Antes de simular se validarán dirección de los ítems, escalas, muestras y momentos de medición.</p>
 </div>`:''}</section>`;
}
// Decorador aditivo, cargado después de Encuestas. Evita alterar la navegación existente.
const caPreviousRender=render;
render=function(){
 caPreviousRender();
 if(page!=='Pensamiento sistémico')return;
 const x=current(),root=$('app');if(x&&root&&!document.getElementById('ca-panel'))root.insertAdjacentHTML('beforeend',caMarkup(x));
};
