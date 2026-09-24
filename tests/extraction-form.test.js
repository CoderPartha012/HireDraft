import { createEmailController } from './legacy/src/email-ui.js';
﻿import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateLinkedInUrl as validateJobUrl } from '../src/validate-job-url.js';
import { normalizeJobProfile, selectProfileRole, validateProfileReview, confirmJobProfile } from '../src/job-profile.js';
import { createRequirementsController } from './legacy/src/requirements-ui.js';
import { createCandidateController } from './legacy/src/candidate-ui.js';
import { createRelevanceController } from './legacy/src/relevance-ui.js';

test('Day 4 confirmation opens Candidate Information and candidate clear preserves requirements', async () => {
  const h=await harness();h.enter(url);h.submit();h.run(350);await h.respond(0,{job,error:null});
  h.get('confirm-button').listeners.click();h.get('requirements-button').listeners.click();h.run(250);h.get('analysis-confirm-button').listeners.click();
  assert.equal(h.get('candidate-section').hidden,false);h.get('candidate-add-button').listeners.click();assert.equal(h.get('candidate-entry').hidden,false);
  h.get('candidate-manual-text').value='Jane Doe\nSkills\nSelenium';h.get('candidate-manual-form').listeners.submit({preventDefault(){}});h.get('candidate-confirm-button').listeners.click();
  assert.equal(h.state.confirmedCandidateProfile.confirmed,true);const requirements=h.state.confirmedRequirementsProfile;h.get('candidate-clear-button').listeners.click();assert.equal(h.state.confirmedCandidateProfile,null);assert.equal(h.state.confirmedRequirementsProfile,requirements);
  h.get('analysis-edit-button').listeners.click();assert.equal(h.get('candidate-section').hidden,true);
});

test('confirmed candidate unlocks matching without any new retrieval or resume request; editing invalidates the handoff',async()=>{
  const h=await harness();h.enter(url);h.submit();h.run(350);await h.respond(0,{job:{...job,jobDescription:'Required Skills: Selenium\nExperience: 1–3 years'},error:null});
  h.get('confirm-button').listeners.click();h.get('requirements-button').listeners.click();h.run(250);h.get('analysis-confirm-button').listeners.click();h.get('candidate-add-button').listeners.click();
  h.get('candidate-manual-text').value='Jane Doe\nSkills\nSelenium';h.get('candidate-manual-form').listeners.submit({preventDefault(){}});h.get('candidate-confirm-button').listeners.click();
  assert.equal(h.get('match-section').hidden,false);const jobSnapshot=JSON.stringify(h.state.confirmedRequirementsProfile),candidateSnapshot=JSON.stringify(h.state.confirmedCandidateProfile);
  h.get('match-button').listeners.click();assert.equal(h.state.matchStatus,'matching');h.run(250);assert.equal(h.state.matchStatus,'reviewing');assert.equal(h.state.draftRelevanceProfile.requiredSkills[0].status,'strong');
  h.get('match-confirm-button').listeners.click();assert.equal(h.state.confirmedRelevanceProfile.confirmed,true);assert.equal(h.requests.length,1);assert.equal(JSON.stringify(h.state.confirmedRequirementsProfile),jobSnapshot);assert.equal(JSON.stringify(h.state.confirmedCandidateProfile),candidateSnapshot);
  h.get('candidate-edit-button').listeners.click();assert.equal(h.state.confirmedRelevanceProfile,null);assert.equal(h.get('match-section').hidden,true);
  h.get('candidate-edit-cancel').listeners.click();h.get('candidate-confirm-button').listeners.click();assert.equal(h.get('match-button').textContent,'Recalculate Match');h.get('match-button').listeners.click();h.run(250);h.get('match-confirm-button').listeners.click();
  h.get('analysis-edit-button').listeners.click();assert.equal(h.state.confirmedRelevanceProfile,null);assert.equal(h.get('match-section').hidden,true);
});

