import { parentPort,workerData } from 'node:worker_threads';
import { inflateRawSync } from 'node:zlib';
import { load } from 'cheerio';

const buffer=Buffer.from(workerData.buffer);
// Inspect the central directory before any decompression. No file is written or executed.
function docxText() {
  let end=-1;
  for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0)throw new Error('Corrupted DOCX archive.');
  const count=buffer.readUInt16LE(end+10);let offset=buffer.readUInt32LE(end+16),total=0;const entries=[];
  if(count>1000)throw new Error('Unsupported DOCX structure.');
  for(let i=0;i<count;i++) {
    if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)throw new Error('Corrupted DOCX directory.');
    const flags=buffer.readUInt16LE(offset+8),method=buffer.readUInt16LE(offset+10),compressed=buffer.readUInt32LE(offset+20),size=buffer.readUInt32LE(offset+24);
    const nameLength=buffer.readUInt16LE(offset+28),extra=buffer.readUInt16LE(offset+30),comment=buffer.readUInt16LE(offset+32),local=buffer.readUInt32LE(offset+42);
    const name=buffer.subarray(offset+46,offset+46+nameLength).toString();total+=size;
    if(flags&1||total>20*1024*1024||size>5*1024*1024||name.includes('..')||name.startsWith('/')||/vbaProject|macros/i.test(name))throw new Error('Unsupported or oversized DOCX structure.');
    entries.push({name,method,compressed,size,local});offset+=46+nameLength+extra+comment;
  }
  if(!entries.some(item=>item.name==='[Content_Types].xml')||!entries.some(item=>item.name==='word/document.xml'))throw new Error('Not a DOCX document.');
  const parts=entries.filter(item=>/^word\/(?:document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(item.name)).sort((a,b)=>a.name==='word/document.xml'?-1:b.name==='word/document.xml'?1:a.name.localeCompare(b.name));
  return parts.map(entry=>{
    if(entry.local+30>buffer.length||buffer.readUInt32LE(entry.local)!==0x04034b50)throw new Error('Corrupted DOCX entry.');
    const start=entry.local+30+buffer.readUInt16LE(entry.local+26)+buffer.readUInt16LE(entry.local+28);
    if(start+entry.compressed>buffer.length)throw new Error('Truncated DOCX entry.');
    const bytes=buffer.subarray(start,start+entry.compressed);
    const xml=entry.method===0?bytes:entry.method===8?inflateRawSync(bytes,{maxOutputLength:5*1024*1024}):null;
    if(!xml||xml.length!==entry.size)throw new Error('Unsupported DOCX compression.');
    const source=xml.toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(source))throw new Error('Unsupported XML structure.');
    const $=load(source,{xml:true});
    return $('w\\:p').toArray().map(p=>{
      const pieces=[];$(p).find('w\\:t,w\\:tab,w\\:br').each((_,node)=>pieces.push(node.name==='w:t'?$(node).text():node.name==='w:tab'?'\t':'\n'));
      return `${$(p).find('w\\:numPr').length?'â€¢ ':''}${pieces.join('')}`;
    }).join('\n');
  }).join('\n\n');
}
try {
  let text='',pageCount=null;const warnings=[];
  if(workerData.format==='pdf') {
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,verbosity:0});
    const pdf=await task.promise;pageCount=pdf.numPages;
    if(pageCount>100)throw new Error('Resume has too many pages.');
    const pages=[];
    for(let number=1;number<=pageCount;number++) {
      try {const page=await pdf.getPage(number),content=await page.getTextContent();let line='',previousY=null;const lines=[];
        for(const item of content.items){if(!('str' in item))continue;const y=item.transform[5];if(previousY!==null&&Math.abs(y-previousY)>3&&line){lines.push(line);line='';}line+=`${line?' ':''}${item.str}`;previousY=y;if(item.hasEOL){lines.push(line);line='';}}
        if(line)lines.push(line);const result=lines.join('\n');if(!result.trim())warnings.push(`Page ${number} has no readable text. OCR is not available.`);pages.push(result);
      } catch {warnings.push(`Page ${number} could not be read.`);pages.push('');}
      if(pages.join('\n').length>300000)throw new Error('Resume text is too large.');
    }
    text=pages.join('\n\n');await task.destroy();
  } else text=docxText();
  if(text.length>300000)throw new Error('Resume text is too large.');
  if((text.match(/[\p{L}\p{N}]/gu)||[]).length<20)throw new Error("We couldn't find readable content in this document. Try another file or enter your information manually.");
  parentPort.postMessage({text,pageCount,warnings,extractionStatus:warnings.length?'partial':'extracted'});
} catch(error) {parentPort.postMessage({code:error.name==='PasswordException'?'password_protected':'unreadable',error:error.name==='PasswordException'?'This PDF is password-protected. Upload an unlocked copy or enter your information manually.':"We couldn't reliably read this resume. Try another file or enter your information manually."});}


