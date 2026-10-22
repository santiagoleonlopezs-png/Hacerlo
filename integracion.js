/* Extensiones aditivas: ejecutan primero la función previa, sin eliminar vistas. */
const eeBaseRender=render;
render=function(){
 eeBaseRender();const x=current();if(!x)return;
 if(['Diagnóstico','Indicadores','Analítica','Inteligencia integrada'].includes(page))$('app').insertAdjacentHTML('beforeend',eeSummaryPanel(x));
 if(page==='Inicio'&&db.initiatives.some(i=>(i.surveyPriorities||[]).length))$('app').insertAdjacentHTML('beforeend',`<section class="panel"><h2>Señales de encuestas para priorización</h2>${db.initiatives.filter(i=>(i.surveyPriorities||[]).length).map(i=>`<p><b>${safe(i.name)}</b>: ${i.surveyPriorities.map(s=>safe(s.label)+' · '+safe(s.reason)+' (n='+s.n+')').join('; ')}</p>`).join('')}<p class="muted">Las señales complementan la matriz de impacto y esfuerzo; no cambian las evaluaciones manuales.</p></section>`);
};
const eeBaseAIPayload=initiativeAIPayload;
initiativeAIPayload=function(x){const p=eeBaseAIPayload(x);p.initiative.surveys=EE.init(x).map(s=>({surveyId:s.id,title:s.title,kind:s.kind,version:s.version,wave:s.wave,results:EE.summarize(s).metrics,evolution:EE.evolution(s),sampleSize:s.responses.length}));p.initiative.surveyReadingScale=eeBalanceRanges();p.initiative.surveyPrioritySignals=x.surveyPriorities||[];p.methodological_rules.push('Para comparar mediciones usa evolution.series y evolution.comparisons, con su base y tamaños de muestra. results conserva el consolidado histórico y no representa la última medición. Los cambios son descriptivos y no prueban causalidad.');p.methodological_rules.push('Encuestas: autoinforme descriptivo, no causalidad. SENTIR es una plantilla de trabajo no validada. Desgaste alto = más desgaste. NPS y CNPS no son intercambiables. Entradas de capacidad no equivalen a stocks ni tasas.');return p;};

// Recuperación automática solo en Resultados, con la pestaña visible y sesión activa.
setInterval(()=>{if(cloudReady&&document.visibilityState==='visible'&&page==='Encuestas y experiencias'&&eeTab==='resultados'&&current()&&eeSurvey()?.publication)eePull(true);},15000);
