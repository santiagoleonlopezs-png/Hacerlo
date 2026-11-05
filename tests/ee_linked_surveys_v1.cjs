/* Regresión: conectar encuestas de diferentes olas sin tocar los instrumentos. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const x={id:1,name:'Cultura organizacional',audiences:[],indicators:[],surveys:[]};
const ctx={
 console,crypto:{randomUUID},structuredClone,current:()=>x,
 render:()=>{},save:()=>{},confirm:()=>true,alert:message=>{throw Error(message)},
 safe:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 $:()=>({textContent:'',setAttribute(){}})
};
vm.createContext(ctx);
for(const path of ['src/modules/encuestas/motor.js','src/modules/encuestas/encuestas.js','src/modules/encuestas/encadenamiento.js','src/modules/encuestas/comparacion-vinculada.js'])vm.runInContext(read(path),ctx);
const create=(title,id,moment,score,qid='q001',scaleMax=10)=>({
 id,title,kind:'SENTIR',status:'active',version:1,createdAt:'2026-11-01T00:00:00Z',
 questions:[{id:qid,label:'Tengo claridad sobre el cambio.',type:'scale',dimension:'Preparación',min:0,max:scaleMax}],
 responses:[{id:'r_'+id,date:'2026-11-04',wave:moment,answers:{[qid]:score},audienceId:''}],wave:moment
});
const base=create('Pulso inicial','base','Antes',2,'x1');
const during=create('Pulso noviembre','during','Durante',9,'x2');
const incompatible=create('Escala diferente','different','Después',4,'x3',5);
const many=create('Dos olas internas','many','Antes',1,'x4');many.responses.push({id:'r2',wave:'Durante',answers:{x4:8}});
x.surveys=[during,base,incompatible,many];
const methods=['eeChainLink','eeChainMembers','eeChainEvolution','eeChainIssue','eeChainStrictCompatibility','eeChainFullCompatible','eeChainUnlink','eeChainPanel','eeChainOverview','eeChainCreateNext','eeChainComparableMetrics'];
const f=Object.fromEntries(methods.map(k=>[k,vm.runInContext(k,ctx)]));
const dateInfo=vm.runInContext('eeChainDateInfo',ctx);
assert.equal(dateInfo(base).date,'2026-11-04');
assert.equal(dateInfo(base).source,'Primera respuesta');
base.applicationStart='2026-10-28T10:00:00-05:00';
assert.equal(dateInfo(base).date,'2026-10-28');
assert.equal(dateInfo(base).source,'Inicio de aplicación');
base.measurementDate='2026-10-29';
assert.equal(dateInfo(base).date,'2026-10-29');
assert.equal(dateInfo(base).source,'Fecha ajustada');
delete base.applicationStart;delete base.measurementDate;

assert.equal(f.eeChainIssue(during,base),'','IDs diferentes pero mismo banco deben enlazar');
assert.equal(f.eeChainIssue(during,incompatible),'','Permitir conexión conceptual aunque los instrumentos sean distintos');
assert.equal(f.eeChainIssue(during,many),'','No limitar la agrupación por etiqueta interna de ola');
assert.equal(f.eeChainStrictCompatibility(during,incompatible),false,'No calcular como equivalentes escalas distintas');
const origBefore=JSON.stringify(base.responses),origDuring=JSON.stringify(during.responses);
f.eeChainLink(x,during,base.id,'Durante','Base');
assert.equal(during.measurementGroupId,base.measurementGroupId);
assert.equal(f.eeChainMembers(x,during).length,2);
assert.equal(f.eeChainFullCompatible(x,during),true);
const e=f.eeChainEvolution(x,during,'');
assert.equal(e.series.length,2);
assert.equal(e.baseline,'Base');
assert.equal(e.latest,'Durante');
assert.equal(e.series[0].n,1);
assert.equal(e.series[1].n,1);
const metric=e.comparisons.find(m=>m.key==='evo:global');
assert.equal(metric.baselineValue,-100);
assert.equal(metric.latestValue,100);
assert.equal(metric.delta,200);
assert.equal(JSON.stringify(base.responses),origBefore,'No cambiar respuestas de base');
assert.equal(JSON.stringify(during.responses),origDuring,'No cambiar respuestas actuales');
assert.throws(()=>f.eeChainLink(x,during,base.id,'Durante','Durante'),/vinculada|momento|seguimiento/i);
assert.match(f.eeChainPanel(x,during),/Conectar y comparar encuestas/);
assert.match(f.eeChainPanel(x,during),/Pulso inicial/);
assert.match(f.eeChainPanel(x,during),/Guardar ajustes/);
assert.match(f.eeChainPanel(x,during),/Seleccionar encuesta|No hay otras encuestas disponibles/,'Opciones de vinculación compactas');
f.eeChainLink(x,during,incompatible.id,'Durante','Después');
assert.equal(f.eeChainMembers(x,during).length,3,'Vincula encuesta diferente cuando es parte de la serie');
assert.equal(f.eeChainFullCompatible(x,during),false);
const separate=f.eeChainOverview(x,during);
assert.match(separate,/Secuencia vinculada/);
assert.match(separate,/Escala diferente/);
assert.match(separate,/Comparación entre momentos/,'Una vinculación tiene resultados comparados, no solo una lista de encuestas');
assert.match(separate,/Índice global propio/,'Presenta resultados de cada instrumento sin interpretar índices distintos como iguales');
assert.equal(f.eeChainComparableMetrics(x,during).rows.length,1,'Solo preguntas realmente comparables entre base y durante');
assert.match(f.eeChainPanel(x,during),/Primera respuesta/,'El formulario identifica la fecha de la primera respuesta');
assert.match(f.eeChainPanel(x,during),/value="2026-11-04"/,'La fecha se carga automáticamente del instrumento');
assert.match(f.eeChainPanel(x,during),/<select name="moment_0"/,'Selector de momento compacto');
const compare=vm.runInContext('eeLinkedRows',ctx);
const diff=vm.runInContext('eeLinkedDiff',ctx);
const canCompare=vm.runInContext('eeLinkedCanCompare',ctx);
assert.equal(compare(x,during).rows.length,1);
const alternative=create('Medición reformulada','alt','Seguimiento',7,'altq');
alternative.questions[0].label='Percibo claridad sobre el cambio.';
x.surveys.push(alternative);
f.eeChainLink(x,during,alternative.id,'Durante','Seguimiento');
assert.equal(compare(x,during).rows.length,1,'Redacción diferente no se asume comparable automáticamente');
assert.equal(canCompare(base.questions[0],alternative.questions[0]),true);
assert.equal(canCompare(base.questions[0],incompatible.questions[0]),true,'Escalas 0–10 y 0–5 pueden normalizarse con confirmación manual');
const wrongDirection={...alternative.questions[0],reverse:true};
assert.equal(canCompare(base.questions[0],wrongDirection),false,'No mezclar escalas de direcciones opuestas');
x.measurementQuestionLinks=[{id:'link1',groupId:during.measurementGroupId,
 firstSurveyId:base.id,firstQuestionId:base.questions[0].id,
 secondSurveyId:alternative.id,secondQuestionId:alternative.questions[0].id,label:'Claridad frente al cambio'}];
const outcome=compare(x,during).rows;
assert.equal(outcome.length,1,'Una variable equivalente se consolida en una sola fila a través de las mediciones, sin duplicar comparación automática y manual');
const manuallyMapped=outcome.find(r=>r.source==='manual');
assert.ok(manuallyMapped);
assert.equal(diff(manuallyMapped),60,'El cambio de la serie consolidada se calcula entre el primer y último momento cronológico; se conservan los valores normalizados');
assert.match(f.eeChainOverview(x,during),/Claridad frente al cambio/);
assert.match(f.eeChainOverview(x,during),/↑ \+60/);

/* Prueba de interacción: el facilitador debe poder guardar la equivalencia
   desde el formulario real, sin modificar respuestas originales. */
