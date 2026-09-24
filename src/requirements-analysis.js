// Deterministic source-only analysis. No network, model, or extraction dependencies.
export const SKILL_CATEGORIES = ['Programming Languages', 'Automation Tools', 'API Testing', 'Database', 'CI/CD and DevOps', 'Testing Skills', 'Other Tools'];
const definitions = [
  ['Programming Languages', 'Java', ['Java']], ['Programming Languages', 'Python', ['Python']],
  ['Programming Languages', 'JavaScript', ['JavaScript']], ['Programming Languages', 'TypeScript', ['TypeScript']],
  ['Programming Languages', 'C#', ['C#']], ['Programming Languages', 'C++', ['C++']],
  ['Automation Tools', 'Selenium', ['Selenium WebDriver', 'Selenium']], ['Automation Tools', 'Playwright', ['Playwright']],
  ['Automation Tools', 'Cypress', ['Cypress']], ['Automation Tools', 'Appium', ['Appium']],
  ['Automation Tools', 'TestNG', ['TestNG']], ['Automation Tools', 'Cucumber', ['Cucumber']],
  ['API Testing', 'Postman', ['Postman']], ['API Testing', 'REST API', ['RESTful APIs', 'RESTful API', 'REST APIs', 'REST API']],
  ['API Testing', 'REST Assured', ['REST Assured', 'RestAssured']], ['API Testing', 'Swagger', ['Swagger']],
  ['API Testing', 'API Testing', ['API Testing']],
  ['Database', 'SQL', ['SQL']], ['Database', 'MySQL', ['MySQL']], ['Database', 'PostgreSQL', ['PostgreSQL', 'Postgres']],
  ['Database', 'MongoDB', ['MongoDB']],
  ['CI/CD and DevOps', 'Jenkins', ['Jenkins']], ['CI/CD and DevOps', 'GitHub Actions', ['GitHub Actions']],
  ['CI/CD and DevOps', 'Docker', ['Docker']], ['CI/CD and DevOps', 'Kubernetes', ['Kubernetes']],
  ['CI/CD and DevOps', 'AWS', ['AWS', 'Amazon Web Services']], ['CI/CD and DevOps', 'Azure', ['Azure']],
  ['CI/CD and DevOps', 'CI/CD', ['CI/CD', 'CI CD']],
  ['Testing Skills', 'Manual Testing', ['Manual Testing']], ['Testing Skills', 'Functional Testing', ['Functional Testing']],
  ['Testing Skills', 'Regression Testing', ['Regression Testing']], ['Testing Skills', 'Smoke Testing', ['Smoke Testing']],
  ['Testing Skills', 'Integration Testing', ['Integration Testing']], ['Testing Skills', 'UAT', ['UAT', 'User Acceptance Testing']],
  ['Testing Skills', 'Mobile Testing', ['Mobile Testing']], ['Testing Skills', 'Performance Testing', ['Performance Testing']],
  ['Testing Skills', 'Automation Testing', ['Automation Testing', 'Test Automation', 'Automated Testing']],
  ['Testing Skills', 'Security Testing', ['Security Testing']],
  ['Other Tools', 'Jira', ['Jira']], ['Other Tools', 'TestRail', ['TestRail']], ['Other Tools', 'JMeter', ['JMeter']],
  ['Other Tools', 'Git', ['Git']], ['Other Tools', 'Maven', ['Maven']],
  ['Other Tools', 'React', ['React', 'React.js']], ['Other Tools', 'Node.js', ['Node.js', 'NodeJS']],
];
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = aliases => new RegExp(`(?<![\\w])(?:${aliases.map(escapeRegex).join('|')})(?![\\w])`, 'gi');
const skillMatchers = definitions.map(([category, name, aliases]) => ({ category, name, aliases, pattern: wordPattern(aliases) }));
export function canonicalSkill(value) {
  const skill = skillMatchers.find(skill => skill.aliases.some(alias => alias.toLowerCase() === value.trim().toLowerCase()));
  return skill ? { value: skill.name, category: skill.category } : { value: value.trim(), category: 'Other Tools' };
}
const requiredCue = /\b(?:must(?: have)?|required|mandatory|essential|minimum|strong (?:knowledge|hands-on|experience)|hands-on experience|proficiency|proficient)\b/i;
const preferredCue = /\b(?:preferred|preferably|desirable|nice[ -]to[ -]have|advantage|bonus|a plus|optional)\b/i;
const excludedCue = /\b(?:not required|not necessary|no .{0,30} (?:required|needed)|do not (?:need|require))\b/i;
const clone = value => JSON.parse(JSON.stringify(value));

