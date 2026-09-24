import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJobRequirements, confirmRequirementsProfile, verifyAnalysisEvidence } from '../src/requirements-analysis.js';
import { analysisEditorValues, applyAnalysisCorrections } from '../src/analysis-review.js';
import { normalizeJobProfile, selectProfileRole, confirmJobProfile } from '../src/job-profile.js';
import { parsePostPage } from '../src/server/extract-post.js';

const profile = content => ({ confirmed: true, sourcePlatform: 'LinkedIn', sourceType: 'linkedin_job',
  sourceUrl: 'https://www.linkedin.com/jobs/view/123', jobTitle: 'QA Engineer', companyName: 'Example',
  location: 'Bengaluru', jobSourceContent: content, recruiterName: 'Muskan Sharma', recruiterEmail: 'hr@example.com' });
const names = entries => entries.map(entry => entry.value);
const detailed = `Required Skills:
Must have Java and Selenium WebDriver experience.
REST APIs, Postman, MySQL, Jenkins and Git are required.
Preferred Skills:
Playwright and AWS would be an advantage.
Docker is nice to have.
Experience: 1–3 years
Selenium experience: 2+ years
Responsibilities:
Design and execute test cases.
Perform functional testing and regression testing.
Report and track defects using Jira.
Education:
Bachelor's degree in Computer Science or equivalent experience.
Banking domain experience preferred.
ISTQB certification preferred.
Strong communication, analytical thinking and attention to detail.
Employment Type: Full-time
Work Mode: Hybrid
Immediate joiners preferred.
Shift: 3 PM–12 AM
Application Instructions:
Send your CV to careers@example.com.
Use Application for QA Engineer as the email subject.
Mention current CTC and expected CTC.
Include notice period and share current location.`;