test('candidate context edits, clear, and resume replacement invalidate matching immediately',async()=>{
  const h=await harness();h.enter(url);h.submit();h.run(350);await h.respond(0,{job,error:null});h.get('confirm-button').listeners.click();h.get('requirements-button').listeners.click();h.run(250);h.get('analysis-confirm-button').listeners.click();
  h.get('candidate-add-button').listeners.click();h.get('candidate-manual-text').value='Jane Doe\nSkills\nSelenium';h.get('candidate-manual-form').listeners.submit({preventDefault(){}});
  const confirmAndMatch=()=>{h.get('candidate-confirm-button').listeners.click();h.get('match-button').listeners.click();h.run(250);h.get('match-confirm-button').listeners.click();};
  confirmAndMatch();h.get('candidate-context-workMode').value='Remote';h.get('candidate-context-workMode').listeners.input();assert.equal(h.state.confirmedRelevanceProfile,null);assert.equal(h.get('match-section').hidden,true);
  confirmAndMatch();h.get('candidate-upload').files=[{name:'new.pdf',size:100,type:'application/pdf'}];h.get('candidate-upload-form').listeners.submit({preventDefault(){}});assert.equal(h.state.confirmedRelevanceProfile,null);assert.equal(h.get('match-section').hidden,true);assert.equal(h.requests[1].target,'/api/read-resume');
  h.get('candidate-clear-button').listeners.click();await h.respond(1,{text:'Stale Person\nSkills\nAppium',file:{name:'new.pdf'},warnings:[]});assert.equal(h.state.draftRelevanceProfile,null);assert.equal(h.state.confirmedCandidateProfile,null);assert.equal(h.state.confirmedRequirementsProfile.confirmed,true);
});