ctx.FormData=class {constructor(form){this.values=form.values;}get(k){return this.values[k]??null;}};
vm.runInContext('eeSelected='+JSON.stringify(during.id),ctx);
vm.runInContext('eeVerifySave = async ()=>true',ctx);
const mapAction=vm.runInContext('eeLinkedSaveQuestionMap',ctx);
const entriesBefore=x.measurementQuestionLinks.length;
const mapEvent={preventDefault(){},target:{values:{
 first:base.id+'|'+base.questions[0].id,
 second:incompatible.id+'|'+incompatible.questions[0].id,
 equivalent:'yes'
}}};
mapAction(mapEvent);
assert.equal(x.measurementQuestionLinks.length,entriesBefore+1,'Guardar desde formulario crea un vínculo persistente');
assert.equal(x.measurementQuestionLinks.at(-1).label,base.questions[0].label,'La relación toma el nombre original automáticamente, sin pedir otro campo');
assert.match(vm.runInContext('eeChainComparisonView',ctx)(x,during), /eeLinkedChooseCounterpart\(this.form\)/, 'El formulario guía hacia preguntas de distintas encuestas');
assert.match(vm.runInContext('eeChainComparisonView',ctx)(x,during), /data-ee-map-feedback/, 'La respuesta de guardado o error aparece junto al botón');
const mappingCount=x.measurementQuestionLinks.length;
mapAction({preventDefault(){},target:{values:{
 first:base.id+'|'+base.questions[0].id,
 second:base.id+'|'+base.questions[0].id,
 equivalent:'yes'
}}});
assert.equal(x.measurementQuestionLinks.length,mappingCount,'No guardar correspondencia de dos preguntas dentro de una misma encuesta');
const firstSelect={value:base.id+'|'+base.questions[0].id};
const secondSelect={value:'',options:[
 {value:''},{value:base.id+'|'+base.questions[0].id},
 {value:during.id+'|'+during.questions[0].id},
 {value:incompatible.id+'|'+incompatible.questions[0].id}
]};
const pairForm={elements:{namedItem:name=>name==='first'?firstSelect:secondSelect},querySelector:()=>null};
vm.runInContext('eeLinkedChooseCounterpart',ctx)(pairForm);
assert.equal(secondSelect.options[1].disabled,true,'Evita seleccionar preguntas de la misma encuesta');
assert.equal(secondSelect.value,during.id+'|'+during.questions[0].id,'Sugiere automáticamente la pregunta equivalente de otra medición');
const consolidated=compare(x,during).rows;
assert.equal(consolidated.length,1,'La misma pregunta no se duplica por agregar otra equivalencia manual');
assert.equal(consolidated[0].unit,'%');
assert.equal(consolidated[0].values.length,4,'La variable reúne los cuatro momentos vinculados');
const chainOrder=f.eeChainMembers(x,during);
const baseIndex=chainOrder.findIndex(z=>z.id===base.id),otherIndex=chainOrder.findIndex(z=>z.id===incompatible.id);
assert.equal(consolidated[0].values[baseIndex].value,20,'Se mantiene la base de la escala original 0–10');
assert.equal(consolidated[0].values[otherIndex].value,80,'Escala 0–5 normalizada a 0–100 para comparar');
assert.equal(consolidated[0].values[otherIndex].value-consolidated[0].values[baseIndex].value,60,'Diferencia entre las dos mediciones normalizadas');
assert.equal(diff(consolidated[0]),60,'La diferencia total sigue entre la primera y última medición cronológica con datos');
const evolutionData=vm.runInContext('eeLinkedEvolutionData',ctx)(x,during);
assert.ok(evolutionData.sharedPercent.length>0,'El seguimiento debe alimentar un resultado global comparable');
assert.equal(evolutionData.series.length,4,'La evolución contempla todas las encuestas vinculadas');
assert.ok(evolutionData.comparisons.some(row=>row.key==='linked:global'&&row.delta!==null),'Debe calcular variación global a partir de preguntas equivalentes');
const linkedDashboard=vm.runInContext('eeLinkedEvolutionDashboard',ctx);
ctx.eeMetricChart=(e,key)=>'<div data-test-chart="'+key+'"></div>';
ctx.eeEvolutionTable=(e,keys)=>'<div data-test-table="'+keys.join(',')+'"></div>';
ctx.eeNumber=n=>String(n);
assert.match(linkedDashboard(x,during),/Resultados comparables entre momentos/,'Los resultados globales vinculados llegan al panel principal');
assert.match(linkedDashboard(x,during),/data-test-chart="linked:global"/,'Se presenta una gráfica temporal con los momentos vinculados');
assert.match(read('src/modules/encuestas/encuestas.js'),/eeLinkedEvolutionDashboard\(x,s,eeFilter\.audienceId\)/,'La pantalla principal integra el comparativo vinculado');
const resultsScreen=read('src/modules/encuestas/encuestas.js');
const evolutionRender=resultsScreen.slice(resultsScreen.indexOf('function eeEvolutionResults(x,s){'),resultsScreen.indexOf('function eeMomentSettings(',resultsScreen.indexOf('function eeEvolutionResults(x,s){')));
assert.match(evolutionRender,/<h2>Resultados propios de la encuesta seleccionada<\/h2>/,'El resultado individual conserva su título y detalle');
assert.match(evolutionRender, /<\/section>\$\{linkedIntro\}\$\{eeChainPanel\(x,s\)\}/, 'El seguimiento vinculado aparece después del resultado individual y antes de la gestión de relaciones');
assert.doesNotMatch(evolutionRender, /<section class="panel ee-evolution">\$\{linkedIntro\}/,'El comparativo no desplaza el resultado individual');
assert.match(f.eeChainOverview(x,during),/Claridad frente al cambio|Tengo claridad sobre el cambio/,'El análisis conserva los nombres de las preguntas validadas');
assert.equal(JSON.stringify(base.responses),origBefore);
assert.equal(JSON.stringify(during.responses),origDuring);


