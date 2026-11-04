/* HACERLO — Configuración unificada de aplicación para TODOS los instrumentos. */
const EE_APPLICATION_WAVES=['Antes','Durante','Después','Todas'];
function eeApplicationMode(s){
 return EE_APPLICATION_WAVES.includes(s?.waveMode)?s.waveMode:
   EE_APPLICATION_WAVES.includes(s?.wave)?s.wave:
   (s?.wave==='Base'?'Base':(s?.wave||'Antes'));
}
function eeAssignedAudiences(x,s){
 const all=x?.audiences||[];
 if(Array.isArray(s?.audienceIds))return s.audienceIds.map(String).filter(id=>all.some(a=>String(a.id)===id));
 const legacy=s?.audienceId?String(s.audienceId):'';
 return legacy&&all.some(a=>String(a.id)===legacy)?[legacy]:[];
}
function eeTargetAudiences(x,s){
 const ids=eeAssignedAudiences(x,s);
 return (x?.audiences||[]).filter(a=>!ids.length||ids.includes(String(a.id)));
}
function eeLocalApplicationTime(iso){
 if(!iso)return '';
 const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
 const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return o.year+'-'+o.month+'-'+o.day+'T'+o.hour+':'+o.minute;
}
function eeParseApplicationTime(text){
 const v=String(text||'').trim();
 if(!v)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))throw Error('Indica una fecha y hora válidas.');
 const result=new Date(v+':00-05:00');
 if(!Number.isFinite(result.getTime())||eeLocalApplicationTime(result.toISOString())!==v)throw Error('La fecha u hora no es válida.');
 return result.toISOString();
}
function eeApplicationCheck(s,at=Date.now()){
 const start=s?.applicationStart?Date.parse(s.applicationStart):null;
 const end=s?.applicationEnd?Date.parse(s.applicationEnd):null;
 if(start!==null&&Number.isFinite(start)&&at<start)return {ok:false,message:'La aplicación comienza el '+new Date(start).toLocaleString('es-CO',{timeZone:'America/Bogota'})+'.'};
 if(end!==null&&Number.isFinite(end)&&at>end)return {ok:false,message:'El período de aplicación terminó el '+new Date(end).toLocaleString('es-CO',{timeZone:'America/Bogota'})+'.'};
 return {ok:true,message:''};
}
function eeResponseWaves(s){
 return eeApplicationMode(s)==='Todas'?EE_APPLICATION_WAVES.slice(0,3):[s.wave||eeApplicationMode(s)||'Antes'];
}
function eeApplicationAudienceOptions(x,s){
 const audiences=eeTargetAudiences(x,s);
 if(!audiences.length)return '<option value="">Sin segmentar</option>';
 return '<option value="">Selecciona una audiencia</option>'+
   audiences.map(a=>'<option value="'+safe(a.id)+'">'+safe(a.name)+'</option>').join('');
}
function eeApplicationWaveOptions(s){
 const waves=eeResponseWaves(s);
 return waves.map(w=>'<option value="'+safe(w)+'">'+safe(w)+'</option>').join('');
}
function eeAppConfigPanel(x,s){
 const ids=eeAssignedAudiences(x,s),all=x.audiences||[],mode=eeApplicationMode(s);
 const options=EE_APPLICATION_WAVES.includes(mode)?EE_APPLICATION_WAVES:[mode,...EE_APPLICATION_WAVES];
 return '<section class="panel ee-app-config">'+
 '<div class="ee-app-top"><div><h3>Aplicación del instrumento</h3><p class="muted">Define a quién, cuándo y en qué ola se aplica.</p></div>'+
 '<span class="ee-app-state">'+(s.applicationStart&&s.applicationEnd?'Programada':'Sin fecha definida')+'</span></div>'+
 '<form onsubmit="eeSaveApplication(event)" class="ee-app-form">'+
 '<div class="ee-app-grid"><label>Inicio de aplicación (Colombia)<input type="datetime-local" name="applicationStart" value="'+safe(eeLocalApplicationTime(s.applicationStart))+'"></label>'+
 '<label>Fin de aplicación (Colombia)<input type="datetime-local" name="applicationEnd" value="'+safe(eeLocalApplicationTime(s.applicationEnd))+'"></label>'+
 '<label>Ola<select name="waveMode">'+options.map(w=>'<option value="'+safe(w)+'"'+(w===mode?' selected':'')+'>'+safe(w)+'</option>').join('')+'</select></label></div>'+
 '<fieldset class="ee-app-audiences"><legend>Audiencias de la aplicación</legend>'+
 (all.length?'<div class="ee-app-audlist">'+all.map(a=>'<label class="ee-app-auditem"><input type="checkbox" name="audienceIds" value="'+safe(a.id)+'"'+(ids.includes(String(a.id))?' checked':'')+'><span>'+safe(a.name)+'</span></label>').join('')+'</div><p class="muted">Marca una o varias. Sin marcas: disponible para todas las audiencias.</p>':'<p class="muted">No tienes audiencias creadas. El instrumento se registra sin segmentación.</p>')+
 '</fieldset><div class="ee-app-footer"><span class="muted">Horario de Colombia (UTC−5). El intervalo limita la recepción pública e interna; las respuestas históricas permanecen.</span>'+
 '<button class="primary" type="submit">Guardar aplicación</button></div></form></section>';
}
async function eeSaveApplication(event){
 event.preventDefault();
 const x=current(),s=eeSurvey();if(!x||!s)return;
 const form=event.target,fd=new FormData(form),mode=String(fd.get('waveMode')||'Antes');
 try{
  if(![...EE_APPLICATION_WAVES,'Base',s.wave].includes(mode))throw Error('Selecciona una ola permitida.');
  const start=eeParseApplicationTime(fd.get('applicationStart'));
  const end=eeParseApplicationTime(fd.get('applicationEnd'));
  if(Boolean(start)!==Boolean(end))throw Error('Selecciona ambas fechas: inicio y fin.');
  if(start&&end&&Date.parse(end)<=Date.parse(start))throw Error('El fin debe ser posterior al inicio.');
  const validIds=new Set((x.audiences||[]).map(a=>String(a.id)));
  const audienceIds=[...new Set(fd.getAll('audienceIds').map(String))];
  if(audienceIds.some(id=>!validIds.has(id)))throw Error('Hay una audiencia que ya no existe.');
  const updated={...s,audienceIds,audienceId:audienceIds.length===1?audienceIds[0]:'',
    waveMode:mode,wave:mode==='Todas'?(EE_APPLICATION_WAVES.includes(s.wave)?s.wave:'Antes'):mode,
    applicationStart:start,applicationEnd:end,
    updatedAt:EE.now()};
  if(s.publication?.id){
   const snapshot=eePublicSnapshot(updated);
   const {error}=await sb.from('ee_publications').update({snapshot}).eq('id',s.publication.id);
   if(error)throw Error('No fue posible sincronizar el enlace público: '+error.message);
  }
  Object.assign(s,updated);save();render();eeMsg('Aplicación guardada: fechas, olas y audiencias actualizadas.');
 }catch(error){eeMsg(error.message,true);}
}
