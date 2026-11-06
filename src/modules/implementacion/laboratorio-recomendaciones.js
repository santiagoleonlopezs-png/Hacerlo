/* Recomendaciones orientativas, locales, explicables y sin transferencia de datos. */
const HACERLO_LAB_RECOMMENDATIONS=Object.freeze([
 {id:'nexus',title:'Proyecto NEXUS',path:'nexus.html',focus:'Ensayar decisiones para acompañar procesos de cambio y adopción.',patterns:['cambi\\w*','adop\\w*','resisten\\w*','transform\\w*','lider\\w*','intervencion\\w*']},
 {id:'cultura',title:'Radar de Cultura',path:'cultura-cvf.html',focus:'Explorar la cultura actual y deseada de los equipos.',patterns:['cultur\\w*','valor(?:es)?','normas sociales','creencias','identidad','ritual\\w*','habitos?']},
 {id:'saberon',title:'SaberON',path:'knowledge.html',focus:'Convertir conocimientos y comprensión en una experiencia de aplicación.',patterns:['aprendi\\w*','capacit\\w*','formaci\\w*','conocim\\w*','comprensi\\w*','habilidad\\w*','entendim\\w*']},
 {id:'flaco',title:'El Flaco',path:'el-flaco.html',focus:'Explorar cómo se comparte y transforma el conocimiento en la organización.',patterns:['gestion del conocimiento','transferencia','compartir','mentoria','lecciones aprendidas','memoria organizacional','documentacion','conocimiento colectivo']},
 {id:'saturno',title:'SATURNO',path:'saturno.html',focus:'Poner a prueba la coordinación, colaboración y dependencias entre equipos.',patterns:['colabor\\w*','coordin\\w*','agil\\w*','scrum','kanban','dependenc\\w*','equipos?']},
 {id:'talento',title:'Talento & Riesgo Lab',path:'talento-riesgo.html',focus:'Explorar dilemas de gestión humana, movilidad y riesgo laboral.',patterns:['talento','riesgo laboral','contratacion','ascenso','movilidad','legislac\\w*','normativ\\w*','gestion humana','seguridad y salud','sst']},
 {id:'reglas',title:'Las reglas del juego',path:'reglas.html',focus:'Reflexionar sobre cooperación, negociación e incentivos.',patterns:['negoci\\w*','conflict\\w*','cooperac\\w*','incentiv\\w*','dilema\\w*']}
]);
function labNormalize(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function labEvidence(x){
 if(!x)return [];
 const items=[];
 const push=(name,value,weight)=>{
  const text=String(value??'').trim();
  if(text)items.push({name,text,weight});
 };
 // Dar prioridad a hallazgos y barreras antes que a palabras aisladas del título.
 for(const [key,entry] of Object.entries(x.behaviorDiagnosis||{})){
  if(!entry||typeof entry!=='object')continue;
  const role=String(entry.role||'');
  const factor=String(entry.factor||key.split('::')[1]||'');
  if(role==='Barrera'||role==='Ambivalente')push('Barrera conductual',factor,9);
  else if(role==='Facilitador')push('Facilitador conductual',factor,5);
  else push('Factor por explorar',factor,2);
 }
 for(const z of x.diagnosisFindings||[]){
  if(!z)continue;
  const combined=[z.text,...(Array.isArray(z.categories)?z.categories:[])].filter(Boolean).join(' · ');
  push('Hallazgo registrado',combined,8);
 }
 for(const z of x.behaviors||[])push('Comportamiento objetivo',z?.name||z?.description,6);
 for(const text of [x.objective,x.expected,x.description,x.resultGoal?.text,x.globalResult?.text])push('Resultado u objetivo',text,4);
 for(const z of x.actions||[])push('Acción existente',z?.name,1);
 push('Nombre de la iniciativa',x.name,1);
 return items;
}
function labRecommendedExperiences(x){
 const evidence=labEvidence(x);
 return HACERLO_LAB_RECOMMENDATIONS.map((item,index)=>{
  let score=0,best=null;
  const tests=item.patterns.map(pattern=>new RegExp('(?:^|[^a-z])(?:'+pattern+')(?:$|[^a-z])','i'));
  for(const ev of evidence){
   const normalized=labNormalize(ev.text);
   if(!tests.some(re=>re.test(normalized)))continue;
   score+=ev.weight;
   if(!best||ev.weight>best.weight)best=ev;
  }
  return {id:item.id,title:item.title,path:item.path,focus:item.focus,score,basis:best,index};
 }).filter(item=>item.score>=4).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,2);
}
function labExperienceLink(id){
 const item=HACERLO_LAB_RECOMMENDATIONS.find(i=>i.id===id);
 return item?HACERLO_LABORATORIO_URL+item.path:'';
}
function labAddExperienceToInterventions(id){
 const item=HACERLO_LAB_RECOMMENDATIONS.find(i=>i.id===id);
 const x=typeof current==='function'?current():null;
 if(!item||!x){alert('Selecciona primero una iniciativa para planificar esta experiencia.');return;}
 x.actions=x.actions||[];
 if(x.actions.some(z=>z.learningLabExperience===id)){go('Intervenciones');return;}
 x.actions.push({
  id:'laboratorio-'+id+'-'+Date.now(),name:'Experiencia · '+item.title,
  dimension:'Aprendizaje',owner:'',start:'',end:'',status:'Pendiente',
  source:'Laboratorio de Aprendizaje y Decisión',
  hypothesis:'Explorar con la audiencia de la iniciativa: '+item.focus+' Registrar después los aprendizajes y las observaciones.',
  learningLabExperience:id
 });
 save();
 go('Intervenciones');
}
function learningLabRecommendationsSection(x){
 if(!x)return '<section class="hcx-lab-recommendations"><h2>Experiencias para tus iniciativas</h2><p class="muted">Selecciona una iniciativa en HACERLO para ver sugerencias contextualizadas. También puedes explorar libremente el laboratorio.</p></section>';
 const suggestions=labRecommendedExperiences(x);
 const heading='<header class="hcx-lab-rec-head"><div><span class="hcx-lab-kicker">EXPERIENCIAS SUGERIDAS</span><h2>Para tu iniciativa</h2><p class="muted">Según la información registrada en <strong>'+safe(x.name||'esta iniciativa')+'</strong>.</p></div></header>';
 if(!suggestions.length)return '<section class="hcx-lab-recommendations">'+heading+'<div class="hcx-lab-note">Todavía no hay información suficiente para sugerir una experiencia específica. Registra comportamientos o hallazgos en HACERLO y aquí aparecerán opciones relacionadas. Puedes explorar el catálogo mientras tanto.</div></section>';
 const cards=suggestions.map(rec=>{
  const already=(x.actions||[]).some(z=>z.learningLabExperience===rec.id);
  return '<article class="hcx-lab-rec-card"><div class="hcx-lab-rec-detail"><h3>'+safe(rec.title)+'</h3><p>'+safe(rec.focus)+'</p><small><b>'+safe(rec.basis.name)+':</b> '+safe(rec.basis.text.slice(0,115))+'</small></div>'+
   '<div class="hcx-lab-rec-actions"><a class="hcx-lab-rec-link" href="'+labExperienceLink(rec.id)+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir '+safe(rec.title)+' en una nueva pestaña">Explorar experiencia ↗</a>'+
   '<button type="button" class="secondary" onclick="labAddExperienceToInterventions(\''+rec.id+'\')">'+(already?'Ver intervención':'Añadir a intervenciones')+'</button></div></article>';
 }).join('');
 return '<section class="hcx-lab-recommendations">'+heading+'<div class="hcx-lab-rec-grid">'+cards+'</div><p class="hcx-lab-rec-disclaimer">Sugerencias orientativas a partir de palabras clave y registros existentes; no son un diagnóstico automático. La experiencia y los resultados del Laboratorio siguen siendo independientes.</p></section>';
}
