/* HACERLO · Señales para activación adaptativa, derivadas de evidencia existente.
 * Nunca confundir lectura de indicador con efecto causal de una comunicación.
 * Nunca enviar mensajes automáticamente: cada sugerencia crea un borrador. */
function cacSignalNumber(v){
 if(v===null||v===undefined||String(v).trim()==='')return null;
 const n=Number(v);return Number.isFinite(n)?n:null;
}
function cacSignalLatest(ind){
 const direct=cacSignalNumber(ind?.value);
 if(direct!==null)return direct;
 const hist=Array.isArray(ind?.history)?ind.history:[];
 for(let i=hist.length-1;i>=0;i--){
  const n=cacSignalNumber(hist[i]?.value);
  if(n!==null)return n;
 }
 return null;
}
function cacSignalModel(x,row){
 if(!x||!row?.action)return null;
 const action=row.action,behaviorIds=[action.behaviorId,...(Array.isArray(action.behaviorIds)?action.behaviorIds:[])]
   .filter(id=>id!==undefined&&id!==null&&String(id).trim()!=='').map(String);
 const selected=new Set(behaviorIds);
 const behaviors=(x.behaviors||[]).filter(b=>b?.id&&selected.has(String(b.id)));
 const linkNames=new Set(behaviors.map(b=>String(b.name)));
 const indicators=(x.indicators||[]).filter(r=>{
  if(!r)return false;
  if(Array.isArray(r.behaviorIds))return r.behaviorIds.some(id=>selected.has(String(id)));
  return !!r.behavior&&linkNames.has(String(r.behavior));
 }).map(r=>{
  const current=cacSignalLatest(r),target=cacSignalNumber(r.target),baseline=cacSignalNumber(r.baseline);
  let state='unmeasured';
  if(current!==null&&target!==null&&baseline!==null&&target!==baseline){
   state=(target-baseline)*(target-current)>0?'pending':'target';
  }else if(current!==null)state='current';
  return {name:String(r.name||'Indicador'),current,target,baseline,state,unit:String(r.unit||''),
   behaviorIds:Array.isArray(r.behaviorIds)?r.behaviorIds.map(String):[]};
 });
 const observed={total:0,understands:0,tries:0,performs:0,sustains:0,unknown:0};
 const validStages=new Set(['understands','tries','performs','sustains','unknown']);
 // No contar personas dos veces: la tarjeta adopción muestra solo el primer
 // comportamiento explícitamente vinculado a la intervención.
 const focus=behaviors[0];
 if(focus){
  for(const p of x.audiencePeople||[]){
   if(!p||focus.scope==='specific'&&!(focus.audienceIds||[]).some(id=>String(id)===String(p.audienceId)))continue;
   const records=(p.adoptionHistory||[]).filter(r=>String(r.behaviorId)===String(focus.id)&&validStages.has(r.stage));
   if(!records.length)continue;
   records.sort((a,b)=>String(b.observedOn||'').localeCompare(String(a.observedOn||''))||
    String(b.recordedAt||'').localeCompare(String(a.recordedAt||'')));
   observed.total++;observed[records[0].stage]++;
  }
 }
 const pending=indicators.find(i=>i.state==='pending');
 const target=indicators.find(i=>i.state==='target');
 const audience=(x.audiences||[]).find(a=>a?.barriers&&
  (!focus||focus.scope!=='specific'||(focus.audienceIds||[]).some(id=>String(id)===String(a.id))));
 let suggested=null;
 if(pending){
  suggested={kind:'comunicacion',stage:'recordar',
   label:'Preparar refuerzo',reason:'Indicador con meta aún no alcanzada',
   evidence:'El valor actual de «'+pending.name+'» es '+pending.current+
    (pending.unit?' '+pending.unit:'')+'; meta registrada: '+pending.target+
    '. Esto no demuestra que falten comunicaciones, pero justifica revisar posibles barreras.',
   indicator:pending.name,metricCurrent:pending.current,metricTarget:pending.target};
 }else if(observed.total>=3&&observed.tries>0){
  suggested={kind:'comunicacion',stage:'activar',label:'Apoyar la práctica',
   reason:'Hay registros de personas que están probando el comportamiento',
   evidence:'De '+observed.total+' observaciones para «'+focus.name+'», '+observed.tries+
    ' están en fase de prueba. Podría ser útil facilitar su ejecución, previa revisión.',
   indicator:'',metricCurrent:null,metricTarget:null};
 }else if(target&&observed.total>=3&&observed.sustains>0){
  suggested={kind:'reconocimiento',stage:'sostener',label:'Preparar reconocimiento',
   reason:'Hay registros de sostenimiento del comportamiento',
   evidence:'El indicador «'+target.name+'» cumple su meta registrada y existen '+
    observed.sustains+' observaciones en fase de sostenimiento para «'+focus?.name+'». Verifica los logros antes de reconocer.',
   indicator:target.name,metricCurrent:target.current,metricTarget:target.target};
 }else if(audience&&behaviors.length){
  suggested={kind:'comunicacion',stage:'sentido',label:'Comunicar para facilitar',
   reason:'Audiencia con barreras documentadas',
   evidence:'La audiencia «'+audience.name+'» registra barreras. Una comunicación contextual podría ayudar, pero aún no hay evidencia suficiente para medir su efecto.',
   audienceId:String(audience.id),indicator:'',metricCurrent:null,metricTarget:null};
 }
 return {behaviors,indicators,observed,focus,suggested,hasLinks:behaviors.length>0};
}
function cacSignalPanel(x,row){
 if(!row)return '';
 const model=cacSignalModel(x,row);
 const esc=typeof cacSafe==='function'?cacSafe:s=>String(s);
 const bits=[];
 if(model.behaviors.length){
  bits.push('<span class="cac-signal-chip"><b>'+model.behaviors.length+'</b> comportamiento(s) vinculados</span>');
 }else bits.push('<span class="cac-signal-chip">Sin comportamiento vinculado a esta intervención</span>');
 const withReadings=model.indicators.filter(i=>i.current!==null);
 if(withReadings.length)bits.push('<span class="cac-signal-chip"><b>'+withReadings.length+'</b> indicador(es) con valor</span>');
 if(model.observed.total>=3)bits.push('<span class="cac-signal-chip"><b>'+model.observed.total+'</b> observaciones de adopción</span>');
 const proposal=model.suggested;
 const summary=proposal?'<div class="cac-signal-summary"><span class="cac-eyebrow">OPORTUNIDAD DE REFUERZO</span>'+
   '<strong>'+esc(proposal.reason)+'</strong><p>'+esc(proposal.evidence)+'</p></div>'+
   '<button class="secondary" type="button" onclick="cacPrepareFromSignal()">'+esc(proposal.label)+' ↗</button>':
  '<div class="cac-signal-summary"><span class="cac-eyebrow">LECTURA DE EVIDENCIA</span>'+
   '<strong>'+(!model.hasLinks?'Asocia un comportamiento para contextualizar la intervención.':'Sin señal suficiente para sugerir un refuerzo')+'</strong>'+
   '<p>'+(!model.hasLinks?'Los indicadores y observaciones no se atribuirán automáticamente a esta intervención.':
     'Puedes comunicar cuando lo necesites. Para recomendar un refuerzo basado en datos, registra observaciones o indicadores con línea base, meta y valor actual.')+
   '</p></div><button class="secondary" type="button" onclick="go(\'Indicadores\')">Ver indicadores ↗</button>';
 return '<section class="cac-signals" aria-label="Señales de cambio para la intervención">'+
  '<div class="cac-signal-heading"><div><span class="cac-eyebrow">ACTIVACIÓN INFORMADA POR DATOS</span>'+
  '<h3>Señales para orientar el siguiente movimiento</h3></div>'+
  '<div class="cac-signal-counts">'+bits.join('')+'</div></div>'+
  '<div class="cac-signal-action">'+summary+'</div>'+
  '<p class="cac-signal-note">Recomendación orientativa, no diagnóstico causal. Los mensajes se revisan y envían manualmente; las secuencias siguen siendo opcionales.</p></section>';
}
function cacPrepareFromSignal(){
 const x=current(),row=cacAction(x),model=cacSignalModel(x,row),p=model?.suggested;
 if(!row||!p||cacBusy)return;
 if(typeof cacKeepVisibleDraft==='function'&&!cacKeepVisibleDraft())return;
 cacEnsureMechanism(row.action,p.kind);
 const step=cacEnsureNew(row.action,p.stage,p.kind);
 step.standalone=true;
 step.title=(p.stage==='recordar'?'Un recordatorio para avanzar':
  p.stage==='sostener'?'Reconozcamos prácticas verificadas':
  p.stage==='sentido'?'Aclaremos el propósito y la práctica':'Facilitemos el primer paso');
 const behaviorName=model.focus?.name||row.action.name||'esta intervención';
 const name=String(row.action.name||'la intervención').slice(0,100);
 step.body='Estamos avanzando con «'+name+'». El comportamiento que buscamos facilitar es «'+
  behaviorName+'». Revisemos qué necesitamos para ponerlo en práctica con claridad y en el momento oportuno.';
 step.cta='Precisa aquí una acción observable, cuándo realizarla y cómo solicitar apoyo.';
 step.basis={reason:p.reason,description:p.evidence,indicator:p.indicator||'',
  current:p.metricCurrent,target:p.metricTarget,stage:p.stage,
  recordedAt:new Date().toISOString(),source:'indicadores_y_adopcion'};
 // Sin seleccionar destinatarios automáticamente. El facilitador revisa a quién contactar.
 step.audienceIds=[];step.contactIds=[];step.manualEmail='';step.manualName='';
 row.action.activationSequence=[...cacSteps(row.action),step];
 cacStepId=step.id;cacEditorOpen=true;
 cacMessage='Creé un borrador a partir de una señal registrada. Revisa los datos, adapta el mensaje y elige destinatarios antes de enviarlo.';
 save();render();
 document.getElementById?.('cac-editor')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
