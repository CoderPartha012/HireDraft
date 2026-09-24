import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLinkedInUrl, validateJobUrl, linkedInResourceId } from '../src/validate-job-url.js';
import { parsePostPage, analyzeHiringText } from '../src/server/extract-post.js';
import { extractJob } from '../src/server/extract-job.js';
import { normalizeJobProfile, selectProfileRole, confirmJobProfile } from '../src/job-profile.js';

const id = '7505130007300575232';
const url = `https://www.linkedin.com/posts/recruiter_hiring-qa-activity-${id}-Ab12`;
const activity = `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`;
const text = "We're hiring QA Engineer\nCompany: Example Technologies\nLocation: Bangalore\nExperience: 1–3 years\nSkills: Selenium, Java, UncommonTool\nEmployment Type: Full-time\nRecruiter Name: Muskan Sharma\nRecruiter Email: muskan@example.com\nApplication Email: careers@example.com\nApply: https://example.com/careers/qa\nContact Number: +91 987 654 3210\nBuild quality software and collaborate with our engineers.";
const structured = (content = text, extra = {}) => `<script type="application/ld+json">${JSON.stringify({ '@type': 'SocialMediaPosting', url, articleBody: content, author: { name: 'Muskan Sharma', jobTitle: 'Talent Acquisition at Unrelated Employer', url: 'https://www.linkedin.com/in/muskan' }, datePublished: '2026-09-15', ...extra })}</script>`;
const page = html => new Response(html, { headers: { 'Content-Type': 'text/html' } });

