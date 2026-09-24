import { createEmailController } from './email-ui.js';
import { validateLinkedInUrl as validateJobUrl } from '../../../src/validate-job-url.js';
import { normalizeJobProfile, selectProfileRole, validateProfileReview, confirmJobProfile } from '../../../src/job-profile.js';
import { createRequirementsController } from './requirements-ui.js';
import { createCandidateController } from './candidate-ui.js';
import { createRelevanceController } from './relevance-ui.js';

const form = document.querySelector('#job-form');
const input = document.querySelector('#job-url');
const analyze = document.querySelector('#analyze-button');
const clear = document.querySelector('#clear-button');
const message = document.querySelector('#validation-message');
const extractionSection = document.querySelector('#extraction-section');
const extractionMessage = document.querySelector('#extraction-message');
const details = document.querySelector('#job-details');
const retry = document.querySelector('#retry-button');
const manual = document.querySelector('#manual-fallback');
const manualTitle = document.querySelector('#manual-title');
const manualCompany = document.querySelector('#manual-company');
const manualDescription = document.querySelector('#manual-description');
const manualMessage = document.querySelector('#manual-message');
const titleOutput = document.querySelector('#extracted-title');
const companyOutput = document.querySelector('#extracted-company');
const descriptionOutput = document.querySelector('#extracted-description');
const sourceNote = document.querySelector('#source-note');
const get = id => document.querySelector(`#${id}`);
const reviewFields = { jobTitle: get('edit-title'), companyName: get('edit-company'), location: get('edit-location'),
  experience: get('edit-experience'), recruiterName: get('edit-recruiter'), recruiterEmail: get('edit-email'), jobSourceContent: get('edit-content') };
const manualFields = [manualTitle, manualCompany, manualDescription, get('manual-location'), get('manual-recruiter'), get('manual-email')];
const editForm = get('edit-form');
const editButton = get('edit-button');
const confirmButton = get('confirm-button');
const roleSelect = get('role-select');
const reviewMessage = get('review-message');

// In-memory handoff for the future extraction step. Reset whenever input changes.
export const jobAnalysisState = {
  status: 'default', validatedJobUrl: null, extractionStatus: 'idle',
  job: null, extractionError: null, manualJob: null, sourceType: null,
  draftProfile: null, confirmedJobProfile: null, reviewStatus: 'idle',
  analysisStatus: 'raw', draftAnalysis: null, confirmedRequirementsProfile: null, analysisError: null,
};
const email = createEmailController(jobAnalysisState, document);
const relevance = createRelevanceController(jobAnalysisState, document, { schedule: setTimeout, cancel: clearTimeout, onConfirmed: email.onConfirmed, onInvalidated: email.invalidate });
const candidate = createCandidateController(jobAnalysisState, document, { fetchResume: fetch, schedule: setTimeout, cancel: clearTimeout,
  onConfirmed: relevance.onCandidateConfirmed, onInvalidated: relevance.invalidate });
const requirements = createRequirementsController(jobAnalysisState, document, { schedule: setTimeout, cancel: clearTimeout,
  onConfirmed: candidate.onRequirementsConfirmed, onInvalidated: candidate.invalidateJob });
let pendingValidation;
let extractionController;
let requestVersion = 0;

function resetExtraction() {
  requirements.reset();
  requestVersion++;
  extractionController?.abort();
  extractionController = null;
  jobAnalysisState.extractionStatus = 'idle';
  jobAnalysisState.job = null;
  jobAnalysisState.extractionError = null;
  jobAnalysisState.manualJob = null;
  jobAnalysisState.draftProfile = null;
  jobAnalysisState.confirmedJobProfile = null;
  jobAnalysisState.reviewStatus = 'idle';
  editForm.hidden = true;
  get('role-selection').hidden = true;
  get('original-post').hidden = true;
  get('original-post').open = false;
  get('original-post-content').textContent = '';
  roleSelect.replaceChildren();
  for (const field of Object.values(reviewFields)) field.value = '';
  for (const id of ['review-message', 'edit-message', 'extracted-location', 'extracted-experience', 'post-author', 'author-headline', 'author-profile', 'post-date', 'extracted-recruiter', 'extracted-recruiter-email', 'application-emails', 'application-links', 'extracted-skills', 'employment-type', 'contact-numbers']) get(id).textContent = '';
  extractionSection.hidden = true;
  extractionMessage.hidden = true;
  details.hidden = true;
  retry.hidden = true;
  manual.hidden = true;
  for (const field of manualFields) field.value = '';
  for (const field of [titleOutput, companyOutput, descriptionOutput, sourceNote, manualMessage, extractionMessage]) field.textContent = '';
}

