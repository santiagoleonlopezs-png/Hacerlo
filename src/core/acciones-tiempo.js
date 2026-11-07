/* HACERLO: Acciones en el tiempo — vistas Gantt y calendario mensual */
const atState={all:{view:'gantt',month:null,day:null},initiative:{view:'gantt',month:null,day:null}};
function atDate(v){const s=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';const d=new Date(s+'T12:00:00');return !isNaN(d.getTime())&&d.getFullYear()===+s.slice(0,4)&&d.getMonth()+1===+s.slice(5,7)&&d.getDate()===+s.slice(8)?s:''}
function atMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function atRows(scope){return (scope==='all'?(db.initiatives||[]):[current()].filter(Boolean)).flatMap(i=>(i.actions||[]).flatMap((a,actionIndex)=>{const s=atDate(a.start),e=atDate(a.end);if(!s&&!e)return [];const from=s||e;return [{id:String(i.id),actionIndex,initiative:String(i.name||''),name:String(a.name||'Acción'),owner:String(a.owner||''),status:String(a.status||'Pendiente'),start:from,end:e&&e>=from?e:from,hasStart:!!s}]}))}
function atLabel(s){return new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(s+'T12:00:00'))}
function atOpen(id,index){
 const initiative=(db.initiatives||[]).find(item=>String(item.id)===String(id));if(!initiative)return;
 if(typeof hcxPrepareNavigation==='function'&&!hcxPrepareNavigation())return;
 const previous=db.selected;db.selected=initiative.id;
 if(go('Intervenciones')===false){db.selected=previous;return;}
 const actionIndex=Number(index);
 if(index===undefined||!Number.isInteger(actionIndex)||!initiative.actions?.[actionIndex])return;
 const card=document.querySelector?.('[data-action-index="'+actionIndex+'"]');
 if(card){card.classList.add('at-action-focus');card.scrollIntoView({block:'center',behavior:'instant'});card.focus({preventScroll:true});}
}
function atGantt(scope){
 const rows=atRows(scope).sort((a,b)=>a.start.localeCompare(b.start));
 if(!rows.length)return '<p class="at-empty">No hay acciones con fechas registradas.</p>';
 const lo=rows.reduce((v,r)=>r.start<v?r.start:v,rows[0].start),hi=rows.reduce((v,r)=>r.end>v?r.end:v,rows[0].end);
 const base=new Date(lo+'T12:00:00'),total=Math.max(1,Math.round((new Date(hi+'T12:00:00')-base)/86400000)+1);
 const count=Math.min(5,total),grid=Array.from({length:count},(_,index)=>'<span class="at-gridline" style="left:'+((count===1?0:Math.round((total-1)*index/(count-1)))/total*100)+'%" aria-hidden="true"></span>').join(''),ticks=Array.from({length:count},(_,index)=>{
  const offset=count===1?0:Math.round((total-1)*index/(count-1)),date=new Date(+base+offset*86400000);
  const label=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short'}).format(date);
  return '<span style="left:'+(offset/total*100)+'%">'+safe(label)+'</span>';
 }).join('');
 return '<div class="at-gantt-scroll" role="region" aria-label="Cronograma de acciones" tabindex="0"><div class="at-gantt"><div class="at-gantt-head"><strong>Acción e iniciativa</strong><span class="at-scale" aria-label="'+atLabel(lo)+' a '+atLabel(hi)+'">'+ticks+'</span></div>'+rows.map(r=>{
  const start=Math.round((new Date(r.start+'T12:00:00')-base)/86400000),days=Math.round((new Date(r.end+'T12:00:00')-new Date(r.start+'T12:00:00'))/86400000)+1;
  const dates=r.hasStart?atLabel(r.start)+(r.end!==r.start?' — '+atLabel(r.end):''):'Cierre: '+atLabel(r.end)+' · Inicio sin registrar';
  return '<button class="at-gantt-row" type="button" data-at-id="'+safe(r.id)+'" data-at-index="'+r.actionIndex+'" onclick="atOpen(this.dataset.atId,this.dataset.atIndex)" aria-label="'+safe(r.name+' · '+r.initiative+' · '+dates+' · '+r.status)+'"><span><strong>'+safe(r.name)+'</strong><small>'+safe(r.initiative)+' · '+safe(r.status)+'</small><small class="at-dates">'+safe(dates)+'</small></span><span class="at-track">'+grid+'<i class="'+(r.status==='Completada'?'at-done':'')+'" style="left:'+(start/total*100)+'%;width:'+(days/total*100)+'%" title="'+safe(dates)+'"></i></span></button>';
 }).join('')+'</div></div><p class="at-note">Cada segmento muestra las fechas programadas de la acción.</p>';
}
function atCalendar(scope){
 const state=atState[scope],month=state.month||atMonth(),year=+month.slice(0,4),m=+month.slice(5)-1,first=new Date(year,m,1),gap=(first.getDay()+6)%7,days=new Date(year,m+1,0).getDate(),rows=atRows(scope);
 const now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 const day=state.day?.slice(0,7)===month?state.day:(today.slice(0,7)===month?today:'');
 const cells=Array(gap).fill('<span></span>').join('')+Array.from({length:days},(_,i)=>{
 const date=month+'-'+String(i+1).padStart(2,'0'),active=rows.filter(a=>a.start<=date&&a.end>=date),starts=active.filter(a=>a.hasStart&&a.start===date).length;
 return '<button type="button" class="at-day '+(starts?'at-start ':'')+(date===today?'at-today ':'')+(date===day?'at-selected':'')+'" onclick="atPick(\''+scope+'\',\''+date+'\')" aria-pressed="'+(date===day)+'" aria-label="'+atLabel(date)+': '+starts+' inicios, '+active.length+' acciones"><span>'+(i+1)+'</span>'+(active.length?'<i class="'+(starts?'':'at-soft')+'"></i>':'')+'</button>'}).join('');
 const agenda=day?rows.filter(r=>r.start<=day&&r.end>=day):[];
 return '<div class="at-month-head"><strong>'+safe(new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(first))+'</strong><div><button type="button" aria-label="Mes anterior" onclick="atMove(\''+scope+'\',-1)">‹</button><button type="button" onclick="atToday(\''+scope+'\')">Hoy</button><button type="button" aria-label="Mes siguiente" onclick="atMove(\''+scope+'\',1)">›</button></div></div><div class="at-week">'+['L','M','M','J','V','S','D'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="at-grid">'+cells+'</div><p class="at-note">● Verde: inicio de acción · Punto claro: periodo programado.</p><div class="at-agenda">'+(day?'<h4>'+atLabel(day)+'</h4>'+(agenda.length?agenda.map(r=>'<button type="button" class="at-event" data-at-id="'+safe(r.id)+'" data-at-index="'+r.actionIndex+'" onclick="atOpen(this.dataset.atId,this.dataset.atIndex)"><span><strong>'+safe(r.name)+'</strong><small>'+(scope==='all'?safe(r.initiative)+' · ':'')+(r.hasStart&&r.start===day?'Inicia · ':'Programada · ')+safe(r.status)+(r.owner?' · '+safe(r.owner):'')+'</small></span><span>↗</span></button>').join(''):'<p>No hay acciones programadas en este día.</p>'):'<p>Selecciona un día para explorar sus acciones.</p>')+'</div>';
}
function atPanel(scope){const label=scope==='all'?'Todas las iniciativas':'Iniciativa seleccionada';return '<details class="at-panel"><summary><span class="at-icon">▦</span><span><strong>Acciones en el tiempo</strong><small>'+label+' · Consulta fechas y duración de las acciones</small></span><span class="at-chevron">⌄</span></summary><div class="at-body"><div class="at-tabs" role="group" aria-label="Forma de visualizar acciones"><button type="button" data-at-tab="gantt" class="'+(atState[scope].view==='gantt'?'active':'')+'" aria-pressed="'+(atState[scope].view==='gantt')+'" onclick="atView(\''+scope+'\',\'gantt\')">▤ Gantt</button><button type="button" data-at-tab="calendar" class="'+(atState[scope].view==='calendar'?'active':'')+'" aria-pressed="'+(atState[scope].view==='calendar')+'" onclick="atView(\''+scope+'\',\'calendar\')">▦ Calendario</button></div><div id="at-content-'+scope+'">'+atContent(scope)+'</div></div></details>'}
function atContent(scope){return atState[scope].view==='gantt'?atGantt(scope):atCalendar(scope)}
function atRefresh(scope){const root=document.getElementById('at-content-'+scope);if(root)root.innerHTML=atContent(scope);const panel=root?.closest('.at-panel');panel?.querySelectorAll('[data-at-tab]').forEach(b=>{const active=b.dataset.atTab===atState[scope].view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
function atView(scope,view){if(!['gantt','calendar'].includes(view))return;atState[scope].view=view;atRefresh(scope)}
function atMove(scope,delta){const s=atState[scope],m=s.month||atMonth(),d=new Date(+m.slice(0,4),+m.slice(5)-1+delta,1);s.month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');s.day=null;atRefresh(scope)}
function atToday(scope){atState[scope].month=atMonth();atState[scope].day=null;atRefresh(scope)}
function atPick(scope,day){atState[scope].day=day;atRefresh(scope)}
