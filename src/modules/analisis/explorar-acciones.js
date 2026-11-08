/* HACERLO · Proposals from explicit network/system structure. No AI calls or automatic execution. */
let hxaUI={initiative:'',origin:'',scope:'',mode:'home',draft:null,suggestions:[],notice:''};
function hxaRender(focus=false){render();if(focus){const el=document.querySelector('.hxa-panel input, .hxa-panel summary, .hxa-panel button');el?.focus({preventScroll:true});}}
function hxaReady(){return typeof hcxPrepareNavigation!=='function'||hcxPrepareNavigation();}
function hxaContext(origin){const x=current();return {initiative:String(x.id),origin,scope:origin==='system'?sdxUI.key:'graph'};}
function hxaOpen(origin){
 if(!hxaReady()||origin==='system'&&sdxUI.snapshot)return;
 const context=hxaContext(origin);hxaUI={...context,mode:'home',draft:null,suggestions:[],notice:''};
 if(origin==='graph')graphWorkspaceOpen('actions');else sdxOpen('actions');
 const heading=document.querySelector('.hcg-drawer>h2,.sdx-detail>h2');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
}
function hxaSync(origin){const c=hxaContext(origin);if(['initiative','origin','scope'].some(k=>hxaUI[k]!==c[k]))hxaUI={...c,mode:'home',draft:null,suggestions:[],notice:''};}
function hxaFingerprint(x,origin,scope){
 if(origin==='graph')return JSON.stringify({nodes:(x.nodes||[]).map(n=>[n._cloudNodeId,n.name,n.type,n.graphFactors]),edges:x.edges||[],layer:x.networkRelationFilter||'Todas'});
 const m=typeof sdxModel==='function'?sdxModel(x,scope):{};return JSON.stringify({variables:m.variables,links:m.links,boundary:m.boundary});
}
function hxaGraphSuggestions(x){
 const ns=(x.nodes||[]).map(n=>typeof graphResolvedNode==='function'?graphResolvedNode(x,n):n),filter=x.networkRelationFilter||'Todas';
 const edges=(x.edges||[]).filter(e=>ns[e.s]&&ns[e.t]&&(filter==='Todas'||edgeRelation(e)===filter)),out=[];
 const target=(kind,index,label)=>({kind,index,label,id:kind==='node'?x.nodes[index]._cloudNodeId||'':x.edges[index]._cloudEdgeId||''});
 for(const edge of edges){const factors=(edge.graphFactors||[]).filter(f=>f.role!=='Facilitador');if(!factors.length)continue;
  const label=ns[edge.s].name+' → '+ns[edge.t].name;
  out.push({key:'signal:'+x.edges.indexOf(edge),name:'Probar un ajuste en la conexión '+label,expected:'Si abordamos «'+factors[0].name+'», esperamos facilitar esta conexión. Hay que contrastarlo.',why:'Esta conexión tiene una alerta registrada: '+factors[0].name+'. La alerta no demuestra por sí sola una causa.',measurement:'',target:target('edge',x.edges.indexOf(edge),label)});break;
 }
 const neighbors=ns.map(()=>new Set()),degree=ns.map(()=>0);for(const e of edges){if(e.s===e.t)continue;neighbors[e.s].add(Number(e.t));neighbors[e.t].add(Number(e.s));degree[e.s]++;degree[e.t]++;}
 const seen=new Set(),components=[];for(let i=0;i<ns.length;i++){if(seen.has(i))continue;const group=[],queue=[i];seen.add(i);while(queue.length){const j=queue.pop();group.push(j);for(const k of neighbors[j])if(!seen.has(k)){seen.add(k);queue.push(k);}}components.push(group);}
 if(components.length>1){const first=components[0][0],second=components[1][0],label=ns[first].name+' ↔ '+ns[second].name;
  out.push({key:'bridge:'+first+':'+second,name:'Ensayar un enlace de coordinación entre '+ns[first].name+' y '+ns[second].name,expected:'Si conectamos estos grupos, esperamos facilitar el intercambio entre ellos.',why:'Hay '+components.length+' grupos sin conexión entre sí en '+(filter==='Todas'?'la red dibujada':'la capa «'+filter+'»')+'. Comprueba primero si la separación es intencional o faltan registros.',measurement:'',target:target('node',first,label)});
 }
 if(edges.length){const i=degree.indexOf(Math.max(...degree));if(degree[i]>1)out.push({key:'hub:'+i,name:'Probar una ruta que no dependa solo de '+ns[i].name,expected:'Si distribuimos parte de la coordinación, esperamos reducir la dependencia de un único punto.',why:'«'+ns[i].name+'» participa en '+degree[i]+' conexiones de esta vista. Ese conteo no demuestra sobrecarga ni autoridad; revisa si existe dependencia real.',measurement:'',target:target('node',i,ns[i].name)});}
 return out.filter((p,i,all)=>all.findIndex(v=>v.name===p.name)===i).slice(0,3);
}
function hxaSystemSuggestions(x,scope){
 const m=sdxModel(x,scope),out=[],node=id=>m.variables.find(v=>v.id===id),label=e=>(node(e.from)?.name||'')+' → '+(node(e.to)?.name||'');
 for(const e of m.links){if(!e.delay||!node(e.from)||!node(e.to))continue;out.push({key:'delay:'+e.id,name:'Probar una reducción de espera en '+label(e),expected:'Si reducimos esta espera, esperamos observar antes el efecto entre estas variables.',why:'La relación tiene una demora registrada: '+e.delay+'. Confirma si es una espera evitable o un tiempo necesario del proceso.',measurement:'',target:{kind:'link',id:e.id,label:label(e)}});break;}
 for(const cycle of sdxCycles(m).cycles){if(cycle.type==='?')continue;const variable=node(cycle.nodes[0]);if(!variable)continue;
  out.push({key:'loop:'+cycle.id,name:'Ensayar un ajuste pequeño en «'+variable.name+'»',expected:'Si cambiamos esta variable, queremos observar si cambia el patrón del circuito.',why:'La variable forma parte de un bucle de '+(cycle.type==='R'?'refuerzo':'compensación')+' según los signos dibujados. Ese tipo no indica si el efecto es deseable ni confirma causalidad. Define la dirección del cambio antes de probarlo.',measurement:'',target:{kind:'variable',id:variable.id,label:variable.name}});if(out.length===3)break;
 }
 if(out.length<3){const e=m.links.find(l=>node(l.from)&&node(l.to)&&!l.explanation);if(e)out.push({key:'contrast:'+e.id,name:'Observar un cambio acotado en «'+node(e.from).name+'»',expected:'Si varía «'+node(e.from).name+'», queremos contrastar cómo cambia «'+node(e.to).name+'».',why:'La relación dibujada todavía no tiene una explicación registrada. Una prueba pequeña puede aportar evidencia antes de ampliar la intervención.',measurement:'',target:{kind:'link',id:e.id,label:label(e)}});}
 return out.filter((p,i,all)=>all.findIndex(v=>v.name===p.name)===i).slice(0,3);
}
function hxaSuggest(){
 if(!hxaReady())return;const x=current();hxaUI.mode='suggestions';hxaUI.draft=null;
 hxaUI.suggestions=(hxaUI.origin==='graph'?hxaGraphSuggestions(x):hxaSystemSuggestions(x,hxaUI.scope)).map(p=>({...p,fingerprint:hxaFingerprint(x,hxaUI.origin,hxaUI.scope),origin:hxaUI.origin,scope:hxaUI.scope}));hxaUI.notice='';hxaRender(true);
}
function hxaManual(){if(!hxaReady())return;hxaUI.mode='edit';hxaUI.draft={name:'',expected:'',measurement:'',why:'Propuesta de la persona.',origin:hxaUI.origin,scope:hxaUI.scope,fingerprint:hxaFingerprint(current(),hxaUI.origin,hxaUI.scope)};hxaRender(true);}
function hxaUse(index){if(!hxaReady())return;const p=hxaUI.suggestions[Number(index)];if(!p)return;hxaUI.draft={...p};hxaUI.mode='edit';hxaRender(true);}
function hxaDismiss(index){if(!hxaReady())return;hxaUI.suggestions.splice(Number(index),1);render();}
function hxaBack(){if(!hxaReady())return;hxaUI.mode='home';hxaUI.draft=null;render();}
function hxaDrafts(x){return (x.actionExplorationsV1||[]).filter(p=>p.origin===hxaUI.origin&&p.scope===hxaUI.scope&&p.status!=='discarded');}
function hxaFind(id){return (current().actionExplorationsV1||[]).find(p=>p.id===id);}
function hxaEdit(id){if(!hxaReady())return;const p=hxaFind(id);if(!p)return;hxaUI.draft={...p};hxaUI.mode='edit';hxaRender(true);}
function hxaSave(event){
 event.preventDefault();const data=Object.fromEntries(new FormData(event.target)),draft=hxaUI.draft,x=current();if(!draft||hxaUI.origin==='system'&&sdxUI.snapshot)return;
 const name=String(data.name||'').trim().slice(0,180),expected=String(data.expected||'').trim().slice(0,1500);if(!name||!expected)return;
 const id=draft.id||(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():sdxId());
 const proposal={...draft,id,name,expected,measurement:String(data.measurement||'').trim().slice(0,500),status:'proposed',createdAt:draft.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 x.actionExplorationsV1=x.actionExplorationsV1||[];const i=x.actionExplorationsV1.findIndex(p=>p.id===id);if(i<0)x.actionExplorationsV1.push(proposal);else x.actionExplorationsV1[i]=proposal;
 hxaUI.mode='home';hxaUI.draft=null;hxaUI.notice='Propuesta guardada. Todavía no se ha agregado a Implementación.';save();
 // The submitted form is now saved, so navigation must not treat it as an abandoned draft.
 if(typeof hcxRememberForm==='function')hcxRememberForm(event.target);
 if(event.submitter?.value==='simulate')hxaSimulate(id);else render();
}
function hxaImplement(id){
 if(!hxaReady())return;const x=current(),p=hxaFind(id);if(!p)return;
 x.actions=x.actions||[];if(!x.actions.some(a=>a.explorationId===id))x.actions.push({id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():sdxId(),explorationId:id,name:p.name,hypothesis:p.expected,measurement:p.measurement,owner:'',start:'',end:'',status:'Pendiente',mechanisms:['ninguno'],source:p.origin==='graph'?'Grafo de adopción':'Pensamiento sistémico',analysisOrigin:{scope:p.scope,target:p.target||null,why:p.why},createdAt:new Date().toISOString()});
 hxaUI.notice='Acción disponible en Implementación. Completa responsable y fechas antes de ejecutarla.';save();render();
}
function hxaSimulate(id){
 if(!hxaReady())return;const x=current(),p=hxaFind(id);if(!p||p.status==='discarded')return;
 const linked=(x.actions||[]).find(a=>a.explorationId===id);
 const behaviorIndex=p.origin==='system'&&p.scope.startsWith('behavior:')?(x.behaviors||[]).findIndex((b,i)=>String(b.id??i)===p.scope.slice(9)):-1;
 x.abmSettings={...(x.abmSettings||{}),...(behaviorIndex>=0?{behaviorIndex}:{}),intervention:{ref:linked?'action:'+linked.id:'exploration:'+id,name:linked?.name||p.name,kind:linked?'Acción de la iniciativa':p.origin==='graph'?'Propuesta del grafo':'Propuesta del sistema',detail:linked?.hypothesis||p.expected}};save();go('Simulación de agentes');
}
function hxaDiscard(id){if(!hxaReady())return;const p=hxaFind(id);if(!p)return;p.status='discarded';save();render();}
function hxaPanel(origin){
 hxaSync(origin);const x=current(),draft=hxaUI.draft,stale=draft?.fingerprint&&draft.fingerprint!==hxaFingerprint(x,origin,hxaUI.scope);
 const escapedId=id=>`data-id="${safe(id)}"`;
 if(hxaUI.mode==='edit'&&draft)return `<div class="hxa-panel"><button class="hxa-link" type="button" onclick="hxaBack()">← Volver</button>${draft.target?`<p class="hxa-origin">${safe(draft.target.label)}</p>`:''}<form onsubmit="hxaSave(event)"><label>Acción que queremos probar<input name="name" required maxlength="180" value="${safe(draft.name)}"></label><label>Qué queremos comprobar<textarea name="expected" rows="3" required maxlength="1500" placeholder="Si hacemos…, esperamos que…">${safe(draft.expected)}</textarea></label><label>Cómo sabremos si cambia <small>Opcional</small><input name="measurement" maxlength="500" value="${safe(draft.measurement||'')}" placeholder="Indicador u observación que revisaremos"></label><details><summary>Por qué explorar esta acción</summary><p>${safe(draft.why)}</p>${stale?'<p>El dibujo cambió desde esta propuesta. Revisa su fundamento.</p>':''}</details><div class="hxa-buttons"><button class="primary" type="submit">Guardar propuesta</button><button class="secondary" type="submit" name="next" value="simulate">Llevar a simulación ↗</button></div></form></div>`;
 const drafts=hxaDrafts(x);
 return `<div class="hxa-panel"><p class="hxa-hint">Propón una acción o explora hasta tres sugerencias a partir de esta vista.</p><div class="hxa-buttons"><button class="secondary" type="button" onclick="hxaManual()">＋ Proponer una acción</button><button class="secondary" type="button" onclick="hxaSuggest()">✧ Recibir sugerencias</button></div>${hxaUI.notice?`<p class="hxa-hint" role="status">${safe(hxaUI.notice)}</p>`:''}${hxaUI.mode==='suggestions'?`<p class="hxa-hint">Sugerencias por reglas del análisis del dibujo. Son posibilidades para revisar, no efectos comprobados.</p>${hxaUI.suggestions.map((p,i)=>`<details class="hxa-suggestion"><summary>${safe(p.name)}</summary><p>${safe(p.why)}</p><div class="hxa-buttons"><button class="secondary" type="button" onclick="hxaUse(${i})">Revisar y adaptar</button><button class="hxa-link" type="button" onclick="hxaDismiss(${i})">Descartar</button></div></details>`).join('')||'<p class="hxa-hint">No hay información suficiente para otra sugerencia. En el grafo, registra conexiones o alertas; en Sistemas, conecta variables y documenta sus relaciones. También puedes proponer tu propia acción.</p>'}`:''}${drafts.length?`<details class="hxa-saved"><summary>Propuestas guardadas · ${drafts.length}</summary>${drafts.map(p=>`<article><strong>${safe(p.name)}</strong><p>${safe(p.expected)}</p>${p.fingerprint!==hxaFingerprint(x,origin,hxaUI.scope)?'<small>El dibujo cambió; revisa la propuesta.</small>':''}<div class="hxa-buttons"><button type="button" class="hxa-link" ${escapedId(p.id)} onclick="hxaEdit(this.dataset.id)">Editar</button><button type="button" class="hxa-link" ${escapedId(p.id)} onclick="hxaSimulate(this.dataset.id)">Simular ↗</button><button type="button" class="hxa-link" ${escapedId(p.id)} onclick="hxaImplement(this.dataset.id)">${(x.actions||[]).some(a=>a.explorationId===p.id)?'Ya está en Implementación':'Agregar a Implementación'}</button><button type="button" class="hxa-link" ${escapedId(p.id)} onclick="hxaDiscard(this.dataset.id)">Descartar propuesta</button></div></article>`).join('')}</details>`:''}</div>`;
}
