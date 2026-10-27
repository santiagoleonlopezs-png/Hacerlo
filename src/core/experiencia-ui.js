/* HACERLO V2 — Lenguaje visual unificado.
   Renderiza solamente HTML; no modifica datos, estado ni navegación. */
function hcxHero(title,x,description='',eyebrow='HACERLO · FÁBRICA DEL COMPORTAMIENTO',symbol='✣'){
 const scope=x?.scope==='outside'?'Outside':'Inside';
 return '<header class="hcx-hero">'+
  '<div class="hcx-hero-copy"><span class="hcx-eyebrow">'+safe(eyebrow)+'</span>'+
  '<h1>'+safe(title)+'</h1>'+
  (description?'<p>'+safe(description)+'</p>':'')+
  (x?'<div class="hcx-hero-meta"><span class="hcx-initiative">'+safe(x.name||'Iniciativa')+
       '</span><span class="hcx-scope">'+scope+'</span></div>':'')+
  '</div><div class="hcx-hero-orbit" aria-hidden="true">'+
  '<span>'+symbol+'</span><i></i><i></i><i></i></div></header>';
}
function hcxFold(title,description,html,opts={}){
 const open=opts.open?' open':'';
 const count=opts.count!==undefined?' <span class="hcx-fold-count">'+opts.count+'</span>':'';
 return '<details class="hcx-fold"'+open+'><summary><span class="hcx-fold-glyph" aria-hidden="true">'+
  (opts.symbol||'◇')+'</span><span class="hcx-fold-titles"><strong>'+safe(title)+count+
  '</strong>'+(description?'<small>'+safe(description)+'</small>':'')+'</span>'+
  '<span class="hcx-fold-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="hcx-fold-content">'+html+'</div></details>';
}