const url = 'https://www.linkedin.com/jobs/view/1234567890';
const job = { source: 'LinkedIn', sourceUrl: url, jobTitle: 'QA Engineer', companyName: 'Example', jobDescription: 'Original job description.\n\nâ€¢ Test software.', extractionStatus: 'success', extractedAt: '2026-09-15T00:00:00Z' };
export async function harness() {
  const element = () => ({ value: '', hidden: true, disabled: true, textContent: '', dataset: {}, attributes: {}, listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; }, removeAttribute(name) { delete this.attributes[name]; },
    replaceChildren() { this.textContent = ''; }, prepend() {}, append() {}, focus() {},
  });
  const elements = {};
  const get = id => elements[id] ||= element();
  const timers = new Map();
  const requests = [];
  let timerId = 0;
  const context = vm.createContext({ validateJobUrl, AbortController, normalizeJobProfile, selectProfileRole, validateProfileReview, confirmJobProfile, createRequirementsController, createCandidateController, createRelevanceController, createEmailController,
    document: { querySelector: selector => get(selector.slice(1)), createElement: element },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
    fetch: (target, options) => new Promise((resolve, reject) => { requests.push({ target, options, resolve, reject }); }),
  });
  const source = await readFile(new URL('./legacy/src/app.js', import.meta.url), 'utf8');
  vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace('export const jobAnalysisState', 'globalThis.jobAnalysisState'), context);
  const run = delay => { for (const [id, timer] of [...timers]) { if (timer.delay === delay) { timers.delete(id); timer.callback(); } } };
  const enter = value => { get('job-url').value = value; get('job-url').listeners.input(); };
  const submit = () => get('job-form').listeners.submit({ preventDefault() {} });
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const respond = async (index, result, ok = true) => { requests[index].resolve({ ok, json: async () => result }); await flush(); };
  return { get, state: context.jobAnalysisState, run, enter, submit, requests, respond, flush };
}
test('invalid and profile URLs never request extraction', async () => {
  const h = await harness();
  for (const input of ['bad text', 'https://linkedin.com/in/person']) {
    h.enter(input); h.submit(); h.run(350);
    assert.equal(h.state.status, 'invalid');
  }
  assert.equal(h.requests.length, 0);
});
test('valid input retrieves details and sends only the validated URL', async () => {
  const h = await harness();
  h.enter(`  ${url}  `); h.submit(); h.run(350);
  assert.equal(h.state.status, 'valid');
  assert.equal(h.state.extractionStatus, 'loading');
  assert.equal(h.get('extraction-message').textContent, 'Retrieving LinkedIn job details...');
  assert.equal(h.get('analyze-button').disabled, true);
  assert.equal(h.requests[0].target, '/api/extract-job');
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { url });
  h.submit(); assert.equal(h.requests.length, 1);
  await h.respond(0, { job, error: null });
  assert.equal(h.state.extractionStatus, 'success');
  assert.equal(h.get('extracted-title').textContent, job.jobTitle);
  assert.equal(h.get('extracted-description').textContent, job.jobDescription);
  assert.equal(h.get('job-details').hidden, false);
  assert.equal(h.get('manual-fallback').hidden, true);
  assert.equal(h.get('analyze-button').disabled, false);
});
test('partial results display available fields and manual capture keeps raw extraction separate', async () => {
  const h = await harness();
  h.enter(url); h.submit(); h.run(350);
  await h.respond(0, { job: { ...job, extractionStatus: 'partial', jobDescription: null }, error: null });
  assert.equal(h.get('extracted-title').textContent, job.jobTitle);
  assert.equal(h.get('extracted-description').textContent, 'Could not be extracted.');
  assert.equal(h.get('manual-fallback').hidden, false);
  for (const [id, value] of [['manual-title', 'Manual title'], ['manual-company', 'Manual company'], ['manual-description', 'Complete manual description\n\nâ€¢ Original list']]) {
    h.get(id).value = value; h.get(id).listeners.input();
  }
  assert.equal(h.state.manualJob.jobTitle, 'Manual title');
  assert.equal(h.state.manualJob.sourceUrl, url);
  assert.equal(h.state.manualJob.jobDescription, 'Complete manual description\n\nâ€¢ Original list');
  assert.equal(h.state.job.jobDescription, null);
  h.get('clear-button').listeners.click();
  assert.equal(h.state.manualJob, null);
  assert.equal(h.state.job, null);
  assert.equal(h.get('manual-description').value, '');
});
for (const code of ['restricted', 'unavailable', 'extraction', 'network', 'timeout']) {
  test(`${code} failure restores controls and shows fallback with appropriate retry`, async () => {
    const h = await harness();
    h.enter(url); h.submit(); h.run(350);
    await h.respond(0, { job: null, error: { code, message: `Failure: ${code}` } }, false);
    assert.equal(h.state.extractionStatus, 'failed');
    assert.equal(h.get('extraction-message').textContent, `Failure: ${code}`);
    assert.equal(h.get('manual-fallback').hidden, false);
    assert.equal(h.get('retry-button').hidden, !['network', 'timeout'].includes(code));
    assert.equal(h.get('analyze-button').disabled, false);
  });
}
test('network failure can retry the validated URL successfully', async () => {
  const h = await harness();
  h.enter(url); h.submit(); h.run(350);
  h.requests[0].reject(new Error('Connection lost')); await h.flush();
  assert.equal(h.state.extractionError.code, 'network');
  h.get('retry-button').listeners.click();
  assert.equal(h.requests.length, 2);
  await h.respond(1, { job, error: null });
  assert.equal(h.state.extractionStatus, 'success');
});
test('client timeout aborts extraction and offers retry/manual entry', async () => {
  const h = await harness();
  h.enter(url); h.submit(); h.run(350); h.run(15000);
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.requests[0].reject(new Error('Aborted')); await h.flush();
  assert.equal(h.state.extractionError.code, 'timeout');
  assert.equal(h.get('retry-button').hidden, false);
  assert.equal(h.get('manual-fallback').hidden, false);
});
for (const action of ['clear', 'edit']) {
  test(`${action} during extraction aborts and ignores stale success and error`, async () => {
    for (const lateFailure of [false, true]) {
      const h = await harness();
      h.enter(url); h.submit(); h.run(350);
      if (action === 'clear') h.get('clear-button').listeners.click();
      else h.enter('https://www.linkedin.com/jobs/view/999');
      assert.equal(h.requests[0].options.signal.aborted, true);
      if (lateFailure) { h.requests[0].reject(new Error('Late error')); await h.flush(); }
      else await h.respond(0, { job, error: null });
      assert.equal(h.state.status, 'default');
      assert.equal(h.state.extractionStatus, 'idle');
      assert.equal(h.state.job, null);
      assert.equal(h.get('extraction-section').hidden, true);
    }
  });
}
test('out-of-order old response cannot replace a newer job result', async () => {
  const h = await harness();
  h.enter(url); h.submit(); h.run(350);
  const nextUrl = 'https://www.linkedin.com/jobs/view/999';
  h.enter(nextUrl); h.submit(); h.run(350);
  await h.respond(1, { job: { ...job, sourceUrl: nextUrl, jobTitle: 'New job' }, error: null });
  await h.respond(0, { job, error: null });
  assert.equal(h.get('extracted-title').textContent, 'New job');
  assert.equal(h.state.job.sourceUrl, nextUrl);
});

