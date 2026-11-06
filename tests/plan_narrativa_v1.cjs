/* HACERLO: narrativa visual y orden del plan con datos existentes */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8'),html=read('index.html');
assert.match(html,/plan-narrativa\.js\?v=1\.0\.0/);
assert.ok(html.indexOf('plan-ejecutivo.js')<html.indexOf('plan-narrativa.js'));
const ctx={console,Date,Number,Math,hcxHero:()=>'<header>HACERLO</header>'};
vm.createContext(ctx);
vm.runInContext(read('src/modules/implementacion/plan-ejecutivo.js'),ctx);
vm.runInContext(read('src/modules/implementacion/plan-narrativa.js'),ctx);
const x={name:'Evolución cultural',scope:'inside',
 globalResult:{verb:'Fortalecer',complement:'la cooperación',baseline:30,target:65,unit:'Porcentaje (%)'},
 objectiveBehavior:{actor:'Líderes',action:'promueven acuerdos'},
 audiences:[{id:'a1',name:'Líderes',kind:'Grupo'}],
 actions:[{name:'Acompañar líderes',status:'Pendiente',owner:'Equipo de cambio',mechanisms:['comunicacion']}],
 indicators:[{name:'Cooperación',baseline:30,target:65,value:40}],behaviors:[]};
ctx.current=()=>x;
let saved=0,rendered=0;
ctx.save=()=>{saved++};ctx.render=()=>{rendered++};
const original=JSON.stringify(x);
assert.equal(ctx.planExecMakeSlides(x).length,8);
assert.equal(JSON.stringify(x),original,'Leer no modifica ni agrega registros');
ctx.planNarrativeSetValue({
 title:'Tejiendo una cultura de acuerdos',
 metaphor:'Cada hilo construye un tejido más fuerte.',
 message:'Cada conversación fortalece nuestra capacidad colectiva.',
 theme:'ambar',showConcept:true
},'Guardado');
assert.equal(saved,1);
let slides=ctx.planExecMakeSlides(x);
assert.equal(slides.length,9);
assert.equal(slides[0].id,'portada');
assert.equal(slides[1].id,'concepto');
assert.match(slides[0].html,/Tejiendo una cultura de acuerdos/);
assert.match(slides[0].html,/Cada hilo construye/);
assert.match(slides[1].html,/Cada conversación fortalece/);
assert.equal(slides[2].id,'norte');
assert.equal(slides[0].planTheme,'ambar');
assert.match(ctx.planExecSlideHTML(slides[0],0,slides.length),/plan-theme-ambar/);
const page=ctx.planExecPreviewPage(x);
assert.match(page,/Narrativa y concepto visual/);
assert.match(page,/Orden y visibilidad de diapositivas/);
assert.match(page,/9 diapositivas/);
assert.match(page,/Cargar imagen guía para el plan/);
ctx.planNarrativeMoveSlide('diagnostico',-1);
slides=ctx.planExecMakeSlides(x);
assert.equal(slides[2].id,'diagnostico','El usuario reordena sin rehacer datos');
assert.equal(slides[3].id,'norte');
ctx.planNarrativeToggleSlide('medicion',false);
slides=ctx.planExecMakeSlides(x);
assert.equal(slides.length,8);
assert.ok(!slides.some(s=>s.id==='medicion'));
ctx.planNarrativeToggleSlide('medicion',true);
assert.equal(ctx.planExecMakeSlides(x).length,9);
ctx.planNarrativeToggleSlide('portada',false);
assert.equal(ctx.planExecMakeSlides(x)[0].id,'portada','Portada fija y obligatoria');
const raw=JSON.stringify(x.globalResult);
const attack='<img src=x onerror=alert(1)>';
ctx.planNarrativeSetValue({title:attack,metaphor:'<script>bad()</script>'},'test');
slides=ctx.planExecMakeSlides(x);
assert.doesNotMatch(slides[1].html,/<img src=x/);
assert.match(slides[1].html,/&lt;img src=x/);
assert.match(slides[0].html,/&lt;script&gt;/);
assert.equal(JSON.stringify(x.globalResult),raw);
assert.equal(ctx.planNarrativeSafeImage('data:image/svg+xml;base64,PHN2Zz4='),'');
assert.equal(ctx.planNarrativeSafeImage('javascript:alert(1)'),'');
const sample='data:image/webp;base64,'+'a'.repeat(140)+'==';
assert.equal(ctx.planNarrativeSafeImage(sample),sample);
ctx.planNarrativeSetValue({image:sample,title:'Evolución cultural',metaphor:'Una travesía de cambio'},'test');
slides=ctx.planExecMakeSlides(x);
assert.match(ctx.planExecSlideHTML(slides[0],0,slides.length),/plan-guide-background/);
assert.match(ctx.planExecSlideHTML(slides[1],1,slides.length),/plan-concept-art/);
assert.equal(ctx.planExecMakeSlides(null).length,0);
const present=ctx.planExecMakeSlides(x),before=JSON.stringify(x);
assert.equal(present.length,9);
assert.equal(JSON.stringify(x),before,'La vista narrativa no muta el estado');
assert.equal(x.actions.length,1,'No se crean acciones ni datos duplicados');
assert.equal(x.indicators.length,1);
console.log('Plan Narrativo v1 OK: metáfora, imagen segura, temas, orden, visibilidad, preservación RDAIM.');
