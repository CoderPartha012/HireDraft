export function createEmailController(state, document, { fetchImpl = fetch, clipboard = globalThis.navigator?.clipboard } = {}) {
  const get = id => document.querySelector(`#${id}`);
  let version = 0, controller, providers = [], additional = {}, sourceKey = '', applicationKey = '';
  state.generationCount = 0; state.emailStatus = 'ready';
  const snapshot = () => JSON.stringify([state.confirmedJobProfile, state.confirmedRequirementsProfile, state.confirmedCandidateProfile, state.confirmedRelevanceProfile]);
  const ready = () => [state.confirmedJobProfile, state.confirmedRequirementsProfile, state.confirmedCandidateProfile, state.confirmedRelevanceProfile].every(x => x?.confirmed);
  const missing = () => state.confirmedRelevanceProfile?.missingApplicationInformation || [];
  function refresh() {
    get('email-generate').disabled = !ready() || state.emailStatus === 'generating' || !providers.some(p => p.id === get('email-provider').value && p.available) || missing().some(x => !additional[x.key]?.trim());
    get('email-section').setAttribute('aria-busy', String(state.emailStatus === 'generating'));
  }
  function invalidate() {
    version++; controller?.abort(); additional = {};
    state.emailStatus = state.originalEmail ? 'outdated' : 'ready';
    get('email-section').hidden = !state.originalEmail;
    get('email-status').textContent = state.originalEmail ? 'Outdated — source information changed. Confirm your profiles and generate an updated email.' : '';
    get('email-generate').textContent = state.originalEmail ? 'Generate Updated Email' : 'Generate Email'; refresh();
  }
  async function onConfirmed() {
    const nextApplication = JSON.stringify([state.confirmedJobProfile?.sourceUrl, state.confirmedJobProfile?.selectedRoleId, state.confirmedJobProfile?.jobTitle, state.confirmedJobProfile?.companyName]);
    if (applicationKey && nextApplication !== applicationKey) state.generationCount = 0;
    applicationKey = nextApplication;
    const key = snapshot();
    if (sourceKey && key !== sourceKey) invalidate();
    sourceKey = key; get('email-section').hidden = false;
    const container = get('email-missing'); container.replaceChildren();
    if (missing().length) {
      const title = document.createElement('h3'); title.textContent = 'Additional Information Needed'; container.append(title);
      for (const item of missing()) {
        const label = document.createElement('label'), input = document.createElement('input'), note = document.createElement('small');
        input.id = `email-extra-${item.key}`; input.maxLength = 500; input.value = additional[item.key] || '';
        label.setAttribute('for', input.id); label.textContent = item.label;
        input.addEventListener('input', () => { additional[item.key] = input.value; note.textContent = input.value.trim() ? 'Source: User Provided' : ''; version++; controller?.abort(); if (state.originalEmail) { state.emailStatus = 'outdated'; get('email-status').textContent = 'Outdated — application information changed.'; } else state.emailStatus = 'ready'; refresh(); });
        container.append(label, input, note);
      }
    }
    refresh(); const run = version;
    try {
      const response = await fetchImpl('/api/ai-providers'); if (!response.ok) throw new Error();
      const data = await response.json(); if (run !== version) return;
      providers = data.providers;
      const select = get('email-provider'), previous = select.value; select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Select a model'; select.append(placeholder);
      for (const p of providers) { const option = document.createElement('option'); option.value = p.id; option.textContent = p.label + (p.available ? '' : ' (currently unavailable)'); select.append(option); }
      select.value = previous; refresh();
    } catch { if (run === version) get('email-status').textContent = 'Unable to check model availability. Confirm your match again to retry.'; }
  }
  get('email-provider').addEventListener('change', () => { const p = providers.find(p => p.id === get('email-provider').value); if (p && !p.available) get('email-status').textContent = `${p.label} is currently unavailable. Please select another model.`; refresh(); });
  async function generate() {
    refresh(); if (get('email-generate').disabled) return;
    const run = ++version, sources = snapshot(); controller = new AbortController();
    const payload = { job: state.confirmedJobProfile, requirements: state.confirmedRequirementsProfile, candidate: state.confirmedCandidateProfile, relevance: state.confirmedRelevanceProfile, additionalInformation: { ...additional }, provider: get('email-provider').value, tone: get('email-tone').value, length: get('email-length').value, instruction: get('email-instruction').value };
    state.emailStatus = 'generating'; get('email-status').textContent = 'Generating your application email...'; refresh();
    try {
      const response = await fetchImpl('/api/generate-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      const data = await response.json(); if (run !== version || sources !== snapshot()) return;
      if (!response.ok) throw new Error(data.error?.message || 'Email generation failed. Please try again.');
      if (typeof data.subject !== 'string' || typeof data.body !== 'string' || data.metadata?.status !== 'verified') throw new Error('The model returned an invalid response. Please try again.');
      state.originalEmail = structuredClone(data); state.editedEmail = { subject: data.subject, body: data.body }; state.generationCount++; state.emailStatus = 'generated';
      get('email-subject').value = data.subject; get('email-body').value = data.body; get('email-result').hidden = false;
      get('email-status').textContent = `Passed factual checks against supplied evidence. Please review before use. Generation ${state.generationCount}.`;
      get('email-generate').textContent = 'Generate Again';
    } catch (error) { if (run !== version || sources !== snapshot()) return; state.emailStatus = 'generation_failed'; get('email-status').textContent = error.message; get('email-generate').textContent = 'Try Again'; }
    finally { if (run === version) { if (state.emailStatus === 'generating') state.emailStatus = 'outdated'; refresh(); } }
  }
  get('email-generate').addEventListener('click', generate);
  for (const [id, key] of [['email-subject', 'subject'], ['email-body', 'body']]) get(id).addEventListener('input', () => { if (!state.editedEmail) return; state.editedEmail[key] = get(id).value; get('email-status').textContent = state.emailStatus === 'outdated' ? 'Outdated — source information changed. Manual edits have not been checked.' : 'Manually edited — edits have not been checked. Original AI version preserved.'; });
  for (const [id, part] of [['email-copy-subject', 'subject'], ['email-copy-body', 'body'], ['email-copy-all', 'all']]) get(id).addEventListener('click', async () => {
    if (!state.editedEmail) return;
    try { const { subject, body } = state.editedEmail; await clipboard.writeText(part === 'all' ? `Subject: ${subject}\n\n${body}` : state.editedEmail[part]); get('email-copy-status').textContent = 'Copied.'; }
    catch { get('email-copy-status').textContent = 'Copy was unavailable. Select the text and copy it manually.'; }
  });
  return { invalidate, onConfirmed };
}
