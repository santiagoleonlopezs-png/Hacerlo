/* Centro HACERLO · la acción de enviar nunca queda sin respuesta visible. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('src/modules/implementacion/centro-activacion.js','utf8');
const step={id:'st-1',kind:'comunicacion',stage:'activar',title:'Hola',body:'Mensaje',cta:'Actuar',status:'draft',audienceIds:[]};
const action={name:'Cambio de operación',mechanisms:['comunicacion'],activationSequence:[step]};
const x={_cloudId:'8b6cd7a1-03a7-4cdb-9b51-d3fcdefa7318',actions:[action],audiences:[],audiencePeople:[],indicators:[]};
const form={
 values:{subject:'Hola',message:'Mensaje',cta:'Actuar',kind:'comunicacion',stage:'activar',manualEmail:'',manualName:'',scheduledFor:''},
 authorized:true,
 querySelectorAll:()=>[],
 querySelector:sel=>sel.includes('authorized')?{checked:form.authorized}:null
};
const nodes={
 'cac-form':form,
 'cac-send':{disabled:false,textContent:''},
 'cac-notice':{textContent:''},
 'cac-action-feedback':{hidden:true,textContent:'',dataset:{},setAttribute(){},scrollIntoView(){this.scrolled=true}},
 'cac-send-state':{hidden:true,textContent:'',dataset:{}},
 'cac-recipient-check':{textContent:''}
};
let saves=0,sends=0,previews=0,confirms=0,permission=false,configured=false;
const ctx={
 console,Date,Number,cloudReady:true,
 current:()=>x,actionMechanisms:a=>a.mechanisms,save:()=>saves++,render:()=>{},
 crypto:{randomUUID:()=> 'c1a71f98-9635-45b8-9f41-9f5dcf6949bc'},
 safe:v=>String(v??''),
 FormData:class{constructor(f){return Object.entries(f.values)}},
 document:{getElementById:id=>nodes[id]||null},
 confirm:()=>{confirms++;return permission},
 confirmCloudSave:async()=>({ok:true}),
 sb:{functions:{invoke:async(name,{body})=>{
  if(body.mode==='status')return {data:configured?{ok:true,configured:true,missing:[]}:
   {ok:true,configured:false,missing:['HACERLO_FROM_EMAIL']}};
  if(body.mode==='preview'){previews++;return {data:{ok:true,recipient_count:1,audiences:[],contacts:[],manual_count:1}};}
  if(body.mode==='send'){sends++;return {data:{ok:true,status:'sent',accepted_count:1,failed_count:0,log_id:'log-1'}};}
  throw Error('Modo de prueba no esperado '+body.mode);
 }}}
};
vm.createContext(ctx);vm.runInContext(src,ctx);
ctx.cacLoadHistory=async()=>{};
(async()=>{
 // Sin destinatarios: feedback en el mismo lugar, no alerta oculta.
 await ctx.cacActivateStep();
 assert.match(nodes['cac-action-feedback'].textContent,/Selecciona al menos una audiencia/);
 assert.equal(nodes['cac-action-feedback'].dataset.tone,'error');
 assert.equal(nodes['cac-action-feedback'].hidden,false);
 assert.equal(nodes['cac-action-feedback'].scrolled,true);
 assert.equal(sends,0);assert.equal(previews,0);
 // Destinatario correcto pero remitente de Supabase sin configurar.
 form.values.manualEmail='prueba@example.com';
 await ctx.cacActivateStep();
 assert.match(nodes['cac-action-feedback'].textContent,/HACERLO_FROM_EMAIL/);
 assert.match(nodes['cac-action-feedback'].textContent,/no se envió ningún correo/);
 assert.match(nodes['cac-send-state'].textContent,/HACERLO_FROM_EMAIL/);
 assert.equal(nodes['cac-send'].disabled,false,'El botón se habilita nuevamente');
 assert.equal(sends,0);assert.equal(confirms,0);
 assert.equal(step.status,'draft','El mensaje sigue como borrador');
 // Configuración lista: se valida la lista, pero cancelar NUNCA envía.
 configured=true;
 await ctx.cacActivateStep();
 assert.equal(previews,1);
 assert.equal(confirms,1);
 assert.equal(sends,0,'Revisar destinatarios no equivale a enviar');
 assert.match(nodes['cac-action-feedback'].textContent,/cancelada/);
 assert.equal(step.status,'draft');
 // Solo al confirmar, una solicitud de envío sale hacia la función.
 permission=true;
 await ctx.cacActivateStep();
 assert.equal(sends,1);
 assert.equal(previews,2);
 assert.equal(confirms,2);
 assert.equal(step.status,'sent');
 assert.match(nodes['cac-notice'].textContent,/aceptada por Resend/i);
 // El editor trae feedback junto al botón, con los datos de conexión en el lugar de decisión.
 const editor=ctx.cacStepEditor(x,{action,index:0},{...step,status:'draft'});
 assert.match(editor,/id="cac-action-feedback"/);
 assert.match(editor,/id="cac-send-state"/);
 assert.match(editor,/onclick="cacActivateStep\(\)"/);
 assert.match(editor,/role="status" aria-live="polite"/);
 assert.match(src,/cacDeliveryRefresh\(\)[\s\S]*?cacRefreshSendConnection\(\)/);
 const css=fs.readFileSync('assets/css/centro-activacion.css','utf8');
 assert.match(css,/\.cac-action-feedback\[data-tone="error"\]/);
 assert.match(css,/\.cac-send-state/);
 console.log('Centro de activación: validación visible, secret faltante, cancelación y envío tras confirmación OK.');
})().catch(e=>{console.error(e);process.exitCode=1});