vm.runInContext('eeSelected='+JSON.stringify(during.id),ctx);
vm.runInContext('eeVerifySave = async ()=>true',ctx);
f.eeChainCreateNext();
const next=x.surveys.find(z=>z.id!==during.id&&z.previousSurveyId===during.id);
assert.ok(next);
assert.equal(next.responses.length,0,'No copiar respuestas');
assert.equal(next.measurementGroupId,during.measurementGroupId,'Crear ya vinculada');
assert.equal(next.status,'draft');
assert.equal(next.questions.length,during.questions.length);
assert.equal(next.publication,undefined);
const autoNew=compare(x,during);
assert.ok(autoNew.rows.some(row=>row.questionRefs.some(q=>q.surveyId===next.id&&q.questionId===next.questions[0].id)),
 'Crear siguiente medición vincula sus mismas preguntas automáticamente, sin crear asociaciones manuales');
const restored=JSON.parse(JSON.stringify(x));
const restoredNext=restored.surveys.find(z=>z.id===next.id);
assert.equal(restoredNext.responses.length,0,'La nueva encuesta no hereda respuestas ni siquiera después de persistir');
assert.ok(compare(restored,restoredNext).rows.some(row=>row.questionRefs.some(q=>q.surveyId===next.id)),
 'La comparación automática sobrevive al guardado y nueva carga de la iniciativa');
