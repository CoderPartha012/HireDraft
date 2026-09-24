import { createServer } from 'node:http';
import { generateEmail } from '../../src/server/email-generation.js';
import { GenerationError, providerAvailability } from '../../src/server/ai-provider.js';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { extractJob, ExtractionError } from '../../src/server/extract-job.js';
import { readResume, ResumeError, MAX_RESUME_BYTES } from '../../src/server/resume-reader.js';

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/analyze-job', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/src/app.js', ['src/app.js', 'text/javascript']],
  ['/src/validate-job-url.js', ['../../src/validate-job-url.js', 'text/javascript']],
  ['/src/job-profile.js', ['../../src/job-profile.js', 'text/javascript']],
  ['/src/requirements-analysis.js', ['../../src/requirements-analysis.js', 'text/javascript']],
  ['/src/analysis-review.js', ['../../src/analysis-review.js', 'text/javascript']],
  ['/src/requirements-ui.js', ['src/requirements-ui.js', 'text/javascript']],
  ['/src/candidate-profile.js', ['../../src/candidate-profile.js', 'text/javascript']],
  ['/src/candidate-ui.js', ['src/candidate-ui.js', 'text/javascript']],
  ['/src/relevance-engine.js', ['../../src/relevance-engine.js', 'text/javascript']],
  ['/src/relevance-ui.js', ['src/relevance-ui.js', 'text/javascript']],
  ['/src/email-ui.js', ['src/email-ui.js', 'text/javascript']],
]);
function json(response, status, data) {
  if (response.destroyed) return;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}
async function requestBody(request, limit = 8192) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > limit) throw new ExtractionError('invalid_request', 'Request is too large.', 413);
  }
  try { return JSON.parse(body); }
  catch { throw new ExtractionError('invalid_request', 'Send a JSON object containing the job URL.', 400); }
}
export function createAppServer({ extract = extractJob, resume = readResume, generate = generateEmail, availability = providerAvailability } = {}) {
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/api/ai-providers' && request.method === 'GET') { json(response, 200, { providers: availability() }); return; }
  if (path === '/api/generate-email') {
    if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); json(response, 405, { error: { code: 'method', message: 'Use POST.' } }); return; }
    if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) { json(response, 403, { error: { code: 'origin', message: 'Request origin is not allowed.' } }); return; }
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) { json(response, 415, { error: { code: 'invalid_request', message: 'Use application/json.' } }); return; }
    const controller = new AbortController();
    response.on('close', () => { if (!response.writableEnded) controller.abort(); });
    try { json(response, 200, await generate(await requestBody(request, 1500000), { signal: controller.signal })); }
    catch (error) { const known = error instanceof GenerationError || error instanceof ExtractionError; json(response, known ? error.httpStatus : 500, { error: { code: known ? error.code : 'internal', message: known ? error.message : 'Email generation failed. Please try again.' } }); }
    return;
  }
  if (path === '/api/read-resume') {
    if(request.method!=='POST'){response.setHeader('Allow','POST');json(response,405,{error:{code:'method',message:'Use POST.'}});return;}
    if(request.headers.origin&&request.headers.origin!==`http://${request.headers.host}`){json(response,403,{error:{code:'origin',message:'Request origin is not allowed.'}});return;}
    const controller=new AbortController();response.on('close',()=>{if(!response.writableEnded)controller.abort();});
    try {
      const length=Number(request.headers['content-length']||0);if(length>=MAX_RESUME_BYTES)throw new ResumeError('too_large','Resume must be smaller than 5 MB.',413);
      const chunks=[];let size=0;
      for await(const chunk of request){size+=chunk.length;if(size>=MAX_RESUME_BYTES)throw new ResumeError('too_large','Resume must be smaller than 5 MB.',413);chunks.push(chunk);}
      const filename=decodeURIComponent(request.headers['x-resume-name']||'');
      json(response,200,await resume(Buffer.concat(chunks),{filename,type:(request.headers['content-type']||'').split(';')[0],signal:controller.signal}));
    }catch(error){const known=error instanceof ResumeError;json(response,known?error.httpStatus:422,{error:{code:known?error.code:'unreadable',message:known?error.message:'The document could not be processed. Try another file or enter your information manually.'}});}
    return;
  }
  if (path === '/api/extract-job') {
    if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); json(response, 405, { error: { code: 'method', message: 'Use POST.' } }); return; }
    if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) {
      json(response, 403, { error: { code: 'origin', message: 'Request origin is not allowed.' } }); return;
    }
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) {
      json(response, 415, { error: { code: 'invalid_request', message: 'Use application/json.' } }); return;
    }
    const controller = new AbortController();
    response.on('close', () => { if (!response.writableEnded) controller.abort(); });
    try {
      const body = await requestBody(request);
      if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => key !== 'url')) {
        throw new ExtractionError('invalid_request', 'Send only the job URL.', 400);
      }
      json(response, 200, await extract(body.url, { signal: controller.signal }));
    } catch (error) {
      const known = error instanceof ExtractionError;
      json(response, known ? error.httpStatus : 500, { job: null, error: {
        code: known ? error.code : 'internal', message: known ? error.message : 'Unable to retrieve job details. Please try again.',
      } });
    }
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end('Method not allowed'); return; }
  const asset = assets.get(new URL(request.url, 'http://localhost').pathname);
  if (!asset) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const content = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8` });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(500); response.end('Unable to load page'); }
});
server.requestTimeout = 15000;
return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const server = createAppServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Open http://localhost:${port}/analyze-job if HireDraft is running, or set $env:PORT = "${port + 1}" and run npm.cmd start.`
      : `Unable to start HireDraft: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`HireDraft: http://localhost:${port}/analyze-job`));
}
