/* Contratos de evidencia HACERLO V2: cálculo local, cobertura y procedencia. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('src/modules/analisis/agentes-evidencia-v2.js','utf8');
const context={console,safe:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')};
vm.createContext(context);vm.runInContext(code,context);
const behavior={id:'b1',name:'Registrar interacciones',scope:'specific',audienceIds:['a']};
const when=(stage,date,behaviorId='b1')=>({behaviorId,stage,observedOn:date,recordedAt:date+'T12:00:00Z'});
const x={audiences:[{id:'a',name:'Asesores'},{id:'b',name:'No aplicable'}],
  audiencePeople:[
    {id:'p1',audienceId:'a',adoptionHistory:[when('understands','2026-01-01'),when('performs','2026-02-01')]},
    {id:'p2',audienceId:'a',adoptionHistory:[when('sustains','2026-02-01')]},
    {id:'p3',audienceId:'a',adoptionHistory:[]},
    {id:'p4',audienceId:'b',adoptionHistory:[when('sustains','2026-02-01')]},
    {id:'p5',audienceId:'a',adoptionHistory:[when('tries','2026-02-01'),when('unknown','2026-03-01')]}
  ],nodes:[
    {name:'Asesores',type:'Persona',sourceKind:'audiencia',sourceId:'a'},
    {name:'Indefinido',type:'Persona'}
  ],behaviors:[behavior]};
const result=context.abmV2EvidenceSummary(x,behavior);
assert.equal(result.eligible,4);
assert.equal(result.confirmed,2);
assert.equal(result.measured,2);
assert.equal(result.unknown,2);
assert.equal(result.observedPct,50);
assert.equal(result.coveragePct,50);
assert.equal(result.stages.performs,1);
assert.equal(result.stages.sustains,1);
assert.equal(result.stages.unknown,2);
assert.equal(result.byAudience.a.confirmed,2);
assert.equal(result.byAudience.b,undefined);
assert.equal(result.source,'Gestión de audiencias · historial de adopción');
const html=context.renderABMV2Evidence(x,behavior);
assert.match(html,/Cobertura de evidencia/);
assert.match(html,/50.0%/);
assert.match(html,/disabled/);
assert.equal(context.abmV2AudienceId(x,x.nodes[0],0),'a');
assert.equal(context.abmV2AudienceId(x,x.nodes[1],1),'');
x.abmAudienceMap={0:'b'};
assert.equal(context.abmV2AudienceId(x,x.nodes[0],0),'b','El mapeo explícito prevalece sobre el catálogo');
x.abmAudienceMap={};
x.audiencePeople[2].adoptionHistory=[when('performs','2026-03-01')];
x.audiencePeople[4].adoptionHistory.push(when('tries','2026-04-01'));
const ready=context.abmV2EvidenceSummary(x,behavior);
assert.equal(ready.measured,4);
assert.equal(ready.coveragePct,100);
assert.equal(ready.confirmed,3);
assert.equal(ready.observedPct,75);
const readyHtml=context.renderABMV2Evidence(x,behavior);
assert.match(readyHtml,/75.0%/);
assert.doesNotMatch(readyHtml,/disabled onclick="abmV2UseObservedBase/);
// La función de aplicación requiere una acción explícita, no se ejecuta al renderizar.
assert.equal(x.abmSettings,undefined);
const network={
  edges:[
    {s:0,t:1,relation:'Influye en',evidence:'Observada',measureType:'influence',measureValue:4},
    {s:1,t:2,relation:'Influye en',evidence:'Declarada',measureType:'influence',measureValue:5},
    {s:2,t:3,relation:'Influye en',evidence:'Hipótesis',measureType:'influence',measureValue:1},
    {s:3,t:4,relation:'Influye en',evidence:'Registrada'},
    {s:4,t:5,relation:'Colabora con',evidence:'Observada'},
    {s:5,t:5,relation:'Influye en',evidence:'Observada',measureType:'influence',measureValue:5}
  ]
};
const net=context.abmV2NetworkEdges(network,[0,1,2,3,4,5]);
assert.equal(net.edges.length,2);
assert.equal(net.candidate,4);
assert.equal(net.excludedUnverified,2);
assert.equal(net.unmeasured,1);
assert.equal(net.edges[0].weight,.8);
assert.equal(net.edges[1].weight,.5);
assert.equal(context.abmV2NetworkEdges(network,[0,1]).edges.length,1);

const systemic={
  behaviorDiagnosis:{
    o:{role:'Barrera',factor:'Sin permisos en CRM',dimension:'Entorno'},
    c:{role:'Facilitador',factor:'Experiencia',dimension:'Capacidad'}
  },systemV23:{conditions:[
    {name:'Restricción de permisos',orientation:'Dificulta',state:'Persistente',behaviorId:'b1'},
    {name:'Condición resuelta',orientation:'Dificulta',state:'Resuelta',behaviorId:'b1'},
    {name:'No relacionada',orientation:'Dificulta',state:'Presente',behaviorId:'b2'}
  ]}
};
const hypotheses=context.abmV2HypothesisContext(systemic,behavior);
assert.equal(hypotheses.factors.length,1);
assert.equal(hypotheses.conditions.length,1);
assert.match(context.renderABMV2Hypotheses(systemic,behavior),/NO alteran automáticamente/);
assert.match(context.renderABMV2Hypotheses(systemic,behavior),/Sin permisos en CRM/);

console.log('Evidencia V2 OK: cobertura, última medición, audiencias, mapeo y opt-in');
