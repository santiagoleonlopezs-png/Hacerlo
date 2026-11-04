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
for(const path of ['src/modules/encuestas/motor.js','src/modules/encuestas/encuestas.js','src/modules/encuestas/encadenamiento.js'])vm.runInContext(read(path),ctx);
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
assert.match(f.eeChainPanel(x,during),/Conectar encuestas para comparar momentos/);
assert.match(f.eeChainPanel(x,during),/Pulso inicial/);
assert.match(f.eeChainPanel(x,during),/Guardar momentos y orden/);
assert.match(f.eeChainPanel(x,during),/Escalas equivalentes|No hay otras encuestas|Revisión por resultados/);
f.eeChainLink(x,during,incompatible.id,'Durante','Después');
assert.equal(f.eeChainMembers(x,during).length,3,'Vincula encuesta diferente cuando es parte de la serie');
assert.equal(f.eeChainFullCompatible(x,during),false);
const separate=f.eeChainOverview(x,during);
assert.match(separate,/Secuencia de medición/);
assert.match(separate,/Escala diferente/);
assert.match(separate,/Solo se contrastan preguntas/,'Comparar solamente preguntas iguales, sin inventar índices globales');
assert.equal(f.eeChainComparableMetrics(x,during).rows.length,1,'Solo preguntas realmente comparables entre base y durante');
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
assert.match(read('index.html'),/encadenamiento\.js\?v=1\.0\.0/);
assert.match(read('src/modules/encuestas/encuestas.js'),/eeChainEvolution\(x,s,eeFilter\.audienceId\)/);
f.eeChainUnlink(x,during,base.id);
assert.equal(f.eeChainMembers(x,during).length,3);
assert.equal(base.measurementGroupId,undefined);
assert.equal(JSON.stringify(base.responses),origBefore);
console.log('Encuestas vinculadas OK: banco compatible, conexión libre, siguiente medición vinculada y datos intactos.');