function captureManualJob() {
  jobAnalysisState.manualJob = {
    source: 'Manual', sourceUrl: jobAnalysisState.validatedJobUrl,
    jobTitle: manualTitle.value, companyName: manualCompany.value,
    jobDescription: manualDescription.value, updatedAt: new Date().toISOString(),
    location: get('manual-location').value, recruiterName: get('manual-recruiter').value, recruiterEmail: get('manual-email').value,
  };
  jobAnalysisState.confirmedJobProfile = null;
  jobAnalysisState.reviewStatus = 'manual';
  requirements.reset();
  confirmButton.disabled = true;
  reviewMessage.textContent = '';
  manualMessage.textContent = 'Manual details captured on this page.';
}
for (const field of manualFields) field.addEventListener('input', captureManualJob);

function sourceLabels() {
  const isPost = jobAnalysisState.sourceType === 'linkedin_post';
  get('details-heading').textContent = isPost ? 'Hiring Post Details' : 'Job Details';
  get('content-heading').textContent = isPost ? 'Hiring Post' : 'Job Description';
  get('edit-content-label').textContent = isPost ? 'Hiring Post Content (required)' : 'Job Description (required)';
  get('manual-content-label').textContent = isPost ? 'Hiring Post Content (required)' : 'Job Description (required)';
  get('post-information').hidden = !isPost;
}

function renderProfile() {
  const profile = jobAnalysisState.draftProfile;
  if (!profile) return;
  const isPost = profile.sourceType === 'linkedin_post';
  titleOutput.textContent = profile.requiresRoleSelection ? 'Select a role.' : profile.jobTitle || 'Could not be extracted.';
  companyOutput.textContent = profile.companyName || (isPost ? 'Not specified' : 'Could not be extracted.');
  descriptionOutput.textContent = profile.jobSourceContent || 'Could not be extracted.';
  get('extracted-location').textContent = profile.location || 'Not specified';
  get('extracted-experience').textContent = profile.experience || 'Not specified';
  const outputs = { 'post-author': profile.postAuthorName, 'author-headline': profile.postAuthorHeadline,
    'author-profile': profile.authorProfileUrl, 'post-date': profile.publishedAt,
    'extracted-recruiter': profile.recruiterName, 'extracted-recruiter-email': profile.recruiterEmail,
    'application-emails': profile.applicationEmails.join(', ') || profile.applicationEmail,
    'application-links': profile.applicationLinks.join('\n') || profile.applicationLink,
    'extracted-skills': profile.skills.join(', '), 'employment-type': profile.employmentType,
    'contact-numbers': profile.contactNumbers.join(', ') };
  for (const [id, value] of Object.entries(outputs)) get(id).textContent = value || 'Not specified';
  sourceNote.textContent = `Source: LinkedIn · ${profile.sourceUrl}${profile.extractedAt ? ` · Retrieved ${profile.extractedAt}` : ''}`;
  get('original-post').hidden = !profile.originalPostContent;
  get('original-post-content').textContent = profile.originalPostContent || '';
  details.hidden = false;
  editButton.disabled = profile.requiresRoleSelection;
  confirmButton.disabled = profile.requiresRoleSelection || jobAnalysisState.reviewStatus === 'editing' || jobAnalysisState.reviewStatus === 'manual';
}

function initializeReview(job) {
  jobAnalysisState.draftProfile = normalizeJobProfile(job);
  jobAnalysisState.confirmedJobProfile = null;
  jobAnalysisState.reviewStatus = 'review';
  const profile = jobAnalysisState.draftProfile;
  get('role-selection').hidden = profile.roles.length < 2;
  roleSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = ''; placeholder.textContent = 'Select a role'; roleSelect.append(placeholder);
  for (const role of profile.roles) {
    const option = document.createElement('option'); option.value = role.id; option.textContent = role.jobTitle; roleSelect.append(option);
  }
  renderProfile();
}

roleSelect.addEventListener('change', () => {
  if (!jobAnalysisState.draftProfile) return;
  jobAnalysisState.confirmedJobProfile = null;
  editForm.hidden = true;
  requirements.reset();
  jobAnalysisState.reviewStatus = 'review';
  reviewMessage.textContent = '';
  if (!roleSelect.value) jobAnalysisState.draftProfile = normalizeJobProfile(jobAnalysisState.job);
  else jobAnalysisState.draftProfile = selectProfileRole(normalizeJobProfile(jobAnalysisState.job), roleSelect.value);
  renderProfile();
});

