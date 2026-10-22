/* HACERLO V2.4 · Motor puro. No modifica modelos ni métricas manuales. */
const EE = (() => {
 const uid=()=>crypto.randomUUID(), now=()=>new Date().toISOString();
 const scale=(id,label,dimension,min=1,max=5)=>({id,label,type:'scale',dimension,min,max,required:true});
 function template(kind){
  const q=[];
  if(kind==='SENTIR'){
   const groups={Desgaste:['La carga de cambios supera el tiempo que tengo disponible.','Me siento agotado por las demandas del cambio.','Las iniciativas simultáneas dificultan mi trabajo.'],Preparación:['Comprendo qué cambia y por qué.','Sé cómo realizar las nuevas tareas.','Cuento con los recursos para aplicar el cambio.'],Apertura:['Estoy dispuesto a probar nuevas formas de trabajo.','Puedo expresar dudas sobre el cambio.','Veo oportunidades para aprender con este cambio.'],Experiencia:['Recibo acompañamiento cuando lo necesito.','Mis experiencias recientes con el cambio han sido favorables.','Las dificultades que reporto reciben atención.']};
   for(const [d,labels] of Object.entries(groups))labels.forEach((l,j)=>q.push(scale(d.toLowerCase()+'_'+(j+1),l,d)));
   q.push({...scale('cnps','¿Qué tan dispuesto estás a apoyar esta iniciativa de cambio?','CNPS',0,10),type:'cnps'});
  }else if(kind==='NPS'||kind==='CNPS')q.push({...scale(kind.toLowerCase(),kind==='NPS'?'¿Qué tan probable es que recomiendes esta experiencia a otra persona?':'¿Qué tan dispuesto estás a apoyar esta iniciativa de cambio?',kind,0,10),type:kind.toLowerCase()});
  else if(kind==='Conocimiento')q.push({id:'conocimiento_1',label:'Edita esta pregunta y define la respuesta correcta antes de activar.',type:'knowledge',options:['Opción A','Opción B','Opción C'],correct:'Opción A',dimension:'Conocimiento',required:true});
  else q.push({id:'experiencia',label:'Cuéntanos una experiencia relacionada con esta iniciativa.',type:'text',required:true});
  if(kind!=='Libre')q.push({id:'relato',label:'¿Qué experiencia explica tu respuesta? ¿Qué ayudaría a mejorar?',type:'text',required:false});
  return q;
 }
 function init(x){x.surveys ||= [];return x.surveys;}
 function create(kind,title){return {id:uid(),kind,title,status:'draft',version:1,createdAt:now(),questions:template(kind),responses:[],audienceId:'',wave:'Base',period:'',description:'',instrumentNote:'Plantilla de trabajo editable. No es un instrumento psicométrico validado.'};}
 function validateQuestions(qs){
  if(!Array.isArray(qs)||!qs.length||qs.length>100)throw Error('Define entre 1 y 100 preguntas.');
  const ids=new Set();for(const q of qs){
   if(typeof q.id!=='string'||!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(q.id)||ids.has(q.id))throw Error('Los IDs deben ser únicos, comenzar con letra y usar letras, números o _.');ids.add(q.id);
   if(q.required!==undefined&&typeof q.required!=='boolean')throw Error('required debe ser booleano.');
   if(q.reverse&&q.type!=='scale')throw Error('Solo las preguntas scale admiten inversión.');
   if(!q.label?.trim()||!['scale','nps','cnps','text','choice','knowledge'].includes(q.type))throw Error('Pregunta o tipo inválido.');
   if(['scale','nps','cnps'].includes(q.type)){if(!Number.isFinite(q.min)||!Number.isFinite(q.max)||q.min>=q.max)throw Error('Escala inválida.');if(['nps','cnps'].includes(q.type)&&(q.min!==0||q.max!==10))throw Error('NPS/CNPS requieren escala 0–10.');}
   if(['choice','knowledge'].includes(q.type)&&(!Array.isArray(q.options)||q.options.length<2||q.options.some(o=>typeof o!=='string'||!o.trim())||new Set(q.options).size!==q.options.length))throw Error('Define al menos dos opciones únicas.');
   if(q.optionScoring?.enabled){if(!['text','choice'].includes(q.type))throw Error('Los valores por opción solo aplican a texto u opciones.');validateOptionScoring(q.optionScoring);}
   if(q.type==='knowledge'&&!q.options.includes(q.correct))throw Error('La respuesta correcta debe existir entre las opciones.');
  }return qs;
 }
 function validateResponse(s,input){
  const a={},errors=[];for(const q of s.questions){let v=input[q.id];
   if(v===undefined||v===null||String(v).trim()===''){if(q.required)errors.push(q.label+': respuesta requerida');continue;}
   if(['scale','nps','cnps'].includes(q.type)){v=Number(String(v).trim().replace(',','.'));if(!Number.isFinite(v)||v<q.min||v>q.max||(['nps','cnps'].includes(q.type)&&!Number.isInteger(v))){errors.push(q.label+': fuera de escala');continue;}}
   else {v=String(v).trim();if(v.length>5000){errors.push(q.label+': máximo 5000 caracteres');continue;}if(['choice','knowledge'].includes(q.type)&&!q.options.includes(v)){errors.push(q.label+': opción desconocida');continue;}}
   a[q.id]=v;
  }return {answers:a,errors};
 }
 const round=n=>Math.round(n*100)/100;
 function summarize(s,filter={}){
  const responses=s.responses.filter(r=>(filter.exact?r.wave===filter.wave:(!filter.wave||r.wave===filter.wave))&&(filter.exact?String(r.audienceId)===String(filter.audienceId):(!filter.audienceId||String(r.audienceId)===String(filter.audienceId))));
  const metrics=[];const groups={};
  for(const q of s.questions){const vals=responses.map(r=>r.answers[q.id]).filter(v=>v!==undefined&&v!==null&&v!=='');
   if(['nps','cnps'].includes(q.type)){const n=vals.length,p=vals.filter(v=>v>=9).length,d=vals.filter(v=>v<=6).length;metrics.push({key:q.id,label:q.dimension||q.type.toUpperCase(),value:n?round(100*(p-d)/n):null,n,min:-100,max:100,promoters:p,passives:n-p-d,detractors:d,unit:'puntos',direction:'higher'});}
   else if(q.type==='scale'||q.type==='knowledge'){
    const key=q.dimension||q.id;groups[key] ||= {key,label:key,values:[],respondents:new Set(),direction:key==='Desgaste'?'lower':'higher',questions:0};groups[key].questions++;
    responses.forEach(r=>{let v=r.answers[q.id];if(v===undefined||v===null||v==='')return;groups[key].values.push(q.type==='knowledge'?(v===q.correct?100:0):(q.reverse?100-100*(Number(v)-q.min)/(q.max-q.min):100*(Number(v)-q.min)/(q.max-q.min)));groups[key].respondents.add(r.id);});
   }
  }
  for(const g of Object.values(groups))metrics.push({key:g.key,label:g.label,value:g.values.length?round(g.values.reduce((a,b)=>a+b,0)/g.values.length):null,n:g.respondents.size,itemsAnswered:g.values.length,min:0,max:100,unit:'%',direction:g.direction});
  const texts=responses.flatMap(r=>s.questions.filter(q=>q.type==='text'&&r.answers[q.id]).map(q=>({responseId:r.id,question:q.label,text:r.answers[q.id],date:r.date,wave:r.wave,audienceId:r.audienceId})));
  return {n:responses.length,metrics,texts};
 }
 function detailedBase(s,filter={}){
  const rr=s.responses.filter(r=>(!filter.wave||r.wave===filter.wave)&&(!filter.audienceId||String(r.audienceId)===String(filter.audienceId)));
  const questions=s.questions.map(q=>{const vals=rr.flatMap(r=>{const v=r.answers[q.id];return v===undefined||v===null||v===''?[]:[v];}),n=vals.length,counts=new Map();vals.forEach(v=>counts.set(String(v),(counts.get(String(v))||0)+1));const numeric=['scale','nps','cnps'].includes(q.type),direction=q.dimension==='Desgaste'?'lower':'higher';
   const result={key:'question:'+q.id,questionId:q.id,label:q.label,dimension:q.dimension||'Sin dimensión',type:q.type,n,mean:numeric&&n?round(vals.reduce((a,v)=>a+Number(v),0)/n):null,distribution:[...counts].map(([answer,count])=>({answer,count,percent:round(100*count/n)})),value:null,unit:'',direction,min:0,max:100};
   if(q.type==='scale'){result.value=n?round(vals.reduce((a,v)=>a+(q.reverse?100-100*(Number(v)-q.min)/(q.max-q.min):100*(Number(v)-q.min)/(q.max-q.min)),0)/n):null;result.unit='%';}
   if(q.type==='knowledge'){result.value=n?round(100*vals.filter(v=>v===q.correct).length/n):null;result.unit='%';}
   if(['nps','cnps'].includes(q.type)){result.promoters=vals.filter(v=>v>=9).length;result.detractors=vals.filter(v=>v<=6).length;result.passives=n-result.promoters-result.detractors;result.value=n?round(100*(result.promoters-result.detractors)/n):null;result.unit='puntos';result.min=-100;}
   result.scale=numeric?[q.min,q.max]:null;return result;
  });
  function aggregate(level){const groups=new Map();for(const q of s.questions){if(!['scale','knowledge','nps','cnps'].includes(q.type))continue;const direction=q.dimension==='Desgaste'?'lower':'higher',compat=[q.type,direction,q.type==='scale'?q.min:'',q.type==='scale'?q.max:''].join('|'),group=(level==='dimension'?(q.dimension||'Sin dimensión')+'|':'')+compat;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(q);}
   return [...groups].map(([group,qs])=>{const people=rr.map(r=>{const answered=qs.filter(q=>r.answers[q.id]!==undefined&&r.answers[q.id]!==null&&r.answers[q.id]!=='');if(!answered.length)return null;return answered.reduce((sum,q)=>{const v=r.answers[q.id];return sum+(q.type==='knowledge'?(v===q.correct?100:0):q.type==='scale'?(q.reverse?100-100*(Number(v)-q.min)/(q.max-q.min):100*(Number(v)-q.min)/(q.max-q.min)):100*((v>=9?1:0)-(v<=6?1:0)));},0)/answered.length;}).filter(v=>v!==null),first=qs[0],direction=first.dimension==='Desgaste'?'lower':'higher',typeLabel=first.type==='scale'?'Escala '+first.min+'–'+first.max+(direction==='lower'?' · desgaste':''):first.type==='knowledge'?'Conocimiento':first.type.toUpperCase();return {key:level+':'+group,label:(level==='dimension'?(first.dimension||'Sin dimensión')+' · ':'General · ')+typeLabel,type:first.type,direction,n:people.length,questionCount:qs.length,value:people.length?round(people.reduce((a,b)=>a+b,0)/people.length):null,unit:['nps','cnps'].includes(first.type)?'puntos':'%',min:['nps','cnps'].includes(first.type)?-100:0,max:100};});}
  return {n:rr.length,questions,dimensions:aggregate('dimension'),overall:aggregate('overall'),method:'Por pregunta: respuestas válidas. Dimensiones y general: promedio de resultados individuales, con igual peso por participante y por pregunta respondida. Se separan tipos, escalas y sentidos; no se imputan faltantes. NPS/CNPS de varias preguntas son un balance promedio compuesto, no un NPS de recomendación único.'};
 }
 function optionScore(q,answer){
  const c=q.optionScoring;if(!c?.enabled||answer===undefined||answer===null||String(answer).trim()==='')return null;
  const entry=c.options.find(o=>o.option===String(answer).trim());return entry&&Number.isFinite(entry.value)?entry.value:null;
 }
 function validateOptionScoring(c){
  if(!c?.enabled)return;
  if(!Number.isFinite(c.min)||!Number.isFinite(c.max)||c.min>=c.max)throw Error('El mínimo debe ser menor que el máximo.');
  if(!Array.isArray(c.options)||c.options.length<2)throw Error('Define al menos dos opciones con valor.');
  const seen=new Set();for(const o of c.options){if(typeof o.option!=='string'||!o.option.trim()||o.option!==o.option.trim()||seen.has(o.option))throw Error('Las opciones deben ser distintas y tener texto.');seen.add(o.option);if(!Number.isFinite(o.value)||o.value<c.min||o.value>c.max)throw Error('Cada valor debe estar dentro de la escala.');}
 }
 function detailed(s,filter={}){
  const result=detailedBase(s,filter),rr=s.responses.filter(r=>(!filter.wave||r.wave===filter.wave)&&(!filter.audienceId||String(r.audienceId)===String(filter.audienceId)));
  for(const q of s.questions.filter(q=>['text','choice'].includes(q.type)&&q.optionScoring?.enabled)){
   const c=q.optionScoring,values=rr.map(r=>optionScore(q,r.answers[q.id])).filter(v=>v!==null),metric=result.questions.find(v=>v.questionId===q.id),mean=values.length?round(values.reduce((a,b)=>a+b,0)/values.length):null;
   Object.assign(metric,{scoredOptions:true,scoredN:values.length,unscoredN:metric.n-values.length,mean,value:mean,unit:'valor',scale:[c.min,c.max],min:c.min,max:c.max,direction:c.direction==='lower'?'lower':'higher'});
   metric.distribution=metric.distribution.map(v=>({...v,score:optionScore(q,v.answer)}));
   result.dimensions.push({key:'dimension:option-score:'+q.id,label:(q.dimension||'Sin dimensión')+' · '+q.label,type:'option-score',n:values.length,questionCount:1,value:mean,unit:'valor',min:c.min,max:c.max,direction:metric.direction});
  }return result;
 }
 function composition(s,filter={},options=s.compositionConfig||{}){
  const rr=s.responses.filter(r=>(!filter.wave||r.wave===filter.wave)&&(!filter.audienceId||String(r.audienceId)===String(filter.audienceId))),mode=options.mode||'original',eligible=s.questions.map(q=>['text','choice'].includes(q.type)&&q.optionScoring?.enabled?{...q,type:'scale',mappedOption:true,min:q.optionScoring.min,max:q.optionScoring.max,reverse:q.optionScoring.direction==='lower'}:q).filter(q=>['scale','nps','cnps'].includes(q.type)&&Number.isFinite(q.min)&&Number.isFinite(q.max)&&q.max>q.min&&(mode==='normalized'||(q.max===10&&[0,1].includes(q.min))));
  const selected=Array.isArray(options.questionIds)?options.questionIds:eligible.map(q=>q.id),chosen=eligible.filter(q=>selected.includes(q.id));
  function score(q,r){const raw=r.answers[q.id];if(raw===undefined||raw===null||raw==='')return null;const v=q.mappedOption?optionScore(q,raw):Number(raw);if(v===null||!Number.isFinite(v)||v<q.min||v>q.max)return null;let z=mode==='normalized'&&q.type==='scale'?10*(v-q.min)/(q.max-q.min):v;if(q.reverse)z=mode==='normalized'?10-z:q.min+q.max-z;return z;}
  function stats(key,label,values,questionIds){const n=values.length,p=values.filter(v=>v>=9).length,d=values.filter(v=>v<7).length,pass=n-p-d;return {key,label,n,questionIds,mean:n?round(values.reduce((a,v)=>a+v,0)/n):null,promoters:p,passives:pass,detractors:d,promotersPercent:n?round(100*p/n):null,passivesPercent:n?round(100*pass/n):null,detractorsPercent:n?round(100*d/n):null,balance:n?round(100*(p-d)/n):null};}
  const questions=eligible.map(q=>({...stats('balance-question:'+q.id,q.label,rr.map(r=>score(q,r)).filter(v=>v!==null),[q.id]),dimension:s.compositionDimensions?.[q.id]||q.dimension||'Sin dimensión',included:selected.includes(q.id),originalMin:q.min,originalMax:q.max,reverse:!!q.reverse}));
  function composite(qs,key,label){const values=rr.flatMap(r=>{const vals=qs.map(q=>score(q,r));if(!qs.length||(!options.allowPartial&&vals.some(v=>v===null)))return [];const valid=vals.filter(v=>v!==null);return valid.length?[valid.reduce((a,b)=>a+b,0)/valid.length]:[];});return stats(key,label,values,qs.map(q=>q.id));}
  const preferred=chosen.find(q=>q.type==='nps')||chosen.find(q=>q.type==='cnps')||chosen[0],method=options.method||((preferred&&['nps','cnps'].includes(preferred.type))?'reference':'composite'),reference=eligible.find(q=>q.id===options.referenceId)||eligible.find(q=>q.type==='nps')||eligible.find(q=>q.type==='cnps')||preferred;
  const global=method==='reference'?(reference?{...questions.find(q=>q.questionIds[0]===reference.id),key:'balance-global',label:'Global · '+reference.label}:stats('balance-global','Global',[],[])):composite(chosen,'balance-global','Global · índice compuesto por participante');
  const npsReference=reference?{...questions.find(q=>q.questionIds[0]===reference.id),key:'balance-nps',label:reference.label}:stats('balance-nps','Sin pregunta de referencia',[],[]);
  const instrumentGlobal=composite(chosen,'balance-instrument','Global del instrumento');
  const dimensionOf=q=>s.compositionDimensions?.[q.id]||q.dimension||'Sin dimensión';
  const dimensions=[...new Set(chosen.map(dimensionOf))].map(d=>composite(chosen.filter(q=>dimensionOf(q)===d),'balance-dimension:'+d,d));
  return {mode,method,referenceId:reference?.id||'',allowPartial:!!options.allowPartial,totalRows:rr.length,questions,dimensions,global,npsReference,instrumentGlobal,positive:questions.filter(q=>q.balance>0).length,negative:questions.filter(q=>q.balance<0).length,neutral:questions.filter(q=>q.balance===0).length,thresholds:{promoters:'≥ 9',passives:'≥ 7 y < 9',detractors:'< 7'},formula:'100 × (promotores − detractores) / base válida. Global compuesto: promedio de preguntas seleccionadas por participante y luego clasificación, sin redondear antes de clasificar.'};
 }
 function evolution(s,audienceId=''){
  const waves=[...new Set(s.responses.map(r=>r.wave||'Base'))];const config=s.momentSettings||{};const rank=w=>{const v=w.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return /^(base|antes|diagnostico inicial|linea base)(\b|$)/.test(v)?0:/^(durante|seguimiento)(\b|$)/.test(v)?1:/^(despues|cierre|resultado final)(\b|$)/.test(v)?2:3;};
  const moments=waves.map((wave,i)=>({wave,index:i,date:config[wave]?.date||'',order:Number.isFinite(config[wave]?.order)?config[wave].order:null})).sort((a,b)=>{if(a.order!==null||b.order!==null)return (a.order??9999)-(b.order??9999)||a.index-b.index;if(a.date&&b.date)return a.date.localeCompare(b.date)||a.index-b.index;return rank(a.wave)-rank(b.wave)||a.index-b.index;});
  const baseline=moments.some(m=>m.wave===s.baselineMoment)?s.baselineMoment:moments[0]?.wave||'';
  const series=moments.map(m=>{const scoped={...s,responses:s.responses.filter(r=>(r.wave||'Base')===m.wave&&(!audienceId||String(r.audienceId)===String(audienceId)))},c=composition(scoped),d=detailed(scoped);return {...m,n:scoped.responses.length,nps:c.npsReference,global:c.instrumentGlobal,dimensions:c.dimensions,metrics:[{key:'evo:nps',label:'NPS',value:c.npsReference.balance,n:c.npsReference.n,unit:'puntos',min:-100,max:100},{key:'evo:global',label:'Global',value:c.instrumentGlobal.balance,n:c.instrumentGlobal.n,unit:'puntos',min:-100,max:100},...c.dimensions.map(v=>({key:v.key,label:v.label,value:v.balance,n:v.n,unit:'puntos',min:-100,max:100})),...d.questions.filter(q=>q.unit).map(q=>({key:q.key,label:q.label,value:q.mean!==null?q.mean:q.value,n:q.n,unit:q.mean!==null?'escala '+q.scale.join('–'):q.unit,min:q.mean!==null?q.scale[0]:q.min,max:q.mean!==null?q.scale[1]:q.max}))]};});
  const base=series.find(m=>m.wave===baseline),last=series.at(-1),keys=[...new Set(series.flatMap(m=>m.metrics.map(v=>v.key)))];const comparisons=keys.map(key=>{const first=base?.metrics.find(v=>v.key===key),latest=last?.metrics.find(v=>v.key===key);return {key,label:latest?.label||first?.label||key,unit:latest?.unit||first?.unit,baselineValue:first?.value??null,latestValue:latest?.value??null,baselineN:first?.n||0,latestN:latest?.n||0,delta:series.length>1&&baseline!==last?.wave&&first?.value!==null&&first?.value!==undefined&&latest?.value!==null&&latest?.value!==undefined?round(latest.value-first.value):null};});
  return {baseline,latest:last?.wave||'',audienceId,series,comparisons,note:'Diferencias entre momentos, no prueba de causalidad ni seguimiento individual de las mismas personas.'};
 }
 function simulation(x){return {schema:'hacerlo.change-capacity.inputs/1',initiativeId:x.id,generatedAt:now(),modelValidated:false,stockMapping:null,notes:'Mediciones descriptivas; no son stocks, tasas ni predicciones. Desgaste alto indica mayor desgaste. CNPS conserva escala -100 a 100.',surveys:init(x).filter(s=>s.kind==='SENTIR').map(s=>({surveyId:s.id,version:s.version,title:s.title,period:s.period,segments:[...new Set(s.responses.map(r=>JSON.stringify([r.wave,r.audienceId])))].map(k=>{const [wave,audienceId]=JSON.parse(k),a=summarize(s,{wave,audienceId,exact:true});return {wave,audienceId,sampleSize:a.n,metrics:a.metrics.map(m=>({...m,normalized:m.value===null?null:round((m.value-m.min)/(m.max-m.min)*10000)/10000}))};})}))};}
 function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];let sep=[',',';','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else throw Error('Comillas CSV inválidas.');}else if(!quoted&&c===sep){row.push(cell);cell='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw Error('CSV con comillas sin cerrar.');row.push(cell);if(row.some(v=>v!==''))rows.push(row);return rows;
 }
 function records(rows){if(rows.length<2)throw Error('El archivo necesita encabezados y al menos una respuesta.');const headers=rows[0].map(v=>String(v??'').trim());if(headers.some(v=>!v)||new Set(headers).size!==headers.length)throw Error('Encabezados vacíos o duplicados.');return {headers,rows:rows.slice(1).map((r,i)=>{if(r.length>headers.length)throw Error('Fila '+(i+2)+': más celdas que encabezados.');return Object.fromEntries(headers.map((h,j)=>[h,String(r[j]??'')]));})};}
 function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v)&&!/^[-+]?\d+(\.\d+)?$/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');}
 return {optionScore,validateOptionScoring,evolution,composition,detailed,uid,now,init,create,template,validateQuestions,validateResponse,summarize,simulation,parseCSV,records,csv};
})();
