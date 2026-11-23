/* Synthetic initiatives only: verify the context actually sent to the AI gateway. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const copy=value=>JSON.parse(JSON.stringify(value));
const blank=()=>({boundary:{},variables:[],links:[],levers:[],loopNames:{},events:[],snapshots:[]});
const initiativeModel={...blank(),boundary:{question:'¿Qué sostiene los reprocesos?',inside:'Coordinación',outside:'Mercado',influence:'Reglas de atención',horizon:'Tres meses'},
 variables:[{id:'a',name:'Carga de trabajo',description:'Solicitudes pendientes',indicator:{id:'i',name:'Reprocesos'},sourceRef:'finding:f1',sourceName:'Hallazgo del diagnóstico'},{id:'b',name:'Tiempo disponible'}],
 links:[{id:'ab',from:'a',to:'b',sign:'-',delay:'Dos semanas',explanation:'La carga reduce el tiempo disponible',evidence:'Entrevista de prueba',status:'Observación'},{id:'ba',from:'b',to:'a',sign:'+',status:'Hipótesis'}],
 loopNames:{'ab|ba':{name:'Ciclo de carga',expected:'B'}},
 levers:[{id:'lever',target:'ab',type:'link',expected:'Si reducimos interrupciones, esperamos recuperar tiempo',action:{id:'action',name:'Nombre anterior'}}],
 events:[{date:'2026-11-23',label:'Relación guardada'}],snapshots:[{id:'old',name:'Antes',model:{variables:[{name:'VERSION_HISTORICA_NO_ACTUAL'}]}}]};
const behaviorModel={...blank(),variables:[{id:'a',name:'Claridad del registro'},{id:'b',name:'Práctica del registro'}],links:[{id:'ab',from:'a',to:'b',sign:'?',explanation:'Relación por explorar'}]};
const x={id:'initiative-a',name:'Piloto ficticio A',behaviors:[{id:'b1',name:'Registrar solicitudes'}],indicators:[{id:'i',name:'Reprocesos',unit:'Cantidad',history:[{date:'2026-01-01',value:3},{date:'2026-02-01',value:0},{date:'invalid',value:9},{date:'2026-03-01',value:''}],value:0}],actions:[{id:'action',name:'Probar una regla de coordinación',status:'Pendiente'}],systemVariables:[{id:'legacy',name:'Variable anterior'}],systemLinks:[],systemDynamicsV1:{version:1,models:{initiative:initiativeModel,'behavior:b1':behaviorModel}},surveys:[]};
let active={id:'other',name:'OTRA_INICIATIVA_NO_ENVIAR'},sent=null,saves=0;
const ctx={console,Date,Map,Set,WeakSet,WeakMap,JSON,Math,AbortController,setTimeout,clearTimeout,setInterval(){},page:'Inteligencia integrada',current:()=>active,save:()=>saves++,render(){},safe:v=>String(v??''),normalizedStatus:v=>v,hcxHero:()=>'<h1>Inteligencia integrada</h1>',
 SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fixture-key',sb:{auth:{getSession:async()=>({data:{session:{access_token:'fixture-session'}}})}},
 fetch:async(url,request)=>{sent=JSON.parse(request.body);return {ok:true,json:async()=>({system_reading:'Interpretación ficticia',interventions:[]})};}};
vm.createContext(ctx);
for(const path of ['src/modules/analisis/sistemico-lienzo.js','src/modules/inteligencia/ia.js','src/modules/inteligencia/integrada.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
const original=JSON.stringify(x),payload=ctx.initiativeAIPayload(x),diagram=payload.initiative.analysis.system.diagram;
assert.equal(JSON.stringify(x),original,'Preparar el contexto no modifica los datos');
assert.equal(diagram.models.sourceRecords,2);assert.equal(diagram.variables.sourceRecords,4);assert.equal(diagram.links.sourceRecords,3);
assert.equal(diagram.models.examples[0].boundary.question,'¿Qué sostiene los reprocesos?');
assert.equal(diagram.models.examples[1].scopeName,'Registrar solicitudes');
assert.equal(diagram.links.examples[0].fromName,'Carga de trabajo');assert.equal(diagram.links.examples[0].toName,'Tiempo disponible');assert.equal(diagram.links.examples[0].sign,'-');assert.equal(diagram.links.examples[0].delay,'Dos semanas');assert.equal(diagram.links.examples[0].evidence,'Entrevista de prueba');
assert.equal(diagram.links.examples[2].fromName,'Claridad del registro','Los IDs iguales de distintos ámbitos no se mezclan');
assert.equal(diagram.loops.examples[0].type,'B');assert.equal(diagram.loops.examples[0].name,'Ciclo de carga');
assert.equal(diagram.variables.examples[0].indicator.latest.value,0);assert.equal(diagram.variables.examples[0].indicator.history.records,2);
assert.equal(diagram.interventions.examples[0].action.name,'Probar una regla de coordinación');assert.equal(diagram.interventions.examples[0].targetName,'Carga de trabajo → Tiempo disponible');
assert.equal(diagram.history.examples[0].label,'Relación guardada');
assert.equal(payload.initiative.analysis.system.variables.examples[0].name,'Variable anterior','Los registros previos siguen disponibles');
assert.doesNotMatch(JSON.stringify(payload),/OTRA_INICIATIVA_NO_ENVIAR|VERSION_HISTORICA_NO_ACTUAL/);
assert.ok(payload.initiative.context_coverage.sources.some(s=>s.source==='initiative.analysis.system.diagram.links'&&s.records===3));
assert.equal(ctx.aiCoverageLabel('initiative.analysis.system.diagram.links'),'Relaciones del lienzo sistémico');
const fingerprint=ctx.aiSourceFingerprint(x),changed=copy(x);changed.systemDynamicsV1.models.initiative.links[0].delay='Tres semanas';assert.notEqual(ctx.aiSourceFingerprint(changed),fingerprint,'Modificar el lienzo avisa que la interpretación necesita actualizarse');
assert.match(ctx.integratedAIBlock({...changed,integratedAIAnalysis:{sourceFingerprint:fingerprint,system_reading:'Resultado anterior'}}),/Hay cambios en la iniciativa/);
assert.match(ctx.intelligencePage(copy(x)),/4 variables/);assert.match(ctx.intelligencePage(copy(x)),/3 relaciones por contrastar/);
assert.equal(ctx.aiSystemDiagramContext({}).variables.sourceRecords,0);
const large=copy(x);large.systemDynamicsV1.models={};
for(let i=0;i<45;i++)large.systemDynamicsV1.models['behavior:'+i]={...blank(),variables:Array.from({length:25},(_,j)=>({id:String(j),name:'Variable '+i+' '+j,description:'Detalle '.repeat(80)})),links:Array.from({length:25},(_,j)=>({id:String(j),from:String(j),to:String((j+1)%25),sign:'+',explanation:'Explicación '.repeat(60)}))};
const bounded=ctx.initiativeAIPayload(large);assert.ok(ctx.aiContextSize(bounded)<=30000);assert.equal(bounded.initiative.analysis.system.diagram.variables.sourceRecords,1125);assert.ok(bounded.initiative.analysis.system.diagram.models.examples.some(m=>m.loopsTruncated));
// Exercise the survey wrapper and the real request builder without any external request.
ctx.eeBalanceRanges=()=>[];
vm.runInContext(fs.readFileSync('src/modules/encuestas/integracion.js','utf8'),ctx);
assert.equal(ctx.initiativeAIPayload(x).initiative.analysis.system.diagram.links.sourceRecords,3,'Las extensiones de encuestas conservan el lienzo');
active=x;
(async()=>{await ctx.runIntegratedAI();assert.equal(sent.action,'interpret');assert.equal(sent.payload.initiative.id,x.id);assert.equal(sent.payload.initiative.analysis.system.diagram.links.sourceRecords,3);assert.equal(x.integratedAILastAttempt.status,'success');assert.equal(saves,1);assert.equal(x.integratedAIAnalysis.sourceFingerprint,ctx.aiSourceFingerprint(x));console.log('IA sistémica OK: lienzos actuales, ámbitos, signos, demoras, bucles, indicadores, acciones, cobertura, cambios y contexto enviado al gateway.');})().catch(error=>{console.error(error);process.exitCode=1;});