test('detailed source categorizes technical/professional/employment requirements with evidence', () => {
  const result = analyzeJobRequirements(profile(detailed));
  assert.deepEqual(names(result.technical.requiredSkills), ['Java', 'Selenium', 'Postman', 'REST API', 'MySQL', 'Jenkins', 'Git']);
  assert.deepEqual(names(result.technical.preferredSkills), ['Playwright', 'AWS', 'Docker']);
  assert.equal(result.technical.categories['Programming Languages'][0].value, 'Java');
  assert.ok(names(result.technical.testingRequirements).includes('Functional Testing'));
  assert.ok(names(result.technical.testingRequirements).includes('Regression Testing'));
  assert.ok(names(result.professional.responsibilities).includes('Design and execute test cases.'));
  assert.equal(result.professional.education[0].degree, "Bachelor's degree");
  assert.equal(result.professional.education[0].field, 'Computer Science');
  assert.equal(result.professional.education[0].equivalentExperience, true);
  assert.equal(result.professional.domains[0].value, 'Banking');
  assert.equal(result.professional.certifications[0].priority, 'preferred');
  assert.ok(names(result.professional.softSkills).includes('Communication'));
  assert.equal(result.employment.workModes[0].value, 'Hybrid');
  assert.equal(result.employment.joiningPreferences[0].priority, 'preferred');
  assert.equal(result.employment.shifts[0].value, 'Shift: 3 PM–12 AM');
  assert.equal(verifyAnalysisEvidence(result), true);
});
test('overall and technology-specific experience are preserved separately', () => {
  const result = analyzeJobRequirements(profile('Experience: 3–5 years\n2+ years of Selenium automation experience'));
  assert.equal(result.employment.experience.minimum, 3);
  assert.equal(result.employment.experience.maximum, 5);
  assert.equal(result.employment.experience.technologyExperience[0].minimum, 2);
  assert.equal(result.employment.experience.technologyExperience[0].maximum, null);
  assert.deepEqual(result.employment.experience.technologyExperience[0].technologies, ['Selenium']);
});
for (const [text, minimum, maximum] of [['0–2 years', 0, 2], ['1-3 years', 1, 3], ['2+ years', 2, null], ['Minimum 2 years', 2, null], ['3–5 years', 3, 5], ['Freshers can apply', 0, null], ['3 years experience', 3, null], ['1.5–2.5 years', 1.5, 2.5]]) {
  test(`experience bounds: ${text}`, () => {
    const experience = analyzeJobRequirements(profile(`Experience: ${text}`)).employment.experience;
    assert.equal(experience.minimum, minimum); assert.equal(experience.maximum, maximum);
  });
}
test('conflicting and invalid ranges are preserved without inventing a combined range', () => {
  const result = analyzeJobRequirements(profile('Experience: 1–3 years\nExperience: 5–7 years'));
  assert.equal(result.employment.experience.conflicting, true);
  assert.equal(result.employment.experience.minimum, null);
  assert.equal(analyzeJobRequirements(profile('Experience: 5–2 years')).employment.experience.minimum, null);
});
test('short post extracts only explicitly available facts without inventing skills or education', () => {
  const result = analyzeJobRequirements({ ...profile("We're hiring QA Engineers!\nLocation: Gurgaon\nExperience: 1–3 years\nSend CV to jobs@example.com"), sourceType: 'linkedin_post', location: 'Gurgaon' });
  assert.deepEqual(result.technical.requiredSkills, []);
  assert.deepEqual(result.professional.education, []);
  assert.deepEqual(result.professional.certifications, []);
  assert.deepEqual(result.employment.workModes, []);
  assert.equal(result.application.applicationEmail, 'jobs@example.com');
  assert.equal(result.identity.location, 'Gurgaon');
});
test('mentioned tools are not all mandatory and absent related tools never appear', () => {
  const result = analyzeJobRequirements(profile('Looking for QA Engineer with Selenium experience.'));
  assert.deepEqual(names(result.technical.mentionedSkills), ['Selenium']);
  assert.deepEqual(result.technical.requiredSkills, []);
  assert.deepEqual(result.keywords, ['Selenium']);
  assert.ok(!result.keywords.includes('Java'));
});
for (const text of ['Java required, Python preferred.', 'Java is required and Python is preferred.', 'Must have Java; Python is nice to have.', 'Must have Java, while Python is preferred.']) {
  test(`mixed requirement modality: ${text}`, () => {
    const result = analyzeJobRequirements(profile(text));
    assert.deepEqual(names(result.technical.requiredSkills), ['Java']);
    assert.deepEqual(names(result.technical.preferredSkills), ['Python']);
  });
}
test('negated skills are not required and do not enter matching keywords', () => {
  const result = analyzeJobRequirements(profile('Java is not required. Selenium is required.'));
  assert.deepEqual(names(result.technical.requiredSkills), ['Selenium']);
  assert.deepEqual(names(result.technical.excludedSkills), ['Java']);
  assert.deepEqual(result.keywords, ['Selenium']);
});
test('aliases deduplicate without adding related or substring technologies', () => {
  const result = analyzeJobRequirements(profile('Required Skills: Selenium, Selenium WebDriver, REST API, REST APIs, RESTful API, JavaScript, MySQL'));
  assert.deepEqual(names(result.technical.requiredSkills).sort(), ['Selenium', 'JavaScript', 'REST API', 'MySQL'].sort());
  assert.ok(!result.keywords.includes('Java')); assert.ok(!result.keywords.includes('SQL'));
});
test('application instructions and recruiter context stay separate from technical requirements', () => {
  const result = analyzeJobRequirements(profile(detailed));
  assert.equal(result.application.recruiter.name, 'Muskan Sharma');
  assert.equal(result.application.recruiter.email, 'hr@example.com');
  assert.equal(result.application.applicationEmail, 'careers@example.com');
  assert.equal(result.application.requestedSubject.value, 'Application for QA Engineer');
  for (const key of ['currentCTC', 'expectedCTC', 'noticePeriod', 'currentLocation', 'resume']) assert.equal(result.application.requestedInformation[key].value, true);
  assert.ok(!result.employment.joiningPreferences.some(entry => entry.value.includes('Include notice period')));
});
test('known confirmed location is preserved; explicit new locations are supplements', () => {
  const result = analyzeJobRequirements(profile('Location: Hyderabad\nRequired Skills: Selenium'));
  assert.equal(result.identity.location, 'Bengaluru');
  assert.equal(result.employment.locations[0].value, 'Hyderabad');
});
test('selected-role content is analyzed; original multi-role post is verification context only', () => {
  const sourceUrl = 'https://www.linkedin.com/posts/author_hiring-activity-7505130007300575232-Ab12';
  const content = 'Company: Example\nWe are hiring:\n1. QA Engineer — Selenium, Java\n2. Frontend Developer — React, TypeScript';
  const html = `<article class="main-feed-card"><div class="attributed-text-segment-list__content">${content.replace(/\n/g, '<br>')}</div></article>`;
  const job = parsePostPage(html, sourceUrl);
  const confirmed = confirmJobProfile(selectProfileRole(normalizeJobProfile(job), 'role-1'));
  const result = analyzeJobRequirements(confirmed);
  assert.ok(result.keywords.includes('Selenium')); assert.ok(result.keywords.includes('Java'));
  assert.ok(!result.keywords.includes('React')); assert.ok(!result.keywords.includes('TypeScript'));
  assert.ok(result.source.originalContent.includes('Frontend Developer'));
});
test('unconfirmed/missing/oversized content fails without changing Day 3 data', () => {
  for (const input of [{ ...profile('source'), confirmed: false }, profile(''), profile('x'.repeat(200001))]) {
    const before = JSON.stringify(input);
    assert.throws(() => analyzeJobRequirements(input));
    assert.equal(JSON.stringify(input), before);
  }
});
test('evidence is an exact source slice and tampering prevents confirmation', () => {
  const input = profile('• Must have Selenium experience.\nPreferred skills: Playwright');
  const result = analyzeJobRequirements(input);
  for (const evidence of result.verification.evidence) assert.equal(input[evidence.field].slice(evidence.start, evidence.end), evidence.text);
  result.verification.evidence[0].text = 'Invented source';
  assert.throws(() => confirmRequirementsProfile(result), /could not be verified/);
});
test('confirmed profile experience fallback is traceable to its original confirmed field', () => {
  const result = analyzeJobRequirements({ ...profile('A short source without tenure.'), experience: '1–3 years' });
  assert.equal(result.employment.experience.minimum, 1);
  assert.equal(verifyAnalysisEvidence(result), true);
});
test('editing keeps corrections, removes items, reclassifies skills and preserves source provenance', () => {
  const input = profile('Required Skills: Java, Selenium\nPreferred Skills: Playwright\nExperience: 1–3 years\nDesign and execute test cases.');
  const result = analyzeJobRequirements(input);
  const values = analysisEditorValues(result);
  Object.assign(values, { requiredSkills: 'Selenium\nNewTool', preferredSkills: 'Playwright\nJava', experience: '3–5 years',
    education: "Bachelor's degree", location: 'Remote', domains: 'SaaS', workModes: 'Remote',
    joiningPreferences: 'Immediate joiners only', responsibilities: 'Maintain automation suites',
    applicationInstructions: 'Send CV to corrected@example.com\nMention expected CTC.' });
  const corrected = applyAnalysisCorrections(result, values);
  assert.deepEqual(names(corrected.technical.requiredSkills), ['Selenium', 'NewTool']);
  assert.equal(corrected.technical.requiredSkills[1].status, 'user_provided');
  assert.deepEqual(corrected.technical.requiredSkills[1].evidence, []);
  assert.equal(corrected.technical.preferredSkills.find(entry => entry.value === 'Java').classificationCorrected, true);
  assert.equal(corrected.employment.experience.minimum, 3);
  assert.equal(corrected.employment.experience.maximum, 5);
  assert.equal(corrected.identity.location, 'Remote');
  assert.equal(corrected.application.applicationEmail, 'corrected@example.com');
  assert.equal(corrected.source.analyzedContent, input.jobSourceContent);
  assert.equal(verifyAnalysisEvidence(corrected), true);
  assert.equal(result.identity.location, 'Bengaluru');
  const confirmed = confirmRequirementsProfile(corrected);
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.technical.requiredSkills[1].status, 'user_confirmed');
  assert.equal(confirmed.technical.requiredSkills[1].extractionStatus, 'user_provided');
  corrected.technical.requiredSkills.push({ value: 'Unconfirmed' });
  assert.equal(confirmed.technical.requiredSkills.length, 2);
});
test('one skill cannot be simultaneously required and preferred after correction', () => {
  const result = analyzeJobRequirements(profile('Required Skills: Selenium'));
  const values = analysisEditorValues(result);
  values.preferredSkills = 'Selenium';
  assert.throws(() => applyAnalysisCorrections(result, values), /more than one/);
});
test('edited aliases normalize and deduplicate using the same categories', () => {
  const result = analyzeJobRequirements(profile('Required Skills: Selenium'));
  const values = analysisEditorValues(result);
  values.requiredSkills = 'Selenium\nSelenium WebDriver\nPostgres';
  const corrected = applyAnalysisCorrections(result, values);
  assert.deepEqual(names(corrected.technical.requiredSkills), ['Selenium', 'PostgreSQL']);
  assert.equal(corrected.technical.requiredSkills[1].category, 'Database');
});
test('independent technology tenure on a single line is not blended', () => {
  const result = analyzeJobRequirements(profile('Selenium: 2 years, Python: 3 years'));
  assert.deepEqual(result.employment.experience.technologyExperience.map(entry => entry.technologies), [['Selenium'], ['Python']]);
});
test('application links are captured from manual source content without network calls', () => {
  const result = analyzeJobRequirements(profile('Apply with your CV at https://example.com/careers/qa.'));
  assert.deepEqual(result.application.applicationLinks, ['https://example.com/careers/qa']);
});
test('unfamiliar labeled skills are preserved without guessing related skills', () => {
  const result = analyzeJobRequirements(profile('Required Skills:\nRuby, Robot Framework\nPreferred Skills:\nCustomTool'));
  assert.deepEqual(names(result.technical.requiredSkills), ['Ruby', 'Robot Framework']);
  assert.deepEqual(names(result.technical.preferredSkills), ['CustomTool']);
});
test('negation only affects its own clause and does not make other requirements optional', () => {
  const result = analyzeJobRequirements(profile('Java is not required, Selenium is mandatory.'));
  assert.deepEqual(names(result.technical.requiredSkills), ['Selenium']);
  assert.deepEqual(names(result.technical.excludedSkills), ['Java']);
  const both = analyzeJobRequirements(profile('Java and Selenium are not required.'));
  assert.equal(both.technical.excludedSkills.length, 2);
});
test('remote device access and hybrid deployment do not invent workplace requirements', () => {
  const result = analyzeJobRequirements(profile('Maintain remote device access and hybrid deployment tests.'));
  assert.deepEqual(result.employment.workModes, []);
});
