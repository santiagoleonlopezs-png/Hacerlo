/* Puente HACERLO ↔ Laboratorio (v1). Fuente: resultados agregados, Supabase con RLS. */
const LAB_BRIDGE_SCHEMA='hacerlo.lab-result/1';
const LAB_BRIDGE_ORIENTATIONS=['Colaborar','Crear','Lograr','Organizar'];
const labBridgeCache=new Map();
function labBridgeNormalizeReport(raw){
 if(!raw||Array.isArray(raw)||typeof raw!=='object')throw Error('El archivo no contiene un reporte válido.');
 if(raw.schema!==LAB_BRIDGE_SCHEMA||raw.simulator_id!=='cultura-cvf')
  throw Error('Por ahora se admiten resultados agregados del Radar de Cultura exportados para HACERLO.');
 if(!/^[A-Za-z0-9_-]{4,80}$/.test(raw.session_id||''))throw Error('El código de sala no es válido.');
 if(!Number.isSafeInteger(raw.sample_size)||raw.sample_size<3)throw Error('El reporte debe incluir al menos tres respuestas válidas.');
 if(raw.scope!=='aggregate')throw Error('Solo se permiten perfiles colectivos, nunca respuestas individuales.');
 const capturedAt=new Date(raw.captured_at||'');
 if(!Number.isFinite(capturedAt.getTime())||capturedAt.getTime()>Date.now()+86400000)
  throw Error('La fecha del reporte no es válida.');
 const v=raw.data||{};
 if(JSON.stringify(v).length>24000)throw Error('El reporte excede el tamaño permitido.');
 if(!Array.isArray(v.orientations)||v.orientations.join('|')!==LAB_BRIDGE_ORIENTATIONS.join('|'))
  throw Error('Las orientaciones del Radar no coinciden con el formato esperado.');
 const validProfile=values=>Array.isArray(values)&&values.length===4
  &&values.every(z=>typeof z==='number'&&Number.isFinite(z)&&z>=0&&z<=100)
  &&Math.abs(values.reduce((a,b)=>a+b,0)-100)<=1;
 if(!validProfile(v.current)||!validProfile(v.preferred))throw Error('Los perfiles deben sumar aproximadamente 100 puntos.');
 if(!Array.isArray(v.dimensions)||v.dimensions.length!==6||!v.dimensions.every(d=>
  typeof d.name==='string'&&d.name.length>0&&d.name.length<=100&&validProfile(d.current)&&validProfile(d.preferred)))
  throw Error('No se encontraron las seis dimensiones agregadas de cultura.');
 // Lista explícita: nunca copiar datos personales o campos adicionales del archivo.
 return {simulator_id:'cultura-cvf',session_id:raw.session_id,sample_size:raw.sample_size,
  captured_at:capturedAt.toISOString(),measurement_type:'cvf_profile',format_version:LAB_BRIDGE_SCHEMA,
  data:{orientations:LAB_BRIDGE_ORIENTATIONS,current:v.current.map(Number),
   preferred:v.preferred.map(Number),dimensions:v.dimensions.map(d=>({name:d.name,
    current:d.current.map(Number),preferred:d.preferred.map(Number)}))}};
}
function labBridgeCacheKey(x){return String(x?._cloudId||x?.id||'');}
function labBridgeRecords(x){
 return Array.isArray(x?.labResults)?x.labResults:[];
}
async function labBridgeLoad(x,quiet=false){
 if(!x?._cloudId||!cloudReady)return;
 const key=labBridgeCacheKey(x);
 try{
  const {data,error}=await sb.from('lab_experience_results').select('id,initiative_id,simulator_id,session_id,sample_size,captured_at,measurement_type,format_version,provenance,data,created_at')
   .eq('organization_id',cloudOrgId).eq('initiative_id',x._cloudId).order('captured_at',{ascending:false}).limit(100);
  if(error)throw error;
  x.labResults=Array.isArray(data)?data:[];
  labBridgeCache.set(key,true);
  if(current()===x&&(page==='Laboratorio'||page==='Inteligencia integrada'))render();
 }catch(e){
  console.warn('No se pudieron consultar los resultados del Laboratorio:',e);
  if(!quiet)labBridgeStatus('No se pudieron consultar los resultados: '+(e.message||e),true);
 }
}
function labBridgeStatus(message,isError=false){
 const n=document.getElementById('lab-bridge-status');
 if(n){n.textContent=message;n.setAttribute('data-error',isError?'true':'false');}
}
async function labBridgeImport(event){
 const input=event.target,file=input.files?.[0],x=current();
 if(!file)return;
 try{
  if(!x?._cloudId||!cloudReady)throw Error('Selecciona una iniciativa sincronizada y con sesión activa.');
  if(file.size>100000)throw Error('El archivo es demasiado grande.');
  const normalized=labBridgeNormalizeReport(JSON.parse(await file.text()));
  const {data:{user}}=await sb.auth.getUser();
  if(!user?.id)throw Error('Inicia sesión para importar.');
  labBridgeStatus('Guardando consolidado en HACERLO…');
  const {data,error}=await sb.from('lab_experience_results').upsert(
   {...normalized,organization_id:cloudOrgId,initiative_id:x._cloudId,
    imported_by:user.id,provenance:'facilitator_export_unverified',
    updated_at:new Date().toISOString()},
   {onConflict:'initiative_id,simulator_id,session_id'}
  ).select('id').single();
  if(error)throw error;
  await labBridgeLoad(x,true);
  labBridgeStatus('Resultado importado. Se mostrará en Inteligencia integrada y en la próxima interpretación de IA.');
 }catch(e){labBridgeStatus('No se pudo importar: '+(e.message||e),true);}
 finally{input.value='';}
}
function labBridgeProfile(records){
 const rows=(records||[]).filter(r=>r.simulator_id==='cultura-cvf'&&r.data);
 if(!rows.length)return '<p class="muted">Todavía no hay resultados consolidados del Laboratorio vinculados a esta iniciativa.</p>';
 return rows.map(r=>{
  const d=r.data||{},n=Math.max(0,Number(r.sample_size)||0),os=LAB_BRIDGE_ORIENTATIONS;
  const pairs=os.map((label,i)=>({label,current:Number(d.current?.[i]),preferred:Number(d.preferred?.[i])}))
   .filter(z=>Number.isFinite(z.current)&&Number.isFinite(z.preferred));
  const groups=pairs.map(p=>'<div class="hcx-lab-bridge-row"><b>'+safe(p.label)+'</b><span>Hoy '+safe(p.current)+' · Deseada '+safe(p.preferred)+'</span></div>').join('');
  return '<article class="hcx-lab-bridge-result"><div class="hcx-lab-bridge-result-head"><b>Radar de Cultura</b><small>Sala '+safe(r.session_id)+' · '+n+' valoraciones</small></div>'+
   groups+'<p class="hcx-lab-bridge-source">Fuente: consolidado importado por facilitador (sin verificación automática en Firebase). No indica causalidad ni equivale al OCAI oficial.</p></article>';
 }).join('');
}
function labBridgeImportPanel(x){
 if(!x)return '<section class="hcx-lab-bridge"><h2>Resultados del Laboratorio</h2><p class="muted">Selecciona una iniciativa para conectar resultados.</p></section>';
 const list=labBridgeRecords(x);
 return '<section class="hcx-lab-bridge"><div class="hcx-lab-bridge-header"><div><span class="hcx-lab-kicker">EVIDENCIA VINCULADA</span><h2>Resultados del Laboratorio</h2><p class="muted">Incorpora perfiles colectivos a la iniciativa y permite que Inteligencia integrada los tenga en cuenta.</p></div></div>'+
  '<label class="hcx-lab-bridge-upload" for="lab-bridge-file">Importar consolidado (.json)<input id="lab-bridge-file" type="file" accept=".json,application/json" onchange="labBridgeImport(event)" '+(!x._cloudId?'disabled':'')+'></label>'+
  '<p id="lab-bridge-status" class="hcx-lab-bridge-status" role="status" aria-live="polite">'+(!x._cloudId?'La iniciativa aún debe sincronizarse en Supabase.':'Desde el Radar de Cultura: Facilitador → Llevar resultados a HACERLO → selecciona el archivo aquí.')+'</p>'+
  '<div class="hcx-lab-bridge-results">'+labBridgeProfile(list)+'</div></section>';
}
function labBridgeIntegratedPanel(x){
 const count=labBridgeRecords(x).length;
 if(!count)return '';
 return '<section class="hcx-lab-bridge hcx-lab-bridge-analysis"><span class="hcx-lab-kicker">EVIDENCIA DE EXPERIENCIAS</span><h2>Laboratorio de Aprendizaje y Decisión</h2>'+
  '<p class="muted">'+count+' sesión(es) vinculadas. Los perfiles agregados se incluyen en el próximo análisis de IA; no se consideran mediciones directas de adopción.</p>'+
  '<div class="hcx-lab-bridge-results">'+labBridgeProfile(labBridgeRecords(x))+'</div>'+
  '<button class="secondary" type="button" onclick="go(\'Laboratorio\')">Gestionar resultados del Laboratorio ↗</button></section>';
}
function labBridgeAIContext(x){
 const rows=labBridgeRecords(x).filter(r=>r.simulator_id==='cultura-cvf'&&r.data).slice(0,20);
 return {schema:LAB_BRIDGE_SCHEMA,records:rows.length,source:'Consolidados del Laboratorio cargados por facilitadores; sin verificación automática de origen',
  interpretation:'Percepciones descriptivas agregadas, no prueba de efecto, causalidad ni puntuación psicométrica validada.',
  sessions:rows.map(r=>({simulator:r.simulator_id,session:r.session_id,n:r.sample_size,date:r.captured_at,
    verified:r.provenance==='server_verified',orientations:LAB_BRIDGE_ORIENTATIONS,
    current:r.data.current,preferred:r.data.preferred,
    dimensions:(r.data.dimensions||[]).map(d=>({name:d.name,current:d.current,preferred:d.preferred}))}))};
}
