/* Regresión: acceso al Laboratorio sin fusionar plataformas ni requerir iniciativas. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=path=>fs.readFileSync(path,'utf8');
const core=read('src/core/app.js');
const moduleCode=read('src/modules/implementacion/laboratorio.js');
const recommendationCode=read('src/modules/implementacion/laboratorio-recomendaciones.js');
const kanbanCode=read('src/modules/medicion/paneles.js');
const html=read('index.html');
const css=read('assets/css/laboratorio-acceso.css');
assert.match(core, /\{title:'Implementación',step:3,items:\[\['Intervenciones','▥'\],\['Laboratorio','◇'\]\]\}/);
assert.match(core, /'Intervenciones':3,'Laboratorio':3/);
const route=core.indexOf("if(page==='Laboratorio'){a.innerHTML=renderLearningLabPage();return}");
const noInitiative=core.indexOf("if(!x){a.innerHTML=");
assert.ok(route>=0&&noInitiative>route,'Debe abrirse aunque no haya iniciativa seleccionada');
assert.match(core,/if\(phase===3\)body=[^\n]+\+renderLearningLabTile\(\);/);
assert.ok(html.includes('assets/css/laboratorio-acceso.css?v=1.1.0'));
assert.ok(html.includes('src/modules/implementacion/laboratorio.js?v=1.1.0'));
assert.ok(html.indexOf('src/modules/implementacion/laboratorio.js')<html.indexOf('src/core/bootstrap.js'));
assert.match(css,/\.hcx-lab-hero/);
const sandbox={};
vm.createContext(sandbox);
vm.runInContext(moduleCode+'\n'+recommendationCode,sandbox);
const card=sandbox.renderLearningLabTile(),page=sandbox.renderLearningLabPage();
assert.match(card,/Laboratorio de Aprendizaje y Decisión/);
assert.match(card,/go\('Laboratorio'\)/);
assert.match(page,/https:\/\/laboratorio\.hacerlofc\.com\//);
assert.match(page,/target="_blank"/);
assert.match(page,/rel="noopener noreferrer"/);
assert.match(page,/Dos plataformas, un ecosistema/);
assert.match(page,/Un espacio para experimentar, tomar decisiones y comprender cómo nuestras acciones transforman los resultados/);
assert.ok(html.includes('src/modules/implementacion/laboratorio-recomendaciones.js?v=1.0.0'));
assert.match(kanbanCode,/labExperienceLink\(z\.learningLabExperience\)/);
assert.doesNotMatch(page,/<iframe\b/i);

const testInitiative={id:1,name:'Transformación del servicio',actions:[],
 diagnosisFindings:[{text:'Resistencia al cambio en los equipos'}],
 behaviorDiagnosis:{'Entorno::Normas sociales y culturales':{factor:'Normas sociales y culturales',role:'Barrera'}},
 behaviors:[{name:'Compartir conocimiento con colegas'}]
};
let saveCount=0,visited='';
sandbox.safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
sandbox.current=()=>testInitiative;
sandbox.save=()=>{saveCount++};
sandbox.go=destination=>{visited=destination};
const suggestions=sandbox.labRecommendedExperiences(testInitiative);
assert.equal(suggestions.length,2,'Máximo dos recomendaciones');
assert.ok(suggestions.some(x=>x.id==='cultura'),'Diagnóstico cultural sugiere Radar de Cultura');
assert.ok(suggestions.some(x=>x.id==='nexus'),'Hallazgo de resistencia sugiere NEXUS');
assert.equal(sandbox.labRecommendedExperiences({name:'Proyecto sin señales'}).length,0,'No inventa recomendaciones');
assert.match(sandbox.learningLabRecommendationsSection({name:'Proyecto sin señales'}),/Todavía no hay información suficiente/);
const contextual=sandbox.renderLearningLabPage();
assert.match(contextual,/Para tu iniciativa/);
assert.match(contextual,/Añadir a intervenciones/);
assert.match(contextual,/cultura-cvf\.html/);
assert.match(contextual,/nexus\.html/);
sandbox.labAddExperienceToInterventions('nexus');
assert.equal(saveCount,1);
assert.equal(visited,'Intervenciones');
assert.equal(testInitiative.actions.length,1);
assert.equal(testInitiative.actions[0].learningLabExperience,'nexus');
assert.equal(testInitiative.actions[0].status,'Pendiente');
assert.equal(testInitiative.actions[0].source,'Laboratorio de Aprendizaje y Decisión');
sandbox.labAddExperienceToInterventions('nexus');
assert.equal(testInitiative.actions.length,1,'No duplica la misma experiencia');
assert.equal(saveCount,1,'No guarda una segunda acción duplicada');
assert.match(sandbox.learningLabRecommendationsSection(testInitiative),/Ver intervención/);
assert.ok(!JSON.stringify(testInitiative.actions).includes('diagnosisFindings'),'Solo vincula la experiencia, no transfiere el diagnóstico');
assert.match(sandbox.labExperienceLink('nexus'),/^https:\/\/laboratorio\.hacerlofc\.com\/nexus\.html$/);
assert.equal(sandbox.labExperienceLink('desconocido'),'','No abre destinos arbitrarios');

console.log('Laboratorio HACERLO V2 OK: navegación, entrada independiente y acceso externo seguro.');
