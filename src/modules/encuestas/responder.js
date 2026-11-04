/* Configuración pública; nunca contiene claves secretas ni respuestas correctas. */
const EE_PUBLIC_URL='https://mflakxgdkpuhemgslgsa.supabase.co';
const EE_PUBLIC_KEY='sb_publishable_LK085bNiIRbeQ0uuMOozWw_jYrAiXuk';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let formDefinition,submitting=false;const token=new URLSearchParams(location.search).get('t'),root=document.getElementById('form-root');
async function rpc(name,body){const res=await fetch(EE_PUBLIC_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:EE_PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.message||'No se pudo conectar.');return data;}
function responseControl(q){let attr=`name="${esc(q.id)}" ${q.required?'required':''}`;if(q.type==='text')return `<textarea ${attr} maxlength="5000"></textarea>`;if(['choice','knowledge'].includes(q.type))return `<select ${attr}><option value="">Seleccionar</option>${EE.shuffleChoices(q).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`;return `<input ${attr} type="number" min="${q.min}" max="${q.max}" step="${q.type==='scale'?'any':'1'}" placeholder="${q.min} a ${q.max}">`;}

function localPublicTime(value){
 if(!value)return '';
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return '';
 return d.toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'});
}
function publicApplicationFields(s){
 const audiences=Array.isArray(s.audiences)?s.audiences.filter(a=>a?.id&&a?.name):[];
 const audienceField=audiences.length?
 '<label>Audiencia<select name="_audienceId" required><option value="">Selecciona tu audiencia</option>'+
 audiences.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select></label>':'';
 const mode=s.waveMode||s.wave||'Antes';
 const waveField=mode==='Todas'?
 '<label>Momento de la medición<select name="_wave" required><option value="">Selecciona un momento</option>'+
 ['Antes','Durante','Después'].map(w=>'<option value="'+w+'">'+w+'</option>').join('')+'</select></label>':
 '<input type="hidden" name="_wave" value="'+esc(mode)+'">';
 return '<div class="ee-public-meta">'+audienceField+waveField+'</div>';
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
    '<details><summary>Sobre esta medición</summary><p class="notice">'+esc(s.instrumentNote||'Instrumento de trabajo editable.')+'</p></details>'+
    '<p>Las respuestas se utilizarán para mejorar el acompañamiento al cambio. Evita incluir nombres o datos sensibles en tus relatos.</p>'+
    '<form id="response-form"><label>Código o alias (opcional)<input name="respondent" maxlength="100"></label>'+
    publicApplicationFields(s)+
    s.questions.map(q=>'<label>'+esc(q.label)+(q.required?' *':'')+responseControl(q)+'</label>').join('')+
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
    p_respondent:data.respondent||''});
  try{sessionStorage.removeItem(key);}catch{}
  root.innerHTML='<h1>Gracias por compartir tu experiencia.</h1><p>Tu respuesta quedó registrada. Ya puedes cerrar esta página.</p>';
 }catch(err){msg.textContent=err.message+' Puedes volver a intentar.';submitting=false;document.getElementById('submit-response').disabled=false;}
}

load();