editButton.addEventListener('click', () => {
  const profile = jobAnalysisState.draftProfile;
  if (!profile || profile.requiresRoleSelection) return;
  jobAnalysisState.confirmedJobProfile = null;
  jobAnalysisState.reviewStatus = 'editing';
  requirements.reset();
  for (const [field, input] of Object.entries(reviewFields)) input.value = profile[field] || '';
  get('edit-message').textContent = '';
  reviewMessage.textContent = '';
  editForm.hidden = false;
  editButton.disabled = true;
  confirmButton.disabled = true;
  reviewFields.jobTitle.focus();
});
editForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!jobAnalysisState.draftProfile || jobAnalysisState.reviewStatus !== 'editing') return;
  const changes = Object.fromEntries(Object.entries(reviewFields).map(([field, input]) => [field, input.value.trim() || null]));
  // Source content is retained verbatim, including user-entered paragraph breaks.
  changes.jobSourceContent = reviewFields.jobSourceContent.value;
  changes.jobDescription = changes.jobSourceContent;
  const profile = { ...jobAnalysisState.draftProfile, ...changes, confirmed: false };
  const error = validateProfileReview(profile);
  get('edit-message').textContent = error || '';
  get('edit-message').dataset.state = error ? 'error' : '';
  if (error) return;
  jobAnalysisState.draftProfile = profile;
  jobAnalysisState.confirmedJobProfile = null;
  jobAnalysisState.reviewStatus = 'review';
  editForm.hidden = true;
  renderProfile();
  reviewMessage.textContent = 'Changes saved. Review and confirm the job details.';
  reviewMessage.dataset.state = '';
  confirmButton.focus();
});
get('cancel-edit').addEventListener('click', () => {
  editForm.hidden = true;
  jobAnalysisState.reviewStatus = 'review';
  renderProfile();
  editButton.focus();
});
confirmButton.addEventListener('click', () => {
  if (!jobAnalysisState.draftProfile || ['editing', 'manual'].includes(jobAnalysisState.reviewStatus)) return;
  const error = validateProfileReview(jobAnalysisState.draftProfile);
  reviewMessage.textContent = error || 'Job details confirmed. Your Job Profile is ready for the next step.';
  reviewMessage.dataset.state = error ? 'error' : 'confirmed';
  if (error) return;
  jobAnalysisState.confirmedJobProfile = confirmJobProfile(jobAnalysisState.draftProfile);
  jobAnalysisState.reviewStatus = 'confirmed';
  requirements.onJobConfirmed();
});
get('manual-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!jobAnalysisState.validatedJobUrl || jobAnalysisState.extractionStatus === 'loading') return;
  captureManualJob();
  const profile = normalizeJobProfile({ ...jobAnalysisState.manualJob,
    sourceType: jobAnalysisState.sourceType, jobSourceContent: manualDescription.value,
    originalPostContent: jobAnalysisState.job?.originalPostContent, extractionStatus: jobAnalysisState.extractionStatus,
    entryMethod: 'manual',
  });
  const error = validateProfileReview(profile);
  manualMessage.textContent = error || 'Manual details saved. Review and confirm the job details.';
  manualMessage.dataset.state = error ? 'error' : '';
  if (error) return;
  jobAnalysisState.draftProfile = profile;
  jobAnalysisState.reviewStatus = 'review';
  get('role-selection').hidden = true;
  editForm.hidden = true;
  renderProfile();
  manual.hidden = true;
  reviewMessage.textContent = 'Manual details saved. Review and confirm the job details.';
  confirmButton.focus();
});