for (const input of [url, activity, `${url}?utm_source=share&rcm=abc#post`, `  ${activity}  `, url.replace('-activity-', '-share-')]) {
  test(`detects post permalink ${input}`, () => {
    const result = validateLinkedInUrl(input);
    assert.equal(result.valid, true);
    assert.equal(result.sourceType, 'linkedin_post');
    assert.equal(result.validatedJobUrl, new URL(input.trim()).href);
    assert.equal(linkedInResourceId(result.validatedJobUrl), id);
    assert.equal(validateJobUrl(input).valid, false);
  });
}
for (const path of ['/feed/', '/feed/update/', '/feed/update/urn:li:activity:not-a-number', '/posts/', '/posts/example', '/posts/a-activity-123/extra', '/company/example', '/in/person', '/jobs/search', '/messaging']) {
  test(`rejects unsupported path ${path}`, () => assert.equal(validateLinkedInUrl(`https://www.linkedin.com${path}`).valid, false));
}
test('formal jobs remain detected as linkedin_job', () => assert.equal(validateLinkedInUrl('https://linkedin.com/jobs/view/123').sourceType, 'linkedin_job'));
test('post extraction retains raw text and separates author, recruiter, company and application contacts', async () => {
  const { job, profile } = await extractJob(url, { fetchImpl: async () => page(structured()) });
  assert.equal(job.extractionStatus, 'success');
  assert.equal(job.jobTitle, 'QA Engineer');
  assert.equal(job.companyName, 'Example Technologies');
  assert.equal(job.postAuthorName, 'Muskan Sharma');
  assert.equal(job.recruiterName, 'Muskan Sharma');
  assert.equal(job.recruiterEmail, 'muskan@example.com');
  assert.equal(job.applicationEmail, 'careers@example.com');
  assert.deepEqual(job.applicationEmails, ['muskan@example.com', 'careers@example.com']);
  assert.equal(job.applicationLink, 'https://example.com/careers/qa');
  assert.deepEqual(job.skills, ['Selenium', 'Java', 'UncommonTool']);
  assert.equal(job.location, 'Bangalore');
  assert.equal(job.experience, '1–3 years');
  assert.equal(job.raw.postContent, text);
  assert.equal(job.originalPostContent, text);
  assert.equal(profile.sourceType, 'linkedin_post');
  assert.equal(profile.confirmed, false);
});
test('post extraction never follows captured external links', async () => {
  const calls = [];
  const result = await extractJob(url, { fetchImpl: async target => { calls.push(target); return page(structured()); } });
  assert.deepEqual(calls, [url]);
  assert.equal(result.job.applicationLink, 'https://example.com/careers/qa');
});
test('recognizable post content scopes away comments and captures links safely', () => {
  const html = `<article class="main-feed-card" data-urn="urn:li:activity:${id}"><h2 class="base-main-feed-card__title">Author</h2><div class="base-main-feed-card__subtitle">Recruiter at Other Employer</div><a class="base-main-feed-card__actor-link" href="/in/author">Author</a><time datetime="2026-09-15"></time><div class="attributed-text-segment-list__content">We're hiring QA Engineer<p>📍 Location: Remote (India)</p><p>Experience: Freshers can apply</p><a href="https://example.com/apply">Apply here</a><a href="javascript:alert(1)">Bad</a></div><div class="comments">Company: Fake Company</div></article>`;
  const job = parsePostPage(html, url);
  assert.equal(job.extractionStatus, 'partial');
  assert.equal(job.companyName, null);
  assert.equal(job.location, 'Remote (India)');
  assert.equal(job.authorProfileUrl, 'https://www.linkedin.com/in/author');
  assert.deepEqual(job.applicationLinks, ['https://example.com/apply']);
  assert.ok(!job.originalPostContent.includes('Fake Company'));
});
test('missing company/experience/employment never come from recruiter employer or skill guesses', () => {
  const job = parsePostPage(structured("We're hiring QA Engineers in Bangalore. Selenium experience preferred."), url);
  assert.equal(job.extractionStatus, 'partial');
  assert.equal(job.companyName, null);
  assert.equal(job.experience, null);
  assert.equal(job.employmentType, null);
  assert.deepEqual(job.skills, ['Selenium']);
});
for (const content of ['Sharing career advice for QA Engineers.', 'Hiring trends and opportunities for QA Engineers this year.', 'Looking for advice from a QA Engineer.', "We are not hiring QA Engineers.", "I'm looking for a QA Engineer opportunity.", 'There is a hiring freeze for QA Engineers.']) {
  test(`does not misclassify non-hiring text: ${content}`, () => assert.equal(analyzeHiringText(content).isHiring, false));
}
test('non-hiring posts produce explicit failure and preserve source for manual fallback', async () => {
  const result = await extractJob(url, { fetchImpl: async () => page(structured('Sharing career advice for QA Engineers.')) });
  assert.equal(result.error.code, 'not_hiring');
  assert.equal(result.error.message, 'This LinkedIn post does not appear to contain a job opening.');
  assert.equal(result.job.originalPostContent, 'Sharing career advice for QA Engineers.');
});
test('unrecognized, restricted and unavailable posts fail safely', async () => {
  for (const [response, expected] of [[page('<p>Welcome</p>'), 'extraction'], [new Response('', { status: 403 }), 'restricted'], [new Response('', { status: 404 }), 'unavailable']]) {
    try {
      const result = await extractJob(url, { fetchImpl: async () => response });
      assert.equal(result.error.code, expected);
    } catch (error) { assert.equal(error.code, expected); }
  }
});
test('post redirects require same ID/type and can go from activity to public post', async () => {
  let calls = 0;
  const result = await extractJob(activity, { fetchImpl: async () => ++calls === 1
    ? new Response(null, { status: 302, headers: { location: url } }) : page(structured()) });
  assert.equal(result.job.sourceUrl, activity);
  assert.equal(result.profile.sourceType, 'linkedin_post');
  for (const location of ['https://www.linkedin.com/jobs/view/7505130007300575232', url.replace(id, '999'), 'https://evil.example/']) {
    let redirects = 0;
    await assert.rejects(extractJob(activity, { fetchImpl: async () => { redirects++; return new Response(null, { status: 302, headers: { location } }); } }));
    assert.equal(redirects, 1);
  }
});
test('multi-role posts preserve every role and never blend experience, skills or application addresses', () => {
  const content = "Company: Example\nLocation: Bangalore\nWe're hiring:\n1. QA Engineer — 2–4 years\nSkills: Selenium, Java\nApplication Email: qa@example.com\n2. Backend Developer — 3+ years\nSkills: Python\nApplication Email: backend@example.com\n3. Product Designer — 2+ years";
  const job = parsePostPage(structured(content), url);
  assert.deepEqual(job.roles.map(role => role.jobTitle), ['QA Engineer', 'Backend Developer', 'Product Designer']);
  assert.equal(job.jobTitle, null);
  assert.equal(job.experience, null);
  const profile = normalizeJobProfile(job);
  assert.throws(() => confirmJobProfile(profile), /Select which role/);
  const selected = selectProfileRole(profile, 'role-1');
  assert.equal(selected.experience, '2–4 years');
  assert.deepEqual(selected.skills, ['Selenium', 'Java']);
  assert.deepEqual(selected.applicationEmails, ['qa@example.com']);
  assert.equal(selected.companyName, 'Example');
  assert.equal(selected.location, 'Bangalore');
  assert.ok(!selected.jobSourceContent.includes('Backend Developer'));
  assert.equal(selected.originalPostContent, content);
  const confirmed = confirmJobProfile(selected);
  selected.skills.push('Edited');
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.roles.length, 1);
  assert.deepEqual(confirmed.skills, ['Selenium', 'Java']);
});
test('responsibility bullets are not extra roles', () => {
  const result = analyzeHiringText("We're hiring:\n- QA Engineer\n- Write regression tests.\n- Investigate defects.");
  assert.equal(result.isHiring, true);
  assert.deepEqual(result.roles.map(role => role.jobTitle), ['QA Engineer']);
});
test('same-line multiple roles require user-supplied role content instead of merging it', () => {
  const job = parsePostPage(structured("We're hiring QA Engineer and Backend Developer. Skills: Selenium, Python. Company: Example."), url);
  const selected = selectProfileRole(normalizeJobProfile(job), 'role-1');
  assert.equal(selected.jobSourceContent, null);
  assert.deepEqual(selected.skills, []);
  assert.throws(() => confirmJobProfile(selected), /content is required/);
  assert.ok(selected.originalPostContent.includes('Backend Developer'));
});
test('matching main post wins over unrelated structured posts', () => {
  const unrelated = { '@type': 'SocialMediaPosting', url: url.replace(id, '999'), articleBody: 'We are hiring Product Designer' };
  const html = `<script type="application/ld+json">${JSON.stringify({ '@graph': [unrelated, { '@type': 'SocialMediaPosting', url, articleBody: text }] })}</script>`;
  assert.equal(parsePostPage(html, url).jobTitle, 'QA Engineer');
  assert.equal(parsePostPage(structured(text, { url: url.replace(id, '999') }), url).extractionStatus, 'failed');
});
test('labeled phone numbers are captured without mistaking an activity ID for contact information', () => {
  const job = parsePostPage(structured("We're hiring QA Engineer\nContact Number: +91 9876543210\nActivity ID: 7505130007300575232"), url);
  assert.deepEqual(job.contactNumbers, ['+91 9876543210']);
  assert.equal(job.recruiterName, null);
});
test('seniority stays in the role title, and collaborator roles are not openings', () => {
  const job = parsePostPage(structured("We're hiring Senior QA Engineer\nYou will collaborate with Backend Developers and Product Designers.\nSkills: Selenium"), url);
  assert.equal(job.jobTitle, 'Senior QA Engineer');
  assert.equal(job.roles.length, 1);
});
