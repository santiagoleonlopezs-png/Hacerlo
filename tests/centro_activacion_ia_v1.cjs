const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/modules/implementacion/centro-activacion.js','utf8');
const elements={subject:{value:'Anterior'},message:{value:'Texto original'},cta:{value:'Acción'},kind:{value:'comunicacion'},stage:{value:'activar'},scheduledFor:{value:''},manualEmail:{value:''},manualName:{value:''}};
const form={elements:{namedItem:n=>elements[n]},querySelectorAll:()=>[],querySelector:()=>null};
const x={actions:[{name:'Cambio',mechanisms:['comunicacion'],activationSequence:[{id:'s1',stage:'activar',kind:'comunicacion',status:'draft'}]}],audiences:[],audiencePeople:[]};
const nodes={'cac-form':form,'cac-ai-suggestion':{innerHTML:'',hidden:true},'cac-ai-state':{textContent:''},'cac-ai-create':{disabled:false,textContent:''},'cac-preview':{innerHTML:''}};
let sent=0,saved=0;
const ctx={console,Date,current:()=>x,save:()=>saved++,render:()=>{},
safe:s=>String(s??''),FormData:class{constructor(){return Object.entries(elements).map(([k,v])=>[k,v.value])}},
document:{getElementById:id=>nodes[id]||null},sb:{functions:{invoke:()=>sent++}}};
vm.createContext(ctx);vm.runInContext(src,ctx);
vm.runInContext("cacEditorOpen=true;cacStepId='s1';cacAiSuggestion={stepId:'s1',proposal:{subject:'IA propone',message:'Mensaje listo para ser ajustado por el usuario.',cta:'Acción concreta',reason:'Reducir barreras'},sources:{audiencias:0,hallazgos:1,comportamientos:0,factores:0}}",ctx);
assert.match(ctx.cacAiSuggestionHtml(x.actions[0].activationSequence[0]),/Aplicar y ajustar/);
assert.equal(elements.subject.value,'Anterior');
ctx.cacAiApply();
assert.equal(elements.subject.value,'IA propone');
assert.equal(x.actions[0].activationSequence[0].status,'draft');
assert.equal(sent,0);
assert.ok(saved>=1);
console.log('IA editable: no sobrescritura previa, no envíos automáticos.');
