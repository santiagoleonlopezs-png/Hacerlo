/* HACERLO · Plan ejecutivo: lectura de datos reales, navegación y protección contra duplicaciones. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('src/core/app.js'),html=read('index.html');
const planCode=read('src/modules/implementacion/plan-ejecutivo.js');
assert.match(app,/\['Plan de cambio','▤'\]/);
assert.match(app,/'Plan de cambio':3/);
assert.match(app,/if\(page==='Plan de cambio'\)\{a\.innerHTML=planExecPreviewPage\(x\);return\}/);
assert.match(html,/src\/modules\/implementacion\/plan-ejecutivo\.js\?v=1\.0\.0/);
assert.match(html,/assets\/css\/plan-ejecutivo\.css\?v=1\.0\.0/);
const c={console,Number,Date,Math};
vm.createContext(c);vm.runInContext(planCode,c);
const x={name:'Evolución cultural',scope:'inside',description:'Acompañamiento al cambio',
 globalResult:{verb:'Incrementar',complement:'las conversaciones de retroalimentación',
  baseline:35,target:70,dueDate:'2027-06-30',unit:'Porcentaje (%)',measureType:'Frecuencia de comportamiento'},
 objectiveBehavior:{actor:'Líderes',action:'realizan conversaciones de retroalimentación',
  context:'reuniones de equipo',frequency:'Semanal'},
 audiencePeople:[{name:'Persona privada',email:'privado@empresa.local',audienceId:'aud1'}],
 audiences:[{id:'aud1',name:'Líderes de equipo',kind:'Grupo',population:20}],
 behaviors:[{id:'b1',name:'Retroalimentar semanalmente'}],
 behaviorDiagnosis:{'Entorno::Tiempo':{factor:'Tiempo disponible',dimension:'Entorno',role:'Barrera'},
  'Capacidad::Práctica':{factor:'Habilidades previas',dimension:'Capacidad',role:'Facilitador'}},
 diagnosisFindings:[{text:'Las reuniones no tienen espacio para retroalimentación',source:'Observación'}],
 actions:[{name:'Enviar un recordatorio conductual',status:'En ejecución',
  owner:'Equipo de cambio',start:'2026-11-12',end:'2026-12-10',
  mechanisms:['comunicacion','reconocimiento'],
  mechanismRecords:{comunicacion:[{title:'Recordatorio',status:'realizada'}]},
  learningLabExperience:'nexus'},
 {name:'Reconocer prácticas',status:'Pendiente',start:'',end:''}],
 indicators:[{name:'Frecuencia de retroalimentación',type:'Resultados',baseline:35,target:70,value:42,unit:'Porcentaje (%)'}]};
const before=JSON.stringify(x);
const slides=c.planExecMakeSlides(x);
assert.equal(slides.length,8);
assert.deepEqual([...slides.map(s=>s.id)],['portada','norte','diagnostico','audiencias','acciones','ruta','medicion','decisiones']);
assert.match(slides[0].html,/Evolución cultural/);
assert.match(slides[1].html,/Incrementar las conversaciones de retroalimentación/);
assert.match(slides[1].html,/35/);
assert.match(slides[1].html,/70/);
assert.match(slides[1].html,/Líderes realizan conversaciones/);
assert.match(slides[2].html,/Tiempo disponible/);
assert.match(slides[2].html,/Habilidades previas/);
assert.match(slides[2].html,/Las reuniones no tienen espacio/);
assert.match(slides[3].html,/Líderes de equipo/);
assert.doesNotMatch(slides[3].html,/privado@empresa.local/);
assert.doesNotMatch(slides[3].html,/Persona privada/);
assert.match(slides[4].html,/Enviar un recordatorio conductual/);
assert.match(slides[4].html,/Equipo de cambio/);
assert.match(slides[5].html,/Ejecuciones declaradas/);
assert.match(slides[5].html,/Experiencias de laboratorio asignadas/);
assert.match(slides[6].html,/Frecuencia de retroalimentación/);
assert.match(slides[6].html,/42/);
assert.match(slides[7].html,/Asignar responsables/);
assert.equal(JSON.stringify(x),before,'La presentación no modifica ni duplica los datos existentes');
const preview=c.planExecPreviewPage(x);
assert.match(preview,/Tu estrategia, lista para presentar/);
assert.match(preview,/▶ Presentar/);
assert.match(preview,/Imprimir \/ Guardar PDF/);
assert.match(preview,/8 diapositivas/);
assert.equal((preview.match(/class="plan-thumb"/g)||[]).length,8);
const slideHTML=c.planExecSlideHTML(slides[0],0,slides.length);
assert.match(slideHTML,/01 \/ 08/);
const empty={name:'Plan & <ideas>',actions:[],audiences:[],indicators:[],behaviors:[]};
const emptyBefore=JSON.stringify(empty);
const missing=c.planExecMakeSlides(empty);
assert.equal(missing.length,8);
assert.match(missing[1].html,/Resultado global no registrado/);
assert.match(missing[4].html,/Aún no se han registrado acciones/);
assert.match(missing[6].html,/No hay indicadores registrados/);
assert.match(missing[7].html,/Acordar el resultado global/);
assert.match(missing[0].html,/Plan &amp; &lt;ideas&gt;/);
assert.equal(JSON.stringify(empty),emptyBefore);
const attack={...empty,name:'<img src=x onerror=alert(1)>',
 actions:[{name:'<script>alert(1)</script>',owner:'',status:'Pendiente'}]};
const rendered=c.planExecMakeSlides(attack).map(v=>v.html).join('');
assert.doesNotMatch(rendered,/<script>/);
assert.doesNotMatch(rendered,/<img /);
assert.match(rendered,/&lt;script&gt;/);
assert.match(rendered,/&lt;img /);
assert.equal(c.planExecDate('2026-11-06'),'06/11/2026');
assert.equal(c.planExecDate('mal'),'Sin fecha');
assert.equal(c.planExecNumber(''), '—');
assert.equal(c.planExecNumber(null), '—');
assert.equal(c.planExecNumber(0), '0');
assert.equal(c.planExecMakeSlides(null).length,0);
console.log('Plan ejecutivo HACERLO OK: RDAIM en vivo, 8 láminas, lectura no destructiva, privacidad y vacíos.');
