/* HACERLO · Bucles del sistema. Editor cualitativo; no ejecuta simulaciones ni inventa evidencia. */
let sdxUI={initiative:null,key:'initiative',panel:'',selected:'',selectedLink:'',connect:false,from:'',cycle:'',template:'growth',snapshot:'',compareA:'',compareB:'',view:null,undo:null,notice:'',list:false};
const SDX_ARCHETYPES=[
 {id:'growth',name:'Límites al crecimiento',description:'Algo impulsa el crecimiento, pero una restricción empieza a frenarlo.',nodes:[['Frecuencia de práctica',120,220],['Resultados visibles',400,100],['Motivación para practicar',690,210],['Carga de trabajo',430,370],['Tiempo disponible',130,420]],links:[[0,1,'+'],[1,2,'+'],[2,0,'+'],[0,3,'+'],[3,4,'-'],[4,0,'+']]},
 {id:'fixes',name:'Soluciones que fallan',description:'Una solución alivia el problema y, con el tiempo, genera efectos que lo agravan.',nodes:[['Tamaño del problema',150,220],['Uso de la solución rápida',490,100],['Efectos no deseados',620,360]],links:[[0,1,'+'],[1,0,'-'],[1,2,'+','Con el tiempo'],[2,0,'+']]},
 {id:'burden',name:'Desplazamiento de la carga',description:'El alivio inmediato desplaza el trabajo de fondo y debilita la capacidad de resolver.',nodes:[['Tamaño del problema',100,230],['Uso de la solución rápida',440,90],['Trabajo de fondo',440,360],['Capacidad para resolver',730,230]],links:[[0,1,'+'],[1,0,'-'],[0,2,'+','Requiere tiempo'],[2,0,'-'],[1,3,'-','Con el tiempo'],[3,2,'+']]}
];
function sdxId(){return 'sdx-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));}
function sdxClone(value){return JSON.parse(JSON.stringify(value));}
function sdxBlank(){return {boundary:{question:'',inside:'',outside:'',influence:'',horizon:''},variables:[],links:[],levers:[],loopNames:{},events:[],snapshots:[]};}
function sdxModel(x,key=sdxUI.key){return x?.systemDynamicsV1?.models?.[key]||sdxBlank();}
function sdxCurrentModel(x){const model=sdxModel(x);return model.snapshots?.find(s=>s.id===sdxUI.snapshot)?.model||model;}
function sdxReady(){return typeof hcxPrepareNavigation!=='function'||hcxPrepareNavigation();}
function sdxMutate(label,fn,extra){
 const x=current();if(!x||sdxUI.snapshot)return false;
 const previous=sdxClone(sdxModel(x)),next=sdxClone(previous);
 if(fn(next)===false)return false;
 if(extra)extra(x);
 next.events=[...(next.events||[]),{date:new Date().toISOString(),label}].slice(-100);
 x.systemDynamicsV1={...(x.systemDynamicsV1||{}),version:1,models:{...(x.systemDynamicsV1?.models||{}),[sdxUI.key]:next}};
 sdxUI.undo={initiative:String(x.id),key:sdxUI.key,model:previous};sdxUI.notice=label;save();render();return true;
}
function sdxUndo(){
 const x=current(),undo=sdxUI.undo;if(!x||!undo||undo.initiative!==String(x.id)||undo.key!==sdxUI.key||!sdxReady()||sdxUI.snapshot)return;
 x.systemDynamicsV1.models[undo.key]=undo.model;sdxUI.undo=null;sdxUI.selected='';sdxUI.selectedLink='';sdxUI.panel='';sdxUI.notice='Último cambio del diagrama deshecho';save();render();
}
function sdxOpen(panel,id=''){
 if(!sdxReady())return;sdxUI.panel=panel;sdxUI.selectedLink=panel==='link'?id:'';
 if(panel==='variable'){sdxUI.selected=id;if(!id)sdxUI.source='';}sdxUI.focusPanel=true;render();
}
function sdxClose(){if(!sdxReady())return;sdxUI.panel='';sdxUI.focusPanel=false;render();const canvas=document.getElementById('sdx-canvas');if(canvas){canvas.setAttribute('tabindex','-1');canvas.focus({preventScroll:true});}}
function sdxScope(key){if(!sdxReady()){const picker=document.activeElement;if(picker?.tagName==='SELECT')picker.value=sdxUI.key;return;}sdxUI.key=key;sdxUI.panel='';sdxUI.snapshot='';sdxUI.selected='';sdxUI.selectedLink='';sdxUI.cycle='';sdxUI.view=null;sdxUI.undo=null;sdxUI.notice='';render();}
function sdxToggleList(){if(!sdxReady())return;sdxUI.list=!sdxUI.list;render();const target=document.querySelector?.(sdxUI.list?'.sdx-variable-list button':'#sdx-canvas');if(target){if(!sdxUI.list)target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}}
function sdxConnect(){if(sdxUI.snapshot||!sdxReady())return;sdxUI.connect=!sdxUI.connect;sdxUI.from='';sdxUI.panel='';sdxUI.notice=sdxUI.connect?'Elige primero la variable de origen y después la de destino.':'';render();}
function sdxNodeClick(id){
 if(!sdxReady())return;
 if(sdxUI.connect&&!sdxUI.snapshot){
  if(!sdxUI.from){sdxUI.from=id;sdxUI.notice='Ahora elige la variable de destino.';render();return;}
  if(sdxUI.from===id)return;
  sdxUI.to=id;sdxUI.connect=false;sdxUI.selectedLink='';sdxUI.panel='link';sdxUI.focusPanel=true;render();return;
 }
 sdxUI.selected=id;sdxUI.selectedLink='';sdxUI.panel='variable';sdxUI.focusPanel=true;render();
}
function sdxResolveRef(items,ref){
 if(!ref)return null;
 if(ref.id)return items.find(i=>String(i.id)===String(ref.id))||null;
 const matches=items.filter(i=>i.name===ref.name);return matches.length===1?matches[0]:null;
}
function sdxRef(item){return {id:item.id?String(item.id):'',name:String(item.name||'')};}
function sdxParseRef(value){if(!value)return null;try{const v=JSON.parse(value);return v&&typeof v.name==='string'?{id:String(v.id||''),name:v.name}:null;}catch{return null;}}
function sdxNumber(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function sdxTrend(x,variable,until=''){
 const indicator=sdxResolveRef(x.indicators||[],variable.indicator);
 if(!indicator)return {indicator:null,points:[],latest:null};
 const cutoff=(indicator.revisionHistory||[]).filter(r=>(r.changes||[]).some(c=>['unit','scale','scaleMin','scaleMax','measureType'].includes(c.field))).map(r=>r.date).filter(Boolean).sort().at(-1)||'';
 const points=(indicator.history||[]).map(r=>({date:String(r.date||''),value:sdxNumber(r.value)}))
  .filter(r=>r.value!==null&&r.date&&!Number.isNaN(Date.parse(r.date))&&(!cutoff||r.date>=cutoff)&&(!until||r.date<=until)).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const currentValue=sdxNumber(indicator.value);
 return {indicator,points,cutoff,latest:points.at(-1)||(currentValue!==null&&!until?{date:'',value:currentValue}:null)};
}
function sdxCycles(model,limit=30){
 const nodes=model.variables||[],links=(model.links||[]).filter(e=>nodes.some(n=>n.id===e.from)&&nodes.some(n=>n.id===e.to)),order=new Map(nodes.map((n,i)=>[n.id,i])),out=new Map(nodes.map(n=>[n.id,[]]));
 links.forEach(e=>out.get(e.from).push(e));let budget=30000,truncated=false;const cycles=[];
 function walk(start,id,path,edges){
  if(--budget<0||cycles.length>=limit){truncated=true;return;}
  for(const edge of out.get(id)||[]){
   if(edge.to===start){const all=[...edges,edge],unknown=all.some(e=>!['+','-'].includes(e.sign));cycles.push({id:all.map(e=>e.id).join('|'),nodes:[...path],links:all.map(e=>e.id),type:unknown?'?':all.filter(e=>e.sign==='-').length%2?'B':'R'});if(cycles.length>=limit){truncated=true;return;}}
   else if(order.get(edge.to)>=order.get(start)&&!path.includes(edge.to)&&path.length<Math.min(20,nodes.length))walk(start,edge.to,[...path,edge.to],[...edges,edge]);
   else if(path.length>=20&&!path.includes(edge.to))truncated=true;
   if(budget<0)return;
  }
 }
 nodes.forEach(n=>{if(budget>0&&cycles.length<limit)walk(n.id,n.id,[n.id],[]);else truncated=true;});
 return {cycles,truncated};
}
function sdxPlacement(nodes){
 for(let row=0;row<nodes.length+2;row++)for(let col=0;col<3;col++){
  const x=100+col*280,y=100+row*150;
  if(!nodes.some(n=>Math.abs(n.x-x)<245&&Math.abs(n.y-y)<120))return {x,y};
 }
 return {x:100,y:Math.max(0,...nodes.map(n=>n.y))+150};
}
function sdxSaveVariable(event){
 event.preventDefault();const data=Object.fromEntries(new FormData(event.target)),name=String(data.name||'').trim();if(!name)return;
 const id=data.id||sdxId(),existing=sdxModel(current()).variables.find(v=>v.id===id),placement=sdxPlacement(sdxModel(current()).variables);
 const origin=sdxSources(current()).find(c=>c.ref===data.sourceRef);
 if(origin?.node&&!origin.node._cloudNodeId){origin.node._cloudNodeId=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():sdxId();data.sourceRef='node:'+origin.node._cloudNodeId;}
 const variable={...(existing||{}),id,name,description:String(data.description||'').trim(),indicator:sdxParseRef(data.indicator),sourceRef:String(data.sourceRef||''),sourceName:sdxSources(current()).find(c=>c.ref===data.sourceRef)?.name||existing?.sourceName||'',x:existing?.x??placement.x,y:existing?.y??placement.y};
 sdxUI.selected=id;sdxUI.panel='variable';sdxUI.from='';sdxUI.to='';if(!existing)sdxUI.view=null;
 sdxMutate(existing?'Variable actualizada':'Variable añadida',model=>{const i=model.variables.findIndex(v=>v.id===id);if(i<0)model.variables.push(variable);else model.variables[i]=variable;});
}
function sdxSaveLink(event){
 event.preventDefault();const data=Object.fromEntries(new FormData(event.target)),model=sdxModel(current());
 if(data.from===data.to||!model.variables.some(v=>v.id===data.from)||!model.variables.some(v=>v.id===data.to)){alert('Elige dos variables diferentes.');return;}
 const id=data.id||sdxId(),link={id,from:data.from,to:data.to,sign:['+','-'].includes(data.sign)?data.sign:'?',delay:String(data.delay||'').trim(),explanation:String(data.explanation||'').trim(),evidence:String(data.evidence||'').trim(),status:data.status==='Observación'?'Observación':'Hipótesis'};
 sdxUI.selectedLink=id;sdxUI.from='';sdxUI.to='';
 sdxMutate('Relación actualizada',m=>{const i=m.links.findIndex(e=>e.id===id);if(i<0)m.links.push(link);else m.links[i]=link;});
}
function sdxRemove(kind,id){
 if(sdxUI.snapshot||!confirm('¿Quitar este elemento del diagrama? Puedes deshacer el último cambio.'))return;
 sdxUI.panel='';sdxUI.selected='';sdxUI.selectedLink='';
 sdxMutate('Elemento quitado del diagrama',m=>{
  if(kind==='variable'){const removed=m.links.filter(e=>e.from===id||e.to===id).map(e=>e.id);m.variables=m.variables.filter(v=>v.id!==id);m.links=m.links.filter(e=>!removed.includes(e.id));m.levers=m.levers.filter(l=>l.target!==id&&!removed.includes(l.target));}
  else if(kind==='link'){m.links=m.links.filter(e=>e.id!==id);m.levers=m.levers.filter(l=>l.target!==id);}
  else m.levers=m.levers.filter(l=>l.id!==id);
 });
}
function sdxSaveBoundary(event){
 event.preventDefault();const d=Object.fromEntries(new FormData(event.target));sdxUI.panel='';
 sdxMutate('Alcance actualizado',m=>{m.boundary=Object.fromEntries(['question','inside','outside','influence','horizon'].map(k=>[k,String(d[k]||'').trim()]));});
}
function sdxTemplate(id){if(!SDX_ARCHETYPES.some(t=>t.id===id)||!sdxReady())return;sdxUI.template=id;render();document.querySelector?.('.sdx-template-options [data-id="'+id+'"]')?.focus();}
function sdxApplyTemplate(){
 if(!sdxReady())return;const template=SDX_ARCHETYPES.find(t=>t.id===sdxUI.template);if(!template)return;
 sdxUI.panel='';sdxUI.view=null;
 sdxMutate('Arquetipo añadido como hipótesis',m=>{
  const offset=m.variables.length?Math.max(...m.variables.map(v=>v.y))+150:0;
  const variables=template.nodes.map(([name,x,y])=>({id:sdxId(),name,x,y:y+offset,description:'Plantilla editable: '+template.name,indicator:null,archetype:template.id}));
  const links=template.links.map(([from,to,sign,delay])=>({id:sdxId(),from:variables[from].id,to:variables[to].id,sign,delay:delay||'',explanation:'Relación propuesta por la plantilla; adapta y contrasta su explicación.',evidence:'',status:'Hipótesis'}));
  m.variables.push(...variables);m.links.push(...links);
 });
}
function sdxSaveLoop(event){
 event.preventDefault();const d=Object.fromEntries(new FormData(event.target));
 sdxMutate('Nombre del bucle actualizado',m=>{m.loopNames[d.id]={name:String(d.name||'').trim(),expected:['R','B'].includes(d.expected)?d.expected:''};});
}
function sdxLoop(id){if(!sdxReady())return;sdxUI.cycle=sdxUI.cycle===id?'':id;sdxUI.panel=sdxUI.cycle?'loop':'';sdxUI.focusPanel=true;render();}
function sdxLever(target,type){if(!sdxReady())return;sdxUI.leverId='';sdxUI.target=target;sdxUI.targetType=type;sdxUI.panel='lever';sdxUI.focusPanel=true;render();}
function sdxEditLever(id){const lever=sdxCurrentModel(current()).levers.find(l=>l.id===id);if(!lever||!sdxReady())return;sdxUI.leverId=id;sdxUI.target=lever.target;sdxUI.targetType=lever.type;sdxUI.panel='lever';sdxUI.focusPanel=true;render();}
function sdxSaveLever(event){
 event.preventDefault();const d=Object.fromEntries(new FormData(event.target)),x=current();let action=null,created=null;
 if(d.action==='new'){
  const name=String(d.actionName||'').trim();if(!name){alert('Escribe el nombre de la acción.');return;}
  if(d.start&&d.end&&d.end<d.start){alert('La fecha final debe ser posterior o igual a la inicial.');return;}
  created={id:sdxId(),name,owner:String(d.owner||'').trim(),start:d.start||'',end:d.end||'',status:'Pendiente',source:'Pensamiento sistémico',hypothesis:String(d.expected||'').trim(),mechanisms:['ninguno']};action=sdxRef(created);
 }else action=sdxParseRef(d.action);
 if(action&&!created&&!sdxResolveRef(x.actions||[],action)){alert('No pudimos identificar esa acción. Revisa su nombre en Intervenciones.');return;}
 const target=sdxUI.target,type=sdxUI.targetType,id=sdxUI.leverId||sdxId(),model=sdxModel(x);
 if(![...model.variables,...model.links].some(item=>item.id===target)){alert('Selecciona de nuevo dónde quieres intervenir.');return;}
 sdxUI.panel='';
 sdxMutate('Punto de intervención registrado',m=>{const old=m.levers.find(l=>l.id===id),lever={id,target,type,expected:String(d.expected||'').trim(),action,date:old?.date||new Date().toISOString()};const index=m.levers.findIndex(l=>l.id===id);if(index<0)m.levers.push(lever);else m.levers[index]=lever;},created?project=>{project.actions=project.actions||[];project.actions.push(created);}:null);
}
function sdxSaveSnapshot(event){
 event.preventDefault();const d=Object.fromEntries(new FormData(event.target));
 sdxMutate('Versión del diagrama registrada',m=>{const {snapshots,events,...model}=sdxClone(m);m.snapshots=[...(snapshots||[]),{id:sdxId(),name:String(d.name||'').trim()||'Versión',moment:['Antes','Durante','Después'].includes(d.moment)?d.moment:'Antes',date:new Date().toISOString(),model}];});
}
function sdxViewSnapshot(id){if(!sdxReady())return;sdxUI.snapshot=id;sdxUI.selected='';sdxUI.selectedLink='';sdxUI.cycle='';sdxUI.view=null;sdxUI.panel='history';render();}
function sdxCompare(event){event.preventDefault();const d=Object.fromEntries(new FormData(event.target));sdxUI.compareA=d.a;sdxUI.compareB=d.b;render();}
function sdxSourceChoice(select){
 const form=select.form,source=sdxSources(current()).find(c=>c.ref===select.value),hint=form.querySelector('.sdx-origin-preview');
 // Selecting a reference never overwrites a variable name or creates causal relations.
 if(hint)hint.textContent=source?(source.context?'Actor como contexto · ':'Origen · ')+source.name+(source.evidence?' — '+source.evidence:''):'Variable independiente. Puedes formularla con tus propias palabras.';
 if(source&&!source.context&&!form.elements.name.value.trim())form.elements.name.value=source.name.slice(0,120);
 if(source&&!form.elements.description.value.trim())form.elements.description.value=source.evidence||'';
}
function sdxSourceSummary(x,variable){
 if(!variable.sourceRef)return '';
 const source=sdxSources(x).find(c=>c.ref===variable.sourceRef);
 return `<section class="sdx-origin"><small>Vinculada a HACERLO</small><strong>${safe(source?.name||variable.sourceName||'Registro de origen')}</strong><p class="sdx-hint">${safe(source?source.kind+' · '+(source.evidence||'Registro disponible en esta iniciativa.'):'El origen ya no está disponible. Tu variable y sus relaciones se conservan.')}</p>${source&&variable.sourceName&&source.name!==variable.sourceName?'<p class="sdx-hint">El origen cambió de nombre. La formulación de tu variable se conserva.</p>':''}</section>`;
}
function sdxSources(x){
 const selected=sdxUI.key.startsWith('behavior:')?sdxUI.key.slice(9):'',index=(x.behaviors||[]).findIndex((b,i)=>String(b.id??i)===selected);
 const causes=(x.diagnosisPossibleCauses||[]).filter(c=>!selected||String(c.behaviorId)===selected||String(c.behaviorId)==='index:'+index);
 return [...(x.systemVariables||[]).map((v,index)=>({ref:'legacy:'+index,name:v.name||'Variable anterior',evidence:v.evidence||'',kind:'Variable anterior'})),
 ...(x.systemV23?.conditions||[]).map((c,index)=>({ref:'condition:'+String(c.id||index),name:c.name||'Condición anterior',evidence:c.evidence||'',kind:'Condición registrada'})),
 ...Object.entries(x.behaviorDiagnosis||{}).filter(([,f])=>f&&f.factor).map(([key,f])=>({ref:'factor:'+key,name:String(f.factor),evidence:'Factor de '+String(f.dimension||'Diagnóstico')+' clasificado como '+String(f.role||'Por explorar')+'.',kind:String(f.role||'Factor')+' · '+String(f.dimension||'Diagnóstico')})),
 ...(x.diagnosisFindings||[]).filter(f=>!selected||!f.behaviorId||String(f.behaviorId)===selected).map((f,index)=>({ref:'finding:'+String(f.id||'legacy-'+index),name:String(f.text||f.name||'Hallazgo'),evidence:String(f.evidence||f.description||''),kind:'Hallazgo'})),
 ...(x.nodes||[]).map(n=>{const resolved=typeof graphResolvedNode==='function'?graphResolvedNode(x,n):n;return {node:n,ref:'node:'+String(n._cloudNodeId||n.id||[n.sourceKind,n.sourceId,n.type,n.name].map(v=>encodeURIComponent(String(v||''))).join('|')),name:String(resolved.name||'Nodo'),evidence:[n.description,n.context].filter(Boolean).join(' · '),kind:'Grafo · '+String(resolved.type||'Nodo'),context:!['Barrera','Facilitador','Hallazgo','Factor conductual','Indicador'].includes(resolved.type)};}),
 ...causes.map((c,index)=>({ref:'cause:'+String(c.id||index),name:String(c.statement||x.behaviorDiagnosis?.[c.factorKey]?.factor||'Posible causa').slice(0,120),evidence:[c.statement,c.validationNote].filter(Boolean).join(' · '),kind:'Diagnóstico · Por contrastar'}))];
}
function sdxUseSource(ref){if(!sdxReady())return;sdxUI.source=ref;sdxUI.panel='variable';sdxUI.selected='';sdxUI.focusPanel=true;render();}
function sdxImportLegacy(){
 if(!sdxReady())return;
 sdxMutate('Variables y relaciones anteriores incorporadas',m=>{
  const mapping=new Map(),offset=m.variables.length?Math.max(...m.variables.map(v=>v.y))+150:0;(current().systemVariables||[]).forEach((v,i)=>{
   const sourceRef='legacy:'+i;let node=m.variables.find(n=>n.sourceRef===sourceRef);
   if(!node){node={id:sdxId(),name:v.name||'Variable anterior',description:v.evidence||'',sourceRef,x:100+(i%3)*280,y:100+Math.floor(i/3)*150+offset,indicator:null};m.variables.push(node);}
   mapping.set(String(i),node.id);if(v.id!==undefined)mapping.set(String(v.id),node.id);
  });
  (current().systemLinks||[]).forEach((edge,i)=>{const from=mapping.get(String(edge.from)),to=mapping.get(String(edge.to)),sourceRef='legacy-link:'+i;if(from&&to&&from!==to&&!m.links.some(e=>e.sourceRef===sourceRef))m.links.push({id:sdxId(),from,to,sourceRef,sign:Number(edge.sign)===-1?'-':Number(edge.sign)===1?'+':'?',delay:edge.delay?'Demora registrada':'',evidence:edge.evidence||'',explanation:'Relación conservada del registro anterior.',status:'Hipótesis'});});
 });
}
function sdxFit(model){
 const nodes=model.variables||[];if(!nodes.length)return {x:0,y:0,w:1100,h:580};
 const left=Math.min(...nodes.map(n=>n.x))-70,top=Math.min(...nodes.map(n=>n.y))-65,right=Math.max(...nodes.map(n=>n.x+210))+70,bottom=Math.max(...nodes.map(n=>n.y+90))+65;
 const w=Math.max(800,right-left),h=Math.max(490,bottom-top);return {x:left-(w-(right-left))/2,y:top-(h-(bottom-top))/2,w,h};
}
function sdxZoom(factor){const m=sdxCurrentModel(current()),v=sdxUI.view||sdxFit(m),w=Math.max(320,Math.min(6000,v.w*factor)),h=v.h*w/v.w;sdxUI.view={x:v.x+(v.w-w)/2,y:v.y+(v.h-h)/2,w,h};sdxApplyView();}
function sdxApplyView(){const svg=document.getElementById('sdx-canvas'),v=sdxUI.view||sdxFit(sdxCurrentModel(current()));svg?.setAttribute('viewBox',[v.x,v.y,v.w,v.h].join(' '));}
function sdxResetView(){sdxUI.view=null;sdxApplyView();}
function sdxWrap(text,max=22){const words=String(text).split(/\s+/),lines=[''];for(const word of words){const i=lines.length-1;if((lines[i]+' '+word).trim().length>max&&lines[i])lines.push(word);else lines[i]=(lines[i]+' '+word).trim();}return lines.slice(0,2).map((line,i)=>i===1&&lines.length>2?line.slice(0,max-1)+'…':line);}
function sdxPath(a,b,curved){
 const ax=a.x+105,ay=a.y+43,bx=b.x+105,by=b.y+43,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
 const k=Math.min(112/Math.max(1,Math.abs(dx)),50/Math.max(1,Math.abs(dy))),gap=Math.min(.45,k),bend=curved?65:25;
 const sx=ax+dx*gap,sy=ay+dy*gap,tx=bx-dx*gap,ty=by-dy*gap,cx=(sx+tx)/2-dy/len*bend,cy=(sy+ty)/2+dx/len*bend;
 return {d:`M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`,x:(sx+2*cx+tx)/4,y:(sy+2*cy+ty)/4};
}
function sdxMiniTrend(trend){
 const points=Array.from(new Map(trend.points.map(p=>[Date.parse(p.date),p])).values());if(points.length<2)return '';
 const tail=points.slice(-12),lo=Math.min(...tail.map(p=>p.value)),hi=Math.max(...tail.map(p=>p.value)),start=Date.parse(tail[0].date),span=Date.parse(tail.at(-1).date)-start;
 const coords=tail.map((p,i)=>`${6+(span?(Date.parse(p.date)-start)/span:i/(tail.length-1))*228},${44-(p.value-lo)/(hi-lo||1)*32}`).join(' ');
 return `<svg class="sdx-spark" viewBox="0 0 240 54" role="img" aria-label="Tendencia de las últimas ${tail.length} mediciones"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="${coords.split(' ').at(-1).split(',')[0]}" cy="${coords.split(' ').at(-1).split(',')[1]}" r="3" fill="currentColor"/></svg>`;
}
function sdxSVG(model,x,mini=false){
 const nodes=model.variables||[],links=model.links||[],active=sdxCycles(model).cycles.find(c=>c.id===sdxUI.cycle),view=mini?sdxFit(model):(sdxUI.view||sdxFit(model));
 const paths=links.map(edge=>{const a=nodes.find(n=>n.id===edge.from),b=nodes.find(n=>n.id===edge.to);if(!a||!b)return '';const p=sdxPath(a,b,links.some(e=>e.from===edge.to&&e.to===edge.from));
 return `<g class="sdx-edge ${active?.links.includes(edge.id)?'is-cycle':''} ${sdxUI.selectedLink===edge.id?'is-selected':''}" data-sdx-edge="${safe(edge.id)}"><path d="${p.d}" marker-end="url(#sdx-arrow${mini?'-mini':''})"/><g class="sdx-edge-label" transform="translate(${p.x},${p.y})" role="button" tabindex="${mini?'-1':'0'}" data-id="${safe(edge.id)}" aria-label="Relación de ${safe(a.name)} a ${safe(b.name)}" onclick="sdxOpen('link',this.dataset.id)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();sdxOpen('link',this.dataset.id)}"><title>${safe(edge.explanation||'Relación por contrastar')}${edge.delay?' · Demora: '+safe(edge.delay):''}</title><rect x="-18" y="-15" width="36" height="30" rx="10"/><text text-anchor="middle" y="5">${safe(edge.sign||'?')}</text>${edge.delay?'<text class="sdx-delay" x="24" y="5">//</text>':''}${model.levers?.some(l=>l.target===edge.id)?'<path class="sdx-lever-dot" d="M-25 -26 l6 6 -6 6 -6 -6z"/>':''}</g></g>`;}).join('');
 const cards=nodes.map((node,nodeIndex)=>{const lines=sdxWrap(node.name),trend=sdxTrend(x,node),latest=trend.latest,tag=latest?'Último: '+latest.value.toLocaleString('es-CO'):'Variable';
 return `<g class="sdx-node ${sdxUI.selected===node.id||sdxUI.from===node.id?'is-selected':''} ${active?.nodes.includes(node.id)?'is-cycle':''}" transform="translate(${Number(node.x)||0},${Number(node.y)||0})" data-sdx-node="${safe(node.id)}" data-id="${safe(node.id)}" tabindex="${mini?'-1':'0'}" role="button" aria-label="${safe(node.name)}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();sdxNodeClick(this.dataset.id)}"><title>${safe(node.name)}</title><rect width="210" height="86" rx="14"/><clipPath id="sdx-text-${mini?'mini-':''}${nodeIndex}"><rect x="12" y="10" width="186" height="47"/></clipPath><text clip-path="url(#sdx-text-${mini?'mini-':''}${nodeIndex})" class="sdx-node-name" x="15" y="${lines.length>1?29:37}">${lines.map((line,i)=>`<tspan x="15" dy="${i?19:0}">${safe(line)}</tspan>`).join('')}</text><text class="sdx-node-tag" x="15" y="70">${safe(tag)}</text>${model.levers?.some(l=>l.target===node.id)?'<path class="sdx-lever-dot" d="M188 12 l6 6 -6 6 -6 -6z"/>':''}</g>`;}).join('');
 return `<svg ${mini?'class="sdx-template-svg"':'id="sdx-canvas" class="sdx-canvas"'} viewBox="${view.x} ${view.y} ${view.w} ${view.h}" role="group" aria-label="Diagrama de bucles entre variables"><defs><marker id="sdx-arrow${mini?'-mini':''}" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L9,4 L0,8 z" fill="#69cfc8"/></marker></defs>${paths}${cards}</svg>`;
}
function sdxOptions(items,selected,empty='Sin vincular'){
 const key=selected?JSON.stringify(selected):'';
 return `<option value="">${safe(empty)}</option>`+items.map(item=>{const ref=sdxRef(item),value=JSON.stringify(ref),duplicate=!ref.id&&items.filter(i=>i.name===item.name).length!==1;return `<option value="${safe(value)}" ${value===key?'selected':''} ${duplicate?'disabled':''}>${safe(item.name||'Sin nombre')}${duplicate?' · Nombre duplicado':''}</option>`;}).join('');
}
function sdxVariablePanel(x,model,readonly){
 const source=sdxSources(x).find(c=>c.ref===sdxUI.source),variable=model.variables.find(v=>v.id===sdxUI.selected)||{id:'',name:source?.context?'':source?.name||'',description:source?.evidence||'',sourceRef:source?.ref||'',indicator:null};
 const snapshot=sdxModel(x).snapshots.find(s=>s.id===sdxUI.snapshot),trend=sdxTrend(x,variable,snapshot?.date||'');
 return `<h2 id="sdx-panel-heading">${variable.id?'Explorar variable':'Añadir variable'}</h2><form onsubmit="sdxSaveVariable(event)"><fieldset ${readonly?'disabled':''}><input type="hidden" name="id" value="${safe(variable.id)}"><details class="sdx-source-picker" ${variable.sourceRef?'open':''}><summary>Usar información de HACERLO <small>Opcional</small></summary><label>Registro de origen<select name="sourceRef" onchange="sdxSourceChoice(this)"><option value="">Crear sin vincular</option>${variable.sourceRef&&!sdxSources(x).some(c=>c.ref===variable.sourceRef)?`<option value="${safe(variable.sourceRef)}" selected>Origen no disponible · conservar vínculo</option>`:''}${sdxSources(x).map(c=>`<option value="${safe(c.ref)}" ${c.ref===variable.sourceRef?'selected':''}>${safe(c.kind)} · ${safe(c.name)}</option>`).join('')}</select></label><p class="sdx-hint sdx-origin-preview">${variable.sourceRef?'El vínculo conserva el origen; tú defines qué puede aumentar o disminuir.':'Elige una barrera, hallazgo o nodo de esta iniciativa, o crea una variable nueva.'}</p></details><label>¿Qué puede aumentar o disminuir?<input name="name" required maxlength="120" value="${safe(variable.name)}" placeholder="Ej. Tiempo disponible para coordinar"></label><label>Qué significa aquí<textarea name="description" rows="2" placeholder="Una explicación breve">${safe(variable.description||'')}</textarea></label><label>Indicador para ver su tendencia<select name="indicator">${sdxOptions(x.indicators||[],variable.indicator)}</select></label><p class="sdx-hint">Se actualiza con las mediciones de ese indicador.</p><button type="submit" class="primary">${variable.id?'Guardar cambios':'Añadir al lienzo'}</button></fieldset></form>
 ${sdxSourceSummary(x,variable)}${variable.id?`<section class="sdx-trend"><h3>Ver tendencia</h3>${trend.indicator?`<p class="sdx-trend-value">${trend.latest?trend.latest.value.toLocaleString('es-CO'):'Sin mediciones'} <small>${safe(trend.indicator.unit||'')}</small></p>${sdxMiniTrend(trend)}<p class="sdx-hint">${trend.points.length>1?'Últimos registros observados':trend.latest?.date?'Un registro: todavía no hay una tendencia':trend.latest?'Valor actual sin fecha de medición':'Todavía no hay mediciones con fecha.'}</p>${trend.cutoff?'<p class="sdx-hint">La escala cambió. Se muestran registros posteriores al cambio.</p>':''}${trend.points.length?`<details><summary>Ver historial · ${trend.points.length}</summary><div class="sdx-history-table"><table><thead><tr><th>Fecha</th><th>Valor</th></tr></thead><tbody>${trend.points.slice().reverse().map(p=>`<tr><td>${safe(p.date.slice(0,10))}</td><td>${p.value.toLocaleString('es-CO')}</td></tr>`).join('')}</tbody></table></div></details>`:''}`:`<p class="sdx-hint">${variable.indicator?'El indicador vinculado ya no está disponible.':'Vincula un indicador para consultar sus mediciones aquí.'}</p>`}</section>${!readonly?`<div class="sdx-panel-actions"><button class="secondary" type="button" data-id="${safe(variable.id)}" onclick="sdxLever(this.dataset.id,'variable')">◇ Intervenir aquí</button><button class="sdx-text-button" type="button" data-id="${safe(variable.id)}" onclick="sdxRemove('variable',this.dataset.id)">Quitar del diagrama</button></div>`:''}`:''}`;
}
function sdxLinkPanel(model,readonly){
 const link=model.links.find(e=>e.id===sdxUI.selectedLink)||{id:'',from:sdxUI.from||model.variables[0]?.id||'',to:sdxUI.to||model.variables[1]?.id||'',sign:'?',status:'Hipótesis'};
 const options=id=>model.variables.map(v=>`<option value="${safe(v.id)}" ${v.id===id?'selected':''}>${safe(v.name)}</option>`).join('');
 return `<h2 id="sdx-panel-heading">Conectar variables</h2>${model.variables.length<2?'<p>Añade al menos dos variables para conectarlas.</p>':`<form onsubmit="sdxSaveLink(event)"><fieldset ${readonly?'disabled':''}><input type="hidden" name="id" value="${safe(link.id)}"><label>Si aumenta…<select name="from">${options(link.from)}</select></label><label>¿Qué variable cambia?<select name="to">${options(link.to)}</select></label><label>La segunda variable…<select name="sign"><option value="?" ${link.sign==='?'?'selected':''}>Todavía no lo sabemos</option><option value="+" ${link.sign==='+'?'selected':''}>También aumenta (+)</option><option value="-" ${link.sign==='-'?'selected':''}>Disminuye (−)</option></select></label><label>¿Por qué piensas que ocurre?<textarea name="explanation" rows="3" placeholder="Explica la relación">${safe(link.explanation||'')}</textarea></label><details ${link.delay||link.evidence?'open':''}><summary>Demora y evidencia</summary><label>¿Cuándo se notaría el efecto?<input name="delay" value="${safe(link.delay||'')}" placeholder="Ej. Después de unas semanas"></label><label>Fundamento<select name="status"><option ${link.status==='Hipótesis'?'selected':''}>Hipótesis</option><option ${link.status==='Observación'?'selected':''}>Observación</option></select></label><label>Fuente o evidencia<textarea name="evidence" rows="2">${safe(link.evidence||'')}</textarea></label></details><button class="primary" type="submit">Guardar relación</button></fieldset></form>${link.id&&!readonly?`<div class="sdx-panel-actions"><button class="secondary" type="button" data-id="${safe(link.id)}" onclick="sdxLever(this.dataset.id,'link')">◇ Intervenir aquí</button><button class="sdx-text-button" data-id="${safe(link.id)}" type="button" onclick="sdxRemove('link',this.dataset.id)">Quitar relación</button></div>`:''}`}`;
}
function sdxBoundaryPanel(model,readonly){const b=model.boundary||{};
 return `<h2 id="sdx-panel-heading">Límites del sistema</h2><p class="sdx-hint">Acota qué necesitas comprender. Puedes ajustarlo después.</p><form onsubmit="sdxSaveBoundary(event)"><fieldset ${readonly?'disabled':''}>${[['question','¿Qué situación quieres explicar?','Ej. La coordinación sigue siendo baja'],['inside','Qué incluimos','Procesos, decisiones o condiciones relevantes'],['outside','Qué dejamos fuera','Lo que este análisis no abordará'],['influence','Qué podemos influir','Decisiones a nuestro alcance'],['horizon','Periodo que analizamos','Ej. Los próximos tres meses']].map(([key,label,placeholder])=>`<label>${label}<textarea name="${key}" rows="2" placeholder="${placeholder}">${safe(b[key]||'')}</textarea></label>`).join('')}<button class="primary" type="submit">Guardar alcance</button></fieldset></form>`;}
function sdxTemplateModel(template){return {boundary:{},variables:template.nodes.map(([name,x,y],i)=>({id:'preview-'+i,name,x,y})),links:template.links.map(([from,to,sign,delay],i)=>({id:'preview-edge-'+i,from:'preview-'+from,to:'preview-'+to,sign,delay})),levers:[],loopNames:{}};}
function sdxArchetypePanel(x){const t=SDX_ARCHETYPES.find(a=>a.id===sdxUI.template)||SDX_ARCHETYPES[0];
 return `<h2 id="sdx-panel-heading">Comenzar con un arquetipo</h2><div class="sdx-template-options">${SDX_ARCHETYPES.map(a=>`<button type="button" data-id="${a.id}" class="${t.id===a.id?'is-active':''}" onclick="sdxTemplate(this.dataset.id)">${a.name}</button>`).join('')}</div><h3>${t.name}</h3><p>${t.description}</p><p class="sdx-hint">La vista previa está en el lienzo. Es una hipótesis de partida: adapta las variables y contrasta las relaciones con tu iniciativa.</p><button type="button" class="primary" onclick="sdxApplyTemplate()">Usar esta plantilla</button><p class="sdx-hint">Se añade sin reemplazar tu diagrama. Puedes deshacerlo.</p>`;
}
function sdxLoopPanel(model,readonly){
 const cycle=sdxCycles(model).cycles.find(c=>c.id===sdxUI.cycle);if(!cycle)return '<h2 id="sdx-panel-heading">Bucles del sistema</h2><p>Conecta variables hasta volver al punto de partida.</p>';
 const names=model.loopNames?.[cycle.id]||{},type=cycle.type==='R'?'Refuerzo':cycle.type==='B'?'Compensación':'Por completar';
 return `<h2 id="sdx-panel-heading">${type}</h2><p>${cycle.type==='R'?'Este circuito amplifica el cambio. Puede impulsar una mejora o agravar un problema.':cycle.type==='B'?'Este circuito contrarresta el cambio. Las demoras pueden alterar su comportamiento.':'Define el sentido de todas las relaciones para clasificar este circuito.'}</p><ol class="sdx-loop-story">${cycle.nodes.map(id=>`<li>${safe(model.variables.find(v=>v.id===id)?.name||'Variable')}</li>`).join('')}<li>Vuelve al inicio ↶</li></ol><form onsubmit="sdxSaveLoop(event)"><fieldset ${readonly?'disabled':''}><input type="hidden" name="id" value="${safe(cycle.id)}"><label>Nombre del bucle<input name="name" value="${safe(names.name||'')}" placeholder="Ej. Círculo de colaboración"></label><label>¿Qué tipo esperabas encontrar?<select name="expected"><option value="">Sin propuesta previa</option><option value="R" ${names.expected==='R'?'selected':''}>Reforzador (R)</option><option value="B" ${names.expected==='B'?'selected':''}>Compensatorio (B)</option></select></label><button class="primary" type="submit">Guardar nombre</button></fieldset></form>${names.expected&&cycle.type!=='?'&&names.expected!==cycle.type?'<p class="sdx-warning">Las flechas indican un tipo diferente al esperado. Revisa el sentido de cada relación.</p>':''}<details><summary>Cómo se clasifica</summary><p class="sdx-hint">Un número par de relaciones contrarias (−), incluido cero, indica refuerzo. Un número impar indica compensación. Esta clasificación describe el dibujo; no demuestra su causalidad.</p></details>`;
}
function sdxLeverPanel(x,model){
 const target=model.variables.find(v=>v.id===sdxUI.target)||model.links.find(l=>l.id===sdxUI.target),label=target?.name||(target?[model.variables.find(v=>v.id===target.from)?.name,model.variables.find(v=>v.id===target.to)?.name].join(' → '):'Selecciona una variable o relación'),lever=model.levers.find(l=>l.id===sdxUI.leverId);
 return `<h2 id="sdx-panel-heading">Dónde intervenir</h2><p class="sdx-hint">${safe(label)}</p><form onsubmit="sdxSaveLever(event)"><label>¿Qué esperas cambiar?<textarea name="expected" required rows="3" placeholder="Si cambiamos…, esperamos que…">${safe(lever?.expected||'')}</textarea></label><label>Acción vinculada<select name="action" onchange="document.getElementById('sdx-new-action').hidden=this.value!=='new'">${sdxOptions(x.actions||[],lever?.action,'Vincular después')}<option value="new">＋ Crear una acción</option></select></label><div id="sdx-new-action" hidden><label>Nombre de la acción<input name="actionName" placeholder="Acción observable"></label><label>Responsable<input name="owner"></label><div class="sdx-two"><label>Inicio<input name="start" type="date"></label><label>Fin<input name="end" type="date"></label></div></div><button class="primary" type="submit">Registrar intervención</button></form><p class="sdx-hint">La acción se gestiona en Implementación. Aquí conservas su relación con el sistema.</p>`;
}
function sdxHistoryPanel(model,readonly){
 const full=sdxModel(current()),versions=full.snapshots||[],options=selected=>'<option value="">Diagrama actual</option>'+versions.map(v=>`<option value="${safe(v.id)}" ${v.id===selected?'selected':''}>${safe(v.moment+' · '+v.name)}</option>`).join('');
 const resolve=id=>versions.find(v=>v.id===id)?.model||full,a=resolve(sdxUI.compareA),b=resolve(sdxUI.compareB),comparison=sdxUI.compareA||sdxUI.compareB;
 return `<h2 id="sdx-panel-heading">Versiones del sistema</h2>${!readonly?`<form onsubmit="sdxSaveSnapshot(event)"><label>Nombre de esta versión<input name="name" required placeholder="Ej. Antes del piloto"></label><label>Momento<select name="moment"><option>Antes</option><option>Durante</option><option>Después</option></select></label><button class="primary" type="submit">Guardar versión</button></form>`:''}<div class="sdx-version-list">${versions.map(v=>`<button type="button" data-id="${safe(v.id)}" onclick="sdxViewSnapshot(this.dataset.id)"><strong>${safe(v.moment+' · '+v.name)}</strong><small>${safe(v.date.slice(0,10))} · Ver diagrama ↗</small></button>`).join('')||'<p class="sdx-hint">Guarda una versión cuando quieras conservar el estado de tu análisis.</p>'}</div>${versions.length?`<details><summary>Comparar versiones</summary><form onsubmit="sdxCompare(event)"><label>Primera<select name="a">${options(sdxUI.compareA)}</select></label><label>Segunda<select name="b">${options(sdxUI.compareB)}</select></label><button type="submit" class="secondary">Comparar</button></form>${comparison?`<table><thead><tr><th>Estructura</th><th>Primera</th><th>Segunda</th></tr></thead><tbody><tr><td>Variables</td><td>${a.variables.length}</td><td>${b.variables.length}</td></tr><tr><td>Relaciones</td><td>${a.links.length}</td><td>${b.links.length}</td></tr><tr><td>Bucles R / B</td><td>${sdxCycles(a).cycles.filter(c=>c.type==='R').length} / ${sdxCycles(a).cycles.filter(c=>c.type==='B').length}</td><td>${sdxCycles(b).cycles.filter(c=>c.type==='R').length} / ${sdxCycles(b).cycles.filter(c=>c.type==='B').length}</td></tr></tbody></table><p class="sdx-hint">Compara la estructura documentada; no demuestra que el resultado haya mejorado.</p>`:''}</details>`:''}`;
}
function sdxArchivePanel(x){
 const sources=sdxSources(x),old=x.systemV23||{},model=sdxModel(x);
 return `<h2 id="sdx-panel-heading">Información de la iniciativa</h2><p class="sdx-hint">Consulta tus registros y el diagnóstico. Al incorporar una variable puedes precisar qué aumenta o disminuye. Los originales se conservan.</p>${(x.systemVariables||[]).length?'<button class="secondary" type="button" onclick="sdxImportLegacy()">Incorporar variables y relaciones anteriores</button>':''}<div class="sdx-source-list">${sources.map(c=>`<div><strong>${safe(c.name)}</strong><small>${safe(c.kind)}</small><button class="sdx-text-button" type="button" data-ref="${safe(c.ref)}" onclick="sdxUseSource(this.dataset.ref)" ${model.variables.some(v=>v.sourceRef===c.ref)?'disabled':''}>${model.variables.some(v=>v.sourceRef===c.ref)?'Ya incorporada':'Usar como variable →'}</button></div>`).join('')||'<p>No hay variables o condiciones anteriores registradas.</p>'}</div>${[['mechanisms','Mecanismos'],['hypotheses','Hipótesis'],['events','Observaciones']].map(([key,label])=>`<details><summary>${label} · ${(old[key]||[]).length}</summary>${(old[key]||[]).map(r=>`<p><strong>${safe(r.name||r.detail||r.hypothesis||'Registro')}</strong><br>${safe(r.evidence||r.explanation||r.expected||'')}</p>`).join('')}</details>`).join('')}`;
}
function sdxPanel(x,model,readonly){
 let content='';
 if(sdxUI.panel==='variable')content=sdxVariablePanel(x,model,readonly);
 if(sdxUI.panel==='link')content=sdxLinkPanel(model,readonly);
 if(sdxUI.panel==='boundary')content=sdxBoundaryPanel(model,readonly);
 if(sdxUI.panel==='archetypes')content=sdxArchetypePanel(x);
 if(sdxUI.panel==='loop')content=sdxLoopPanel(model,readonly);
 if(sdxUI.panel==='lever')content=sdxLeverPanel(x,model);
 if(sdxUI.panel==='history')content=sdxHistoryPanel(model,readonly);
 if(sdxUI.panel==='archive')content=sdxArchivePanel(x);
 return content?`<section class="sdx-detail" aria-label="Detalle del sistema"><button type="button" class="sdx-close" aria-label="Cerrar detalle" onclick="sdxClose()">×</button>${content}</section>`:'';
}
function sdxRender(root,x){
 if(sdxUI.initiative!==String(x.id)){sdxUI={initiative:String(x.id),key:'initiative',panel:'',selected:'',selectedLink:'',connect:false,from:'',cycle:'',template:'growth',snapshot:'',compareA:'',compareB:'',view:null,undo:null,notice:'',list:false};}
 const model=sdxCurrentModel(x),readonly=!!sdxUI.snapshot,preview=sdxUI.panel==='archetypes',displayModel=preview?sdxTemplateModel(SDX_ARCHETYPES.find(a=>a.id===sdxUI.template)||SDX_ARCHETYPES[0]):model,cycles=sdxCycles(displayModel),panel=sdxPanel(x,model,readonly),snapshot=sdxModel(x).snapshots.find(s=>s.id===sdxUI.snapshot);
 root.innerHTML=`<div class="sdx-shell"><header class="sdx-hero"><div><span class="sdx-eyebrow">PENSAMIENTO SISTÉMICO · ${safe(x.name)}</span><h1>Descubre qué mantiene el patrón.</h1><p>Conecta lo que cambia. Comprende los ciclos. Elige dónde actuar.</p></div><div class="sdx-hero-mark" aria-hidden="true"><span>R</span><span>↻</span><span>B</span></div></header>
 <div class="sdx-context"><label>Mirar el sistema de<select onchange="sdxScope(this.value)"><option value="initiative" ${sdxUI.key==='initiative'?'selected':''}>Toda la iniciativa</option>${(x.behaviors||[]).map((b,i)=>`<option value="behavior:${safe(String(b.id??i))}" ${sdxUI.key==='behavior:'+String(b.id??i)?'selected':''}>${safe(b.name||'Comportamiento')}</option>`).join('')}</select></label><button class="sdx-boundary-button" type="button" onclick="sdxOpen('boundary')">◎ ${model.boundary?.question?'Alcance definido':'Definir alcance'} <span>↗</span></button></div>
 ${model.boundary?.question?`<p class="sdx-question">${safe(model.boundary.question)}</p>`:''}
 ${readonly?`<div class="sdx-version-banner"><span>Versión de consulta · ${safe(snapshot?.moment||'')} · ${safe(snapshot?.name||'')}</span><button class="secondary" type="button" onclick="sdxViewSnapshot('')">Volver al diagrama actual</button></div>`:''}
 <div class="sdx-workspace ${panel?'has-detail':''}"><section class="sdx-board" aria-label="Espacio para dibujar bucles"><div class="sdx-toolbar"><div><button class="primary" type="button" onclick="sdxOpen('variable')" ${readonly?'disabled':''}>＋ Variable</button><button type="button" class="secondary ${sdxUI.connect?'is-active':''}" onclick="sdxConnect()" title="Relación entre dos variables" ${readonly||preview||model.variables.length<2?'disabled':''}>↗ Conectar</button><button type="button" class="secondary" onclick="sdxOpen('archetypes')" ${readonly?'disabled':''}>◈ Arquetipos</button></div><details class="sdx-more"><summary aria-label="Más opciones del diagrama">···</summary><div><button type="button" onclick="sdxOpen('history')">Versiones y comparación</button><button type="button" onclick="sdxOpen('archive')" ${readonly?'disabled':''}>Usar información existente</button><button type="button" onclick="sdxUndo()" ${!sdxUI.undo||readonly?'disabled':''}>Deshacer último cambio</button><button type="button" onclick="sdxToggleList()">${sdxUI.list?'Ver lienzo':'Ver como lista'}</button></div></details></div>
 <div class="sdx-status" role="status" aria-live="polite">${safe(preview?'Vista previa · Plantilla editable, sin cambios en tu diagrama.':sdxUI.notice|| (model.variables.length?'Selecciona una variable o conecta dos para explorar su relación.':'Empieza con una variable o utiliza un arquetipo como guía.'))}</div>
 ${sdxUI.list&&!preview?`<div class="sdx-variable-list">${model.variables.map(v=>`<button type="button" data-id="${safe(v.id)}" onclick="sdxNodeClick(this.dataset.id)"><strong>${safe(v.name)}</strong><small>Explorar variable →</small></button>`).join('')||'<p class="sdx-hint">Todavía no hay variables.</p>'}${model.links.map(e=>`<button type="button" data-id="${safe(e.id)}" onclick="sdxOpen('link',this.dataset.id)"><span>${safe(model.variables.find(v=>v.id===e.from)?.name||'')} → ${safe(model.variables.find(v=>v.id===e.to)?.name||'')}</span><small>${safe(e.sign)} ${e.delay?'· Demora':''}</small></button>`).join('')}</div>`:`<div class="sdx-stage ${preview?'is-preview':''}">${sdxSVG(displayModel,x,preview)}${!preview&&!model.variables.length?`<div class="sdx-empty"><span aria-hidden="true">↻</span><h2>¿Qué se repite en esta situación?</h2><p>Dibuja las variables que podrían explicarlo.</p><div><button class="primary" type="button" onclick="sdxOpen('variable')" ${readonly?'disabled':''}>Añadir primera variable</button><button class="secondary" type="button" onclick="sdxOpen('archetypes')" ${readonly?'disabled':''}>Explorar arquetipos</button></div>${!readonly&&sdxSources(x).length?`<button type="button" class="sdx-text-button sdx-existing" onclick="sdxOpen('archive')">Consultar información existente · ${sdxSources(x).length}</button>`:''}</div>`:''}<div class="sdx-zoom" ${preview?'hidden':''}><button type="button" aria-label="Acercar diagrama" onclick="sdxZoom(.8)">＋</button><button type="button" aria-label="Alejar diagrama" onclick="sdxZoom(1.25)">−</button><button type="button" onclick="sdxResetView()">Ajustar</button></div></div>`}
 <div class="sdx-legend"><span><b>＋</b> Mismo sentido</span><span><b>−</b> Sentido contrario</span><span><b>//</b> Demora</span><span><b>?</b> Por definir</span></div>
 <section class="sdx-loops" aria-label="Bucles identificados"><span class="sdx-small-label">BUCLES</span>${cycles.cycles.length?cycles.cycles.map((c,i)=>`<button type="button" class="sdx-loop sdx-loop-${c.type==='?'?'unknown':c.type} ${sdxUI.cycle===c.id?'is-active':''}" data-id="${safe(c.id)}" onclick="sdxLoop(this.dataset.id)" ${preview?'disabled':''}><b>${c.type}${i+1}</b> ${safe(model.loopNames?.[c.id]?.name||(c.type==='R'?'Refuerzo':c.type==='B'?'Compensación':'Por completar'))}</button>`).join(''):'<small>Al cerrar un circuito, podrás explorar cómo funciona.</small>'}${cycles.truncated?'<small>Vista limitada a 30 circuitos y 20 variables por recorrido para mantener el editor ágil.</small>':''}</section>
 ${model.levers.length&&!preview?`<details class="sdx-levers"><summary>◇ Puntos de intervención · ${model.levers.length}</summary>${model.levers.map(l=>{const action=sdxResolveRef(x.actions||[],l.action);return `<div><p>${safe(l.expected)}</p><small>${safe(action?(action.name+' · '+(action.status||'Pendiente')):l.action?'La acción vinculada no está disponible':'Acción por vincular')}</small>${action?'<button class="sdx-text-button" type="button" onclick="go(\'Intervenciones\')">Abrir Intervenciones ↗</button>':''}${!readonly?`<div class="sdx-lever-actions"><button class="sdx-text-button" type="button" data-id="${safe(l.id)}" onclick="sdxEditLever(this.dataset.id)">Editar intervención</button><button class="sdx-text-button" type="button" data-id="${safe(l.id)}" onclick="sdxRemove('lever',this.dataset.id)">Quitar vínculo</button></div>`:''}</div>`;}).join('')}</details>`:''}
 <p class="sdx-footnote">Las relaciones son explicaciones por contrastar. El tipo de bucle no demuestra causalidad.</p></section>${panel}</div></div>`;
 sdxMount(root);
}
function sdxMoveEdges(svg,model,id,x,y){
 const nodes=model.variables.map(n=>n.id===id?{...n,x,y}:n);
 svg.querySelectorAll('[data-sdx-edge]').forEach(group=>{
  const edge=model.links.find(e=>e.id===group.getAttribute('data-sdx-edge'));if(!edge||edge.from!==id&&edge.to!==id)return;
  const a=nodes.find(n=>n.id===edge.from),b=nodes.find(n=>n.id===edge.to);if(!a||!b)return;
  const path=sdxPath(a,b,model.links.some(e=>e.from===edge.to&&e.to===edge.from));
  group.querySelector('path')?.setAttribute('d',path.d);group.querySelector('.sdx-edge-label')?.setAttribute('transform',`translate(${path.x},${path.y})`);
 });
}
function sdxMount(root){
 const shell=root.querySelector?.('.sdx-shell');
 shell?.addEventListener('keydown',event=>{if(event.key==='Escape'){if(sdxUI.connect){sdxUI.connect=false;sdxUI.from='';sdxUI.notice='';render();}else if(sdxUI.panel)sdxClose();}});
 const svg=root.querySelector?.('#sdx-canvas');
 if(svg)svg.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('.sdx-edge-label'))return;
  const edgeElement=event.target.closest('[data-sdx-edge]');if(edgeElement){sdxOpen('link',edgeElement.getAttribute('data-sdx-edge'));return;}
  const element=event.target.closest('[data-sdx-node]'),id=element?.getAttribute('data-sdx-node');
  if(sdxUI.connect){if(id)sdxNodeClick(id);return;}
  if(id&&sdxUI.snapshot){sdxNodeClick(id);return;}
  if(!sdxReady())return;
  const model=sdxCurrentModel(current()),node=model.variables.find(v=>v.id===id),initial=sdxUI.view||sdxFit(model),matrix=svg.getScreenCTM();if(!matrix)return;
  const point=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(matrix.inverse());};
  const start=point(event);let last=start,moved=false;
  svg.setPointerCapture(event.pointerId);
  const move=e=>{last=point(e);if(Math.hypot(last.x-start.x,last.y-start.y)>4)moved=true;if(node){const nx=node.x+last.x-start.x,ny=node.y+last.y-start.y;element.setAttribute('transform',`translate(${nx},${ny})`);sdxMoveEdges(svg,model,id,nx,ny);}else{sdxUI.view={...initial,x:initial.x-(last.x-start.x),y:initial.y-(last.y-start.y)};sdxApplyView();}};
  const finish=e=>{
   svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerup',finish);svg.removeEventListener('pointercancel',cancel);
   if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
   if(node&&moved){const x=Math.round(node.x+last.x-start.x),y=Math.round(node.y+last.y-start.y);sdxMutate('Posición actualizada',m=>{const v=m.variables.find(n=>n.id===id);if(v){v.x=x;v.y=y;}});}
   else if(node)sdxNodeClick(id);
  };
  const cancel=()=>{svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerup',finish);svg.removeEventListener('pointercancel',cancel);render();};
  svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',cancel);
 });
 if(sdxUI.focusPanel){const heading=root.querySelector?.('#sdx-panel-heading');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});if(typeof window!=='undefined'&&window.matchMedia?.('(max-width: 900px)').matches)heading.scrollIntoView({block:'start',behavior:'instant'});}sdxUI.focusPanel=false;}
}
