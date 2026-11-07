/* Centro de Activación: recorridos independientes por audiencia, datos de correo
 * y conexión opcional con el Laboratorio. Nunca envía nada automáticamente. */
function cacProviderStats(rows){
 const fields=['recipient_count','accepted_count','delivered_count','opened_count','clicked_count','bounced_count','complained_count','suppressed_count','failed_delivery_count'];
 const totals=Object.fromEntries(fields.map(k=>[k,0]));
 for(const row of rows||[]){
  for(const field of fields){
   const n=Number(row?.[field]);
   if(Number.isFinite(n)&&n>0)totals[field]+=n;
  }
 }
 return totals;
}
function cacHistoryMetricsHTML(rows){
 if(!rows?.length)return '';
 const z=cacProviderStats(rows);
 const chips=[
  ['Aceptados',z.accepted_count],
  ['Entregados',z.delivered_count],
  ['Aperturas*',z.opened_count],
  ['Clics*',z.clicked_count],
  ['Rebotes',z.bounced_count],
  ['Quejas',z.complained_count]
 ];
 return '<div class="cac-provider-summary" aria-label="Métricas técnicas de los últimos envíos">'+
  chips.map(([label,value])=>'<div class="cac-provider-stat"><small>'+label+'</small><strong>'+Number(value).toLocaleString('es-CO')+'</strong></div>').join('')+
  '</div><p class="cac-inline-help">Se muestran hasta 30 activaciones recientes; no es un consolidado histórico completo. *Aperturas y clics solo se contabilizan con seguimiento habilitado en Resend y pueden ser imprecisos por privacidad o protección del correo. No miden adopción.</p>';
}
function cacHistoryEventFields(row){
 const n=k=>Math.max(0,Number(row?.[k])||0);
 const parts=[];
 if(n('delivered_count'))parts.push(n('delivered_count')+' entregados');
 if(n('opened_count'))parts.push(n('opened_count')+' aperturas*');
 if(n('clicked_count'))parts.push(n('clicked_count')+' clics*');
 if(n('bounced_count'))parts.push(n('bounced_count')+' rebotes');
 if(n('complained_count'))parts.push(n('complained_count')+' quejas');
 if(n('suppressed_count'))parts.push(n('suppressed_count')+' suprimidos');
 if(n('failed_delivery_count'))parts.push(n('failed_delivery_count')+' fallos');
 return parts.length?'<small class="cac-provider-events">'+parts.join(' · ')+'</small>':
  '<small class="cac-provider-events">Sin eventos de entrega registrados</small>';
}
function cacCreateForAudience(id){
 if(cacBusy||!cacKeepVisibleDraft())return;
 const x=current(),row=cacAction(x);
 if(!row||!(x.audiences||[]).some(a=>String(a.id)===String(id)))return;
 cacEnsureMechanism(row.action,'comunicacion');
 const step=cacEnsureNew(row.action,'activar','comunicacion');
 step.standalone=true;step.audienceIds=[String(id)];
 step.contactIds=[];step.manualEmail='';step.manualName='';
 row.action.activationSequence=[...cacSteps(row.action),step];
 cacStepId=step.id;cacEditorOpen=true;
 cacMessage='Creaste un borrador dirigido a la audiencia seleccionada. Revísalo antes de enviar.';
 save();render();
 document.getElementById?.('cac-editor')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function cacJourneysHTML(x,row){
 if(!row?.action)return '';
 const action=row.action,steps=cacSteps(action),audiences=x.audiences||[];
 const direct=steps.filter(s=>s.standalone&&!(s.audienceIds||[]).length);
 const linked=audiences.map(a=>{
  const rows=steps.filter(s=>(s.audienceIds||[]).some(id=>String(id)===String(a.id)));
  return {audience:a,rows};
 });
 const withMessages=linked.filter(z=>z.rows.length).length;
 const renderer=(steps)=>steps.slice(0,12).map(s=>
  '<button type="button" class="cac-journey-step" data-cac-step="'+cacSafe(s.id)+'" onclick="cacChooseStep(this.dataset.cacStep)">'+
   '<span>'+cacSafe(cacStage(s.stage).label)+'</span><strong>'+cacSafe(s.title||'Sin asunto')+'</strong>'+
   '<small>'+cacSafe(cacStepLabel(s))+'</small></button>').join('');
 const recommended=typeof labRecommendedExperiences==='function'?labRecommendedExperiences(x).slice(0,2):[];
 const assigned=typeof labExperienceLink==='function'?labExperienceLink(action.learningLabExperience):'';
 const labHtml='<div class="cac-journey-lab"><div><strong>Experiencias y práctica</strong>'+
  '<p>Vincula una experiencia del Laboratorio si ayuda a ensayar el comportamiento. Las respuestas individuales no se comparten automáticamente.</p></div>'+
  (assigned?'<a href="'+cacSafe(assigned)+'" target="_blank" rel="noopener noreferrer">Abrir experiencia asignada ↗</a>':'<button type="button" class="secondary" onclick="go(\'Laboratorio\')">Explorar Laboratorio ↗</button>')+
  (recommended.length?'<small>Experiencias sugeridas: '+recommended.map(i=>cacSafe(i.title)).join(' · ')+'</small>':'')+'</div>';
 return '<details class="cac-journeys"><summary><span><span class="cac-eyebrow">RECORRIDOS FLEXIBLES</span>'+
  '<strong>Activación por audiencia</strong><small>'+withMessages+' de '+audiences.length+
  ' audiencias con mensajes asignados · cada paso puede activarse de forma independiente</small></span>'+
  '<span aria-hidden="true">⌄</span></summary>'+
  '<div class="cac-journey-content">'+
  (audiences.length?'<div class="cac-journey-groups">'+linked.map(({audience,rows})=>
   '<article class="cac-journey-group"><div class="cac-journey-group-head"><div><strong>'+cacSafe(audience.name||'Audiencia')+'</strong>'+
    '<small>'+rows.length+' '+(rows.length===1?'activación':'activaciones')+' en este recorrido</small></div>'+
    '<button class="secondary" type="button" data-cac-audience="'+cacSafe(audience.id)+
    '" onclick="cacCreateForAudience(this.dataset.cacAudience)">+ Mensaje</button></div>'+
    (rows.length?'<div class="cac-journey-steps">'+renderer(rows)+'</div>':
     '<p class="cac-journey-empty">Sin mensajes asignados. Puedes añadir uno cuando tenga sentido.</p>')+
    '</article>').join('')+'</div>':
   '<p class="cac-journey-empty">Crea audiencias desde Diseño para configurar recorridos por grupo.</p>')+
  (direct.length?'<div class="cac-journey-unassigned"><strong>Activaciones individuales o por asignar</strong>'+
   '<div class="cac-journey-steps">'+renderer(direct)+'</div></div>':'')+
  labHtml+
  '<p class="cac-signal-note">Los recorridos no son obligatorios ni se activan de forma autónoma. El facilitador decide si envía, programa o no utiliza un paso.</p>'+
  '</div></details>';
}
