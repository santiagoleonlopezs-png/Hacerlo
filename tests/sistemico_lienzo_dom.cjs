/* Run with NODE_PATH pointing to jsdom@26.1.0 installed outside production assets. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<!doctype html><html><body><main><div id="app"></div></main></body></html>',{runScripts:'dangerously',url:'https://fixture.invalid/'}),w=dom.window,d=w.document;
let saves=0,allow=true,asks=0;const alerts=[],errors=[];w.addEventListener('error',event=>errors.push(event.error));
const x={id:'fixture',name:'Piloto ficticio',behaviors:[{id:'b',name:'Coordinar equipos'}],actions:[{id:'a',name:'Revisar el proceso',status:'Pendiente'}],indicators:[{id:'i',name:'Reprocesos',unit:'Cantidad',history:[{date:'2026-01-01',value:20},{date:'2026-02-01',value:0}],value:0}],systemV23:{conditions:[{id:'old',name:'Registro previo'}],mechanisms:[],hypotheses:[],events:[]}};
const legacy=JSON.stringify(x.systemV23);
w.current=()=>x;w.save=()=>saves++;w.safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.confirm=()=>{asks++;return allow};w.alert=m=>alerts.push(m);w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.fetch=()=>{throw Error('Network access forbidden in UI fixture')};w.cloudSaveVersion=0;w.cloudConfirmedVersion=0;
w.render=()=>w.sdxRender(d.getElementById('app'),x);
for(const path of ['src/modules/analisis/sistemico-lienzo.js','src/core/experiencia-segura.js']){const script=d.createElement('script');script.textContent=fs.readFileSync(path,'utf8');d.body.append(script);}
w.render();assert.equal(saves,0);assert.equal(d.querySelectorAll('button.primary').length,2,'Dos entradas al mismo primer paso, sin paneles vacíos');
const click=text=>{const button=[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert.ok(button,'Botón '+text);button.click();};
const field=(name,value)=>{const input=d.querySelector('.sdx-detail [name="'+name+'"]');assert.ok(input,'Campo '+name);input.value=value;};
const submit=()=>{const form=d.querySelector('.sdx-detail form');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
click('＋ Variable');field('name','Carga de trabajo');submit();assert.equal(w.sdxModel(x).variables.length,1);
click('＋ Variable');field('name','Tiempo disponible');field('indicator',JSON.stringify({id:'i',name:'Reprocesos'}));submit();assert.equal(w.sdxModel(x).variables.length,2);
assert.ok(d.querySelector('.sdx-trend-value').textContent.includes('0'),'Cero válido visible');assert.ok(d.querySelector('.sdx-spark'));
x.indicators[0].history.push({date:'2026-03-01',value:11});w.render();assert.ok(d.querySelector('.sdx-trend-value').textContent.includes('11'),'Tendencia automática al refrescar');
const [a,b]=w.sdxModel(x).variables;
click('↗ Conectar');w.sdxNodeClick(a.id);w.sdxNodeClick(b.id);field('sign','-');field('explanation','Más carga deja menos tiempo.');submit();
click('↗ Conectar');w.sdxNodeClick(b.id);w.sdxNodeClick(a.id);field('sign','+');submit();assert.equal(w.sdxCycles(w.sdxModel(x)).cycles[0].type,'B');
assert.ok(d.querySelector('.sdx-loop-B'));d.querySelector('.sdx-loop-B').click();assert.match(d.querySelector('#sdx-panel-heading').textContent,/Compensación/);
field('expected','R');submit();assert.ok(d.querySelector('.sdx-warning'),'Revisión del tipo esperado frente al calculado');
w.sdxNodeClick(a.id);field('name','Texto sin guardar');allow=false;const count=saves;click('◈ Arquetipos');assert.equal(saves,count);assert.equal(d.querySelector('[name="name"]').value,'Texto sin guardar');assert.ok(asks>0);
allow=true;click('◈ Arquetipos');assert.ok(d.querySelector('.sdx-stage.is-preview .sdx-template-svg'));click('Usar esta plantilla');assert.equal(w.sdxModel(x).variables.length,7);assert.equal(JSON.stringify(x.systemV23),legacy);
w.sdxOpen('boundary');field('question','¿Por qué se repiten los reprocesos?');field('inside','Coordinación y decisiones');field('outside','Mercado externo');field('influence','Reglas del equipo');field('horizon','Tres meses');submit();assert.match(d.querySelector('.sdx-question').textContent,/reprocesos/);
w.sdxLever(a.id,'variable');field('expected','Si reducimos interrupciones, esperamos mejorar la coordinación.');field('action',JSON.stringify({id:'a',name:'Revisar el proceso'}));submit();assert.equal(w.sdxModel(x).levers.length,1);assert.equal(x.actions.length,1);
const leverId=w.sdxModel(x).levers[0].id;w.sdxEditLever(leverId);field('expected','Ajustar la coordinación');submit();assert.equal(w.sdxModel(x).levers.length,1);assert.equal(w.sdxModel(x).levers[0].expected,'Ajustar la coordinación');
w.sdxLever(b.id,'variable');field('expected','Reducir reprocesos');field('action','new');field('actionName','Probar una regla');field('start','2026-12-10');field('end','2026-12-01');submit();assert.equal(x.actions.length,1);assert.ok(alerts.at(-1).includes('fecha final'));
field('end','2026-12-20');submit();assert.equal(x.actions.length,2);assert.equal(x.actions[1].source,'Pensamiento sistémico');
w.sdxOpen('history');field('name','Antes del piloto');field('moment','Antes');submit();const snapshot=w.sdxModel(x).snapshots[0];assert.ok(snapshot.model.variables.length);
w.sdxViewSnapshot(snapshot.id);assert.ok(d.querySelector('.sdx-version-banner'));w.sdxNodeClick(a.id);assert.ok(d.querySelector('.sdx-detail fieldset').disabled);const noWrite=saves;w.sdxMutate('No permitido',m=>m.variables=[]);assert.equal(saves,noWrite);
w.sdxViewSnapshot('');w.sdxOpen('archive');assert.match(d.querySelector('.sdx-detail').textContent,/Registro previo/);
// All inline controls must compile, including escaped user strings.
for(const element of d.querySelectorAll('[onclick],[onchange],[onkeydown],[onsubmit]'))for(const key of ['onclick','onchange','onkeydown','onsubmit'])if(element.hasAttribute(key))assert.equal(typeof element[key],'function',key+' '+element.outerHTML);
w.sdxOpen('variable');field('name','<img src=x onerror="alert(1)">');submit();assert.equal(d.querySelectorAll('img').length,0,'Los nombres se escapan');
// Drag updates the drawing immediately and persists only on release.
const svg=d.getElementById('sdx-canvas'),node=svg.querySelector('[data-sdx-node]'),nodeId=node.getAttribute('data-sdx-node'),beforeNode={...w.sdxModel(x).variables.find(v=>v.id===nodeId)},beforePath=svg.querySelector('[data-sdx-edge] path').getAttribute('d');
svg.getScreenCTM=()=>({inverse:()=>({})});svg.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return this}});let captured=false;svg.setPointerCapture=()=>captured=true;svg.hasPointerCapture=()=>captured;svg.releasePointerCapture=()=>captured=false;
const pointer=(type,px,py)=>{const e=new w.MouseEvent(type,{bubbles:true,button:0,clientX:px,clientY:py});Object.defineProperty(e,'pointerId',{value:1});return e;};
const beforeDrag=saves;node.querySelector('rect').dispatchEvent(pointer('pointerdown',100,100));svg.dispatchEvent(pointer('pointermove',150,130));assert.equal(saves,beforeDrag);assert.equal(w.sdxModel(x).variables.find(v=>v.id===nodeId).x,beforeNode.x);assert.notEqual(svg.querySelector('[data-sdx-edge] path').getAttribute('d'),beforePath);
svg.dispatchEvent(pointer('pointerup',150,130));assert.equal(saves,beforeDrag+1);assert.equal(w.sdxModel(x).variables.find(v=>v.id===nodeId).x,beforeNode.x+50);
const savedBeforeView=saves;w.sdxToggleList();assert.ok(d.querySelector('.sdx-variable-list'));assert.equal(saves,savedBeforeView,'Cambiar la vista no escribe datos');
assert.equal(JSON.stringify(x.systemV23),legacy);
assert.equal(errors.length,0,'No hay errores de ejecución en los controles');
console.log('UX sistémica OK: formularios, conexiones, B/R, cambios pendientes, plantillas, alcance, tendencias, acciones, versiones y escape HTML.');
w.close();
