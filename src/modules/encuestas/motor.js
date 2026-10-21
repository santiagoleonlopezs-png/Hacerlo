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
 function detailed(s,filter={}){
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
 function simulation(x){return {schema:'hacerlo.change-capacity.inputs/1',initiativeId:x.id,generatedAt:now(),modelValidated:false,stockMapping:null,notes:'Mediciones descriptivas; no son stocks, tasas ni predicciones. Desgaste alto indica mayor desgaste. CNPS conserva escala -100 a 100.',surveys:init(x).filter(s=>s.kind==='SENTIR').map(s=>({surveyId:s.id,version:s.version,title:s.title,period:s.period,segments:[...new Set(s.responses.map(r=>JSON.stringify([r.wave,r.audienceId])))].map(k=>{const [wave,audienceId]=JSON.parse(k),a=summarize(s,{wave,audienceId,exact:true});return {wave,audienceId,sampleSize:a.n,metrics:a.metrics.map(m=>({...m,normalized:m.value===null?null:round((m.value-m.min)/(m.max-m.min)*10000)/10000}))};})}))};}
 function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];let sep=[',',';','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else throw Error('Comillas CSV inválidas.');}else if(!quoted&&c===sep){row.push(cell);cell='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw Error('CSV con comillas sin cerrar.');row.push(cell);if(row.some(v=>v!==''))rows.push(row);return rows;
 }
 function records(rows){if(rows.length<2)throw Error('El archivo necesita encabezados y al menos una respuesta.');const headers=rows[0].map(v=>String(v??'').trim());if(headers.some(v=>!v)||new Set(headers).size!==headers.length)throw Error('Encabezados vacíos o duplicados.');return {headers,rows:rows.slice(1).map((r,i)=>{if(r.length>headers.length)throw Error('Fila '+(i+2)+': más celdas que encabezados.');return Object.fromEntries(headers.map((h,j)=>[h,String(r[j]??'')]));})};}
 function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v)&&!/^[-+]?\d+(\.\d+)?$/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');}
 return {detailed,uid,now,init,create,template,validateQuestions,validateResponse,summarize,simulation,parseCSV,records,csv};
})();
