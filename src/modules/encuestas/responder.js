/* Configuración pública; nunca contiene claves secretas ni respuestas correctas. */
const EE_PUBLIC_URL='https://mflakxgdkpuhemgslgsa.supabase.co';
const EE_PUBLIC_KEY='sb_publishable_LK085bNiIRbeQ0uuMOozWw_jYrAiXuk';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let formDefinition,submitting=false;const token=new URLSearchParams(location.search).get('t'),root=document.getElementById('form-root');
async function rpc(name,body){const res=await fetch(EE_PUBLIC_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:EE_PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.message||'No se pudo conectar.');return data;}
function responseControl(q){
 const attrs='name="'+esc(q.id)+'" '+(q.required?'required':'');
 if(q.type==='text')return '<textarea '+attrs+' maxlength="5000"></textarea>';
 if(['choice','knowledge'].includes(q.type))
  return '<div class="ee-choice-options" role="radiogroup" aria-label="'+esc(q.label)+'">'+
   EE.shuffleChoices(q).map(o=>'<label class="ee-choice-option"><input type="radio" name="'+esc(q.id)+'" value="'+esc(o)+'" '+(q.required?'required':'')+'><span>'+esc(o)+'</span></label>').join('')+
   '</div>';
 return EE.scaleMarkup(q,esc);
}

function localPublicTime(value){
 if(!value)return '';
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return '';
 return d.toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'});
}
function publicApplicationFields(s){
 const params=new URLSearchParams(location.search);
 const selectedAudience=params.get('a')||'';
 const selectedWave=params.get('w')||s.wave||'Antes';
 const audiences=Array.isArray(s.audiences)?s.audiences.filter(a=>a?.id):[];
 const allowed=Array.isArray(s.audienceIds)&&s.audienceIds.length?s.audienceIds.map(String):audiences.map(a=>String(a.id));
 const audience=selectedAudience||s.audienceId||(allowed.length===1?allowed[0]:'');
 if(allowed.length&&(!audience||!allowed.includes(audience)))throw Error('Necesitas el enlace de tu audiencia. Solicita el enlace correspondiente al equipo que te convocó.');
 const allowedWaves=(s.waveMode==='Todas')?['Antes','Durante','Después']:[s.waveMode||s.wave||'Antes'];
 if(!allowedWaves.includes(selectedWave))throw Error('Este enlace no corresponde a una ola de aplicación habilitada.');
 return '<input type="hidden" name="_audienceId" value="'+esc(audience)+'">'+
        '<input type="hidden" name="_wave" value="'+esc(selectedWave)+'">';
}
async function load(){
 try{
  if(!/^[0-9a-f-]{36}$/i.test(token||''))throw Error('Enlace de encuesta inválido.');
  formDefinition=await rpc('ee_get_form',{p_token:token});
  if(!formDefinition)throw Error('Esta encuesta no está disponible en este momento. Comprueba su fecha de aplicación o solicita un enlace vigente.');
  const s=formDefinition;
  let windowText=s.applicationStart&&s.applicationEnd?
    '<p class="muted">Disponible del '+esc(localPublicTime(s.applicationStart))+' al '+esc(localPublicTime(s.applicationEnd))+' (hora de Colombia).</p>':'';
  root.innerHTML='<h1>'+esc(s.title)+'</h1><p>'+esc(s.description)+'</p>'+windowText+
    '<p class="muted">Versión '+esc(s.version)+'</p>'+
    '<p>Las respuestas se utilizarán para mejorar el acompañamiento al cambio. '+(s.anonymous===false?'Esta aplicación solicita un dato de identificación.':'Esta aplicación es anónima.')+'</p>'+
    '<form id="response-form">'+(s.anonymous===false?'<label>'+esc(s.identityLabel||'Nombre o identificación')+'<input name="respondent" maxlength="100" autocomplete="off" required></label>':'')+
    publicApplicationFields(s)+
    s.questions.map(q=>'<div class="ee-response-question"><p class="ee-response-question-label">'+esc(q.label)+(q.required?' <span aria-hidden="true">*</span>':'')+'</p>'+responseControl(q)+'</div>').join('')+
    '<label><input type="checkbox" required> Acepto enviar mis respuestas para el análisis de esta iniciativa.</label>'+
    '<button class="primary" id="submit-response">Enviar respuesta</button>'+
    '<p id="response-message" role="status"></p></form>';
  document.getElementById('response-form').addEventListener('submit',submit);
 }catch(e){root.textContent=e.message;}
}
async function submit(e){
 e.preventDefault();if(submitting)return;
 const data=Object.fromEntries(new FormData(e.target));
 const v=EE.validateResponse(formDefinition,data),msg=document.getElementById('response-message');
 if(v.errors.length){msg.textContent=v.errors.join('; ');return;}
 submitting=true;document.getElementById('submit-response').disabled=true;
 const key='ee-pending:'+token;let id;
 try{id=sessionStorage.getItem(key)||EE.uid();sessionStorage.setItem(key,id);}catch{id=EE.uid();}
 try{
  await rpc('ee_submit',{p_token:token,p_response_id:id,
    p_answers:{...v.answers,_audienceId:data._audienceId||'',_wave:data._wave||formDefinition.wave||'Antes'},
    p_respondent:formDefinition.anonymous===false?(data.respondent||''):''});
  try{sessionStorage.removeItem(key);}catch{}
  root.innerHTML='<h1>Gracias por compartir tu experiencia.</h1><p>Tu respuesta quedó registrada. Ya puedes cerrar esta página.</p>';
 }catch(err){msg.textContent=err.message+' Puedes volver a intentar.';submitting=false;document.getElementById('submit-response').disabled=false;}
}

load();
