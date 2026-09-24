import { load } from 'cheerio';
import { validateLinkedInUrl as validateJobUrl, linkedInResourceId } from '../validate-job-url.js';
import { descriptionText } from './html-text.js';
import { parsePostPage } from './extract-post.js';
import { normalizeJobProfile } from '../job-profile.js';
export { descriptionText } from './html-text.js';

export const EXTRACTION_TIMEOUT_MS = 12000;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
export class ExtractionError extends Error {
  constructor(code, message, httpStatus = 502) { super(message); this.code = code; this.httpStatus = httpStatus; }
}
const errors = {
  restricted: "We couldn't access this LinkedIn job posting automatically. Paste the job details manually to continue.",
  unavailable: 'This LinkedIn job posting may have expired, been removed, or become unavailable.',
  network: "We couldn't retrieve the job posting. Please try again.",
  timeout: 'Retrieving job details took too long. Please try again or paste the details manually.',
  extraction: 'The page was retrieved, but the job details could not be extracted reliably.',
};
function fail(code) { throw new ExtractionError(code, errors[code]); }

// Readable source text only: scripts are never executed or sent as rendered HTML.
const clean = value => typeof value === 'string' ? descriptionText(value) : null;
const jobId = url => new URL(url).pathname.match(/(\d+)\/?$/)?.[1];

export function parseJobPage(html, sourceUrl, now = () => new Date()) {
  const $ = load(html);
  const postings = [];
  function collect(value) {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    if ([value['@type']].flat().some(type => type === 'JobPosting' || type === 'https://schema.org/JobPosting')) postings.push(value);
    if (value['@graph']) collect(value['@graph']);
    if (value.mainEntity) collect(value.mainEntity);
  }
  $('script[type="application/ld+json"]').each((_, node) => {
    try { collect(JSON.parse($(node).text())); } catch { /* Try remaining sources. */ }
  });
  const id = jobId(sourceUrl);
  const matches = posting => {
    const url = posting.url || posting['@id'];
    if (typeof url === 'string' && /\/jobs\/view\//.test(url)) {
      try { return jobId(new URL(url, sourceUrl).href) === id; } catch { return false; }
    }
    const identifier = posting.identifier?.value;
    if (identifier != null && /^\d+$/.test(String(identifier))) return String(identifier) === id;
    return null;
  };
  const structured = postings.find(posting => matches(posting) === true)
    || (postings.length === 1 && matches(postings[0]) !== false ? postings[0] : null);
  const titleNode = $('.top-card-layout__title, .topcard__title, h1[itemprop="title"]').first();
  const companyNode = $('.topcard__org-name-link, .topcard__flavor a, [itemprop="hiringOrganization"] [itemprop="name"]').first();
  const descriptionNode = $('.show-more-less-html__markup, .description__text, [itemprop="description"]').first();
  const meta = name => $(`meta[property="${name}"], meta[name="${name}"]`).first().attr('content');
  const provenance = {};
  const pick = (field, choices) => {
    for (const [raw, source] of choices) {
      const text = clean(raw);
      if (text) { provenance[field] = source; return { raw, text }; }
    }
    return { raw: null, text: null };
  };
  // Generic social-preview descriptions are not the full job description.
  const title = pick('jobTitle', [[structured?.title, 'structured'], [meta('job:title'), 'metadata'], [titleNode.text(), 'page']]);
  const company = pick('companyName', [[structured?.hiringOrganization?.name, 'structured'], [meta('job:company'), 'metadata'], [companyNode.text(), 'page']]);
  const description = pick('jobDescription', [[structured?.description, 'structured'], [descriptionNode.html(), 'page']]);
  const values = [title.text, company.text, description.text];
  const meaningful = description.text && description.text.replace(/\s/g, '').length >= 40
    && !/^(?:not available|n\/?a|job description|sign in|unavailable)[.!]?$/i.test(description.text);
  const extractionStatus = values.every(Boolean) && meaningful ? 'success' : values.some(Boolean) ? 'partial' : 'failed';
  return {
    source: 'LinkedIn', sourceType: 'linkedin_job', sourceUrl, jobTitle: title.text, companyName: company.text,
    location: clean(structured?.jobLocation?.address?.addressLocality || $('.topcard__flavor--bullet, [itemprop="addressLocality"]').first().text()),
    jobDescription: description.text, extractionStatus, extractedAt: now().toISOString(),
    raw: { jobTitle: title.raw, companyName: company.raw, jobDescription: description.raw }, provenance,
  };
}

