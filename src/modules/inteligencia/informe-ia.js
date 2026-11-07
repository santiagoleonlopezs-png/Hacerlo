/* HACERLO · Exportación exclusiva de la interpretación generada por IA.
   No exporta datos crudos ni sustituye la presentación ejecutiva RDAIM. */
function aiReportData(initiative) {
  const a = initiative?.integratedAIAnalysis;
  if (!a || typeof a.system_reading !== 'string' || !a.system_reading.trim()) {
    throw Error('Primero genera una interpretación de IA para poder descargar su informe.');
  }
  const entries = (values) => (Array.isArray(values) ? values : []);
  const sections = [];
  function add(title, items) {
    const valid = items.map(item => ({
      title: String(item.title || '').trim(),
      text: String(item.text || '').trim(),
      note: String(item.note || '').trim()
    })).filter(item => item.title || item.text || item.note);
    if (valid.length) sections.push({title, items: valid});
  }
  add('Lectura ejecutiva', [{text: a.system_reading}]);
  add('Audiencias y adopción', [{text: a.audience_reading}]);
  add('Hallazgos estructurales', entries(a.structural_findings).map((v,i) => ({
    title: 'Hallazgo ' + (i + 1), text: v
  })));
  add('Hipótesis para contrastar', entries(a.hypotheses).map((h,i) => ({
    title: String(h?.title || 'Hipótesis ' + (i + 1)),
    text: h?.rationale,
    note: h?.evidence_limit ? 'Límite de evidencia: ' + h.evidence_limit : ''
  })));
  add('Decisiones para explorar', entries(a.interventions).map((v,i) => ({
    title: String(v?.name || 'Propuesta ' + (i + 1)),
    text: v?.why,
    note: v?.measure ? 'Cómo medir: ' + v.measure : ''
  })));
  add('Qué medir', entries(a.what_to_measure).map((v,i) => ({
    title: 'Indicador ' + (i + 1), text: v
  })));
  add('Fuentes, trazabilidad y límites', [
    {text: a.traceability || 'Interpretación generativa. Las relaciones propuestas no prueban causalidad.'}
  ]);
  return {
    initiative: String(initiative.name || 'Iniciativa').trim(),
    generatedAt: a.generatedAt || '',
    model: String(a.model || 'No especificado'),
    outdated: !!(a.sourceFingerprint && typeof aiSourceFingerprint === 'function' &&
      a.sourceFingerprint !== aiSourceFingerprint(initiative)),
    sections
  };
}
function aiReportFilename(report, extension) {
  const name = String(report.initiative || 'Iniciativa').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_')
    .replace(/^_+|_+$/g,'').slice(0,55) || 'Iniciativa';
  return 'HACERLO_Informe_IA_' + name + '.' + extension;
}
function aiReportDate(value) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? d.toLocaleString('es-CO', {dateStyle:'medium',timeStyle:'short'})
    : 'Fecha no registrada';
}
function aiReportReady() {
  try { return aiReportData(current()); }
  catch (error) { alert(error.message); return null; }
}
function aiLoadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    script.onload = () => window.jspdf?.jsPDF
      ? resolve(window.jspdf.jsPDF)
      : reject(Error('La biblioteca de PDF no quedó disponible.'));
    script.onerror = () => reject(Error('No se pudo cargar la biblioteca para crear el PDF.'));
    document.head.appendChild(script);
  });
}
async function exportAIReportPDF() {
  const report = aiReportReady(); if (!report) return;
  try {
    const jsPDF = await aiLoadJsPDF();
    const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    pdf.setProperties({title:'Informe de IA · ' + report.initiative,
      author:'HACERLO · Fábrica del Comportamiento', subject:'Interpretación de IA'});
    const left = 19, right = 191, bottom = 276;
    let y = 60;
    pdf.setFillColor(9,40,57); pdf.rect(0,0,210,46,'F');
    pdf.setTextColor(108,228,213); pdf.setFont('helvetica','bold');
    pdf.setFontSize(9); pdf.text('HACERLO  /  FÁBRICA DEL COMPORTAMIENTO',left,15);
    pdf.setFontSize(19); pdf.setTextColor(255,255,255);
    pdf.text('Informe de interpretación con IA',left,28);
    pdf.setFont('helvetica','normal');pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(report.initiative,172).slice(0,2),left,37);
    function nextPage() {
      pdf.addPage();y=23;
      pdf.setFillColor(9,40,57);pdf.rect(0,0,210,10,'F');
      pdf.setFontSize(8);pdf.setFont('helvetica','bold');
      pdf.setTextColor(255,255,255);pdf.text('HACERLO  ·  INFORME DE IA',left,7);
    }
    function need(height) {if (y+height>bottom)nextPage();}
    function write(value, size=10.5, color=[39,61,75], lineHeight=5.1, bold=false, indent=0) {
      const s = String(value || '').trim();
      if (!s) return;
      pdf.setFont('helvetica',bold?'bold':'normal');
      pdf.setFontSize(size);pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(s,right-left-indent);
      for (const line of lines) {
        need(lineHeight+1);
        pdf.text(String(line),left+indent,y);
        y+=lineHeight;
      }
      y+=2.2;
    }
    write('Generado: '+aiReportDate(report.generatedAt)+'   ·   Modelo: '+report.model,9,[90,115,127],4.7);
    if (report.outdated)write('Atención: la iniciativa cambió después de esta interpretación.',9,[168,96,26],4.7);
    for (const [i,section] of report.sections.entries()) {
      need(17); y+=6;
      pdf.setDrawColor(43,179,171);pdf.setLineWidth(0.5);pdf.line(left,y-5,right,y-5);
      write(String(i+1).padStart(2,'0')+'  '+section.title,13,[9,69,82],6.3,true);
      for (const item of section.items) {
        if (item.title) {need(11);write(item.title,10.8,[23,54,75],5.5,true);}
        if (item.text) write(item.text,10.2,[45,64,77],5.2);
        if (item.note) write(item.note,9.1,[92,121,138],4.8);
        y+=3;
      }
    }
    const count = pdf.internal.getNumberOfPages();
    for (let i=1;i<=count;i++) {
      pdf.setPage(i);pdf.setDrawColor(208,223,229);
      pdf.line(left,285,right,285);
      pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(109,134,145);
      pdf.text('Interpretación generativa · No demuestra causalidad',left,291);
      pdf.text(i+' / '+count,right,291,{align:'right'});
    }
    pdf.save(aiReportFilename(report,'pdf'));
  } catch(error) {alert('No se pudo generar el PDF del informe de IA: '+error.message);}
}
function aiLoadPptx() {
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  return new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
    script.onload = () => window.PptxGenJS
      ? resolve(window.PptxGenJS)
      : reject(Error('La biblioteca de presentaciones no quedó disponible.'));
    script.onerror = () => reject(Error('No se pudo cargar la biblioteca de PowerPoint.'));
    document.head.appendChild(script);
  });
}
function aiReportWrap(text, limit=105) {
  const result = [];
  for (const paragraph of String(text || '').replace(/\r/g,'').split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (!line) line=word;
      else if ((line+' '+word).length <= limit) line+=' '+word;
      else { result.push(line);line=word; }
      while (line.length>limit) {result.push(line.slice(0,limit));line=line.slice(limit);}
    }
    if (line) result.push(line);
  }
  return result;
}
async function exportAIReportPPTX() {
  const report = aiReportReady(); if (!report) return;
  try {
    const PowerPoint = await aiLoadPptx();
    const pptx = new PowerPoint();
    pptx.layout='LAYOUT_WIDE';
    pptx.author='HACERLO · Fábrica del Comportamiento';
    pptx.title='Informe de interpretación con IA · '+report.initiative;
    pptx.subject='Informe exclusivo de Inteligencia integrada';
    pptx.lang='es-CO';
    const BG='092838',ACCENT='48D8C6',TEXT='F1FAFE',MUTED='AFC9D6',GOLD='F0C57F';
    let slide=null,y=1.38,slideNumber=0;
    const newSlide=(title,continued=false)=>{
      slide=pptx.addSlide();slideNumber++;slide.background={color:BG};y=1.38;
      slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:0.09,line:{color:ACCENT},fill:{color:ACCENT}});
      slide.addText('HACERLO  /  INTELIGENCIA INTEGRADA',
        {x:0.78,y:0.3,w:11.8,h:0.25,color:ACCENT,fontSize:10,bold:true,margin:0,charSpacing:1});
      slide.addText(title+(continued?' · continuación':''),
        {x:0.78,y:0.73,w:11.8,h:0.47,color:TEXT,fontSize:23,bold:true,breakLine:false,margin:0,fit:'shrink'});
      slide.addText('Informe de IA · '+report.initiative,
        {x:0.78,y:7.08,w:10.3,h:0.18,fontSize:9,color:MUTED,margin:0,fit:'shrink'});
      slide.addText(String(slideNumber),
        {x:12.2,y:7.08,w:0.3,h:0.18,fontSize:9,color:ACCENT,margin:0,align:'right'});
    };
    const cover=pptx.addSlide();slideNumber++;
    cover.background={color:BG};
    cover.addShape(pptx.ShapeType.rect,{x:0.8,y:1.13,w:0.11,h:4.6,line:{color:ACCENT},fill:{color:ACCENT}});
    cover.addText('HACERLO · FÁBRICA DEL COMPORTAMIENTO',
      {x:1.15,y:1.15,w:10.5,h:0.4,color:ACCENT,fontSize:13,bold:true,charSpacing:1.1,margin:0});
    cover.addText('Informe de\ninterpretación con IA',
      {x:1.15,y:2.03,w:10.6,h:1.5,color:TEXT,fontSize:39,bold:true,margin:0,breakLine:false});
    cover.addText(report.initiative,
      {x:1.15,y:4.35,w:10.7,h:0.65,color:GOLD,fontSize:21,margin:0,fit:'shrink'});
    cover.addText('Generado: '+aiReportDate(report.generatedAt)+'   ·   Modelo: '+report.model,
      {x:1.15,y:5.38,w:10.9,h:0.34,color:MUTED,fontSize:12,margin:0,fit:'shrink'});
    cover.addText('Lecturas, hallazgos, hipótesis y decisiones propuestas; no sustituye el informe ejecutivo RDAIM.',
      {x:1.15,y:6.5,w:10.9,h:0.35,color:MUTED,fontSize:10,margin:0,fit:'shrink'});
    function write(value,kind='body'){
      const chars=kind==='title'?100:kind==='note'?124:107;
      const lines=aiReportWrap(value,chars);
      if (!lines.length) return;
      const lineHeight=kind==='title'?0.34:kind==='note'?0.26:0.3;
      const fontSize=kind==='title'?16:kind==='note'?11.3:13.4;
      const color=kind==='title'?GOLD:kind==='note'?MUTED:TEXT;
      let i=0;
      while(i<lines.length){
        let available=Math.floor((6.83-y-0.13)/lineHeight);
        if(available<1){newSlide(activeSection,true);available=Math.floor((6.83-y-0.13)/lineHeight);}
        const chunk=lines.slice(i,i+available);i+=chunk.length;
        slide.addText(chunk.join('\n'),{
          x:0.86,y,w:11.62,h:chunk.length*lineHeight+0.08,
          color,fontFace:'Aptos',fontSize,bold:kind==='title',
          margin:0,breakLine:false,valign:'top',fit:'shrink',lineSpacingMultiple:1.02
        });
        y+=chunk.length*lineHeight+0.13;
      }
    }
    let activeSection='';
    for(const section of report.sections){
      activeSection=section.title;
      newSlide(section.title);
      for(const item of section.items){
        if (y>5.95 && (item.title||item.text)) newSlide(activeSection,true);
        if(item.title)write(item.title,'title');
        if(item.text)write(item.text,'body');
        if(item.note)write(item.note,'note');
        y+=0.14;
      }
    }
    if(report.outdated){
      newSlide('Vigencia de la interpretación');
      write('La iniciativa se actualizó después de generarse este informe. La interpretación representa el contexto de su fecha de generación.','body');
    }
    await pptx.writeFile({fileName:aiReportFilename(report,'pptx')});
  }catch(error){alert('No se pudo generar la presentación del informe de IA: '+error.message);}
}