const postUrl = 'https://www.linkedin.com/posts/author_hiring-activity-7505130007300575232-Ab12';
const postJob = { ...job, sourceUrl: postUrl, sourceType: 'linkedin_post', companyName: null,
  location: 'Bangalore', experience: null, recruiterName: 'Recruiter', recruiterEmail: 'hr@example.com',
  applicationEmails: ['jobs@example.com'], originalPostContent: "We're hiring QA Engineer. Selenium experience preferred.",
  jobDescription: "We're hiring QA Engineer. Selenium experience preferred.", extractionStatus: 'partial' };
const submitReview = form => form.listeners.submit({ preventDefault() {} });

test('post URL starts source-aware retrieval and displays optional facts without guesses', async () => {
  const h = await harness();
  h.enter(postUrl); h.submit(); h.run(350);
  assert.equal(h.state.sourceType, 'linkedin_post');
  assert.equal(h.get('extraction-message').textContent, 'Retrieving LinkedIn hiring post...');
  await h.respond(0, { job: postJob, error: null });
  assert.equal(h.get('details-heading').textContent, 'Hiring Post Details');
  assert.equal(h.get('content-heading').textContent, 'Hiring Post');
  assert.equal(h.get('extracted-company').textContent, 'Not specified');
  assert.equal(h.get('extracted-experience').textContent, 'Not specified');
  assert.equal(h.get('application-emails').textContent, 'jobs@example.com');
  assert.equal(h.get('original-post-content').textContent, postJob.originalPostContent);
  assert.equal(h.state.confirmedJobProfile, null);
});
test('edit/save/confirm creates an independent corrected profile without changing extracted raw data', async () => {
  const h = await harness();
  h.enter(postUrl); h.submit(); h.run(350);
  await h.respond(0, { job: postJob, error: null });
  h.get('edit-button').listeners.click();
  assert.equal(h.get('edit-form').hidden, false);
  assert.equal(h.get('confirm-button').disabled, true);
  h.get('edit-title').value = 'Senior QA Engineer';
  h.get('edit-company').value = 'Correct Company';
  h.get('edit-location').value = 'Remote';
  h.get('edit-experience').value = '3â€“5 years';
  h.get('edit-recruiter').value = 'Correct Recruiter';
  h.get('edit-email').value = 'correct@example.com';
  h.get('edit-content').value = 'Corrected content.\n\nâ€¢ Original paragraph structure.';
  submitReview(h.get('edit-form'));
  assert.equal(h.state.draftProfile.jobTitle, 'Senior QA Engineer');
  assert.equal(h.get('extracted-description').textContent, h.get('edit-content').value);
  assert.equal(h.state.job.jobTitle, 'QA Engineer');
  assert.equal(h.state.job.originalPostContent, postJob.originalPostContent);
  h.get('confirm-button').listeners.click();
  assert.equal(h.state.confirmedJobProfile.confirmed, true);
  assert.equal(h.state.confirmedJobProfile.sourceType, 'linkedin_post');
  assert.equal(h.state.confirmedJobProfile.companyName, 'Correct Company');
  assert.equal(h.state.confirmedJobProfile.experience, '3â€“5 years');
  const confirmed = h.state.confirmedJobProfile;
  h.state.draftProfile.skills.push('Changed');
  assert.ok(!confirmed.skills.includes('Changed'));
  h.get('edit-button').listeners.click();
  assert.equal(h.state.confirmedJobProfile, null);
  h.get('cancel-edit').listeners.click();
  assert.equal(h.state.draftProfile.jobTitle, 'Senior QA Engineer');
  h.enter('new URL');
  assert.equal(h.state.draftProfile, null);
  assert.equal(h.state.confirmedJobProfile, null);
});
test('editing validates required fields and email, and cannot confirm unsaved changes', async () => {
  const h = await harness();
  h.enter(url); h.submit(); h.run(350); await h.respond(0, { job, error: null });
  h.get('edit-button').listeners.click();
  h.get('edit-title').value = '   ';
  submitReview(h.get('edit-form'));
  assert.match(h.get('edit-message').textContent, /title is required/);
  h.get('confirm-button').listeners.click();
  assert.equal(h.state.confirmedJobProfile, null);
  h.get('edit-title').value = 'QA Engineer';
  h.get('edit-email').value = 'bad email';
  submitReview(h.get('edit-form'));
  assert.match(h.get('edit-message').textContent, /valid recruiter email/);
  h.get('edit-email').value = '';
  h.get('edit-content').value = '   ';
  submitReview(h.get('edit-form'));
  assert.match(h.get('edit-message').textContent, /content is required/);
});
test('manual fallback requires title/content and produces the same confirmed profile contract', async () => {
  const h = await harness();
  h.enter(postUrl); h.submit(); h.run(350);
  await h.respond(0, { job: null, error: { code: 'restricted', message: 'Restricted' } }, false);
  submitReview(h.get('manual-form'));
  assert.match(h.get('manual-message').textContent, /title is required/);
  h.get('manual-title').value = 'Manual role';
  h.get('manual-description').value = 'Original hiring post\n\nFull content.';
  h.get('manual-location').value = 'Remote';
  h.get('manual-recruiter').value = 'HR Name';
  h.get('manual-email').value = 'bad';
  submitReview(h.get('manual-form'));
  assert.match(h.get('manual-message').textContent, /valid recruiter email/);
  h.get('manual-email').value = 'hr@example.com';
  submitReview(h.get('manual-form'));
  assert.equal(h.state.draftProfile.companyName, null);
  assert.equal(h.state.draftProfile.entryMethod, 'manual');
  assert.equal(h.state.draftProfile.sourceType, 'linkedin_post');
  h.get('confirm-button').listeners.click();
  assert.equal(h.state.confirmedJobProfile.jobTitle, 'Manual role');
  assert.equal(h.state.confirmedJobProfile.location, 'Remote');
  assert.equal(h.state.confirmedJobProfile.recruiterEmail, 'hr@example.com');
  h.get('clear-button').listeners.click();
  assert.equal(h.state.confirmedJobProfile, null);
  assert.equal(h.state.draftProfile, null);
  assert.equal(h.get('manual-email').value, '');
});
test('multi-role selection gates confirmation and invalidates it when selection changes', async () => {
  const h = await harness();
  const roles = [
    { id: 'role-1', jobTitle: 'QA Engineer', companyName: 'Example', location: 'Bangalore', experience: '2â€“4 years', skills: ['Selenium'], content: 'QA role only' },
    { id: 'role-2', jobTitle: 'Backend Developer', companyName: 'Example', location: 'Remote', experience: '3+ years', skills: ['Python'], content: 'Backend role only' },
  ];
  h.enter(postUrl); h.submit(); h.run(350);
  await h.respond(0, { job: { ...postJob, jobTitle: null, roles }, error: null });
  assert.equal(h.get('role-selection').hidden, false);
  assert.equal(h.get('confirm-button').disabled, true);
  h.get('confirm-button').listeners.click();
  assert.equal(h.state.confirmedJobProfile, null);
  h.get('role-select').value = 'role-1'; h.get('role-select').listeners.change();
  assert.equal(h.state.draftProfile.jobTitle, 'QA Engineer');
  assert.equal(h.state.draftProfile.experience, '2â€“4 years');
  assert.equal(h.get('original-post-content').textContent, postJob.originalPostContent);
  h.get('confirm-button').listeners.click();
  assert.equal(h.state.confirmedJobProfile.selectedRoleId, 'role-1');
  h.get('role-select').value = 'role-2'; h.get('role-select').listeners.change();
  assert.equal(h.state.confirmedJobProfile, null);
  assert.equal(h.state.draftProfile.jobSourceContent, 'Backend role only');
  assert.equal(h.get('review-message').textContent, '');
  h.get('role-select').value = ''; h.get('role-select').listeners.change();
  assert.equal(h.state.draftProfile.requiresRoleSelection, true);
  assert.equal(h.get('confirm-button').disabled, true);
});
test('non-hiring post preserves raw context and manual fallback without confirming it', async () => {
  const h = await harness();
  h.enter(postUrl); h.submit(); h.run(350);
  await h.respond(0, { job: { ...postJob, extractionStatus: 'failed', isHiring: false }, error: { code: 'not_hiring', message: 'This LinkedIn post does not appear to contain a job opening.' } });
  assert.match(h.get('extraction-message').textContent, /does not appear/);
  assert.equal(h.get('manual-fallback').hidden, false);
  assert.equal(h.get('original-post-content').textContent, postJob.originalPostContent);
  assert.equal(h.state.draftProfile, null);
  assert.equal(h.state.confirmedJobProfile, null);
});
test('post cancellation discards raw source and profile from stale response', async () => {
  const h = await harness();
  h.enter(postUrl); h.submit(); h.run(350);
  h.get('clear-button').listeners.click();
  await h.respond(0, { job: postJob, error: null });
  assert.equal(h.state.draftProfile, null);
  assert.equal(h.get('original-post').hidden, true);
  assert.equal(h.get('original-post-content').textContent, '');
});
test('Day 3 confirmation unlocks Day 4 without another extraction request', async () => {
  const h = await harness();
  h.enter(url); h.submit(); h.run(350);
  await h.respond(0, { job: { ...job, jobDescription: 'Required Skills: Selenium, Java\nExperience: 1â€“3 years' }, error: null });
  assert.equal(h.get('analysis-section').hidden, true);
  h.get('confirm-button').listeners.click();
  assert.equal(h.get('analysis-section').hidden, false);
  h.get('requirements-button').listeners.click();
  assert.equal(h.state.analysisStatus, 'analyzing');
  h.run(250);
  assert.equal(h.state.analysisStatus, 'analyzed');
  assert.equal(h.requests.length, 1);
  h.get('analysis-confirm-button').listeners.click();
  assert.equal(h.state.confirmedRequirementsProfile.confirmed, true);
  h.get('edit-button').listeners.click();
  assert.equal(h.state.confirmedRequirementsProfile, null);
  assert.equal(h.state.draftAnalysis, null);
  assert.equal(h.get('analysis-section').hidden, true);
});
test('Clear during requirement analysis cancels the scheduled result', async () => {
  const h = await harness();
  h.enter(url); h.submit(); h.run(350); await h.respond(0, { job, error: null });
  h.get('confirm-button').listeners.click();
  h.get('requirements-button').listeners.click();
  h.get('clear-button').listeners.click(); h.run(250);
  assert.equal(h.state.analysisStatus, 'raw');
  assert.equal(h.state.confirmedJobProfile, null);
  assert.equal(h.state.confirmedRequirementsProfile, null);
  assert.equal(h.get('analysis-section').hidden, true);
});