async function readPage(response) {
  if (Number(response.headers.get('content-length')) > MAX_PAGE_BYTES) { await response.body?.cancel(); fail('extraction'); }
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_PAGE_BYTES) fail('extraction');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function extractJob(sourceUrl, { fetchImpl = fetch, signal, timeoutMs = EXTRACTION_TIMEOUT_MS, now } = {}) {
  const validation = typeof sourceUrl === 'string' ? validateJobUrl(sourceUrl) : { valid: false };
  if (!validation.valid) throw new ExtractionError('invalid_url', validation.message || 'Please enter a valid LinkedIn job posting URL.', 400);
  const originalUrl = validation.validatedJobUrl;
  const canonical = new URL(originalUrl);
  canonical.protocol = 'https:';
  canonical.search = '';
  canonical.hash = '';
  const timeout = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal ? AbortSignal.any([timeout, signal]) : timeout;
  try {
    let current = canonical.href;
    let response;
    for (let redirects = 0; redirects <= 3; redirects++) {
      response = await fetchImpl(current, {
        redirect: 'manual', signal: requestSignal,
        headers: { Accept: 'text/html', 'User-Agent': 'HireDraft/0.2 (public job information retrieval)' },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) fail('extraction');
        const next = new URL(location, current);
        const nextValidation = validateJobUrl(next.href);
        if (!nextValidation.valid || next.protocol !== 'https:' || nextValidation.sourceType !== validation.sourceType) fail('restricted');
        if (linkedInResourceId(next.href) !== linkedInResourceId(originalUrl)) fail('unavailable');
        if (redirects === 3) fail('extraction');
        next.search = '';
        next.hash = '';
        current = next.href;
        continue;
      }
      break;
    }
    if ([401, 403, 429, 999].includes(response.status)) { await response.body?.cancel(); fail('restricted'); }
    if ([404, 410].includes(response.status)) { await response.body?.cancel(); fail('unavailable'); }
    if (!response.ok) { await response.body?.cancel(); fail('network'); }
    if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel(); fail('extraction');
    }
    const html = await readPage(response);
    const $ = load(html);
    const visible = $('body').clone();
    visible.find('script, style').remove();
    const pageText = visible.text();
    if ($('form[action*="checkpoint"], #captcha, .g-recaptcha').length
      || /security verification|verify (?:that )?you are (?:a )?human|authwall/i.test($('title').text())) fail('restricted');
    const isPost = validation.sourceType === 'linkedin_post';
    const job = isPost ? parsePostPage(html, originalUrl, now) : parseJobPage(html, originalUrl, now);
    if (!isPost && /no longer accepting applications|job (?:is )?no longer available|job (?:has been|was) removed|job (?:has )?expired/i.test(pageText)) fail('unavailable');
    if (job.extractionStatus === 'failed') {
      if ($('form[action*="login"]').length || /sign in to (?:view|see)|join linkedin to (?:view|see)/i.test(pageText)) fail('restricted');
      return { job, profile: normalizeJobProfile(job), error: {
        code: isPost && job.originalPostContent ? 'not_hiring' : 'extraction',
        message: isPost && job.originalPostContent ? 'This LinkedIn post does not appear to contain a job opening.' : errors.extraction,
      } };
    }
    return { job, profile: normalizeJobProfile(job), error: null };
  } catch (error) {
    if (error instanceof ExtractionError) {
      if (validation.sourceType === 'linkedin_post') error.message = error.message.replace(/job posting/g, 'hiring post');
      throw error;
    }
    if (timeout.aborted) throw new ExtractionError('timeout', errors.timeout, 504);
    if (signal?.aborted) throw new ExtractionError('cancelled', 'Request cancelled.', 499);
    throw new ExtractionError('network', errors.network);
  }
}
