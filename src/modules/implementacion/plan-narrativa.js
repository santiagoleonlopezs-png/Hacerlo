/* HACERLO | Narrativa del Plan de cambio.
   Configuración propia de la iniciativa; los datos RDAIM permanecen como fuente única. */
const PLAN_NARRATIVE_SLIDE_IDS=['portada','concepto','norte','diagnostico','audiencias','acciones','ruta','medicion','decisiones'];
const PLAN_NARRATIVE_THEMES=[
 {id:'oceano',label:'Oceánica',note:'Azules profundos · verde agua'},
 {id:'ambar',label:'Cálida',note:'Azul oscuro · ámbar'},
 {id:'violeta',label:'Visión',note:'Azul noche · violeta'}
];
let planNarrativeEditingOpen=false;
let planNarrativeNotice='';
function planNarrativeConfig(x){
 const c=x?.planPresentation||{};
 return {
  title:String(c.title||'').slice(0,110),
  metaphor:String(c.metaphor||'').slice(0,260),
  message:String(c.message||'').slice(0,280),
  theme:PLAN_NARRATIVE_THEMES.some(z=>z.id===c.theme)?c.theme:'oceano',
  image:planNarrativeSafeImage(c.image),
  showConcept:!!c.showConcept,
  order:planNarrativeValidOrder(c.order),
  hidden:Array.isArray(c.hidden)?c.hidden.filter(id=>PLAN_NARRATIVE_SLIDE_IDS.includes(id)&&!['portada'].includes(id)):[]
 };
}
function planNarrativeValidOrder(order){
 const saved=Array.isArray(order)?order.filter(id=>PLAN_NARRATIVE_SLIDE_IDS.includes(id)&&id!=='portada'):[];
 return ['portada',...new Set([...saved,...PLAN_NARRATIVE_SLIDE_IDS.filter(id=>id!=='portada')])];
}
function planNarrativeSafeImage(data){
 const s=String(data||'');
 if(s.length>310000||s.length<48)return '';
 return /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(s)?s:'';
}
function planNarrativeApply(x,baseSlides){
 if(!Array.isArray(baseSlides)||!baseSlides.length)return [];
 const c=planNarrativeConfig(x);
 const byId=new Map(baseSlides.map(s=>[s.id,s]));
 const cover=byId.get('portada');
 if(cover&&(c.title||c.metaphor||c.message)){
  const legacy=cover.html;
  // La narrativa personaliza la portada; el resultado original sigue disponible en la diapositiva de resultados.
  cover.html=legacy
   .replace(/<p class="plan-cover-sub">[\s\S]*?<\/p>/,
    '<p class="plan-cover-sub">'+(c.title?planExecEsc(c.title):'Plan ejecutivo de cambio comportamental')+'</p>')
   .replace('<div class="plan-cover-rule"></div>',
    (c.metaphor?'<p class="plan-cover-metaphor">'+planExecEsc(c.metaphor)+'</p>':'')+
    '<div class="plan-cover-rule"></div>')
   .replace('<div class="plan-cover-bottom">',
    (c.message?'<div class="plan-cover-message">'+planExecEsc(c.message)+'</div>':'')+
    '<div class="plan-cover-bottom">');
 }
 if(c.showConcept&&[c.title,c.metaphor,c.message,c.image].some(Boolean)){
  byId.set('concepto',{id:'concepto',label:'Concepto',eyebrow:'CONCEPTO RECTOR',
   title:c.title||'El concepto de nuestro cambio',
   html:'<div class="plan-narrative-concept">'+
    '<div class="plan-concept-main">'+
    '<span class="plan-section-caption">LA HISTORIA QUE DA SENTIDO AL CAMBIO</span>'+
    '<h3>'+planExecEsc(c.title||x?.name||'Nuestro cambio')+'</h3>'+
    (c.metaphor?'<div class="plan-concept-metaphor"><strong>Metáfora o analogía</strong><p>'+planExecEsc(c.metaphor)+'</p></div>':'')+
    (c.message?'<blockquote>'+planExecEsc(c.message)+'</blockquote>':'')+
    '</div>'+
    (c.image?'<div class="plan-concept-art"><img alt="Concepto visual de la iniciativa" src="'+planExecEsc(c.image)+'"></div>':'')+
    '</div>',mode:'concept'});
 }
 const ids=c.order.filter(id=>byId.has(id)&&!c.hidden.includes(id));
 // La portada es obligatoria y permanece siempre al principio.
 const ordered=['portada',...ids.filter(id=>id!=='portada')];
 return ordered.map(id=>({...byId.get(id),planTheme:c.theme,planGuideImage:(id==='portada'||id==='concepto')?c.image:''}));
}
function planNarrativeSlideBackground(slide){
 const image=planNarrativeSafeImage(slide?.planGuideImage);
 if(!image||slide.id!=='portada')return '';
 return '<div class="plan-guide-background" aria-hidden="true" style="background-image:linear-gradient(90deg,rgba(5,24,38,.91),rgba(5,24,38,.54)),url(&quot;'+
 planExecEsc(image)+'&quot;)"></div>';
}
function planNarrativeImageUI(c){
 return '<div class="plan-narrative-image-wrap">'+
  (c.image?'<div class="plan-narrative-image"><img src="'+planExecEsc(c.image)+'" alt="Imagen guía cargada"><button type="button" class="secondary" onclick="planNarrativeRemoveImage()">Eliminar imagen</button></div>':
   '<div class="plan-narrative-image-empty"><span>◈</span><strong>Imagen guía</strong><small>Portada y lámina de concepto</small></div>')+
  '<label class="plan-upload-field"><span>Subir imagen (JPG, PNG o WebP)</span>'+
  '<input type="file" accept="image/jpeg,image/png,image/webp" onchange="planNarrativeUploadImage(this)" aria-label="Cargar imagen guía para el plan de cambio">'+
  '<small>Se optimiza para la presentación. Máximo 8 MB de origen; imagen guardada hasta 230 KB aprox.</small></label>'+
  '</div>';
}
function planNarrativeEditorUI(x){
 const c=planNarrativeConfig(x);
 const present=planExecMakeSlides(x);
 const rawIds=planNarrativeValidOrder(c.order);
 const labels={portada:'Portada',concepto:'Concepto rector',norte:'Norte del cambio',diagnostico:'Diagnóstico',
  audiencias:'Audiencias',acciones:'Intervenciones',ruta:'Ruta de ejecución',medicion:'Medición',decisiones:'Decisiones'};
 const input=(label,name,value,placeholder,max=140)=>'<label class="plan-narrative-field"><span>'+label+'</span>'+
  '<input name="'+name+'" maxlength="'+max+'" value="'+planExecEsc(value)+'" placeholder="'+placeholder+'"></label>';
 const select='<label class="plan-narrative-field"><span>Identidad visual</span><select name="theme">'+
  PLAN_NARRATIVE_THEMES.map(t=>'<option value="'+t.id+'"'+(c.theme===t.id?' selected':'')+'>'+t.label+' · '+t.note+'</option>').join('')+'</select></label>';
 return '<section class="plan-narrative-module"><details class="plan-narrative-details"'+(planNarrativeEditingOpen?' open':'')+
  ' ontoggle="planNarrativeEditingOpen=this.open"><summary><div><span class="plan-overline">PERSONALIZACIÓN DEL PLAN</span>'+
  '<h3>Narrativa y concepto visual</h3><p>Una metáfora, una imagen y una historia coherente con tu intervención.</p></div>'+
  '<span class="plan-narrative-chevron">Personalizar ↗</span></summary>'+
  '<div class="plan-narrative-inner"><form onsubmit="planNarrativeSave(event)">'+
  '<div class="plan-narrative-editor-grid"><div class="plan-narrative-fields">'+
  input('Nombre del concepto','title',c.title,'Ej. Encender nuevos hábitos',110)+
  '<label class="plan-narrative-field"><span>Metáfora o analogía</span><textarea name="metaphor" rows="3" maxlength="260" placeholder="Ej. La transformación como una travesía en equipo">'+planExecEsc(c.metaphor)+'</textarea></label>'+
  '<label class="plan-narrative-field"><span>Mensaje fuerza</span><textarea name="message" rows="3" maxlength="280" placeholder="Una idea para conectar el propósito y los comportamientos">'+planExecEsc(c.message)+'</textarea></label>'+
  select+
  '<label class="plan-narrative-check"><input type="checkbox" name="showConcept" value="yes"'+(c.showConcept?' checked':'')+
  '> Incluir una diapositiva de concepto rector</label>'+
  '<button type="submit" class="primary">Guardar narrativa</button>'+
  '<small class="plan-narrative-hint">El concepto personaliza la presentación, pero no modifica el resultado o los comportamientos registrados en RDAIM.</small>'+
  '</div>'+planNarrativeImageUI(c)+'</div></form>'+
  '<div class="plan-slide-order-section"><div><span class="plan-overline">ESTRUCTURA</span><h3>Orden y visibilidad de diapositivas</h3>'+
  '<p>La portada permanece al inicio. Usa las flechas para ordenar y el control para incluir u ocultar láminas.</p></div>'+
  '<div class="plan-order-list">'+rawIds.filter(id=>id!=='concepto'||c.showConcept).map((id,i)=>{
   const hidden=c.hidden.includes(id),disabled=id==='portada',available=id!=='concepto'||!![c.title,c.metaphor,c.message,c.image].some(Boolean);
   return '<div class="plan-order-item'+(hidden?' is-hidden':'')+'"><div class="plan-order-label"><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+
    planExecEsc(labels[id]||id)+'</strong></div><div class="plan-order-actions">'+
    (id==='portada'?'<small>Siempre visible</small>':
     '<label class="plan-order-visibility"><input type="checkbox"'+(!hidden&&available?' checked':'')+
     (!available?' disabled':'')+' onchange="planNarrativeToggleSlide(\''+id+'\',this.checked)">Mostrar</label>')+
    '<button type="button" class="secondary" onclick="planNarrativeMoveSlide(\''+id+'\',-1)"'+
    (i<=1||disabled?' disabled':'')+' aria-label="Subir '+planExecEsc(labels[id])+'">↑</button>'+
    '<button type="button" class="secondary" onclick="planNarrativeMoveSlide(\''+id+'\',1)"'+
    (i===rawIds.filter(z=>z!=='concepto'||c.showConcept).length-1||disabled?' disabled':'')+
    ' aria-label="Bajar '+planExecEsc(labels[id])+'">↓</button>'+
    '</div></div>';
  }).join('')+'</div>'+
  '<div class="plan-narrative-count">Presentación actual: <strong>'+present.length+' diapositivas</strong></div></div></div></details>'+
  '<p class="plan-narrative-status" id="plan-narrative-status" role="status" aria-live="polite">'+planExecEsc(planNarrativeNotice)+'</p></section>';
}
function planNarrativeSave(event){
 event.preventDefault();
 const x=current(),f=event.target;
 if(!x||!f)return;
 const data=Object.fromEntries(new FormData(f));
 const prev=planNarrativeConfig(x);
 x.planPresentation={
  ...prev,
  title:String(data.title||'').trim().slice(0,110),
  metaphor:String(data.metaphor||'').trim().slice(0,260),
  message:String(data.message||'').trim().slice(0,280),
  theme:PLAN_NARRATIVE_THEMES.some(z=>z.id===data.theme)?data.theme:'oceano',
  showConcept:data.showConcept==='yes'
 };
 planNarrativeNotice='Narrativa guardada y aplicada a la presentación.';
 planNarrativeEditingOpen=true;
 save();render();
}
function planNarrativeSetValue(patch,notice){
 const x=current();if(!x)return;
 x.planPresentation={...planNarrativeConfig(x),...patch};
 planNarrativeNotice=notice;
 planNarrativeEditingOpen=true;
 save();render();
}
function planNarrativeMoveSlide(id,direction){
 const x=current(),c=planNarrativeConfig(x);
 if(!x||id==='portada'||![-1,1].includes(direction))return;
 const order=planNarrativeValidOrder(c.order);
 const filtered=order.filter(z=>z!=='concepto'||c.showConcept);
 const index=filtered.indexOf(id),other=index+direction;
 if(index<1||other<1||other>=filtered.length)return;
 // No reorganizamos una lámina de concepto que actualmente está desactivada.
 const a=order.indexOf(filtered[index]),b=order.indexOf(filtered[other]);
 [order[a],order[b]]=[order[b],order[a]];
 planNarrativeSetValue({order},'Orden actualizado.');
}
function planNarrativeToggleSlide(id,visible){
 const c=planNarrativeConfig(current());
 if(id==='portada'||!PLAN_NARRATIVE_SLIDE_IDS.includes(id))return;
 const next=visible?c.hidden.filter(x=>x!==id):[...new Set([...c.hidden,id])];
 planNarrativeSetValue({hidden:next},visible?'Diapositiva incluida.':'Diapositiva oculta de la presentación.');
}
function planNarrativeRemoveImage(){
 if(!confirm('¿Eliminar la imagen guía de este plan? El concepto y el orden se conservarán.'))return;
 planNarrativeSetValue({image:''},'Imagen guía eliminada.');
}
async function planNarrativeUploadImage(input){
 const file=input?.files?.[0],x=current();
 if(!file||!x)return;
 const targetId=String(x._cloudId||x.id);
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){
  alert('Usa una imagen JPG, PNG o WebP de máximo 8 MB.');input.value='';return;
 }
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se pudo leer la imagen.'));img.src=url});
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>100000000)throw Error('La imagen es demasiado grande.');
  const factor=Math.min(1,1400/img.naturalWidth,840/img.naturalHeight);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  let result='';
  for(const q of [.83,.72,.6,.48,.36,.26]){
   result=canvas.toDataURL('image/webp',q);
   if(!result.startsWith('data:image/webp'))result=canvas.toDataURL('image/jpeg',q);
   if(result.length<=300000)break;
  }
  if(!planNarrativeSafeImage(result))throw Error('No se pudo optimizar la imagen a un tamaño apropiado para el plan. Prueba con otra.');
  if(String(current()?._cloudId||current()?.id)!==targetId)throw Error('Cambiaste de iniciativa durante la carga. Vuelve a seleccionar la imagen.');
  planNarrativeSetValue({image:result},'Imagen guía cargada y optimizada.');
 }catch(error){alert(error.message||'No se pudo cargar la imagen.');}
 finally{URL.revokeObjectURL(url);input.value='';}
}
