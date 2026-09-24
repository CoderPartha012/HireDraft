import { Worker } from 'node:worker_threads';
import { resolve as resolvePath } from 'node:path';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export class ResumeError extends Error {
  constructor(code,message,httpStatus=422) { super(message);this.code=code;this.httpStatus=httpStatus; }
}
export function validateResume(buffer, filename, type='') {
  if (!buffer?.length) throw new ResumeError('empty','Please select a non-empty resume.',400);
  if (buffer.length >= MAX_RESUME_BYTES) throw new ResumeError('too_large','Resume must be smaller than 5 MB.',413);
  const extension=String(filename).split('.').at(-1).toLowerCase();
  const types={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  if(!types[extension] || type&&type!=='application/octet-stream'&&type!==types[extension]) throw new ResumeError('unsupported','Please upload a PDF or DOCX resume.',415);
  if(extension==='pdf'&&!buffer.subarray(0,5).equals(Buffer.from('%PDF-')) || extension==='docx'&&!buffer.subarray(0,4).equals(Buffer.from([80,75,3,4]))) throw new ResumeError('invalid_file','The document does not match its file type. Please upload a readable PDF or DOCX.',415);
  return extension;
}
export async function readResume(buffer, {filename='',type='',signal,timeout=12000}={}) {
  const format=validateResume(buffer,filename,type);
  if(signal?.aborted) throw new ResumeError('cancelled','Resume reading cancelled.',499);
  return new Promise((resolve,reject)=>{
    const worker=new Worker(resolvePath(process.cwd(),'src/server/resume-worker.js'),{workerData:{buffer,format},resourceLimits:{maxOldGenerationSizeMb:192},execArgv:[]});
    let done=false;
    const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve({...result,file:{name:String(filename).replace(/[\\/]/g,'_').slice(0,200),type:format,size:buffer.length}});};
    const abort=()=>finish(new ResumeError('cancelled','Resume reading cancelled.',499));
    const timer=setTimeout(()=>finish(new ResumeError('timeout',"We couldn't reliably read this resume. Try another file or enter your information manually.")),timeout);
    signal?.addEventListener('abort',abort,{once:true});
    worker.on('message',result=>result.error?finish(new ResumeError(result.code||'unreadable',result.error)):finish(null,result));
    worker.on('error',()=>finish(new ResumeError('unreadable','The document could not be processed. Try another file or enter your information manually.')));
    worker.on('exit',()=>{if(!done)finish(new ResumeError('unreadable','The document reader stopped. Try another file.'));});
  });
}
