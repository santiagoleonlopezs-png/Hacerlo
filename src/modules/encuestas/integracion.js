/* Extensiones aditivas: ejecutan primero la función previa, sin eliminar vistas. */
const eeBaseRender=render;
render=function(){
 eeBaseRender();const x=current();if(!x)return;
 if(['Diagnóstico','Indicadores','Analítica','Inteligencia integrada'].includes(page))$('app').insertAdjacentHTML('beforeend',eeSummaryPanel(x));
 if(page==='Inicio'&&db.initiatives.some(i=>(i.surveyPriorities||[]).length))$('app').insertAdjacentHTML('beforeend',`<section class="panel"><h2>Señales de encuestas para priorización</h2>${db.initiatives.filter(i=>(i.surveyPriorities||[]).length).map(i=>`<p><b>${safe(i.name)}</b>: ${i.surveyPriorities.map(s=>safe(s.label)+' · '+safe(s.reason)+' (n='+s.n+')').join('; ')}</p>`).join('')}<p class="muted">Las señales complementan la matriz de impacto y esfuerzo; no cambian las evaluaciones manuales.</p></section>`);
};
const eeBaseAIPayload=initiativeAIPayload;
initiativeAIPayload=function(x){const p=eeBaseAIPayload(x);p.initiative.surveys=aiSurveyContext(x);p.initiative.surveyReadingScale=eeBalanceRanges();p.initiative.surveyPrioritySignals=aiDataset(x.surveyPriorities,r=>aiFields(r,['label','reason','n','surveyId']));p.methodological_rules.push('Encuestas: results resume el histórico; para comparar momentos usar evolution, su base, muestras y diferencias descriptivas. No prueba causalidad ni seguimiento de las mismas personas. SENTIR es plantilla no validada; Desgaste alto indica mayor desgaste.');return aiFinalizeContext(p);};

// Recuperación automática solo en Resultados, con la pestaña visible y sesión activa.
setInterval(()=>{if(cloudReady&&document.visibilityState==='visible'&&page==='Encuestas y experiencias'&&eeTab==='resultados'&&current()&&eeSurvey()?.publication)eePull(true);},15000);