assert.equal(restored.measurementQuestionLinks.length,x.measurementQuestionLinks.length,
 'Las correspondencias manuales permanecen después del guardado');
assert.match(read('index.html'),/encadenamiento\.js\?v=\d+(?:\.\d+)+/,'El módulo actualizado debe estar versionado para publicación');
assert.match(read('index.html'),/comparacion-vinculada\.js\?v=\d+(?:\.\d+)+/,'La comparación actualizada debe estar versionada');
assert.match(read('src/modules/encuestas/encuestas.js'),/function eeEvolutionResults\(x,s\)\{const e=EE\.evolution\(s,eeFilter\.audienceId\)/,'La encuesta seleccionada conserva sus resultados principales');
assert.doesNotMatch(read('src/modules/encuestas/encuestas.js'),/return eeChainOverview\(x,s\)/,'El seguimiento no sustituye el panel');
assert.match(read('src/modules/encuestas/encuestas.js'),/\$\{eeChainPanel\(x,s\)\}/,'La vinculación aparece después de resultados propios');
f.eeChainUnlink(x,during,base.id);
assert.equal(f.eeChainMembers(x,during).length,4);
assert.equal(base.measurementGroupId,undefined);
assert.equal(JSON.stringify(base.responses),origBefore);
console.log('Encuestas vinculadas OK: banco compatible, conexión libre, siguiente medición vinculada y datos intactos.');
