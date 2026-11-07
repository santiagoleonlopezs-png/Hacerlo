/* Cambios pendientes y orientación al cambiar de pantalla. No guarda datos al navegar. */
const hcxFormSnapshots=new WeakMap();
function hcxFormFingerprint(form,defaults=false){
 return JSON.stringify(Array.from(form.elements||[]).filter(el=>el.name&&!el.disabled&&!['submit','button','reset','hidden'].includes(el.type)).map(el=>{
  if(['checkbox','radio'].includes(el.type))return [el.name,defaults?el.defaultChecked:el.checked,el.value];
  if(el.tagName==='SELECT'){const options=Array.from(el.options),selected=options.filter(o=>defaults?o.defaultSelected:o.selected);return [el.name,(defaults&&!el.multiple&&!selected.length?options.slice(0,1):selected).map(o=>o.value)];}
  return [el.name,defaults?el.defaultValue:el.value];
 }));
}
function hcxRememberForm(form){if(form)hcxFormSnapshots.set(form,hcxFormFingerprint(form));}
function hcxFormChanged(form){
 return !!form&&hcxFormFingerprint(form)!==(hcxFormSnapshots.get(form)??hcxFormFingerprint(form,true));
}
function hcxPendingForms(){
 const forms=Array.from(document.querySelectorAll('#app form[onsubmit]')).filter(form=>form.id!=='cac-form');
 const modal=document.getElementById?.('metric-entry');
 if(modal&&modal.style.display!=='none')forms.push(modal.querySelector('form'));
 return forms.filter(hcxFormChanged);
}
function hcxPrepareNavigation(){
 const forms=hcxPendingForms();
 if(!forms.length)return true;
 if(!confirm('Tienes cambios sin guardar en este formulario. ¿Quieres salir y descartarlos?'))return false;
 forms.forEach(hcxRememberForm);
 return true;
}
function hcxAfterNavigation(){
 window.scrollTo({top:0,left:0,behavior:'instant'});
 const heading=document.querySelector('#app h1, #app h2, #app');
 if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
}
const hcxOriginalRender=render;
render=function(){
 const result=hcxOriginalRender();
 document.querySelectorAll('#app form[onsubmit]').forEach(hcxRememberForm);
 return result;
};
window.addEventListener('beforeunload',event=>{
 if(hcxPendingForms().length||cloudSaveVersion>cloudConfirmedVersion){event.preventDefault();event.returnValue='';}
});
