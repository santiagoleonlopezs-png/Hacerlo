/* Centro HACERLO · Recorridos editables, métricas técnicas sin manipular envíos. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const source=read('src/modules/implementacion/centro-seguimiento.js');
const frontend=read('src/modules/implementacion/centro-activacion.js');
const backend=read('supabase/functions/hacerlo-activation-email/index.ts');
const webhook=read('supabase/functions/hacerlo-resend-webhook/index.ts');
const initiative={
 name:'Cambio operativo',audiences:[{id:'aud-1',name:'Operaciones'},{id:'aud-2',name:'Líderes'}],
 actions:[{id:'act-1',name:'Facilitar reporte',mechanisms:['comunicacion'],
 activationSequence:[{id:'step-1',stage:'activar',title:'Primer paso',audienceIds:['aud-1'],status:'sent',kind:'comunicacion'}]}]
};
let saved=0,rendered=0,network=0;
const ctx={
 console,Date,Number,
 current:()=>initiative,save:()=>saved++,render:()=>rendered++,
 cacBusy:false,cacKeepVisibleDraft:()=>true,cacAction:()=>({action:initiative.actions[0],index:0}),
 cacEnsureMechanism:(a,k)=>{a.mechanisms=[...new Set([...a.mechanisms,k])]},
 cacEnsureNew:(a,stage,kind)=>({id:'step-2',kind,stage,title:'Plantilla',status:'draft'}),
 cacSteps:a=>a.activationSequence||[],
 cacStep:row=>(row?.action?.activationSequence||[]).at(-1),
 cacStage:s=>({label:{activar:'Activar',sentido:'Dar sentido',recordar:'Recordar',sostener:'Reforzar'}[s]||'Activar'}),
 cacStepLabel:s=>s.status==='sent'?'Aceptado':'Borrador',
 cacSafe:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 HACERLO_LABORATORIO_URL:'https://laboratorio.hacerlofc.com/',
 labRecommendedExperiences:()=>[{title:'SaberON',id:'saberon'}],
 labExperienceLink:id=>id==='saberon'?'https://laboratorio.hacerlofc.com/knowledge.html':'',
 document:{getElementById:()=>null},
 sb:{functions:{invoke:()=>network++}}
};
vm.createContext(ctx);vm.runInContext(source,ctx);
const summary=ctx.cacProviderStats([
 {accepted_count:2,delivered_count:1,opened_count:1,clicked_count:1,bounced_count:1},
 {accepted_count:3,delivered_count:2,opened_count:1,clicked_count:0,complained_count:1}
]);
assert.equal(summary.accepted_count,5);
assert.equal(summary.delivered_count,3);
assert.equal(summary.opened_count,2);
assert.equal(summary.bounced_count,1);
assert.equal(summary.complained_count,1);
assert.match(ctx.cacHistoryMetricsHTML([summary]),/Entregados/);
assert.match(ctx.cacHistoryMetricsHTML([summary]),/Se muestran hasta 30 activaciones recientes/);
assert.match(ctx.cacHistoryEventFields(summary),/3 entregados/);
assert.match(ctx.cacHistoryEventFields({}),/Entrega aún sin verificar/);
assert.match(ctx.cacHistoryEventFields({accepted_count:1,delivery_check_at:'2026-11-07T03:35:00Z',delivery_check_result:{sent:1}}),/aún no confirmada/);
assert.match(ctx.cacHistoryEventFields({accepted_count:1}),/«Aceptado» no garantiza/);
assert.match(ctx.cacHistoryMetricsHTML([summary]),/0 entregados no significa/);
const journey=ctx.cacJourneysHTML(initiative,{action:initiative.actions[0]});
assert.match(journey,/Activación por audiencia/);
assert.match(journey,/Operaciones/);
assert.match(journey,/Líderes/);
assert.match(journey,/Primer paso/);
assert.match(journey,/Mensajes asignados|Sin mensajes asignados/);
assert.match(journey,/Explorar Laboratorio/);
assert.match(journey,/SaberON/);
assert.match(journey,/data-cac-audience="aud-1"/);
assert.doesNotMatch(journey,/@example\.com/,'No mostrar direcciones individuales');
ctx.cacCreateForAudience('aud-2');
assert.equal(saved,1);
assert.equal(rendered,1);
assert.equal(network,0,'La creación de un recorrido no envía nada');
assert.equal(initiative.actions[0].activationSequence.length,2);
assert.equal(initiative.actions[0].activationSequence[1].audienceIds.join(','),'aud-2');
assert.equal(initiative.actions[0].activationSequence[1].status,'draft');
assert.equal(initiative.actions[0].activationSequence[1].standalone,true);
assert.equal(initiative.actions[0].activationSequence[1].scheduledFor,undefined);
assert.equal(ctx.cacCreateForAudience('inexistente'),undefined);
assert.equal(saved,1,'Audiencias desconocidas no pueden iniciar borradores');
initiative.behaviors=[{id:'b-1',name:'Reportar riesgo',scope:'specific',audienceIds:['aud-1']}];
initiative.actions[0].behaviorId='b-1';
initiative.audiencePeople=[
 {id:'u-1',audienceId:'aud-1',adoptionHistory:[{behaviorId:'b-1',stage:'tries',observedOn:'2026-11-01'}]},
 {id:'u-2',audienceId:'aud-1',adoptionHistory:[{behaviorId:'b-1',stage:'tries',observedOn:'2026-11-02'}]}
];
const signal=ctx.cacAudienceAdoptionSignal(initiative,initiative.actions[0],'aud-1');
assert.equal(signal.count,2);
assert.equal(signal.total,2);
assert.equal(signal.next,'recordar');
assert.equal(signal.kind,'comunicacion');
assert.equal(ctx.cacAudienceAdoptionSignal(initiative,initiative.actions[0],'aud-2'),null,'No sugerir para audiencias fuera del alcance del comportamiento');
assert.match(ctx.cacJourneysHTML(initiative,{action:initiative.actions[0]}),/Sugerir refuerzo/);
ctx.cacSuggestForAudience('aud-1');
assert.equal(initiative.actions[0].activationSequence.length,3);
assert.equal(initiative.actions[0].activationSequence[2].stage,'recordar');
assert.equal(initiative.actions[0].activationSequence[2].basis.source,'adopcion_audiencia');
assert.equal(network,0,'Las sugerencias nunca disparan correos');
assert.match(frontend,/cacHistoryMetricsHTML\(cacHistory\)/);
assert.match(frontend,/cacHistoryEventFields\(r\)/);
assert.match(frontend,/cacJourneysHTML\(x,row\)/);
assert.match(frontend,/delivered_count,opened_count,clicked_count/);
assert.match(frontend,/tracking_configured/);
assert.match(frontend,/cacRefreshDeliveryHistory/);
assert.match(backend,/if\(mode==='refresh'\)/);
assert.match(backend,/last_synced_at/);
assert.match(backend,/provider_last_event/);
assert.match(backend,/permission_denied:denied/);
assert.match(backend,/delivery_check_result:byState/);
assert.match(frontend,/Actualizar desde Resend/);
assert.match(frontend,/Consultar correos en Resend/);
assert.match(frontend,/cacProviderNotice/);
assert.match(frontend,/no puede consultar su estado/);
assert.match(backend,/activation_email_items/,'Asociación por proveedor');
assert.match(backend,/resend_email_id:providerId/);
assert.match(backend,/tracking_configured:/);
assert.match(webhook,/validSignature\(req,raw,secret\)/);
assert.match(webhook,/RESEND_WEBHOOK_SECRET/);
assert.match(webhook,/activation_email_events/);
assert.match(webhook,/activation_email_items/);
assert.match(webhook,/activation_sends/);
assert.match(webhook,/Math\.abs\(Date\.now\(\)\/1000-Number\(timestamp\)\)>300/);
assert.match(webhook,/verify_jwt|Endpoint público ÚNICAMENTE/);
assert.doesNotMatch(webhook,/data\.to\[/,'No se almacenan destinatarios por evento');
const css=read('assets/css/centro-activacion.css');
assert.match(css,/\.cac-provider-summary/);
assert.match(css,/\.cac-journeys/);
console.log('Centro de Activación V2: métricas, recorridos, validación de firma y cero envíos involuntarios.');