async function retrieveJob() {
  if (jobAnalysisState.status !== 'valid' || !jobAnalysisState.validatedJobUrl || jobAnalysisState.extractionStatus === 'loading') return;
  const sourceUrl = jobAnalysisState.validatedJobUrl;
  requirements.reset();
  const version = ++requestVersion;
  extractionController?.abort();
  const controller = new AbortController();
  extractionController = controller;
  jobAnalysisState.extractionStatus = 'loading';
  jobAnalysisState.extractionError = null;
  jobAnalysisState.job = null;
  jobAnalysisState.draftProfile = null;
  jobAnalysisState.confirmedJobProfile = null;
  jobAnalysisState.reviewStatus = 'idle';
  editForm.hidden = true;
  get('role-selection').hidden = true;
  get('original-post').hidden = true;
  sourceLabels();
  extractionSection.hidden = false;
  extractionMessage.hidden = false;
  extractionMessage.dataset.state = 'loading';
  extractionMessage.textContent = jobAnalysisState.sourceType === 'linkedin_post' ? 'Retrieving LinkedIn hiring post...' : 'Retrieving LinkedIn job details...';
  details.hidden = true;
  manual.hidden = true;
  retry.hidden = true;
  analyze.disabled = true;
  analyze.textContent = 'Retrieving…';
  form.setAttribute('aria-busy', 'true');
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  try {
    const response = await fetch('/api/extract-job', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sourceUrl }), signal: controller.signal,
    });
    if (version === requestVersion) extractionMessage.textContent = 'Analyzing available hiring information...';
    const result = await response.json();
    if (version !== requestVersion) return;
    if (result.job?.sourceUrl === sourceUrl) jobAnalysisState.job = result.job;
    if (result.job?.sourceUrl === sourceUrl && result.job?.originalPostContent) {
      get('original-post').hidden = false;
      get('original-post-content').textContent = result.job.originalPostContent;
    }
    if (!response.ok || result.error) throw result.error || { code: 'network', message: "We couldn't retrieve the job posting. Please try again." };
    const job = result.job;
    if (!job || !['success', 'partial'].includes(job.extractionStatus) || job.sourceUrl !== sourceUrl) {
      throw { code: 'extraction', message: 'The page was retrieved, but the job details could not be extracted reliably.' };
    }
    jobAnalysisState.job = job;
    jobAnalysisState.extractionStatus = job.extractionStatus;
    extractionMessage.dataset.state = job.extractionStatus;
    extractionMessage.textContent = job.extractionStatus === 'success' ? 'Job details extracted. Review the information below.'
      : 'Some job information could not be retrieved. Please review the available details.';
    initializeReview(job);
    details.hidden = false;
    manual.hidden = job.extractionStatus !== 'partial';
  } catch (error) {
    if (version !== requestVersion) return;
    const failure = timedOut ? { code: 'timeout', message: 'Retrieving job details took too long. Please try again or paste the details manually.' }
      : ['restricted', 'unavailable', 'network', 'timeout', 'extraction', 'internal', 'invalid_url', 'not_hiring'].includes(error?.code) && error?.message
        ? error : { code: 'network', message: "We couldn't retrieve the job posting. Please try again." };
    jobAnalysisState.extractionStatus = 'failed';
    jobAnalysisState.extractionError = failure;
    extractionMessage.dataset.state = 'failed';
    extractionMessage.textContent = failure.message;
    manual.hidden = false;
    retry.hidden = !['network', 'timeout', 'internal'].includes(failure.code);
  } finally {
    clearTimeout(timeout);
    if (version === requestVersion) {
      extractionController = null;
      analyze.disabled = !input.value.trim();
      analyze.textContent = 'Analyze Job →';
      form.setAttribute('aria-busy', 'false');
    }
  }
}
retry.addEventListener('click', retrieveJob);

function resetFeedback() {
  clearTimeout(pendingValidation);
  resetExtraction();
  jobAnalysisState.status = 'default';
  jobAnalysisState.validatedJobUrl = null;
  jobAnalysisState.sourceType = null;
  message.hidden = true;
  message.replaceChildren();
  input.removeAttribute('aria-invalid');
  form.setAttribute('aria-busy', 'false');
  analyze.textContent = 'Analyze Job →';
  analyze.disabled = !input.value.trim();
}

input.addEventListener('input', resetFeedback);
input.addEventListener('blur', () => { input.value = input.value.trim(); });
clear.addEventListener('click', () => {
  input.value = '';
  resetFeedback();
  input.focus();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (jobAnalysisState.status === 'validating' || jobAnalysisState.extractionStatus === 'loading') return;
  resetExtraction();
  input.value = input.value.trim();
  const submittedValue = input.value;
  jobAnalysisState.status = 'validating';
  jobAnalysisState.validatedJobUrl = null;
  input.removeAttribute('aria-invalid');
  form.setAttribute('aria-busy', 'true');
  analyze.disabled = true;
  analyze.textContent = 'Checking…';
  message.hidden = false;
  message.dataset.state = 'validating';
  message.textContent = 'Checking LinkedIn URL...';
  // Brief local feedback interval; no network request is made.
  pendingValidation = setTimeout(() => {
    const result = validateJobUrl(submittedValue);
    jobAnalysisState.status = result.valid ? 'valid' : 'invalid';
    jobAnalysisState.validatedJobUrl = result.validatedJobUrl;
    jobAnalysisState.sourceType = result.sourceType;
    form.setAttribute('aria-busy', 'false');
    analyze.disabled = !input.value.trim();
    analyze.textContent = 'Analyze Job →';
    input.setAttribute('aria-invalid', String(!result.valid));
    message.dataset.state = jobAnalysisState.status;
    message.textContent = result.message;
    if (result.valid) {
      const title = document.createElement('strong');
      title.textContent = result.sourceType === 'linkedin_post' ? 'LinkedIn Post URL Validated Successfully' : 'LinkedIn Job URL Validated Successfully';
      const detail = document.createElement('small');
      detail.textContent = result.validatedJobUrl;
      message.prepend(title);
      message.append(detail);
      void retrieveJob();
    }
  }, 350);
});
