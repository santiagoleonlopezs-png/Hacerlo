/* Datos ficticios. Prueba cálculos de fuentes, vínculos, formularios y aislamiento. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const dom=new JSDOM('<!doctype html><main><div id="app"></div></main>',{runScripts:'dangerously',url:'https://fixture.invalid'});
const w=dom.window,d=w.document,errors=[];w.addEventListener('error',e=>errors.push(e.error));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let project={id:'project-a',name:'Piloto Outside <test>',scope:'outside',
 globalResult:{verb:'Incrementar',complement:'el uso sostenido',baseline:0,target:50,dueDate:'2026-12-01',unit:'Porcentaje (%)'},
 behaviors:[{id:'b1',name:'Registrar seguimiento',scope:'specific',audienceIds:['a']},{id:'b2',name:'Resolver el reto',scope:'specific',audienceIds:['b']}],
 audiences:[{id:'a',name:'Usuarios A'},{id:'b',name:'Usuarios B'}],
 audiencePeople:[{id:'p1',audienceId:'a',adoptionHistory:[{behaviorId:'b1',stage:'performs',observedOn:'2026-11-08'}]},{id:'p2',audienceId:'a'},{id:'p3',audienceId:'b'}],
 indicators:[{id:'i1',name:'Seguimientos registrados',type:'Gestión',unit:'Cantidad',baseline:0,target:10,value:0,behaviorIds:['b1'],history:[{date:'2026-11-08',value:0},{date:'2026-11-01',value:2},{date:'2026-11-02',value:3}]},
 {id:'i2',name:'Tiempo de resolución',type:'Resultados',unit:'Tiempo',baseline:10,target:4,value:null,behaviorIds:['b2'],history:[]},
 {id:'i3',name:'Indicador general',type:'Otros',value:''}],
 actions:[{id:'a1',name:'Simplificar el seguimiento',behaviorIds:['b1'],status:'Completada',hypothesis:'Si reducimos pasos, aumentará el registro.'},{id:'a2',name:'Otra intervención',behaviorIds:['b2'],status:'Pendiente'}],
 dimensions:{Entendimiento:null},metrics:{cnps:20},metricHistory:{cnps:[{date:'2026-11-01',value:20}]},
 systemV23:{conditions:[{id:'c1',behaviorId:'b1'}],hypotheses:[{id:'h1',conditionId:'c1',statement:'Reducir esfuerzo',status:'Pendiente',learning:'',decision:''}],events:[]},
 surveys:[{id:'s1',kind:'Libre',title:'Encuesta de prueba',questions:[{id:'q1',label:'Recomendaría la experiencia',type:'cnps',min:0,max:10}],responses:[
 {id:'r1',date:'2026-11-01',wave:'Base',audienceId:'a',answers:{q1:0}},
 {id:'r2',date:'2026-11-08',wave:'Después',audienceId:'a',answers:{q1:10}},
 {id:'r3',date:'2026-11-08',wave:'Después',audienceId:'b',answers:{q1:0}}],momentSettings:{Base:{date:'2026-11-01'},Después:{date:'2026-11-08'}}}],
 surveyHomeSources:{cnps:{surveyId:'s1',key:'question:q1'}},
 diagnosisFindings:[{id:'f1',text:'El formulario genera fricción'}],nodes:[],edges:[],observations:[],modelRuns:[{engine:'abm-v1',date:'2026-11-08',behavior:'Registrar seguimiento',result:{model_version:'abm-1.2',final:{difference:{mean:.9}}}}]};
let saves=0,route='',authListener;const requests=[];
w.safe=esc;w.crypto.randomUUID=randomUUID;w.current=()=>project;w.save=()=>saves++;
w.hcxHero=(title,x)=>'<header class="hcx-hero"><h1>'+esc(title)+'</h1><p>'+esc(x.name)+'</p></header>';
w.cloudReady=false;w.cloudOrgId='org-a';w.page='Analítica';w.phase=4;
w.db={initiatives:[project]};w.go=p=>route=p;w.$=id=>d.getElementById(id);w.alert=message=>{throw Error(message)};
w.confirm=()=>true;w.hcxRememberForm=()=>{};
const responses={activation_sends:[],lab_experience_results:[]};
w.sb={auth:{onAuthStateChange(fn){authListener=fn;}},from(table){
 const q={table,filters:[]};requests.push(q);
 const chain={select(fields){q.fields=fields;return this},eq(key,value){q.filters.push([key,value]);return this},order(){return this},limit(n){q.limit=n;return Promise.resolve({data:responses[table],error:null})}};
 return chain;
}};
for(const path of ['src/modules/encuestas/motor.js','src/modules/encuestas/encuestas.js','src/modules/encuestas/encadenamiento.js','src/modules/encuestas/comparacion-vinculada.js',
 'src/modules/analisis/agentes-evidencia-v2.js','src/modules/analisis/sistemico.js','src/modules/implementacion/operaciones.js','src/modules/medicion/integrada.js']){
 const script=d.createElement('script');script.textContent=fs.readFileSync(path,'utf8');d.body.append(script);
}
w.render=()=>{d.getElementById('app').innerHTML=w.renderMeasurementPage(project)};
const render=w.render;
// Los editores muestran candidatos de toda la iniciativa; comprobar relaciones
// sobre el listado de intervenciones, no sobre las opciones para vincular.
async function exercise(){
 const original=JSON.stringify(project);render();
 assert.equal(JSON.stringify(project),original);assert.equal(errors.length,0);
 assert.equal(d.querySelectorAll('.med-headline .med-core-card').length,3,'INS y CNPS visibles al entrar');
 assert.equal(d.querySelector('.med-dashboard'),null,'La iniciativa no despliega todos los comportamientos');
 assert.equal(d.querySelectorAll('.med-headline [data-metric]').length,3,'Los indicadores mantienen identidad visual propia');
 assert.match(d.querySelector('.med-visual-summary .med-ring').getAttribute('aria-label'),/1 de 2/);
 assert.equal(w.medIndicatorState({value:0,baseline:0,target:10}),'pending','Cero medido sigue siendo un valor');
 assert.equal(w.medIndicatorState({value:null,baseline:0,target:10}),'missing');
 assert.equal(w.medIndicatorState({value:2,baseline:10,target:4}),'met','Meta decreciente');
 assert.equal(w.medIndicatorState({value:10,baseline:10,target:10}),'met','Meta estable');
 assert.equal(w.medIndicatorState({value:3,baseline:null,target:4}),'unconfigured');
 assert.match(w.medVisualSummary([],[]),/Agrega indicadores/);
 assert.doesNotMatch(w.medVisualSummary([],[]),/NaN|Infinity|0%/,'Sin acciones no muestra 0% de cumplimiento');
 assert.doesNotMatch(w.medCoreCard({...project,metrics:{},metricHistory:{},surveyHomeSources:{},surveys:[]},'CNPS','cnps'),/<polyline/,'Sin datos no se dibuja evolución');
 assert.match(w.medTrendPill({current:0,rows:[{date:'2026-11-01',value:10},{date:'2026-11-08',value:0}]}),/↘ -10/);
 assert.match(w.medTrendPill({rows:[{date:'2026-11-01',value:5,definition:'1–5'},{date:'2026-11-08',value:50,definition:'%'}]}),/Revisar comparabilidad/);

 assert.equal(d.querySelectorAll('.med-initiative-indicators .med-indicator').length,3);
 const behaviorSelect=d.getElementById('med-behavior-select');behaviorSelect.value='0';behaviorSelect.dispatchEvent(new w.Event('change',{bubbles:true}));
 d.querySelector('.med-tabs button:nth-child(2)').click();
 assert.match(d.querySelector('.med-tab-content').textContent,/Simplificar el seguimiento/);
 assert.doesNotMatch(d.querySelector('.med-tab-content').textContent,/Otra intervención/,'Las intervenciones de otro comportamiento no aparecen');
 d.querySelector('.med-tabs button:first-child').click();
 assert.equal(d.querySelector('.med-tabs button:first-child').getAttribute('aria-pressed'),'true');
 w.medSetFilter('behavior','1');
 assert.match(d.querySelector('.med-tab-content').textContent,/Tiempo de resolución/);
 assert.doesNotMatch(d.querySelector('.med-tab-content').textContent,/Seguimientos registrados/);
 w.medSetFilter('behavior','0');
 assert.equal(saves,0,'Explorar el tablero no modifica registros');
 const card=d.querySelector('[data-med-behavior="b1"]');
 assert.match(card.textContent,/Seguimientos registrados/);
 assert.match(card.textContent,/1 de 2.*estado evaluado/);
 assert.match(card.querySelector('.med-adoption-bar').getAttribute('aria-label'),/Realiza: 1/);
 assert.match(card.querySelector('.med-adoption-bar').getAttribute('aria-label'),/Sin evidencia suficiente: 1/);
 assert.match(card.querySelector('.med-ring').getAttribute('aria-label'),/1 de 1/,'Resumen filtrado al comportamiento seleccionado');
 assert.equal(w.medActions(project,project.behaviors[0],0).length,1);
 assert.match(w.medModelRuns(project),/90.*No es un efecto observado/);
 assert.equal(project.measurementV1,undefined,'No se concluye que una hipótesis esté respaldada por una simulación');
 assert.equal(w.medCoreSeries(project,'cnps').current,0,'Última encuesta tiene balance 0; no confundir con ausencia');
 const surveyCard=w.medCoreCard(project,'CNPS','cnps');
 assert.match(surveyCard,/Encuesta de prueba/);assert.match(surveyCard,/-100/);
 assert.doesNotMatch(surveyCard,/<td>20<\/td>/,'No mezclar historial manual en una tarjeta de encuesta');
 assert.match(w.metricHistoryView(project,'cnps'),/Encuesta de prueba/);
 assert.doesNotMatch(w.metricHistoryView(project,'cnps'),/<td>20<\/td>/);
 const manual={...project,surveyHomeSources:{cnps:{manual:true}}};
 assert.equal(w.medCoreSeries(manual,'cnps').current,20);
 const missing={...project,surveyHomeSources:{cnps:{surveyId:'missing',key:'global'}}};
 assert.equal(w.medCoreSeries(missing,'cnps').current,null,'Fuente eliminada no usa valor manual');
 const empty={...project,surveys:[{...project.surveys[0],responses:[]}]};
 assert.equal(w.medCoreSeries(empty,'cnps').current,null);
 assert.match(w.medAdoption({...project,audiencePeople:[{id:'p',audienceId:'a'}]},project.behaviors[0]),/No significa cero adopción/);
 const chart=w.medSeriesChart(w.medHistory(project.indicators[0].history),{baseline:0,target:10,label:'Prueba'});
 assert.match(chart,/Línea base 0/);assert.match(chart,/Meta 10/);
 const parsed=new JSDOM(chart),circles=[...parsed.window.document.querySelectorAll('circle')];
 assert.equal(circles.length,3);
 const xs=circles.map(c=>Number(c.getAttribute('cx')));
 assert.ok(xs[2]-xs[1]>5*(xs[1]-xs[0]),'Espaciado temporal real');parsed.window.close();
 assert.match(w.medSeriesChart([{date:'sinfecha',value:0}]),/sin fecha válida/);
 assert.doesNotMatch(w.medSeriesChart([{date:'sinfecha',value:0}]),/NaN|Infinity/);
 const changedScale=w.medSeriesChart([{date:'2026-11-01',value:5,definition:'Escala 1–5'},{date:'2026-11-08',value:80,definition:'Porcentaje'}]);
 assert.doesNotMatch(changedScale,/<polyline/);assert.match(changedScale,/definiciones diferentes/);
 assert.match(w.medIndicatorCard(project,{baseline:10,target:4,value:3,unit:'minutos'}),/Alcanza la meta/);
 assert.match(w.medLabProfiles([{simulator_id:'cultura-cvf',sample_size:5,captured_at:'2026-11-08',data:{current:[0,25,25,50],preferred:[25,25,25,25]}}]),/<td>0<\/td>/);
 // Vínculos explícitos conservan respuestas y otras asociaciones.
 let form=d.querySelector('[data-med-behavior="b1"] .med-link-editor form');
 form.querySelector('input[name="surveys"][value="0"]').checked=true;
 const sourceResponses=JSON.stringify(project.surveys[0].responses);
 w.medSaveLinks({preventDefault(){},target:form},0);
 assert.deepEqual(Array.from(project.measurementV1.surveyLinks.s1),['b1']);
 assert.deepEqual(Array.from(project.actions[1].behaviorIds),['b2']);
 assert.equal(JSON.stringify(project.surveys[0].responses),sourceResponses);
 assert.equal(w.medIndicators(project,project.behaviors[0],0).length,1);
 // Filtrar audiencia afecta encuestas/adopción; los indicadores siguen generales.
 w.medSetFilter('audience','a');
 assert.equal(w.medSurveyEvolution(project.surveys[0],'a').comparisons.find(m=>m.key==='evo:nps').latestValue,100);
 assert.match(d.querySelector('[data-med-behavior="b1"]').textContent,/Valor general, sin segmentación/);
 assert.equal(d.querySelectorAll('[data-med-behavior]').length,1);
 w.medSetTab('learning');
 form=d.querySelector('.med-review form');form.elements.status.value='Avance observado';form.elements.learning.value='Registro contrastado con la fuente';form.elements.decision.value='Ajustar';
 w.medSaveReview({preventDefault(){},target:form},0);
 assert.equal(project.measurementV1.reviews['b1|audience:a'].decision,'Ajustar');
 assert.equal(project.systemV23.hypotheses[0].status,'Pendiente');
 w.medSetFilter('audience','');
 assert.doesNotMatch(d.querySelector('[data-med-behavior="b1"] .med-review').textContent,/Registro contrastado/,'Revisión segmentada no se presenta como global');
 form=d.querySelector('[data-med-behavior="b1"] .med-hypothesis form');
 form.elements.status.value='Respaldada parcialmente';form.elements.learning.value='Contraste cualitativo';form.elements.decision.value='Continuar';
 w.medSaveHypothesis({preventDefault(){},target:form},'h1');
 assert.equal(project.systemV23.hypotheses[0].status,'Respaldada parcialmente');
 assert.equal(project.systemV23.events.length,1);
 w.medSetFilter('behavior','all');
 assert.equal(d.querySelectorAll('.med-headline .med-core-card').length,3);
 assert.equal(d.querySelector('.med-dashboard'),null);
 // Un resultado global requiere asociación explícita, no una media automática.
 const selector=d.querySelector('.med-outcome select');selector.value='0';w.medSetGlobalIndicator(selector);
 assert.equal(project.measurementV1.globalIndicatorId,'i1');
 assert.match(d.querySelector('.med-global-current').textContent,/Valor actual: 0/);
 w.medOpenSurvey('s1');assert.equal(route,'Encuestas y experiencias');
 // Solo se abre un acordeón principal a la vez.
 const first=d.querySelector('[data-med-fold="analysis"]'),general=d.querySelector('[data-med-fold="general"]');
 first.open=true;w.medToggleFold(first);general.open=true;w.medToggleFold(general);assert.equal(first.open,false);
 // Datos ajenos/maliciosos son texto; el selector también escapa valores.
 project.behaviors[0].name='<img src=x onerror="window.pwned=1">';render();
 assert.equal(d.querySelector('.med-page img'),null);assert.equal(w.pwned,undefined);
 assert.doesNotMatch(d.getElementById('app').innerHTML,/NaN|undefined%/);
 // Aislamiento de consultas externas: filtros de organización e iniciativa.
 project._cloudId='cloud-a';w.cloudReady=true;authListener('SIGNED_IN',{user:{id:'user-a'}});
 responses.activation_sends=[{accepted_count:2}];await w.medLoadExternal();
 assert.equal(requests.length,2);
 for(const r of requests){assert.deepEqual(r.filters,[['organization_id','org-a'],['initiative_id','cloud-a']]);assert.ok(!/email|recipient_name|answers/.test(r.fields));}
 const a=project;project={id:'other',_cloudId:'cloud-b',name:'Otra iniciativa',behaviors:[],indicators:[],actions:[],surveys:[],audiences:[],metrics:{}};
 render();assert.doesNotMatch(w.medExternalBody(project),/2 registros consultados/);
 await w.medLoadExternal();assert.equal(requests.length,4);
 authListener('SIGNED_OUT',null);assert.match(w.medExternalBody(project),/Consulta los resultados/,'Cerrar sesión descarta caché');
 // Navegar mientras una consulta está pendiente no escribe en otra iniciativa.
 const delayed=[];w.sb.from=()=>({select(){return this},eq(){return this},order(){return this},limit(){return new Promise(resolve=>delayed.push(resolve));}});
 project=a;render();const pending=w.medLoadExternal(true);
 project={id:'race-other',_cloudId:'cloud-race',name:'Otra',behaviors:[],indicators:[],actions:[],surveys:[],audiences:[],metrics:{}};render();
 delayed.forEach(resolve=>resolve({data:[{sample_size:999}],error:null}));await pending;
 assert.doesNotMatch(d.getElementById('med-external-body').textContent,/999/);
 w.cloudReady=false;project=a;render();
 // Formularios de otra iniciativa no pueden guardar.
 w.medSetFilter('behavior','0');w.medSetTab('learning');
 const stale=d.querySelector('.med-review form');project={id:'different',behaviors:[{id:'b1'}]};const before=saves;
 w.medSaveReview({preventDefault(){},target:stale},0);assert.equal(saves,before);
 const previous=project;
 project={id:'legacy',name:'Legacy',behaviors:[{name:'Conducta antigua'}],indicators:[{name:'Medida',behavior:'Conducta antigua'}],actions:[{name:'Acción',analysisOrigin:{scope:'behavior:0'}}],audiences:[],surveys:[],metrics:{}};render();w.medSetFilter('behavior','0');
 form=d.querySelector('.med-link-editor form');assert.equal(form.querySelector('input[name="actions"]').checked,true);
 w.medSaveLinks({preventDefault(){},target:form},0);
 assert.equal(project.actions[0].behaviorIds[0],project.behaviors[0].id);
 assert.equal(project.indicators[0].behaviorIds[0],project.behaviors[0].id);
 project=previous;
 await new Promise(resolve=>w.setTimeout(resolve,0));
 assert.equal(errors.length,0);assert.ok(saves>=4);
 console.log('Medición integrada OK: fuentes, fechas, vínculos, revisión humana, segmentación, XSS y consultas aisladas.');
 w.close();
}
exercise().catch(error=>{console.error(error);w.close();process.exitCode=1});
