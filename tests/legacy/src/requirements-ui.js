import { analyzeJobRequirements, confirmRequirementsProfile } from '../../../src/requirements-analysis.js';
import { analysisEditorValues, applyAnalysisCorrections } from '../../../src/analysis-review.js';

export function createRequirementsController(state, document, { analyze = analyzeJobRequirements, schedule = setTimeout, cancel = clearTimeout, onConfirmed = () => {}, onInvalidated = () => {} } = {}) {
  const get = id => document.querySelector(`#${id}`);
  const section = get('analysis-section');
  const message = get('analysis-message');
  const action = get('requirements-button');
  const results = get('analysis-results');
  const edit = get('analysis-edit-form');
  const editButton = get('analysis-edit-button');
  const confirm = get('analysis-confirm-button');
  const retry = get('analysis-retry-button');
  const fields = Object.fromEntries(['experience', 'location', 'requiredSkills', 'preferredSkills', 'mentionedSkills',
    'responsibilities', 'education', 'workModes', 'domains', 'joiningPreferences', 'applicationInstructions'].map(key => [key, get(`analysis-edit-${key}`)]));
  let version = 0;
  let timer;
  let beforeEditing;
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function reset() {
    onInvalidated();
    version++;
    cancel(timer);
    state.analysisStatus = 'raw'; state.draftAnalysis = null; state.confirmedRequirementsProfile = null; state.analysisError = null;
    section.hidden = true; results.hidden = true; edit.hidden = true; retry.hidden = true;
    section.setAttribute('aria-busy', 'false');
    get('analysis-tools').hidden = true; get('analysis-source').hidden = true;
    get('analysis-source-content').textContent = ''; get('analysis-original-content').textContent = '';
    get('analysis-original').hidden = true;
    message.textContent = ''; message.dataset.state = '';
    get('analysis-edit-message').textContent = '';
    results.replaceChildren();
    for (const field of Object.values(fields)) field.value = '';
    action.disabled = true;
  }
  function onJobConfirmed() {
    reset();
    section.hidden = false;
    action.disabled = false;
    message.textContent = 'Job details confirmed. Analyze the requirements when you’re ready.';
  }
  function showList(parent, label, items) {
    const panel = node('section', null, 'analysis-panel');
    panel.append(node('h3', label));
    if (!items.length) panel.append(node('p', 'Not specified', 'hint'));
    else {
      const list = node('ul', null, 'requirements-list');
      for (const item of items) {
        const row = node('li');
        row.append(node('span', String(item.value), 'requirement-value'));
        const status = item.userConfirmed ? 'User Confirmed' : item.origin === 'user' ? 'User Added / Corrected' : item.status === 'inferred' ? 'Inferred' : 'Explicit';
        row.append(node('span', `${item.category ? `${item.category} · ` : ''}${item.priority && item.priority !== 'unspecified' ? `${item.priority.replace('_', ' ')} · ` : ''}${status}`, 'requirement-status'));
        if (item.evidence?.length) {
          const evidence = node('details', null, 'requirement-evidence');
          evidence.append(node('summary', item.origin === 'user' ? 'Original evidence (classification corrected by you)' : 'Source evidence'));
          for (const source of item.evidence) {
            evidence.append(node('blockquote', source.text));
            if (source.context) evidence.append(node('small', `Context: ${source.context}`));
          }
          row.append(evidence);
        } else if (item.origin === 'user') row.append(node('small', 'Entered by you; not extracted from the source.', 'hint'));
        list.append(row);
      }
      panel.append(list);
    }
    parent.append(panel);
  }
  function overview(parent, title, values) {
    const panel = node('section', null, 'analysis-panel');
    panel.append(node('h3', title));
    const list = node('dl', null, 'job-summary');
    for (const [label, value] of values) {
      const row = node('div'); row.append(node('dt', label), node('dd', value == null || value === '' ? 'Not specified' : String(value))); list.append(row);
    }
    panel.append(list); parent.append(panel);
  }
  function render() {
    const analysis = state.analysisStatus === 'confirmed' ? state.confirmedRequirementsProfile : state.draftAnalysis;
    if (!analysis) return;
    results.replaceChildren();
    overview(results, 'Overview', [['Role', analysis.identity.jobTitle], ['Company', analysis.identity.companyName],
      ['Location', analysis.identity.location], ['Experience', analysis.employment.experience.text],
      ['Minimum Experience', analysis.employment.experience.minimum == null ? null : `${analysis.employment.experience.minimum} years`],
      ['Maximum Experience', analysis.employment.experience.maximum == null ? null : `${analysis.employment.experience.maximum} years`],
      ['Employment Type', analysis.employment.employmentTypes.map(item => item.value).join(', ')],
      ['Work Mode', analysis.employment.workModes.map(item => item.value).join(', ')]]);
    showList(results, 'Required Skills', analysis.technical.requiredSkills);
    showList(results, 'Preferred Skills', analysis.technical.preferredSkills);
    showList(results, 'Mentioned Skills — Priority Not Specified', analysis.technical.mentionedSkills);
    showList(results, 'Explicitly Not Required', analysis.technical.excludedSkills);
    showList(results, 'Testing Requirements', analysis.technical.testingRequirements);
    showList(results, 'Experience Requirements', analysis.employment.experience.requirements.map(item => ({ ...item,
      value: `${item.scope === 'technology' ? `${item.technologies.join(', ')}: ` : item.scope === 'domain' ? 'Domain: ' : ''}${item.value}` })));
    if (analysis.employment.experience.conflicting) results.append(node('p', 'Several experience ranges were stated. Review them; no single range has been assumed.', 'hint'));
    for (const [label, items] of Object.entries({ Responsibilities: analysis.professional.responsibilities, Education: analysis.professional.education,
      'Domain Requirements': analysis.professional.domains, Certifications: analysis.professional.certifications,
      'Soft Skills': analysis.professional.softSkills, 'Employment Type': analysis.employment.employmentTypes,
      'Work Mode': analysis.employment.workModes, 'Additional Source Locations': analysis.employment.locations,
      'Joining / Notice Period': analysis.employment.joiningPreferences, 'Shift Requirements': analysis.employment.shifts })) showList(results, label, items);
    overview(results, 'Application Context', [['Recruiter / HR', analysis.application.recruiter.name], ['Recruiter Email', analysis.application.recruiter.email],
      ['Post Author', analysis.application.recruiter.postAuthorName], ['Author Headline', analysis.application.recruiter.postAuthorHeadline],
      ['Application Email(s)', analysis.application.applicationEmails.join(', ')], ['Application Link(s)', analysis.application.applicationLinks.join('\n')]]);
    showList(results, 'Application Methods', analysis.application.methods);
    showList(results, 'Requested Email Subject', analysis.application.requestedSubject ? [analysis.application.requestedSubject] : []);
    showList(results, 'Application Instructions', analysis.application.instructions);
    const labels = { currentCTC: 'Current CTC Required', expectedCTC: 'Expected CTC Required', noticePeriod: 'Notice Period Required', currentLocation: 'Current Location Required', resume: 'Resume / CV Required' };
    showList(results, 'Requested Application Information', Object.entries(analysis.application.requestedInformation).filter(([, value]) => value)
      .map(([key, value]) => ({ ...value, value: `${labels[key]}: ${value.value ? 'Yes' : 'No'}` })));
    overview(results, 'Important Keywords', [['Keywords', analysis.keywords.join(', ')]]);
    results.hidden = false;
    get('analysis-tools').hidden = false;
    get('analysis-source').hidden = false;
    get('analysis-source-content').textContent = analysis.source.analyzedContent;
    get('analysis-original').hidden = analysis.source.originalContent === analysis.source.analyzedContent;
    get('analysis-original-content').textContent = analysis.source.originalContent;
    editButton.disabled = state.analysisStatus === 'editing';
    confirm.disabled = state.analysisStatus === 'editing';
  }
  function run() {
    if (!state.confirmedJobProfile?.confirmed || state.analysisStatus === 'analyzing') return;
    onInvalidated();
    const profile = state.confirmedJobProfile;
    const runVersion = ++version;
    cancel(timer);
    state.analysisStatus = 'analyzing'; state.analysisError = null; state.draftAnalysis = null; state.confirmedRequirementsProfile = null;
    results.hidden = true; edit.hidden = true; retry.hidden = true;
    get('analysis-tools').hidden = true;
    action.disabled = true;
    message.textContent = 'Analyzing job requirements...'; message.dataset.state = 'loading';
    section.setAttribute('aria-busy', 'true');
    timer = schedule(() => {
      if (runVersion !== version || state.confirmedJobProfile !== profile) return;
      try {
        state.draftAnalysis = analyze(profile);
        state.analysisStatus = 'analyzed';
        message.textContent = 'Job analysis ready. Review the requirements and their source evidence. Missing sections are marked Not specified.';
        message.dataset.state = 'success';
        render();
      } catch (error) {
        state.draftAnalysis = null; state.analysisStatus = 'analysis_failed'; state.analysisError = error.code || 'analysis_failure';
        message.textContent = error.code === 'missing_content' ? "There isn't enough job information to perform a detailed analysis. Edit your job details to add source content."
          : "We couldn't reliably analyze the job requirements. Your original job details are still available.";
        message.dataset.state = 'failed'; retry.hidden = false;
      } finally {
        action.disabled = false; section.setAttribute('aria-busy', 'false');
      }
    }, 250);
  }
  action.addEventListener('click', run);
  retry.addEventListener('click', run);
  editButton.addEventListener('click', () => {
    if (!state.draftAnalysis || state.analysisStatus === 'analyzing') return;
    onInvalidated();
    beforeEditing = state.draftAnalysis;
    state.confirmedRequirementsProfile = null; state.analysisStatus = 'editing';
    const values = analysisEditorValues(state.draftAnalysis);
    for (const [key, field] of Object.entries(fields)) field.value = values[key];
    edit.hidden = false; editButton.disabled = true; confirm.disabled = true;
    get('analysis-edit-message').textContent = ''; message.textContent = 'Edit the analysis, then save and confirm it again.';
    fields.experience.focus();
  });
  edit.addEventListener('submit', event => {
    event.preventDefault();
    if (state.analysisStatus !== 'editing' || !state.draftAnalysis) return;
    try {
      state.draftAnalysis = applyAnalysisCorrections(state.draftAnalysis, Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])));
      state.analysisStatus = 'analyzed'; state.confirmedRequirementsProfile = null;
      edit.hidden = true; render();
      message.textContent = 'Analysis changes saved. User additions and corrections are labeled separately from extracted source facts.';
      message.dataset.state = 'success'; confirm.focus();
    } catch (error) { get('analysis-edit-message').textContent = error.message; }
  });
  get('analysis-edit-cancel').addEventListener('click', () => {
    if (state.analysisStatus !== 'editing') return;
    state.draftAnalysis = beforeEditing; state.analysisStatus = 'analyzed';
    edit.hidden = true; render(); message.textContent = 'Changes discarded. Review and confirm the analysis.';
  });
  confirm.addEventListener('click', () => {
    if (!state.draftAnalysis || state.analysisStatus === 'editing' || state.analysisStatus === 'analyzing') return;
    try {
      state.confirmedRequirementsProfile = confirmRequirementsProfile(state.draftAnalysis);
      state.analysisStatus = 'confirmed';
      onConfirmed();
      render();
      message.textContent = 'Job analysis confirmed. Your Job Requirements Profile is ready for the next step.';
      message.dataset.state = 'success';
    } catch {
      message.textContent = 'The analysis could not be verified. Review the source evidence or try analyzing again.';
      message.dataset.state = 'failed'; retry.hidden = false;
    }
  });
  return { reset, onJobConfirmed };
}