export class AnalysisError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function priority(text, heading) {
  if (excludedCue.test(text)) return 'not_required';
  if (preferredCue.test(text)) return 'preferred';
  if (requiredCue.test(text)) return 'required';
  if (/preferred|nice[ -]to[ -]have|desirable/i.test(heading)) return 'preferred';
  if (/required|requirements|must have|essential/i.test(heading)) return 'required';
  return 'unspecified';
}

function sourceUnits(content) {
  const units = [];
  let offset = 0;
  let heading = '';
  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/^\s*(?:[•*#-]|\d+[.)])\s*/, '').trim();
    const start = offset + rawLine.indexOf(line);
    offset += rawLine.length + 1;
    if (!line) continue;
    const isHeading = /^(?:required skills|preferred skills|requirements|qualifications|must have|nice[ -]to[ -]have|responsibilities|key responsibilities|what you(?:'|’)ll do|duties|education|certifications|domain(?: requirements)?|soft skills|application (?:instructions|requirements)|skills|experience|employment|benefits)[:：]?$/i.test(line);
    if (isHeading) { heading = line.replace(/[:：]$/, ''); continue; }
    const inlineHeading = line.match(/^(required skills|preferred skills|requirements|nice[ -]to[ -]have|responsibilities|education|soft skills|experience|employment type|work mode|location|shift|application instructions)\s*:/i)?.[1];
    if (inlineHeading) heading = inlineHeading;
    const context = heading;
    // Separate clauses with conflicting modality, while keeping lists intact.
    const positiveText = line.replace(/\bnot required\b|\bnot necessary\b|\bno[^,;]{0,30}(?:required|needed)\b/gi, '');
    const mixed = requiredCue.test(line) && preferredCue.test(line)
      || excludedCue.test(line) && (requiredCue.test(positiveText) || preferredCue.test(positiveText));
    const separators = mixed ? /;\s*|,\s*|\s+(?:and|but|while|whereas)\s+|(?<=[.!?])\s+/gi : /;\s*|\s+(?:but|while|whereas)\s+|(?<=[.!?])\s+(?=[A-Z])/g;
    let cursor = 0;
    const fragments = line.split(separators);
    for (const fragment of fragments) {
      const index = line.indexOf(fragment, cursor);
      cursor = index + fragment.length;
      const text = fragment.trim();
      if (text) units.push({ text, start: start + index + fragment.indexOf(text), heading: context });
    }
  }
  return units;
}

function evidenceFor(unit, field = 'jobSourceContent') {
  return { field, text: unit.text, start: unit.start, end: unit.start + unit.text.length, context: unit.heading || null };
}
const profileEvidence = (profile, field) => ({ field, text: String(profile[field]), start: null, end: null, context: 'Confirmed Day 3 field' });
function item(value, evidence, extra = {}) {
  return { value, status: 'explicit', userConfirmed: false, evidence: [evidence], ...extra };
}
function addUnique(list, value, evidence, extra = {}) {
  const existing = list.find(entry => entry.value.toLowerCase() === value.toLowerCase() && entry.priority === extra.priority);
  if (existing) { if (!existing.evidence.some(source => source.text === evidence.text && source.field === evidence.field)) existing.evidence.push(evidence); }
  else list.push(item(value, evidence, extra));
}
function findSkills(text) {
  return skillMatchers.flatMap(definition => [...text.matchAll(definition.pattern)].map(match => ({ ...definition, wording: match[0], index: match.index })));
}

function experienceItems(units) {
  const entries = [];
  for (const unit of units) {
    const pattern = /(?:(?:minimum|min(?:imum)?\.?|at least)\s+)?(\d+(?:\.\d+)?)(?:\s*[–—-]\s*(\d+(?:\.\d+)?))?(\s*\+)?\s*(?:years?|yrs?)\b/gi;
    const matches = [...unit.text.matchAll(pattern)];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      let left = index ? matches[index - 1].index + matches[index - 1][0].length : 0;
      let right = matches[index + 1]?.index || unit.text.length;
      if (matches.length > 1) {
        left = Math.max(left, unit.text.lastIndexOf(',', match.index) + 1);
        const comma = unit.text.indexOf(',', match.index + match[0].length);
        if (comma !== -1) right = Math.min(right, comma);
      }
      const context = unit.text.slice(left, right);
      // A role's overall experience is not replaced with technology-specific tenure.
      const technologies = [...new Set(findSkills(context).filter(skill => skill.category !== 'Testing Skills').map(skill => skill.name))];
      const domains = /\b(?:FinTech|Banking|Healthcare|LegalTech|SaaS|E-commerce|Insurance|Payments)\b/i.test(context);
      const scope = technologies.length ? 'technology' : domains ? 'domain' : 'overall';
      const maximumOnly = /\b(?:up to|maximum|max)\s*$/i.test(unit.text.slice(0, match.index));
      const exact = /\bexactly\s*$/i.test(unit.text.slice(0, match.index));
      const minimum = maximumOnly ? null : Number(match[1]);
      const maximum = maximumOnly ? Number(match[1]) : match[2] ? Number(match[2]) : exact ? Number(match[1]) : null;
      const invalidRange = minimum != null && maximum != null && minimum > maximum;
      entries.push(item(match[0].trim(), evidenceFor(unit), { minimum: invalidRange ? null : minimum,
        maximum: invalidRange ? null : maximum, invalidRange, scope, technologies, priority: priority(unit.text, unit.heading) }));
    }
    if (/\bfreshers (?:can|may) apply\b|\bno (?:prior )?experience (?:is )?required\b/i.test(unit.text)) {
      entries.push(item(unit.text, evidenceFor(unit), { minimum: 0, maximum: null, scope: 'overall', technologies: [], priority: 'unspecified' }));
    }
  }
  const overall = entries.filter(entry => entry.scope === 'overall');
  // Keep contradictory/multiple source ranges separate instead of guessing a range.
  const bounds = [...new Set(overall.map(entry => JSON.stringify([entry.minimum, entry.maximum])))];
  return { minimum: bounds.length === 1 ? overall[0].minimum : null, maximum: bounds.length === 1 ? overall[0].maximum : null,
    text: overall.length ? overall.map(entry => entry.value).join('; ') : null, requirements: entries,
    technologyExperience: entries.filter(entry => entry.scope === 'technology'), conflicting: bounds.length > 1 };
}

export function analyzeJobRequirements(profile, { now = () => new Date() } = {}) {
  if (!profile?.confirmed || profile.requiresRoleSelection) throw new AnalysisError('unconfirmed', 'Confirm the job details and select a role before analyzing requirements.');
  if (typeof profile.jobSourceContent !== 'string' || !profile.jobSourceContent.trim()) throw new AnalysisError('missing_content', "There isn't enough job information to perform a detailed analysis.");
  if (profile.jobSourceContent.length > 200000) throw new AnalysisError('too_large', "We couldn't reliably analyze the job requirements. Your original job details are still available.");
  const units = sourceUnits(profile.jobSourceContent);
  const skills = [], responsibilities = [], education = [], domains = [], certifications = [], softSkills = [];
  const employmentTypes = [], workModes = [], joining = [], shifts = [], locations = [], instructions = [];
  const domainNames = ['FinTech', 'Banking', 'Healthcare', 'LegalTech', 'SaaS', 'E-commerce', 'Insurance', 'Payments'];
  const softNames = [['Communication', ['communication']], ['Problem Solving', ['problem solving', 'problem-solving']],
    ['Collaboration', ['collaboration', 'collaborate']], ['Analytical Thinking', ['analytical thinking', 'analytical skills']],
    ['Attention to Detail', ['attention to detail']], ['Ownership', ['ownership']], ['Time Management', ['time management']]];
  let requestedSubject = null;
  const requestedInformation = { currentCTC: null, expectedCTC: null, noticePeriod: null, currentLocation: null, resume: null };
  const methods = [];
  const applicationEmails = [...new Set([...(profile.applicationEmails || []), profile.applicationEmail].filter(Boolean))];
  const applicationLinks = [...new Set([...(profile.applicationLinks || []), profile.applicationLink].filter(Boolean))];
  for (const unit of units) {
    const evidence = evidenceFor(unit);
    const modality = priority(unit.text, unit.heading);
    const application = /\b(?:send|share|submit|email|DM|apply|include|mention|subject)\b/i.test(unit.text)
      && /\b(?:CV|resume|CTC|notice period|current location|subject|apply|application|DM)\b|@/i.test(unit.text);
    const responsibility = /responsibilities|duties|what you(?:'|’)ll do/i.test(unit.heading)
      || /^(?:you will\s+|you(?:'|’)ll\s+)?(?:design|execute|perform|automate|test|report|track|participate|work with|maintain|develop|build|investigate|collaborate|write|review|create|ensure|support|manage)\b/i.test(unit.text);
    for (const skill of findSkills(unit.text)) {
      // Recruiter headlines, benefits, and application subject lines aren't technical requirements.
      if (application || /benefits/i.test(unit.heading) || /^\s*(?:recruiter|author|email subject)\s*:/i.test(unit.text)) continue;
      addUnique(skills, skill.name, evidence, { category: skill.category, priority: modality, originalWording: skill.wording });
    }
    // Preserve unfamiliar explicitly labeled skills without assigning a guessed category.
    const labeledSkills = unit.text.match(/^(?:required skills|preferred skills|skills|technologies|tech stack)\s*:\s*(.+)/i);
    const plainSkillList = /^(?:required skills|preferred skills|skills|technical skills)$/i.test(unit.heading)
      && !/\b(?:must|have|experience|knowledge|years?|strong|advantage|nice|required|preferred)\b/i.test(unit.text)
      && unit.text.length <= 160;
    if ((labeledSkills || plainSkillList) && !application) {
      for (const value of (labeledSkills?.[1] || unit.text).split(/[,;|]/).map(value => value.trim()).filter(Boolean)) {
        if (!findSkills(value).length && value.length <= 80) addUnique(skills, value, evidence, { category: 'Other Tools', priority: modality, originalWording: value });
      }
    }
    if (responsibility && !application && !/^(?:must|should|experience|knowledge|proficiency|requirements|qualifications)\b/i.test(unit.text)) addUnique(responsibilities, unit.text, evidence);
    if (/\b(?:bachelor(?:'s|’s|s)?|master(?:'s|’s|s)?|diploma|B\.?(?:Tech|Sc)|M\.?(?:Tech|Sc)|equivalent experience)\b/i.test(unit.text)) {
      const degree = unit.text.match(/\b(?:bachelor(?:'s|’s|s)?(?: degree)?|master(?:'s|’s|s)?(?: degree)?|diploma|B\.?(?:Tech|Sc)|M\.?(?:Tech|Sc))/i)?.[0] || null;
      const field = unit.text.match(/\b(?:Computer Science|Information Technology|IT|Engineering)(?:\s*(?:\/|or)\s*(?:Computer Science|IT|Engineering))*/i)?.[0] || null;
      addUnique(education, unit.text, evidence, { degree, field, equivalentExperience: /equivalent experience/i.test(unit.text), priority: modality });
    }
    for (const name of domainNames) {
      if (wordPattern([name]).test(unit.text) && /\b(?:experience|knowledge|domain|background|familiarity)\b/i.test(unit.text)) addUnique(domains, name, evidence, { priority: modality });
    }
    for (const name of ['ISTQB', 'AWS Certification', 'Scrum Certification']) {
      if (wordPattern([name]).test(unit.text)) addUnique(certifications, name, evidence, { priority: modality });
    }
    for (const [name, aliases] of softNames) {
      if (wordPattern(aliases).test(unit.text) && !application && !/benefits/i.test(unit.heading)) addUnique(softSkills, name, evidence, { priority: modality });
    }
    const employment = unit.text.match(/\b(?:full[ -]time|part[ -]time|internship|contract|temporary)\b/i)?.[0];
    if (employment && !application) addUnique(employmentTypes, employment, evidence);
    const workMode = unit.text.match(/\b(?:remote|hybrid|on[ -]site|onsite|work from home|work from office)\b/i)?.[0];
    const workplaceContext = /\b(?:work mode|workplace|location|work(?:ing)? (?:mode|remotely|from|in|on)|fully remote|remote (?:role|position|job|work)|hybrid (?:role|position|working|work)|onsite (?:role|position|work))\b/i.test(unit.text)
      || /^(?:remote|hybrid|on[ -]site|onsite)$/i.test(unit.text)
      || /\((?:remote|hybrid|on[ -]site|onsite)\b/i.test(unit.text);
    if (workMode && !application && workplaceContext) addUnique(workModes, workMode, evidence);
    if (/\b(?:immediate joiners?|\d+[ -]day notice|(?:maximum|max)\s+\d+[ -]day|serving notice|notice period\s*:)/i.test(unit.text) && !application) addUnique(joining, unit.text, evidence, { priority: modality });
    if (/\b(?:(?:night|US|UK|rotational|general) shift|\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s*[–—-]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM))\b/i.test(unit.text)) addUnique(shifts, unit.text, evidence);
    const location = unit.text.match(/^(?:job |work )?location\s*:\s*(.+)/i)?.[1];
    if (location) addUnique(locations, location, evidence);
    if (application) {
      addUnique(instructions, unit.text, evidence);
      const emails = unit.text.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi) || [];
      applicationEmails.push(...emails);
      for (const match of unit.text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
        try {
          const url = new URL(match[0].replace(/[.,;)]+$/, ''));
          if (!url.username && !url.password) applicationLinks.push(url.href);
        } catch { /* Ignore malformed application links; never fetch them. */ }
      }
      if (emails.length || /\bemail\b/i.test(unit.text)) addUnique(methods, 'Email', evidence);
      if (/\bDM\b|direct message/i.test(unit.text)) addUnique(methods, 'Direct Message', evidence);
      if (/\bapply\b/i.test(unit.text) && /https?:\/\//i.test(unit.text)) addUnique(methods, 'Application Link', evidence);
      const subject = unit.text.match(/(?:subject(?: line)?\s*[:：]\s*|use\s+["“]?)(.+?)(?:["”]?\s+as (?:the )?(?:email )?subject[.!]?|$)/i)?.[1];
      if (/\bsubject\b/i.test(unit.text) && subject) requestedSubject = item(subject.replace(/^["“]|["”]$/g, '').trim(), evidence);
      if (!/\b(?:not required|do not|don't|optional)\b/i.test(unit.text)) {
        for (const [field, pattern] of Object.entries({ currentCTC: /current CTC/i, expectedCTC: /expected CTC/i,
          noticePeriod: /notice period/i, currentLocation: /current location/i, resume: /\b(?:CV|resume)\b/i })) {
          if (pattern.test(unit.text)) requestedInformation[field] = item(true, evidence);
        }
      }
    }
  }
  // An unspecified mention doesn't create a second skill alongside an explicit
  // requirement. Conflicting explicit priorities remain visible for review.
  for (let index = skills.length - 1; index >= 0; index--) {
    const skill = skills[index];
    if (skill.priority === 'unspecified') {
      const classified = skills.filter(other => other.value === skill.value && ['required', 'preferred'].includes(other.priority));
      if (classified.length) {
        for (const other of classified) other.evidence.push(...skill.evidence);
        skills.splice(index, 1);
      }
    }
  }
  for (const skill of skills) skill.conflictingPriority = skills.some(other => other.value === skill.value && other.priority !== skill.priority);
  const experience = experienceItems(units);
  if (!experience.text && profile.experience) {
    const confirmedUnits = sourceUnits(profile.experience);
    const parsed = experienceItems(confirmedUnits);
    for (const entry of parsed.requirements) entry.evidence = [profileEvidence(profile, 'experience')];
    if (parsed.requirements.length) Object.assign(experience, parsed);
    else experience.text = profile.experience;
  }
  if (profile.employmentType && !employmentTypes.length) employmentTypes.push(item(profile.employmentType, profileEvidence(profile, 'employmentType')));
  const requiredSkills = skills.filter(skill => skill.priority === 'required');
  const preferredSkills = skills.filter(skill => skill.priority === 'preferred');
  const mentionedSkills = skills.filter(skill => skill.priority === 'unspecified');
  const excludedSkills = skills.filter(skill => skill.priority === 'not_required');
  const allEvidence = [...skills, ...responsibilities, ...education, ...domains, ...certifications, ...softSkills,
    ...employmentTypes, ...workModes, ...joining, ...shifts, ...locations, ...instructions, ...experience.requirements].flatMap(entry => entry.evidence);
  const result = {
    schemaVersion: 1, analysisStatus: 'analyzed', confirmed: false, analyzedAt: now().toISOString(),
    identity: { jobTitle: profile.jobTitle, companyName: profile.companyName || null, location: profile.location || null,
      sourcePlatform: profile.sourcePlatform || 'LinkedIn', sourceType: profile.sourceType, sourceUrl: profile.sourceUrl,
      selectedRoleId: profile.selectedRoleId || null },
    employment: { experience, employmentTypes, workModes, locations, joiningPreferences: joining, shifts },
    technical: { requiredSkills, preferredSkills, mentionedSkills, excludedSkills,
      categories: Object.fromEntries(SKILL_CATEGORIES.map(category => [category, skills.filter(skill => skill.category === category && skill.priority !== 'not_required')])),
      testingRequirements: skills.filter(skill => skill.category === 'Testing Skills' && skill.priority !== 'not_required') },
    professional: { responsibilities, education, domains, certifications, softSkills },
    application: { recruiter: { name: profile.recruiterName || null, email: profile.recruiterEmail || null,
      postAuthorName: profile.postAuthorName || null, postAuthorHeadline: profile.postAuthorHeadline || null },
      applicationEmail: profile.applicationEmail || (new Set(applicationEmails).size === 1 ? applicationEmails[0] : null),
      applicationEmails: [...new Set(applicationEmails)], applicationLinks: [...new Set(applicationLinks)],
      methods, requestedSubject, requestedInformation, instructions },
    keywords: [...new Set([...skills.filter(skill => skill.priority !== 'not_required').map(skill => skill.value), ...domains.map(domain => domain.value)])],
    verification: { evidence: allEvidence, userConfirmed: false, ruleVersion: 'day4-v1' },
    source: { confirmedJobProfile: clone(profile), analyzedContent: profile.jobSourceContent,
      originalContent: profile.originalPostContent || profile.jobSourceContent },
  };
  verifyAnalysisEvidence(result);
  return result;
}

export function verifyAnalysisEvidence(analysis) {
  const profile = analysis.source.confirmedJobProfile;
  for (const evidence of analysis.verification.evidence) {
    const content = profile[evidence.field];
    if (typeof content !== 'string' || (evidence.start == null ? content !== evidence.text : content.slice(evidence.start, evidence.end) !== evidence.text)) {
      throw new AnalysisError('verification', 'An extracted requirement could not be verified against the confirmed source.');
    }
  }
  return true;
}

export function confirmRequirementsProfile(analysis, now = () => new Date()) {
  if (!analysis || analysis.analysisStatus === 'analysis_failed') throw new AnalysisError('invalid_analysis', 'Analyze the confirmed job details first.');
  verifyAnalysisEvidence(analysis);
  const result = clone(analysis);
  const mark = value => {
    if (!value || typeof value !== 'object') return;
    if ('status' in value && Array.isArray(value.evidence)) { value.userConfirmed = true; value.extractionStatus = value.status; value.status = 'user_confirmed'; }
    for (const [key, child] of Object.entries(value)) if (key !== 'source') mark(child);
  };
  mark(result);
  result.confirmed = true; result.confirmedAt = now().toISOString(); result.analysisStatus = 'confirmed';
  result.verification.userConfirmed = true;
  return result;
}
