/** Pure format validation; does not confirm a posting exists or fetch LinkedIn. */
export function validateLinkedInUrl(value) {
  if (typeof value !== 'string') return { valid: false, code: 'format', message: 'Please enter a valid URL.', validatedJobUrl: null, sourceType: null };
  const input = value.trim();
  const invalid = (code, message) => ({ valid: false, code, message, validatedJobUrl: null, sourceType: null });
  if (!input) return invalid('empty', 'Please enter a LinkedIn job posting URL.');
  if (!/^https?:\/\//i.test(input) || /\s/.test(input)) {
    return invalid('format', 'Please enter a valid URL. Include https:// at the beginning.');
  }
  let url;
  try { url = new URL(input); }
  catch { return invalid('format', 'Please enter a valid URL.'); }
  if (url.username || url.password || url.port) return invalid('format', 'Please enter a valid LinkedIn job posting URL.');
  if (!['linkedin.com', 'www.linkedin.com'].includes(url.hostname)) {
    return invalid('domain', 'This is not a LinkedIn URL.');
  }
  // LinkedIn supports numeric IDs and descriptive slugs ending in a numeric ID.
  const isJob = /^\/jobs\/view\/(?:[a-z0-9]+(?:-[a-z0-9]+)*-)?\d+\/?$/i.test(url.pathname);
  const isActivity = /^\/feed\/update\/urn:li:activity:\d+\/?$/.test(url.pathname);
  // A public post permalink must carry an activity/share ID, not just /posts/.
  const isPost = /^\/posts\/[a-z0-9_%.-]+-(?:activity|share)-\d+(?:-[a-z0-9_-]+)?\/?$/i.test(url.pathname);
  if (!isJob && !isActivity && !isPost) return invalid('job', 'Please enter a LinkedIn job or post URL, not a profile or company page.');
  return { valid: true, code: 'valid', message: isJob ? 'Valid LinkedIn job posting URL.' : 'Valid LinkedIn post URL.',
    validatedJobUrl: url.href, sourceType: isJob ? 'linkedin_job' : 'linkedin_post' };
}

// Preserve the original strict Day 1 validator for callers that require job URLs.
export function validateJobUrl(value) {
  const result = validateLinkedInUrl(value);
  if (result.valid && result.sourceType !== 'linkedin_job') return { valid: false, code: 'job', message: 'Please enter a LinkedIn job posting URL, not a profile or company page.', validatedJobUrl: null, sourceType: null };
  return result;
}

export function linkedInResourceId(value) {
  const url = new URL(value);
  return url.pathname.match(/(?:activity:|-(?:activity|share)-)(\d+)/)?.[1]
    || url.pathname.match(/(\d+)\/?$/)?.[1] || null;
}
