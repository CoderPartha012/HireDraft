import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJob, parseJobPage, descriptionText } from '../src/server/extract-job.js';

const url = 'https://www.linkedin.com/jobs/view/1234567890';
const description = '<p>Build and maintain reliable test automation for our web applications.</p><p>Work with the engineering team.</p><ul><li>Write regression tests.</li><li>Investigate defects &amp; document findings.</li></ul>';
const posting = { '@type': 'JobPosting', url, title: 'Software QA Engineer', hiringOrganization: { name: 'Example Technologies' }, description };
const structured = data => `<html><head><script type="application/ld+json">${JSON.stringify(data)}</script></head><body></body></html>`;
const page = html => new Response(html, { headers: { 'Content-Type': 'text/html' } });
const failure = code => error => error.code === code;

test('structured extraction preserves raw description, paragraphs, lists, provenance and time', async () => {
  const { job } = await extractJob(url, { fetchImpl: async () => page(structured(posting)), now: () => new Date('2026-09-15T00:00:00Z') });
  assert.equal(job.extractionStatus, 'success');
  assert.equal(job.jobTitle, posting.title);
  assert.equal(job.companyName, posting.hiringOrganization.name);
  assert.equal(job.raw.jobDescription, description);
  assert.match(job.jobDescription, /applications\.\n\nWork/);
  assert.match(job.jobDescription, /• Write regression tests\./);
  assert.match(job.jobDescription, /defects & document/);
  assert.equal(job.provenance.jobDescription, 'structured');
  assert.equal(job.extractedAt, '2026-09-15T00:00:00.000Z');
});
test('page content fallback works despite malformed metadata and a normal sign-in form', async () => {
  const html = `<script type="application/ld+json">broken</script><form action="/login"></form><h1 class="top-card-layout__title">QA Engineer</h1><a class="topcard__org-name-link">Example</a><div class="show-more-less-html__markup">${description}</div>`;
  const { job } = await extractJob(url, { fetchImpl: async () => page(html) });
  assert.equal(job.extractionStatus, 'success');
  assert.equal(job.provenance.jobTitle, 'page');
});
test('job-specific metadata can fill title/company, but generic social previews are not invented fields', () => {
  const job = parseJobPage('<meta property="job:title" content="QA Engineer"><meta property="job:company" content="Example"><meta property="og:description" content="Sign in to view this job">', url);
  assert.equal(job.extractionStatus, 'partial');
  assert.equal(job.jobDescription, null);
  assert.equal(job.provenance.companyName, 'metadata');
  assert.equal(parseJobPage('<meta property="og:title" content="LinkedIn"><meta name="description" content="Find jobs">', url).extractionStatus, 'failed');
});
test('partial results retain available fields without fabricating missing ones', () => {
  const job = parseJobPage(structured({ ...posting, description: undefined }), url);
  assert.equal(job.extractionStatus, 'partial');
  assert.equal(job.jobTitle, posting.title);
  assert.equal(job.jobDescription, null);
  assert.equal(job.raw.jobDescription, null);
});
test('a short description stays raw but cannot count as complete', () => {
  const job = parseJobPage(structured({ ...posting, description: 'N/A' }), url);
  assert.equal(job.extractionStatus, 'partial');
  assert.equal(job.raw.jobDescription, 'N/A');
});
test('JSON-LD graphs choose the requested posting, not a related job', () => {
  const related = { ...posting, url: 'https://www.linkedin.com/jobs/view/999', title: 'Wrong job' };
  assert.equal(parseJobPage(structured({ '@graph': [related, posting] }), url).jobTitle, posting.title);
  assert.equal(parseJobPage(structured(related), url).extractionStatus, 'failed');
  assert.equal(parseJobPage(structured([{ ...posting, url: undefined }, { ...related, url: undefined }]), url).extractionStatus, 'failed');
});
test('description conversion does not execute or render active source content', () => {
  assert.equal(descriptionText('<p>Hello <b>team</b></p><script>alert(1)</script><iframe>bad</iframe>'), 'Hello team');
});
test('server revalidates arbitrary, malformed, profile and non-string input before any fetch', async () => {
  for (const input of ['https://127.0.0.1/jobs/view/123', 'https://linkedin.com/in/person', 'https://linkedin.com.evil.com/jobs/view/123', 'bad', null, {}, 'ftp://linkedin.com/jobs/view/123']) {
    await assert.rejects(extractJob(input, { fetchImpl: () => { assert.fail('must not fetch'); } }), failure('invalid_url'));
  }
});
for (const [status, code] of [[401, 'restricted'], [403, 'restricted'], [429, 'restricted'], [999, 'restricted'], [404, 'unavailable'], [410, 'unavailable'], [503, 'network']]) {
  test(`HTTP ${status} reports ${code}`, async () => {
    await assert.rejects(extractJob(url, { fetchImpl: async () => status === 999 ? { status, body: null } : new Response('', { status }) }), failure(code));
  });
}
test('retrieved but unrecognized page returns failed result and explicit failure', async () => {
  const result = await extractJob(url, { fetchImpl: async () => page('<html><body>Welcome</body></html>') });
  assert.equal(result.job.extractionStatus, 'failed');
  assert.equal(result.error.code, 'extraction');
});
for (const html of ['<title>Security Verification</title>', '<form action="/checkpoint"></form>', '<form action="/login"></form>', '<div>Sign in to view this job</div>']) {
  test(`restricted page: ${html}`, async () => {
    await assert.rejects(extractJob(url, { fetchImpl: async () => page(html) }), failure('restricted'));
  });
}
test('removed job banner is unavailable even if stale metadata remains', async () => {
  await assert.rejects(extractJob(url, { fetchImpl: async () => page(`${structured(posting)}<div>This job is no longer available</div>`) }), failure('unavailable'));
});
test('network errors are safe and do not leak internal error text', async () => {
  await assert.rejects(extractJob(url, { fetchImpl: async () => { throw new Error('secret internals'); } }), error => error.code === 'network' && !error.message.includes('secret'));
});
test('timeout and user cancellation abort retrieval', async () => {
  const fetchImpl = (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    if (signal.aborted) reject(signal.reason);
  });
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(extractJob(url, { fetchImpl, timeoutMs: 10 }), failure('timeout')); }
  finally { clearTimeout(keepAlive); }
  const controller = new AbortController();
  const pending = extractJob(url, { fetchImpl, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, failure('cancelled'));
});
test('timeout covers a stalled response body too', async () => {
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(extractJob(url, { timeoutMs: 10, fetchImpl: async (_, { signal }) => {
      const body = new ReadableStream({ start(controller) { signal.addEventListener('abort', () => controller.error(signal.reason), { once: true }); } });
      return new Response(body, { headers: { 'Content-Type': 'text/html' } });
    } }), failure('timeout'));
  } finally { clearTimeout(keepAlive); }
});
test('redirects cannot fetch external, login, downgraded or different-job pages', async () => {
  for (const location of ['https://evil.example/jobs/view/1234567890', 'https://www.linkedin.com/login', 'http://www.linkedin.com/jobs/view/1234567890', 'https://www.linkedin.com/jobs/view/999']) {
    let calls = 0;
    await assert.rejects(extractJob(url, { fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location } }); } }));
    assert.equal(calls, 1);
  }
});
test('safe same-job redirects work and tracking data is stripped only for retrieval', async () => {
  const calls = [];
  const sourceUrl = `${url}?trackingId=abc#details`;
  const result = await extractJob(sourceUrl, { fetchImpl: async (target, options) => {
    calls.push(target);
    assert.equal(options.redirect, 'manual');
    return calls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://linkedin.com/jobs/view/1234567890?tracking=xyz' } }) : page(structured(posting));
  } });
  assert.deepEqual(calls, [url, 'https://linkedin.com/jobs/view/1234567890']);
  assert.equal(result.job.sourceUrl, sourceUrl);
});
test('redirect loops, oversized pages and non-HTML responses fail safely', async () => {
  await assert.rejects(extractJob(url, { fetchImpl: async () => new Response(null, { status: 302, headers: { location: url } }) }), failure('extraction'));
  await assert.rejects(extractJob(url, { fetchImpl: async () => new Response('a', { headers: { 'content-type': 'text/html', 'content-length': '3000000' } }) }), failure('extraction'));
  await assert.rejects(extractJob(url, { fetchImpl: async () => page('a'.repeat(2 * 1024 * 1024 + 1)) }), failure('extraction'));
  await assert.rejects(extractJob(url, { fetchImpl: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }) }), failure('extraction'));
});
