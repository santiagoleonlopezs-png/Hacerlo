/* HACERLO | Estudio de movilización y refuerzo.
   Las acciones nacen en Intervenciones. Aquí se diseñan piezas de ejecución y se
   registran entregas declaradas; no se envían mensajes ni reconocimientos automáticamente. */
const MOB_PATTERNS={
 comunicacion:[
  {id:'sentido',title:'Dar sentido',description:'Conectar el cambio con el resultado y el para qué.',purpose:'Dar sentido',timing:'Antes',channel:'Correo'},
  {id:'activar',title:'Activar',description:'Pedir una acción concreta, posible y situada.',purpose:'Activar',timing:'Durante',channel:'Teams'},
  {id:'recordar',title:'Recordar en el momento',description:'Hacer visible una práctica cuando se necesita.',purpose:'Recordar',timing:'Durante',channel:'Teams'},
  {id:'sostener',title:'Sostener la práctica',description:'Mostrar avances y mantener una rutina observable.',purpose:'Sostener',timing:'Después',channel:'Reunión'}
 ],
 reconocimiento:[
  {id:'evidencia',title:'Reconocer una práctica',description:'Destacar un comportamiento concreto y su contribución.',purpose:'Práctica observable',timing:'Durante',channel:'Conversación'},
  {id:'pares',title:'Entre pares',description:'Facilitar gratitud basada en acciones y ayuda mutua.',purpose:'Entre pares',timing:'Durante',channel:'Teams'},
  {id:'equipo',title:'Logro colectivo',description:'Visibilizar lo conseguido por el equipo, sin rankings.',purpose:'Logro colectivo',timing:'Después',channel:'Reunión'},
  {id:'constancia',title:'Refuerzo continuo',description:'Destacar la repetición y el sostenimiento de una práctica.',purpose:'Constancia',timing:'Después',channel:'Conversación'}
 ]
};
let mobActiveTab='comunicacion';
let mobSelectedAction={comunicacion:null,reconocimiento:null};
let mobEditId=null;
let mobComposerOpen=false;
let mobNotice='';
function mobKinds(){return ['comunicacion','reconocimiento']}
function mobItems(action,kind){
 const stored=action?.mechanismRecords?.[kind];
 if(Array.isArray(stored))return stored;
 const legacy=action?.mechanismDetails?.[kind];
 if(!legacy||!Object.values(legacy).some(v=>typeof v==='string'&&v.trim()))return [];
 return [{id:'legacy-'+kind,title:kind==='comunicacion'?'Comunicación inicial':'Reconocimiento inicial',
  body:String(legacy.message||legacy.practice||''),channel:String(legacy.channel||''),
  audienceText:String(legacy.audience||''),evidence:String(legacy.evidence||''),
  format:String(legacy.format||''),status:'borrador',moment:'Durante',
  purpose:kind==='comunicacion'?'Activar':'Práctica observable',
  createdAt:legacy.updatedAt||''}];
}
function mobLinked(x,kind){
 return (x?.actions||[]).map((action,index)=>({action,index}))
  .filter(row=>typeof actionMechanisms==='function'&&actionMechanisms(row.action).includes(kind));
}
function mobSelectTab(kind){
 if(!mobKinds().includes(kind))return;
 mobActiveTab=kind;mobEditId=null;mobComposerOpen=false;mobNotice='';render();
}
function mobSelectAction(value){
 const index=Number(value);
 if(!Number.isSafeInteger(index))return;
 mobSelectedAction[mobActiveTab]=index;mobEditId=null;mobComposerOpen=false;mobNotice='';render();
}
function mobPickRow(x,kind){
 const linked=mobLinked(x,kind);
 return linked.find(r=>r.index===mobSelectedAction[kind])||linked[0]||null;
}
function mobCounts(x){
 const actions=(x?.actions||[]).filter(a=>typeof actionMechanisms==='function'&&
  (actionMechanisms(a).includes('comunicacion')||actionMechanisms(a).includes('reconocimiento')));
 const records=actions.flatMap(a=>mobKinds().flatMap(k=>mobItems(a,k)));
 return {actions:actions.length,pieces:records.length,ready:records.filter(r=>r.status==='lista').length,
  completed:records.filter(r=>r.status==='realizada').length};
}
function mobSafe(v){return typeof safe==='function'?safe(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}
function mobFormOptions(rows,selected){
 return '<option value="">Sin vincular</option>'+(rows||[]).map(r=>'<option value="'+mobSafe(r.id)+'"'+
  (String(r.id)===String(selected)?' selected':'')+'>'+mobSafe(r.name||r.description||'Sin nombre')+'</option>').join('');
}
function mobDisplayState(v){return v==='realizada'?'Ejecución registrada':v==='lista'?'Lista para ejecutar':'Borrador';}
function mobActionInfo(row,x){
 const a=row.action;
 return '<div class="mob-action-context"><div><span class="mob-eyebrow">ACCIÓN DE ORIGEN</span>'+
  '<h3>'+mobSafe(a.name||'Acción')+'</h3><p>'+mobSafe(a.hypothesis||'Sin hipótesis registrada')+'</p>'+
  '</div><div class="mob-action-tags"><span>'+mobSafe(a.status||'Pendiente')+'</span>'+
  '<span>'+mobSafe(a.owner||'Sin responsable')+'</span></div></div>';
}
function mobPatternCards(kind,linked){
 const cards=MOB_PATTERNS[kind];
 return '<section class="mob-patterns"><div class="mob-section-heading"><div><span class="mob-eyebrow">ARQUITECTURA CONDUCTUAL</span>'+
  '<h3>'+ (kind==='comunicacion'?'¿Qué quieres provocar con el mensaje?':'¿Qué quieres reforzar?')+'</h3>'+
  '</div><small>Modelos sugeridos, no envíos automáticos</small></div><div class="mob-pattern-grid">'+
  cards.map(p=>'<article class="mob-pattern"><span class="mob-pattern-spark">✦</span><h4>'+mobSafe(p.title)+'</h4>'+
   '<p>'+mobSafe(p.description)+'</p>'+
   (linked?'<button type="button" class="mob-text-button" onclick="mobStartPattern(\''+kind+'\',\''+p.id+'\')">Usar enfoque ↗</button>':
    '<span class="mob-pattern-hint">Disponible al vincular una acción</span>')+'</article>').join('')+'</div></section>';
}
function mobDraftFromPattern(kind,id,x,action,form){
 const pattern=MOB_PATTERNS[kind].find(x=>x.id===id)||MOB_PATTERNS[kind][0];
 const audienceId=form?.elements.namedItem('audienceId')?.value||'';
 const behaviorId=form?.elements.namedItem('behaviorId')?.value||'';
 const audience=(x?.audiences||[]).find(a=>String(a.id)===String(audienceId))?.name||'el equipo';
 const behavior=(x?.behaviors||[]).find(b=>String(b.id)===String(behaviorId))?.name||action?.name||'esta práctica';
 const goal=String(action?.hypothesis||'').trim();
 const actionWord=behavior.replace(/[.!?]+$/,'');
 let title='',body='',cta='';
 if(kind==='comunicacion'){
  if(id==='sentido'){
   title='El propósito detrás de '+actionWord;
   body='Queremos lograr un cambio concreto en '+audience+': '+actionWord+'. No se trata de hacer más por hacer; se trata de facilitar un resultado que importa para nuestro trabajo.'+(goal?' Partimos de esta hipótesis: '+goal:'');
   cta='Conversemos qué condición necesitamos para empezar.';
  }else if(id==='recordar'){
   title='Una práctica para tener presente';
   body='Cuando llegue el momento de decidir o actuar, recuerda esta práctica: '+actionWord+'. Hazla visible en tu próxima oportunidad real de trabajo.';
   cta='Ponla en práctica una vez y comparte qué facilitó o dificultó hacerlo.';
  }else if(id==='sostener'){
   title='Lo que seguimos construyendo';
   body='Los cambios se sostienen cuando repetimos comportamientos concretos. Sigamos practicando: '+actionWord+'. Revisemos juntos lo que está funcionando y lo que todavía estorba.';
   cta='Comparte un ejemplo concreto y una mejora para la próxima semana.';
  }else{
   title='Una acción que podemos probar';
   body='En '+audience+' queremos pasar de la intención a la acción. Empecemos con un paso observable: '+actionWord+'. No necesitas hacerlo perfecto; necesitamos aprender de la experiencia.';
   cta='Prueba esta práctica y comparte qué ocurrió.';
  }
 }else{
  if(id==='pares'){
   title='Gracias por hacerlo posible';
   body='Queremos reconocer una acción que fortaleció el trabajo con otras personas: '+actionWord+'. Su valor está en la ayuda concreta y en lo que permitió hacer mejor al equipo.';
  }else if(id==='equipo'){
   title='Una práctica que construimos juntos';
   body='Reconocemos al equipo por sostener una práctica que contribuye al resultado: '+actionWord+'. Lo importante no es competir, sino hacer visible cómo colaboramos.';
  }else if(id==='constancia'){
   title='La constancia también transforma';
   body='Reconocemos la continuidad de una práctica observable: '+actionWord+'. Sostenerla en el tiempo ayuda a convertir una intención en una forma habitual de trabajar.';
  }else{
   title='Reconocer lo que queremos fortalecer';
   body='Queremos hacer visible una práctica concreta: '+actionWord+'. Reconocerla sirve para mostrar qué comportamientos contribuyen a nuestros resultados y por qué vale la pena repetirlos.';
  }
  cta='Identifica el hecho observado y su contribución antes de compartir este reconocimiento.';
 }
 return {purpose:pattern.purpose,moment:pattern.timing,channel:pattern.channel,title,body,cta};
}
function mobStartPattern(kind,id){
 if(!mobKinds().includes(kind))return;
 mobActiveTab=kind;mobComposerOpen=true;mobEditId=null;mobNotice='';render();
 const form=document.getElementById('mob-studio-form');
 if(!form)return;
 form.elements.namedItem('pattern').value=id;
 mobGenerateFromForm();
 document.getElementById('mob-studio')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function mobOpen(kind,index,id){
 const row=mobLinked(current(),kind).find(r=>r.index===index);
 if(!row)return;
 if(id&&mobItems(row.action,kind).find(r=>r.id===id)?.status==='realizada')return;
 mobActiveTab=kind;mobSelectedAction[kind]=index;mobEditId=id||null;mobComposerOpen=true;mobNotice='';render();
 document.getElementById('mob-studio')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function mobClose(){
 mobEditId=null;mobComposerOpen=false;mobNotice='';render();
}
function mobSelectPattern(id){
 const form=document.getElementById('mob-studio-form');
 if(!form)return;
 form.elements.namedItem('pattern').value=id;
 mobGenerateFromForm();
}
function mobGenerateFromForm(){
 const form=document.getElementById('mob-studio-form'),x=current(),row=mobPickRow(x,mobActiveTab);
 if(!form||!row)return;
 const id=form.elements.namedItem('pattern').value||MOB_PATTERNS[mobActiveTab][0].id;
 const text=mobDraftFromPattern(mobActiveTab,id,x,row.action,form);
 for(const k of ['purpose','moment','channel','title','body','cta']){
  const el=form.elements.namedItem(k);
  if(el)el.value=text[k]||'';
 }
 mobPreview();
}
function mobPreview(){
 const form=document.getElementById('mob-studio-form'),preview=document.getElementById('mob-live-preview');
 if(!form||!preview)return;
 const get=k=>String(form.elements.namedItem(k)?.value||'');
 const title=get('title')||'Título de la pieza',body=get('body')||'Escribe tu mensaje para visualizarlo aquí.';
 const cta=get('cta'),target=get('recipient');
 preview.innerHTML='<div class="mob-preview-inner"><span class="mob-eyebrow">'+(mobActiveTab==='comunicacion'?'MENSAJE · VISTA PREVIA':'RECONOCIMIENTO · VISTA PREVIA')+'</span>'+
  '<h4>'+mobSafe(title)+'</h4>'+(target?'<small>Dirigido a: '+mobSafe(target)+'</small>':'')+
  '<p>'+mobSafe(body).replace(/\n/g,'<br>')+'</p>'+(cta?'<div class="mob-preview-cta">'+mobSafe(cta)+'</div>':'')+
  '</div>';
}
function mobStudioForm(x,row,kind){
 const record=mobEditId?mobItems(row.action,kind).find(r=>r.id===mobEditId):null;
 const patterns=MOB_PATTERNS[kind],base=record||{};
 const field=(name,label,html)=>'<label class="mob-field"><span>'+label+'</span>'+html+'</label>';
 const select=(name,options,value)=>'<select name="'+name+'" onchange="mobPreview()">'+options.map(z=>
  '<option value="'+mobSafe(z.value)+'"'+(String(z.value)===String(value)?' selected':'')+'>'+mobSafe(z.label)+'</option>').join('')+'</select>';
 const currentPattern=base.pattern||patterns[0].id;
 const audienceOpts=mobFormOptions(x.audiences,base.audienceId);
 const behaviorOpts=mobFormOptions(x.behaviors,base.behaviorId);
 return '<section id="mob-studio" class="mob-studio"><div class="mob-section-heading"><div><span class="mob-eyebrow">TALLER DE EJECUCIÓN</span><h3>'+
  (record?'Editar pieza':'Preparar '+(kind==='comunicacion'?'comunicación':'reconocimiento'))+
  '</h3></div><button type="button" class="secondary" onclick="mobClose()">Cerrar</button></div>'+
  '<div class="mob-studio-grid"><form id="mob-studio-form" onsubmit="mobSavePiece(event,'+row.index+',\''+kind+'\')" oninput="mobPreview()">'+
  '<div class="mob-form-row">'+field('pattern','Enfoque conductual',select('pattern',patterns.map(p=>({value:p.id,label:p.title})),currentPattern))+
  '<button type="button" class="mob-generate" onclick="mobGenerateFromForm()">✦ Proponer borrador</button></div>'+
  '<div class="mob-form-row">'+field('audienceId','Audiencia vinculada','<select name="audienceId" onchange="mobPreview()">'+audienceOpts+'</select>')+
  field('behaviorId','Comportamiento objetivo','<select name="behaviorId" onchange="mobPreview()">'+behaviorOpts+'</select>')+'</div>'+
  '<div class="mob-form-row">'+field('moment','Momento',select('moment',['Antes','Durante','Después'].map(a=>({value:a,label:a})),base.moment||'Durante'))+
  field('channel',kind==='comunicacion'?'Canal':'Espacio de reconocimiento',
   select('channel',(kind==='comunicacion'?['Correo','Teams','WhatsApp','Intranet','Reunión','Otro']:['Conversación','Teams','Correo','Reunión','Otro']).map(a=>({value:a,label:a})),base.channel||''))+'</div>'+
  (kind==='reconocimiento'?'<div class="mob-form-row">'+
   field('recipient','Persona o equipo (opcional)','<input type="text" name="recipient" maxlength="120" value="'+mobSafe(base.recipient||'')+'" placeholder="Ej. Equipo de servicio">')+
   field('evidence','Hecho que justifica reconocer','<input type="text" name="evidence" maxlength="350" value="'+mobSafe(base.evidence||'')+'" placeholder="Ej. Compartió aprendizajes con otras áreas">')+'</div>':'')+
  field('title',kind==='comunicacion'?'Asunto o encabezado':'Título del reconocimiento','<input type="text" name="title" required maxlength="140" value="'+mobSafe(base.title||'')+'" placeholder="Un título breve y claro">')+
  field('body','Mensaje','<textarea name="body" required maxlength="2400" rows="6" placeholder="¿Qué quieres que la persona entienda, haga o repita?">'+mobSafe(base.body||'')+'</textarea>')+
  field('cta',kind==='comunicacion'?'Acción concreta esperada':'Refuerzo o cierre','<textarea name="cta" maxlength="450" rows="2">'+mobSafe(base.cta||'')+'</textarea>')+
  '<div class="mob-form-actions"><button class="primary" type="submit">Guardar pieza</button>'+
  '<button class="secondary" type="button" onclick="mobCopyForm()">Copiar texto</button></div>'+
  '<small class="mob-help">Los textos sugeridos son plantillas editables, no mensajes generados por IA. Guardar no envía ni publica nada.</small>'+
  '</form><div class="mob-preview-wrap"><h4>Así se vería</h4><div id="mob-live-preview" class="mob-live-preview">'+
  '<div class="mob-preview-inner"><span class="mob-eyebrow">VISTA PREVIA</span><h4>'+mobSafe(base.title||'Título de la pieza')+'</h4>'+
  (base.recipient?'<small>Dirigido a: '+mobSafe(base.recipient)+'</small>':'')+
  '<p>'+mobSafe(base.body||'Aquí visualizarás la pieza antes de compartirla.').replace(/\n/g,'<br>')+'</p>'+
  (base.cta?'<div class="mob-preview-cta">'+mobSafe(base.cta)+'</div>':'')+'</div></div>'+
  '<div class="mob-preview-tip"><strong>Chequeo conductual</strong><p>¿Describe una acción observable? ¿Reduce la fricción para realizarla? ¿Evita premios o comparaciones que puedan generar efectos no deseados?</p></div></div></div></section>';
}
function mobRecordById(action,kind,id){return mobItems(action,kind).find(r=>r.id===id)}
function mobSavePiece(e,index,kind){
 e.preventDefault();
 const row=mobLinked(current(),kind).find(r=>r.index===index),form=e.target;
 if(!row||!form)return;
 const f=Object.fromEntries(new FormData(form));
 const trim=(name,max)=>String(f[name]||'').trim().slice(0,max);
 const title=trim('title',140),body=trim('body',2400);
 if(!title||!body){mobNotice='Completa el título y el mensaje antes de guardar.';render();return;}
 const patterns=MOB_PATTERNS[kind];
 const chosen=patterns.find(p=>p.id===f.pattern)||patterns[0];
 const audienceId=(current().audiences||[]).some(z=>String(z.id)===String(f.audienceId))?String(f.audienceId):'';
 const behaviorId=(current().behaviors||[]).some(z=>String(z.id)===String(f.behaviorId))?String(f.behaviorId):'';
 const existing=mobEditId?mobRecordById(row.action,kind,mobEditId):null;
 if(existing?.status==='realizada')return;
 const now=new Date().toISOString();
 const piece={
  id:existing?.id||'pieza-'+now.replace(/\W/g,'')+'-'+Math.random().toString(36).slice(2,9),
  title,body,cta:trim('cta',450),purpose:chosen.purpose,pattern:chosen.id,
  moment:['Antes','Durante','Después'].includes(f.moment)?f.moment:'Durante',
  channel:trim('channel',120),audienceId,behaviorId,
  recipient:kind==='reconocimiento'?trim('recipient',120):'',
  evidence:kind==='reconocimiento'?trim('evidence',350):'',
  status:existing?.status==='lista'?'lista':'borrador',
  createdAt:existing?.createdAt||now,updatedAt:now
 };
 const store=row.action.mechanismRecords||{};
 const previous=mobItems(row.action,kind);
 const next=existing?previous.map(z=>z.id===existing.id?piece:z):[...previous,piece];
 row.action.mechanismRecords={...store,[kind]:next};
 mobEditId=null;mobComposerOpen=false;mobNotice='Pieza guardada dentro de la acción; todavía no se ha distribuido.';
 save();render();
}
async function mobCopyText(value){
 try{
  await navigator.clipboard.writeText(value);
  mobNotice='Texto copiado. Compártelo en el canal que hayas elegido.';
 }catch(error){
  mobNotice='No se pudo copiar automáticamente. Selecciona el texto en la vista previa.';
 }
 const node=document.getElementById('mob-studio-notice');
 if(node)node.textContent=mobNotice;
}
function mobText(record,kind){
 const parts=[record.title||'',record.recipient?'Para '+record.recipient:'',record.body||'',record.cta||''];
 return parts.filter(Boolean).join('\n\n');
}
function mobCopyForm(){
 const f=document.getElementById('mob-studio-form');
 if(!f)return;
 const get=n=>String(f.elements.namedItem(n)?.value||'');
 void mobCopyText([get('title'),get('recipient')?'Para '+get('recipient'):'',get('body'),get('cta')].filter(Boolean).join('\n\n'));
}
function mobCopyPiece(index,kind,id){
 const row=mobLinked(current(),kind).find(r=>r.index===index);
 const piece=mobRecordById(row?.action,kind,id);
 if(piece)void mobCopyText(mobText(piece,kind));
}
function mobUpdateStatus(index,kind,id,status){
 const row=mobLinked(current(),kind).find(r=>r.index===index);
 if(!row||!['lista','realizada'].includes(status))return;
 const pieces=mobItems(row.action,kind).map(p=>({...p}));
 const pos=pieces.findIndex(p=>p.id===id);
 if(pos<0||pieces[pos].status==='realizada')return;
 if(status==='realizada'){
  if(!confirm('¿Confirmas que '+(kind==='comunicacion'?'compartiste esta comunicación':'entregaste este reconocimiento')+' fuera de HACERLO? Esta acción registra una ejecución declarada; no verifica automáticamente el envío.'))return;
  if(kind==='reconocimiento'&&!pieces[pos].evidence?.trim()){
   alert('Registra primero el hecho observable que fundamenta el reconocimiento.');return;
  }
 }
 const now=new Date().toISOString();
 pieces[pos]={...pieces[pos],status,updatedAt:now,
  ...(status==='realizada'?{executedAt:now}: {})};
 row.action.mechanismRecords={...(row.action.mechanismRecords||{}),[kind]:pieces};
 mobNotice=status==='realizada'?'Ejecución declarada registrada. No equivale a una medición de adopción.':'Pieza marcada como lista.';
 save();render();
}
function mobDeletePiece(index,kind,id){
 const row=mobLinked(current(),kind).find(r=>r.index===index);
 if(!row)return;
 const pieces=mobItems(row.action,kind);
 const item=pieces.find(p=>p.id===id);
 if(!item||item.status==='realizada')return;
 if(!confirm('¿Eliminar este borrador? No se eliminará la acción de Intervenciones.'))return;
 row.action.mechanismRecords={...(row.action.mechanismRecords||{}),[kind]:pieces.filter(p=>p.id!==id)};
 mobNotice='Borrador eliminado. La acción permanece sin cambios.';
 save();render();
}
function mobPieceList(row,kind){
 const pieces=mobItems(row.action,kind);
 if(!pieces.length)return '<div class="mob-empty-pieces"><span>✦</span><div><strong>Aún no hay piezas preparadas</strong>'+
  '<p>Utiliza un enfoque conductual para crear el primer mensaje o reconocimiento de esta acción.</p></div></div>';
 return '<div class="mob-piece-list">'+pieces.slice().reverse().map(p=>'<article class="mob-piece">'+
  '<div class="mob-piece-main"><div class="mob-piece-title"><strong>'+mobSafe(p.title||'Sin título')+'</strong>'+
  '<span class="mob-status mob-status-'+mobSafe(p.status||'borrador')+'">'+mobDisplayState(p.status)+'</span></div>'+
  '<p>'+mobSafe(p.body||'').slice(0,180)+'</p>'+
  '<small>'+mobSafe(p.moment||'')+' · '+mobSafe(p.channel||'Sin canal')+
  (p.executedAt?' · Declarada el '+mobSafe(p.executedAt.slice(0,10)):'')+'</small></div>'+
  '<div class="mob-piece-actions">'+
  '<button type="button" class="secondary" onclick="mobCopyPiece('+row.index+',\''+kind+'\',\''+mobSafe(p.id)+'\')">Copiar</button>'+
  (p.status!=='realizada'?
   '<button type="button" class="secondary" onclick="mobOpen(\''+kind+'\','+row.index+',\''+mobSafe(p.id)+'\')">Editar</button>'+
   (p.status!=='lista'?'<button type="button" class="secondary" onclick="mobUpdateStatus('+row.index+',\''+kind+'\',\''+mobSafe(p.id)+'\',\'lista\')">Marcar lista</button>':'')+
   '<button type="button" class="mob-piece-confirm" onclick="mobUpdateStatus('+row.index+',\''+kind+'\',\''+mobSafe(p.id)+'\',\'realizada\')">Registrar ejecución</button>'+
   '<button type="button" class="mob-piece-delete" onclick="mobDeletePiece('+row.index+',\''+kind+'\',\''+mobSafe(p.id)+'\')" aria-label="Eliminar borrador">×</button>':
   '<span class="mob-record-note">Registro conservado</span>')+
  '</div></article>').join('')+'</div>';
}
function mobAIContext(x){
 const rows=(x?.actions||[]).flatMap(a=>mobKinds().flatMap(kind=>mobItems(a,kind).map(p=>({kind,
   action:a.name||'',status:p.status||'borrador',purpose:p.purpose||'',
   moment:p.moment||'',channel:p.channel||'',pattern:p.pattern||'',
   behaviorId:p.behaviorId||'',audienceId:p.audienceId||'',
   evidence:kind==='reconocimiento'?String(p.evidence||'').slice(0,180):'',
   // Evitar transferir nombres, destinatarios o mensajes personales a la IA.
   summary:kind==='comunicacion'?String(p.cta||'').slice(0,180):''
 }))));
 const done=rows.filter(r=>r.status==='realizada');
 return {pieces:rows.length,executionsDeclared:done.length,
  note:'Ejecuciones declaradas por el facilitador, no entregas ni efectos verificados. Los borradores no son intervenciones realizadas.',
  byType:{comunicacion:rows.filter(r=>r.kind==='comunicacion').length,reconocimiento:rows.filter(r=>r.kind==='reconocimiento').length},
  executions:done.slice(0,12)};
}
function renderMovilizacionEstudio(x){
 const kind=mobActiveTab,linked=mobLinked(x,kind),row=mobPickRow(x,kind),summary=mobCounts(x);
 const kindName=kind==='comunicacion'?'Comunicaciones':'Reconocimiento';
 const summaryCards=[['Acciones vinculadas',summary.actions],['Piezas preparadas',summary.pieces],
  ['Listas',summary.ready],['Ejecuciones declaradas',summary.completed]];
 const empty=!linked.length?'<section class="mob-empty-start"><div class="mob-empty-icon">◎</div>'+
  '<div><span class="mob-eyebrow">COMIENZA CON UNA ACCIÓN</span><h3>El comportamiento es el punto de partida</h3>'+
  '<p>En Intervenciones, marca '+(kind==='comunicacion'?'Comunicaciones':'Reconocimiento')+
  ' al crear o editar una acción. Aquí podrás construir tantas piezas como necesites, sin duplicar la acción.</p>'+
  '<button type="button" class="primary" onclick="go(\'Intervenciones\')">Abrir Intervenciones ↗</button></div></section>':'';
 const content=row?'<section class="mob-workbench"><div class="mob-section-heading"><div><span class="mob-eyebrow">ESTUDIO DE '+(kind==='comunicacion'?'COMUNICACIONES':'RECONOCIMIENTO')+
  '</span><h3>Trabaja sobre una acción</h3></div>'+
  '<label class="mob-action-select">Elegir acción <select onchange="mobSelectAction(this.value)">'+
  linked.map(z=>'<option value="'+z.index+'"'+(row.index===z.index?' selected':'')+'>'+mobSafe(z.action.name)+'</option>').join('')+
  '</select></label></div>'+mobActionInfo(row,x)+
  '<div class="mob-section-heading mob-piece-heading"><div><h3>Piezas de ejecución</h3>'+
  '<p>Distintas piezas pueden pertenecer a la misma acción.</p></div><button type="button" class="primary" onclick="mobOpen(\''+kind+'\','+row.index+',null)">＋ Nueva pieza</button></div>'+
  mobPieceList(row,kind)+(mobComposerOpen?mobStudioForm(x,row,kind):'')+'</section>':'';
 return '<div class="mob-home">'+hcxHero('Movilización y refuerzo',x,
  'Comunica para activar comportamientos. Reconoce para reforzar prácticas observables.',
  'RDAIM · IMPLEMENTACIÓN','✧')+
  '<section class="mob-overview"><div class="mob-overview-top"><span class="mob-eyebrow">CENTRO DE ACTIVACIÓN CONDUCTUAL</span>'+
  '<p>Una misma acción puede generar varias comunicaciones y reconocimientos. Su origen y seguimiento permanecen en Intervenciones.</p></div>'+
  '<div class="mob-kpis">'+summaryCards.map(c=>'<div class="mob-kpi"><strong>'+c[1]+'</strong><span>'+c[0]+'</span></div>').join('')+'</div></section>'+
  '<div class="mob-tabs" role="tablist" aria-label="Explorar movilización y refuerzo">'+
  mobKinds().map(k=>'<button role="tab" type="button" aria-selected="'+(k===kind?'true':'false')+
   '" class="'+(kind===k?'active':'')+'" onclick="mobSelectTab(\''+k+'\')">'+
   (k==='comunicacion'?'◈ Comunicaciones':'✧ Reconocimiento')+
   '<span>'+mobLinked(x,k).length+' acciones</span></button>').join('')+'</div>'+
  '<section class="mob-intro"><div><span class="mob-eyebrow">'+(kind==='comunicacion'?'ACTIVACIÓN':'REFUERZO')+'</span>'+
  '<h2>'+kindName+'</h2><p>'+(kind==='comunicacion'?
   'Diseña mensajes que den sentido, reduzcan fricciones, activen una práctica y recuerden qué hacer.':
   'Visibiliza hechos observables, expresa su contribución y promueve prácticas que vale la pena sostener.')+
  '</p></div><span class="mob-intro-symbol">'+(kind==='comunicacion'?'◉':'✧')+'</span></section>'+
  mobPatternCards(kind,!!linked.length)+empty+content+
  '<p id="mob-studio-notice" class="mob-notice" role="status" aria-live="polite">'+mobSafe(mobNotice)+'</p>'+
  '<div class="mob-disclaimer">HACERLO prepara y registra estas piezas. No envía correos, publica reconocimientos ni verifica resultados automáticamente. Las ejecuciones se registran solo cuando el facilitador confirma que ocurrieron.</div></div>';
}
