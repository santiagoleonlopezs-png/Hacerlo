/* HACERLO · Pensamiento Sistémico: hub de herramientas independientes.
   Agregar nuevos temas mediante sysHubRegisterModule sin cargar el home. */
let sysHubArea='inicio',sysHubInitiative=null;
const SYS_HUB_MODULES=[
 {id:'lectura',name:'Comprender el sistema',icon:'⟳',tag:'CONDICIONES Y RELACIONES',
  description:'Explora lo que favorece o dificulta el comportamiento, identifica mecanismos y contrasta hipótesis.',
  summary:x=>{const s=sysStore(x);return (s.conditions||[]).length+' condiciones · '+(s.hypotheses||[]).length+' hipótesis';},
  render:(a,x)=>sysRender(a,'',x)},
 {id:'capacidad',name:'Capacidad Adaptativa',icon:'◈',tag:'MEDICIÓN Y DINÁMICA',
  description:'Vincula preguntas de SENTIR y CNPS para comprender energía, preparación, apertura y experiencia.',
  summary:x=>caCandidates(x).length+' preguntas disponibles · '+(x.capacityAdaptive?.observations?.length||0)+' lecturas guardadas',
  render:(a,x)=>{a.innerHTML=sysHubCapacityPage(x);}}
];
function sysHubRegisterModule(mod){
 if(!mod||typeof mod.id!=='string'||typeof mod.render!=='function'||SYS_HUB_MODULES.some(m=>m.id===mod.id))return false;
 SYS_HUB_MODULES.push(mod);return true;
}
function sysHubReset(){sysHubArea='inicio';}
function sysHubOpen(id){
 if(id!=='inicio'&&!SYS_HUB_MODULES.some(m=>m.id===id))return;
 if(id==='capacidad'&&sysHubArea!==id){caExpanded=false;caSurveyFilter='';}
 sysHubArea=id;render();
}
function sysHubHome(x){
 return `<div class="sh-shell">
  <header class="sh-home-hero">
   <div class="sh-eyebrow">RDAIM · ANÁLISIS · ${safe(x.name||'Iniciativa')}</div>
   <h1>Pensamiento Sistémico</h1>
   <p>Comprende cómo funciona el sistema y elige qué quieres explorar.</p>
  </header>
  <div class="sh-section-label">HERRAMIENTAS DE ANÁLISIS</div>
  <div class="sh-modules">
   ${SYS_HUB_MODULES.map(m=>`<button type="button" class="sh-module" onclick="sysHubOpen('${m.id}')">
    <span class="sh-module-top"><span class="sh-symbol" aria-hidden="true">${m.icon}</span><span class="sh-module-tag">${m.tag}</span></span>
    <strong>${safe(m.name)}</strong>
    <span class="sh-module-description">${safe(m.description)}</span>
    <span class="sh-module-bottom"><small>${safe(m.summary(x))}</small><span aria-hidden="true">↗</span></span>
   </button>`).join('')}
  </div>
 </div>`;
}
function sysHubNavigation(active){
 return `<nav class="sh-inner-nav" aria-label="Herramientas de pensamiento sistémico">
  <button type="button" class="sh-home-back" onclick="sysHubOpen('inicio')">← Pensamiento sistémico</button>
  <div class="sh-inner-options">
   ${SYS_HUB_MODULES.map(m=>`<button type="button" class="${m.id===active?'is-active':''}" aria-current="${m.id===active?'page':'false'}" onclick="sysHubOpen('${m.id}')">${safe(m.name)}</button>`).join('')}
  </div>
 </nav>`;
}
function sysHubCapacityPage(x){
 return `<div class="sh-capacity-layout">
  <header class="sh-capacity-hero">
   <div class="sh-eyebrow">PENSAMIENTO SISTÉMICO · DATOS DE LA INICIATIVA</div>
   <h1>Capacidad Adaptativa</h1>
   <p>Explora la evidencia de cuatro dimensiones. Revisa primero las preguntas vinculadas y después sus resultados.</p>
  </header>
  ${caMarkup(x)}
  ${caObservedView(x)}
 </div>`;
}
function sysHubRender(a,x){
 if(sysHubInitiative!==String(x.id)){sysHubInitiative=String(x.id);sysHubArea='inicio';}
 const mod=SYS_HUB_MODULES.find(m=>m.id===sysHubArea);
 if(!mod){a.innerHTML=sysHubHome(x);return;}
 mod.render(a,x);
 a.insertAdjacentHTML('afterbegin',sysHubNavigation(mod.id));
}
