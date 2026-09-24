import { analyzeJobRequirements, SKILL_CATEGORIES, canonicalSkill } from './requirements-analysis.js';

const clone = value => JSON.parse(JSON.stringify(value));
const lines = value => [...new Set(value.split('\n').map(line => line.trim()).filter(Boolean))];
const added = (value, extra = {}) => ({ value, status: 'user_provided', origin: 'user', userConfirmed: false, evidence: [], ...extra });
const updateItems = (values, previous, extra = {}) => values.map(value => {
  const existing = previous.find(entry => entry.value.toLowerCase() === value.toLowerCase());
  return existing ? { ...clone(existing), ...extra, userConfirmed: false } : added(value, extra);
});

export function analysisEditorValues(analysis) {
  const values = list => list.map(entry => entry.value).join('\n');
  return {
    experience: analysis.employment.experience.text || '', location: analysis.identity.location || '',
    requiredSkills: values(analysis.technical.requiredSkills), preferredSkills: values(analysis.technical.preferredSkills),
    mentionedSkills: values(analysis.technical.mentionedSkills), responsibilities: values(analysis.professional.responsibilities),
    education: values(analysis.professional.education), workModes: values(analysis.employment.workModes),
    domains: values(analysis.professional.domains), joiningPreferences: values(analysis.employment.joiningPreferences),
    applicationInstructions: values(analysis.application.instructions),
  };
}

function markUserEntries(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.evidence)) {
    value.status = 'user_provided'; value.origin = 'user'; value.userConfirmed = false; value.evidence = [];
  }
  for (const child of Object.values(value)) markUserEntries(child);
}

/** Corrections stay separate from source facts. No user addition gets fabricated source evidence. */
export function applyAnalysisCorrections(analysis, values, now = () => new Date()) {
  const result = clone(analysis);
  const previous = analysisEditorValues(analysis);
  result.confirmed = false; result.analysisStatus = 'analyzed';
  delete result.confirmedAt;
  result.verification.userConfirmed = false;
  const skillGroups = ['requiredSkills', 'preferredSkills', 'mentionedSkills'];
  const priorities = ['required', 'preferred', 'unspecified'];
  const grouped = skillGroups.map(group => [...new Set(lines(values[group]).map(value => canonicalSkill(value).value))]);
  const seen = new Set();
  for (const entries of grouped) for (const value of entries) {
    const key = value.toLowerCase();
    if (seen.has(key)) throw new Error(`${value} appears in more than one skills section. Keep it in one section.`);
    seen.add(key);
  }
  const allOldSkills = [...analysis.technical.requiredSkills, ...analysis.technical.preferredSkills, ...analysis.technical.mentionedSkills, ...analysis.technical.excludedSkills];
  for (let index = 0; index < skillGroups.length; index++) {
    result.technical[skillGroups[index]] = grouped[index].map(value => {
      const old = allOldSkills.find(entry => entry.value.toLowerCase() === value.toLowerCase());
      if (old) return old.priority === priorities[index] ? { ...clone(old), userConfirmed: false }
        : { ...clone(old), priority: priorities[index], origin: 'user', status: 'user_provided', userConfirmed: false, classificationCorrected: true };
      const category = canonicalSkill(value).category;
      return added(value, { category, priority: priorities[index], originalWording: value });
    });
  }
  const allSkills = [...result.technical.requiredSkills, ...result.technical.preferredSkills, ...result.technical.mentionedSkills];
  result.technical.categories = Object.fromEntries(SKILL_CATEGORIES.map(category => [category, allSkills.filter(entry => entry.category === category)]));
  result.technical.testingRequirements = allSkills.filter(entry => entry.category === 'Testing Skills');
  result.professional.responsibilities = updateItems(lines(values.responsibilities), analysis.professional.responsibilities);
  result.professional.education = updateItems(lines(values.education), analysis.professional.education);
  result.professional.domains = updateItems(lines(values.domains), analysis.professional.domains);
  result.employment.workModes = updateItems(lines(values.workModes), analysis.employment.workModes);
  result.employment.joiningPreferences = updateItems(lines(values.joiningPreferences), analysis.employment.joiningPreferences);
  result.identity.location = values.location.trim() || null;
  if (values.location !== previous.location) result.identity.locationVerification = added(values.location.trim() || 'Not specified');
  if (values.experience !== previous.experience) {
    const probe = analyzeJobRequirements({ confirmed: true, jobSourceContent: `Experience: ${values.experience}`, jobTitle: analysis.identity.jobTitle });
    result.employment.experience = probe.employment.experience;
    result.employment.experience.text = values.experience.trim() || null;
    markUserEntries(result.employment.experience);
    result.employment.experience.review = added(values.experience.trim() || 'Not specified');
  }
  if (values.applicationInstructions !== previous.applicationInstructions) {
    const profile = result.source.confirmedJobProfile;
    const probe = analyzeJobRequirements({ ...profile, confirmed: true, jobSourceContent: values.applicationInstructions || 'Not specified' });
    const parsed = probe.application;
    markUserEntries(parsed);
    result.application = { ...parsed, recruiter: clone(analysis.application.recruiter),
      instructions: updateItems(lines(values.applicationInstructions), analysis.application.instructions) };
  }
  result.keywords = [...new Set([...allSkills.map(entry => entry.value), ...result.professional.domains.map(entry => entry.value)])];
  result.corrections = [...(analysis.corrections || []), ...Object.entries(values).filter(([key, value]) => value !== previous[key])
    .map(([field, value]) => ({ field, previousValue: previous[field], value, origin: 'user', editedAt: now().toISOString() }))];
  const evidence = new Map();
  const collect = value => {
    if (!value || typeof value !== 'object') return;
    for (const source of value.evidence || []) evidence.set(JSON.stringify(source), source);
    for (const [key, child] of Object.entries(value)) if (!['source', 'verification', 'corrections', 'evidence'].includes(key)) collect(child);
  };
  collect(result);
  result.verification.evidence = [...evidence.values()];
  return result;
}
