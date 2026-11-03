
(function(){
const Q=id=>document.getElementById(id);
const h=Q('dashboard');if(!h)return;
const old=document.createElement('div');old.id='an-org-admin';
while(h.firstChild)old.appendChild(h.firstChild);
h.innerHTML=`
 <div class="an-top">
  <button class="secondary an-refresh" id="an-reload" type="button">↻ Actualizar</button>
  <h2 class="an-dashboard-title">Centro de control</h2>
  <p class="an-helper">Indicadores agregados de la plataforma · sin contenido privado de iniciativas</p>
 </div>
 <nav class="an-nav" aria-label="Secciones administrativas">
  <button type="button" class="an-tab is-active" data-panel="resumen">Visión general</button>
  <button type="button" class="an-tab" data-panel="uso">Uso y adopción</button>
  <button type="button" class="an-tab" data-panel="ingresos">Ingresos</button>
  <button type="button" class="an-tab" data-panel="accesos">Accesos y alertas</button>
  <button type="button" class="an-tab" data-panel="orgs">Organizaciones</button>
 </nav>
 <div id="an-resumen" class="an-panel">
  <div class="an-kpis" id="an-kpis"></div>
  <div class="an-grid">
    <div class="an-chart"><h3>Actividad por módulo RDAIM</h3><p>Vistas registradas en los últimos 30 días</p><div id="an-mods"></div></div>
    <div class="an-chart"><h3>Iniciativas por fábrica</h3><p>Volumen de proyectos registrados</p><div id="an-projects"></div></div>
    <div class="an-chart"><h3>Estado de fábricas</h3><p>Activas, suspendidas y archivadas</p><div id="an-status"></div></div>
    <div class="an-chart"><h3>Alertas prioritarias</h3><p>Vencimientos próximos e inactividad observada</p><div id="an-overview-alerts"></div></div>
  </div>
 </div>
 <div id="an-uso" class="an-panel" hidden>
  <h2>Uso y adopción</h2><p class="an-helper">Seguimiento desde la activación del registro de eventos; no hay reconstrucción retroactiva.</p>
  <div class="an-grid">
   <div class="an-chart"><h3>Uso de RDAIM</h3><p>Vistas por etapa · últimos 30 días</p><div id="an-module-detail"></div></div>
   <div class="an-chart"><h3>Usuarios activos por fábrica</h3><p>Personas distintas con actividad en 30 días</p><div id="an-active-orgs"></div></div>
   <div class="an-chart"><h3>Histograma de iniciativas</h3><p>Fábricas por rango de iniciativas</p><div id="an-hist-projects"></div></div>
   <div class="an-chart"><h3>Histograma de accesos habilitados</h3><p>Fábricas por número de usuarios</p><div id="an-hist-users"></div></div>
  </div>
 </div>
 <div id="an-ingresos" class="an-panel" hidden>
  <h2>Ingresos y contratos</h2>
  <p class="an-helper">MRR = mensualidad contratada activa. Recaudo = pagos registrados manualmente. No se confunden proyecciones con cobros.</p>
  <div class="an-grid">
    <div class="an-chart"><h3>Recaudación mensual</h3><p>Últimos 12 meses · COP</p><div id="an-revenue-line"></div></div>
    <div class="an-chart"><h3>Ingreso mensual contratado por fábrica</h3><p>Incluye contratos registrados, según su estado</p><div id="an-revenue-bars"></div></div>
  </div>
  <div class="an-card">
    <h3>Registrar contrato mensual</h3>
    <form id="an-contract-form" class="an-actions">
      <label>Organización<select id="an-contract-org" required></select></label>
      <label>Valor mensual (COP)<input id="an-contract-amount" type="number" min="0" step="0.01" required placeholder="0"></label>
      <label>Estado<select id="an-contract-status"><option value="active">Activo</option><option value="draft">Borrador</option><option value="paused">Pausado</option><option value="ended">Finalizado</option></select></label>
      <button type="submit">Guardar contrato</button>
    </form>
  </div>
  <div class="an-card">
    <h3>Registrar dinero recibido</h3>
    <form id="an-revenue-form" class="an-actions">
      <label>Organización<select id="an-revenue-org" required></select></label>
      <label>Mes<input id="an-revenue-month" type="month" required></label>
      <label>Valor recibido (COP)<input id="an-revenue-amount" type="number" min="0" step="0.01" required placeholder="0"></label>
      <button type="submit">Guardar ingreso</button>
    </form>
    <p class="an-helper">Puedes actualizar un mes existente. No se crea un pago ficticio cuando configuras un contrato.</p>
  </div>
  <div class="an-notice" id="an-finance-msg" role="status"></div>
 </div>
 <div id="an-accesos" class="an-panel" hidden>
  <div class="an-grid">
   <div class="an-chart"><h3>Accesos recientes</h3><p>Inicios o reanudaciones de sesión registrados desde hoy</p><div class="an-tablewrap"><table class="an-table"><thead><tr><th>Usuario</th><th>Fábrica</th><th>Fecha</th></tr></thead><tbody id="an-access-list"></tbody></table></div></div>
   <div class="an-chart"><h3>Alertas operativas</h3><p>Vencimientos en 30 días, vencidos o fábricas sin actividad reciente</p><div id="an-all-alerts"></div></div>
  </div>
  <p class="an-helper">Los datos de acceso son metadatos técnicos. No se consulta el contenido de encuestas, diagnósticos ni proyectos.</p>
 </div>
 <div id="an-orgs" class="an-panel" hidden></div>`;
Q('an-orgs').appendChild(old);
Q('an-revenue-month').value=new Date().toISOString().slice(0,7);
let current=null,active='resumen';
function show(name){
 active=name;
 h.querySelectorAll('.an-tab').forEach(b=>{const on=b.dataset.panel===name;b.classList.toggle('is-active',on);b.setAttribute('aria-current',on?'page':'false')});
 h.querySelectorAll('.an-panel').forEach(p=>{p.hidden=p.id!=='an-'+name});
}
h.querySelectorAll('.an-tab').forEach(btn=>btn.addEventListener('click',()=>show(btn.dataset.panel)));
Q('an-reload').addEventListener('click',()=>refreshAnalytics());
const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v)||0);
const fmt=v=>new Intl.NumberFormat('es-CO').format(Number(v)||0);
const date=v=>v?new Date(v).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'}):'Sin registro';
function plain(el,text,cls){const x=document.createElement(el);if(cls)x.className=cls;x.textContent=text;return x}
function empty(parent,txt='Aún no hay datos registrados'){parent.replaceChildren(plain('div',txt,'an-empty'))}
function kpis(data){
 const v=data.summary||{};
 const list=[
 ['Ingresos mensuales contratados',money(v.mrr),'MRR · contratos activos'],
 ['Recaudo del mes',money(v.income_this_month),'Pagos cargados manualmente'],
 ['Fábricas activas',fmt(v.active_orgs),'De '+fmt(v.organizations)+' organizaciones'],
 ['Usuarios activos · 30 días',fmt(v.active_users_30d),'De '+fmt(v.unique_users)+' usuarios habilitados'],
 ['Iniciativas registradas',fmt(v.initiatives),fmt(v.visits_30d)+' vistas RDAIM en 30 días']
 ];
 const area=Q('an-kpis');area.replaceChildren();
 for(const [name,value,info] of list){
 const box=plain('div','','an-kpi');
 box.append(plain('span',name),plain('strong',value),plain('small',info));area.append(box)
 }
}
function bars(id,data,display){
 const host=Q(id);host.replaceChildren();
 data=Array.isArray(data)?data:[];if(!data.length){empty(host);return}
 const max=Math.max(1,...data.map(d=>Number(d.value)||0));
 const container=plain('div','','an-bars');host.append(container);
 for(const d of data){
 const x=Number(d.value)||0;
 const row=plain('div','','an-bar'),name=plain('span',d.label,'an-lab');
 name.title=d.label;
 const track=plain('div','','an-track'),fill=plain('div','','an-fill');
 fill.style.width=(x<=0?0:Math.max(2,x/max*100))+'%';track.append(fill);
 row.append(name,track,plain('span',display?display(x):fmt(x),'an-val'));container.append(row)
 }
}
function hist(id,data){
 const host=Q(id);host.replaceChildren();data=Array.isArray(data)?data:[];
 if(!data.length){empty(host);return}
 const top=Math.max(1,...data.map(d=>Number(d.value)||0)),wrap=plain('div','','an-hist');
 for(const d of data){
 const x=Number(d.value)||0,bin=plain('div','','an-bin'),bar=plain('div','','fill');
 bar.style.height=(x?Math.max(4,x/top*122):3)+'px';
 bin.append(plain('strong',fmt(x)),bar,plain('em',d.label));wrap.append(bin)
 }host.append(wrap)
}
function donut(rows){
 const host=Q('an-status');host.replaceChildren();
 const n=rows.length,counts=[rows.filter(x=>x.status==='active').length,rows.filter(x=>x.status==='suspended').length,rows.filter(x=>x.status==='archived').length];
 const colors=['#42ca8a','#e2b548','#8295aa'],sum=counts.reduce((a,b)=>a+b,0);
 if(!sum){empty(host);return}
 let acc=0;const stops=counts.map((v,i)=>{let start=acc;acc+=v/sum*100;return colors[i]+' '+start+'% '+acc+'%'}).join(',');
 const area=plain('div','','an-donut-area'),ring=plain('div','','an-donut');ring.style.background='conic-gradient('+stops+')';ring.append(plain('strong',fmt(n)));area.append(ring);
 const legend=plain('div','','an-legend');
 ['Activas','Suspendidas','Archivadas'].forEach((label,i)=>{
 const row=plain('div','','an-legend-row'),dot=plain('span','','an-swatch');dot.style.background=colors[i];row.append(dot,plain('span',label+' · '+fmt(counts[i])));legend.append(row)
 });area.append(legend);host.append(area)
}
function line(series){
 const host=Q('an-revenue-line');host.replaceChildren();if(!series?.length){empty(host);return}
 const W=720,H=210,left=58,top=12,bottom=34,plotW=W-left-14,plotH=H-top-bottom;
 const v=series.map(d=>Number(d.value)||0),max=Math.max(1,...v);
 const pts=v.map((n,i)=>[left+i*plotW/Math.max(1,v.length-1),top+plotH*(1-n/max)]);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 720 210');svg.setAttribute('role','img');svg.setAttribute('aria-label','Recaudación mensual de los últimos 12 meses');
 svg.classList.add('an-line');
 function child(type,attrs,text){const e=document.createElementNS(ns,type);for(const [k,val] of Object.entries(attrs))e.setAttribute(k,String(val));if(text!==undefined)e.textContent=text;svg.append(e);return e}
 for(let j=0;j<=3;j++){const y=top+j*plotH/3;child('line',{x1:left,y1:y,x2:W-12,y2:y,class:'gridline'});child('text',{x:0,y:y+4},money(max*(3-j)/3).replace(',00',''))}
 child('polyline',{points:pts.map(p=>p.join(',')).join(' '),class:'trend'});
 pts.forEach(([x,y],i)=>{child('circle',{cx:x,cy:y,r:3.2,class:'dot'});if(i===0||i===pts.length-1||i%3===0)child('text',{x:x-18,y:H-12},series[i].label.slice(2))});
 host.append(svg)
}
function tableAccess(rows){
 const tbody=Q('an-access-list');tbody.replaceChildren();if(!rows?.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent='Aún no hay accesos registrados';tr.append(td);tbody.append(tr);return}
 rows.forEach(r=>{const tr=document.createElement('tr');[r.email||'—',r.organization||'—',date(r.at)].forEach(t=>tr.append(plain('td',t)));tbody.append(tr)})
}
function alerts(id,rows){
 const host=Q(id);host.replaceChildren();if(!rows?.length){empty(host,'Sin alertas registradas');return}
 rows.forEach(r=>{const el=plain('div','','an-alert');el.append(plain('strong',r.reason+' · '),plain('span',r.name));if(r.date)el.append(plain('small',' · '+date(r.date)));host.append(el)})
}
function selects(rows){
 const prev1=Q('an-contract-org').value,prev2=Q('an-revenue-org').value;
 for(const id of ['an-contract-org','an-revenue-org']){
 const sel=Q(id);sel.replaceChildren();rows.forEach(r=>sel.add(new Option(r.name,r.id)));
 sel.value=(id==='an-contract-org'?prev1:prev2)||rows[0]?.id||'';
 if(sel.selectedIndex<0&&rows.length)sel.selectedIndex=0
 }
 updateContract();
}
function updateContract(){
 const o=current?.organizations?.find(r=>r.id===Q('an-contract-org').value);
 Q('an-contract-amount').value=o?Number(o.monthly_amount)||0:0;
 Q('an-contract-status').value=o?.contract_status||'draft'
}
Q('an-contract-org').addEventListener('change',updateContract);
async function refreshAnalytics(){
 const {data,error}=await sb.rpc('platform_admin_metrics');
 if(error){Q('an-kpis').textContent='No fue posible cargar el tablero: '+error.message;return}
 current=data;
 const orgs=data.organizations||[];
 kpis(data);donut(orgs);
 bars('an-mods',data.module_usage||[]);
 bars('an-module-detail',data.module_usage||[]);
 bars('an-projects',orgs.map(o=>({label:o.name,value:o.initiatives})));
 bars('an-active-orgs',orgs.map(o=>({label:o.name,value:o.active_users})));
 bars('an-revenue-bars',orgs.map(o=>({label:o.name,value:o.monthly_amount})),money);
 hist('an-hist-projects',data.initiative_histogram||[]);
 hist('an-hist-users',data.access_histogram||[]);
 line(data.monthly_revenue||[]);tableAccess(data.recent_accesses||[]);
 alerts('an-all-alerts',data.alerts||[]);alerts('an-overview-alerts',(data.alerts||[]).slice(0,4));selects(orgs);
}
window.refreshAnalytics=refreshAnalytics;
Q('an-contract-form').addEventListener('submit',async e=>{
 e.preventDefault();const msg=Q('an-finance-msg'),amount=Number(Q('an-contract-amount').value);
 if(!Number.isFinite(amount)||amount<0){msg.textContent='Valor inválido';return}
 msg.textContent='Guardando contrato…';
 const {error}=await sb.rpc('platform_admin_save_contract',{p_org:Q('an-contract-org').value,p_amount:amount,p_status:Q('an-contract-status').value});
 if(error){msg.textContent=error.message;return}
 await refreshAnalytics();msg.textContent='Contrato actualizado.'
});
Q('an-revenue-form').addEventListener('submit',async e=>{
 e.preventDefault();const msg=Q('an-finance-msg'),amount=Number(Q('an-revenue-amount').value);
 if(!Number.isFinite(amount)||amount<0){msg.textContent='Valor inválido';return}
 msg.textContent='Guardando ingreso…';
 const {error}=await sb.rpc('platform_admin_save_revenue',{p_org:Q('an-revenue-org').value,p_period:Q('an-revenue-month').value+'-01',p_amount:amount});
 if(error){msg.textContent=error.message;return}
 await refreshAnalytics();msg.textContent='Ingreso registrado.'
});
})();
