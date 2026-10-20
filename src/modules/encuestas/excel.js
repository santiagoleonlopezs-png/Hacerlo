/* Lector XLSX sin dependencias remotas. ZIP/OOXML, primera hoja, valores guardados. */
async function eeReadXLSX(file){
 if(file.size>10*1024*1024)throw Error('Máximo 10 MB por archivo.');
 const bytes=new Uint8Array(await file.arrayBuffer()),dv=new DataView(bytes.buffer),files=new Map();let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('No es un XLSX ZIP válido.');const count=dv.getUint16(end+10,true);let pos=dv.getUint32(end+16,true),total=0;
 if(count>2000)throw Error('Libro demasiado complejo.');
 for(let i=0;i<count;i++){
  if(pos+46>bytes.length||dv.getUint32(pos,true)!==0x02014b50)throw Error('Directorio ZIP inválido.');
  const method=dv.getUint16(pos+10,true),size=dv.getUint32(pos+20,true),unpacked=dv.getUint32(pos+24,true),nl=dv.getUint16(pos+28,true),xl=dv.getUint16(pos+30,true),cl=dv.getUint16(pos+32,true),offset=dv.getUint32(pos+42,true),name=new TextDecoder().decode(bytes.slice(pos+46,pos+46+nl));
  total+=unpacked;if(total>40*1024*1024)throw Error('Contenido descomprimido superior a 40 MB.');
  files.set(name,{method,size,unpacked,offset});pos+=46+nl+xl+cl;
 }
 async function read(name){const e=files.get(name);if(!e)throw Error('Falta '+name);if(e.offset+30>bytes.length)throw Error('ZIP truncado.');let start=e.offset+30+dv.getUint16(e.offset+26,true)+dv.getUint16(e.offset+28,true);if(start+e.size>bytes.length)throw Error('ZIP truncado.');let raw=bytes.slice(start,start+e.size),out;
  if(e.method===0)out=raw;else if(e.method===8){if(typeof DecompressionStream==='undefined')throw Error('El navegador no descomprime XLSX. Usa Chrome/Edge reciente o guarda CSV UTF-8.');out=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}else throw Error('Compresión no compatible.');
  if(out.length!==e.unpacked)throw Error('Tamaño ZIP inconsistente.');const xml=new DOMParser().parseFromString(new TextDecoder().decode(out),'application/xml');if(xml.querySelector('parsererror'))throw Error('XML inválido.');return xml;
 }
 const wb=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels'),sheet=wb.getElementsByTagName('sheet')[0];if(!sheet)throw Error('Libro sin hojas.');const rel=[...rels.getElementsByTagName('Relationship')].find(r=>r.getAttribute('Id')===sheet.getAttribute('r:id'));if(!rel)throw Error('Hoja no encontrada.');let target=rel.getAttribute('Target');target=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');if(target.includes('..'))throw Error('Ruta de hoja inválida.');
 const shared=files.has('xl/sharedStrings.xml')?[...(await read('xl/sharedStrings.xml')).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
 const xml=await read(target),rows=[];
 for(const r of xml.getElementsByTagName('row')){const values=[];for(const c of r.getElementsByTagName('c')){let ref=c.getAttribute('r')||'',col=0;for(const char of ref.replace(/\d/g,''))col=col*26+char.charCodeAt(0)-64;if(col<1||col>300)throw Error('Máximo 300 columnas.');const type=c.getAttribute('t'),v=c.getElementsByTagName('v')[0]?.textContent||'';if(c.getElementsByTagName('f').length&&!c.getElementsByTagName('v').length)throw Error('Guarda el libro recalculado o usa CSV: hay fórmulas sin resultado.');values[col-1]=type==='s'?(shared[Number(v)]??''):type==='inlineStr'?[...c.getElementsByTagName('t')].map(t=>t.textContent).join(''):v;}
  if(values.some(v=>String(v??'').trim()))rows.push(Array.from({length:values.length},(_,i)=>values[i]??''));if(rows.length>10001)throw Error('Máximo 10000 respuestas por importación.');
 }return EE.records(rows);
}
