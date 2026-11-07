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
  '</div><p class="cac-inline-help">Estos números reflejan únicamente eventos confirmados o consultados; 0 entregados no significa que el correo haya fallado. Se muestran hasta 30 activaciones recientes. *Aperturas y clics pueden ser imprecisos por privacidad o protección del correo. No miden adopción.</p>';
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
 if(parts.length)return '<small class="cac-provider-events">'+parts.join(' · ')+'</small>';
 const result=row?.delivery_check_result||{};
 const checked=!!row?.delivery_check_at;
 const statusCount=k=>Math.max(0,Number(result?.[k])||0);
 const sent=statusCount('sent')+statusCount('queued')+statusCount('scheduled');
 if(sent)return '<small class="cac-provider-events">Resend: '+sent+
  ' mensaje(s) en estado enviado o en proceso; entrega todavía no confirmada.</small>';
 if(checked&&statusCount('unknown'))return '<small class="cac-provider-events">El proveedor no devolvió un estado reconocido. Consulta Resend → Emails.</small>';
 return '<small class="cac-provider-events">Entrega aún sin verificar. «Aceptado» no garantiza la llegada al destinatario.</small>';
}
function cacAudienceAdoptionSignal(x,action,audienceId){
 const ids=[action?.behaviorId,...(Array.isArray(action?.behaviorIds)?action.behaviorIds:[])]
  .filter(Boolean).map(String);
 const behavior=(x.behaviors||[]).find(b=>ids.includes(String(b?.id)));
 if(!behavior)return null;
 if(behavior.scope==='specific'&&!(behavior.audienceIds||[]).some(id=>String(id)===String(audienceId)))return null;
 const counts={understands:0,tries:0,performs:0,sustains:0};
 for(const person of x.audiencePeople||[]){
  if(String(person?.audienceId)!==String(audienceId))continue;
  const latest=(person.adoptionHistory||[])
    .filter(r=>String(r.behaviorId)===String(behavior.id)&&Object.hasOwn(counts,r.stage))
    .sort((a,b)=>String(b.observedOn||'').localeCompare(String(a.observedOn||''))||
      String(b.recordedAt||'').localeCompare(String(a.recordedAt||'')))[0];
  if(latest)counts[latest.stage]++;
 }
 const total=Object.values(counts).reduce((n,z)=>n+z,0);
 if(!total)return null;
 const [stage,count]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
 const recommendations={
  understands:{kind:'comunicacion',next:'activar',label:'Apoyar la acción',detail:'La evidencia registra comprensión; todavía se necesita verificar la práctica.'},
  tries:{kind:'comunicacion',next:'recordar',label:'Reforzar la práctica',detail:'Hay registros de ejecución en prueba; conviene explorar qué apoyo facilita continuar.'},
  performs:{kind:'comunicacion',next:'recordar',label:'Sostener la práctica',detail:'Hay registros de ejecución autónoma; una ayuda en el momento oportuno puede ser útil.'},
  sustains:{kind:'reconocimiento',next:'sostener',label:'Revisar reconocimiento',detail:'Hay registros de sostenimiento. Verifica los logros antes de reconocer.'}
 };
 return {...recommendations[stage],total,count,observedStage:stage,behavior:behavior.name};
}
function cacSuggestForAudience(id){
 const x=current(),row=cacAction(x);
 const signal=row&&cacAudienceAdoptionSignal(x,row.action,id);
 if(!signal)return;
 cacCreateForAudience(id,signal.next,signal.kind);
 const step=cacStep(cacAction(current()));
 if(!step||step.status!=='draft')return;
 step.basis={source:'adopcion_audiencia',observedStage:signal.observedStage,
  recordedCount:signal.count,totalObserved:signal.total,observedBehavior:signal.behavior,
  reason:signal.detail,recordedAt:new Date().toISOString()};
 cacMessage='Borrador preparado a partir de '+signal.count+' observaciones de «'+signal.observedStage+
  '». Comprueba la evidencia y adapta el mensaje antes de elegir enviarlo.';
 save();render();
}
function cacCreateForAudience(id,stage='activar',kind='comunicacion'){
 if(cacBusy||!cacKeepVisibleDraft())return;
 const x=current(),row=cacAction(x);
 if(!row||!(x.audiences||[]).some(a=>String(a.id)===String(id)))return;
 if(!['sentido','activar','recordar','sostener'].includes(stage)||
   !['comunicacion','reconocimiento'].includes(kind))return;
 cacEnsureMechanism(row.action,kind);
 const step=cacEnsureNew(row.action,stage,kind);
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
    '<small>'+rows.length+' '+(rows.length===1?'activación':'activaciones')+' en este recorrido</small>'+
    (typeof cacAudienceAdoptionSignal==='function'&&cacAudienceAdoptionSignal(x,action,audience.id)?
      '<small class="cac-journey-evidence">✧ '+cacAudienceAdoptionSignal(x,action,audience.id).count+
        ' de '+cacAudienceAdoptionSignal(x,action,audience.id).total+
        ' observaciones de adopción orientan un posible refuerzo</small>':'')+'</div>'+
    (cacAudienceAdoptionSignal(x,action,audience.id)?
     '<button class="secondary" type="button" data-cac-audience="'+cacSafe(audience.id)+
     '" onclick="cacSuggestForAudience(this.dataset.cacAudience)">✧ Sugerir refuerzo</button>':'')+
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
