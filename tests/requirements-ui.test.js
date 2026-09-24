import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequirementsController } from './legacy/src/requirements-ui.js';
import { analyzeJobRequirements } from '../src/requirements-analysis.js';

const sourceProfile = () => ({ confirmed: true, jobTitle: 'QA Engineer', companyName: 'Example', location: 'Bangalore',
  sourceType: 'linkedin_job', sourceUrl: 'https://www.linkedin.com/jobs/view/123',
  jobSourceContent: 'Required Skills: Selenium, Java\nPreferred Skills: Playwright\nExperience: 1–3 years\nDesign and execute test cases.' });
function harness(analyze) {
  const element = () => ({ textContent: '', value: '', hidden: true, disabled: true, children: [], attributes: {}, dataset: {}, listeners: {},
    append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; }, focus() { this.focused = true; },
  });
  const elements = {};
  const get = id => elements[id] ||= element();
  const timers = new Map();
  let timerId = 0;
  const state = { confirmedJobProfile: null };
  const controller = createRequirementsController(state, { querySelector: selector => get(selector.slice(1)), createElement: element }, {
    analyze, schedule: callback => { timers.set(++timerId, callback); return timerId; }, cancel: id => timers.delete(id),
  });
  const run = () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } };
  const text = node => [node.textContent, ...node.children.map(text)].join(' ');
  controller.reset();
  return { state, controller, get, run, text, timers };
}
const submit = form => form.listeners.submit({ preventDefault() {} });
test('only confirmed Day 3 profiles can start requirement analysis', () => {
  const h = harness();
  h.get('requirements-button').listeners.click();
  assert.equal(h.timers.size, 0);
  h.state.confirmedJobProfile = { ...sourceProfile(), confirmed: false };
  h.get('requirements-button').listeners.click();
  assert.equal(h.timers.size, 0);
  assert.equal(h.get('analysis-section').hidden, true);
});
test('analyze lifecycle renders categories, evidence, absent sections and a confirmed handoff', () => {
  const h = harness();
  h.state.confirmedJobProfile = sourceProfile();
  const original = JSON.stringify(h.state.confirmedJobProfile);
  h.controller.onJobConfirmed();
  assert.equal(h.get('requirements-button').disabled, false);
  h.get('requirements-button').listeners.click();
  assert.equal(h.state.analysisStatus, 'analyzing');
  assert.equal(h.get('analysis-message').textContent, 'Analyzing job requirements...');
  h.get('requirements-button').listeners.click();
  assert.equal(h.timers.size, 1);
  h.run();
  assert.equal(h.state.analysisStatus, 'analyzed');
  assert.equal(h.get('analysis-results').hidden, false);
  const rendered = h.text(h.get('analysis-results'));
  assert.match(rendered, /Required Skills/); assert.match(rendered, /Selenium/); assert.match(rendered, /Source evidence/);
  assert.match(rendered, /Education Not specified/);
  h.get('analysis-confirm-button').listeners.click();
  assert.equal(h.state.analysisStatus, 'confirmed');
  assert.equal(h.state.confirmedRequirementsProfile.confirmed, true);
  assert.match(h.text(h.get('analysis-results')), /User Confirmed/);
  assert.equal(JSON.stringify(h.state.confirmedJobProfile), original);
});
test('analysis failure preserves confirmed job details and retry can recover', () => {
  let attempts = 0;
  const h = harness(profile => { if (!attempts++) throw new Error('Failure'); return analyzeJobRequirements(profile); });
  h.state.confirmedJobProfile = sourceProfile();
  const original = h.state.confirmedJobProfile;
  h.controller.onJobConfirmed(); h.get('requirements-button').listeners.click(); h.run();
  assert.equal(h.state.analysisStatus, 'analysis_failed');
  assert.equal(h.state.confirmedJobProfile, original);
  assert.equal(h.state.draftAnalysis, null);
  assert.equal(h.get('analysis-retry-button').hidden, false);
  assert.match(h.get('analysis-message').textContent, /original job details are still available/);
  h.get('analysis-retry-button').listeners.click(); h.run();
  assert.equal(h.state.analysisStatus, 'analyzed');
});
test('missing content asks user to edit original details without destroying the profile', () => {
  const h = harness();
  h.state.confirmedJobProfile = { ...sourceProfile(), jobSourceContent: '' };
  h.controller.onJobConfirmed(); h.get('requirements-button').listeners.click(); h.run();
  assert.equal(h.state.analysisError, 'missing_content');
  assert.match(h.get('analysis-message').textContent, /Edit your job details/);
  assert.equal(h.state.confirmedJobProfile.jobTitle, 'QA Engineer');
});
test('edit/save invalidates confirmation, retains corrections and keeps raw source intact', () => {
  const h = harness();
  h.state.confirmedJobProfile = sourceProfile();
  h.controller.onJobConfirmed(); h.get('requirements-button').listeners.click(); h.run();
  h.get('analysis-confirm-button').listeners.click();
  h.get('analysis-edit-button').listeners.click();
  assert.equal(h.state.analysisStatus, 'editing');
  assert.equal(h.state.confirmedRequirementsProfile, null);
  assert.equal(h.get('analysis-confirm-button').disabled, true);
  h.get('analysis-edit-requiredSkills').value = 'Selenium\nNewTool';
  h.get('analysis-edit-preferredSkills').value = 'Playwright';
  h.get('analysis-edit-experience').value = '3–5 years';
  h.get('analysis-edit-location').value = 'Remote';
  submit(h.get('analysis-edit-form'));
  assert.equal(h.state.analysisStatus, 'analyzed');
  assert.equal(h.state.draftAnalysis.identity.location, 'Remote');
  assert.equal(h.state.draftAnalysis.employment.experience.minimum, 3);
  assert.equal(h.state.confirmedJobProfile.location, 'Bangalore');
  assert.match(h.text(h.get('analysis-results')), /User Added \/ Corrected/);
  h.get('analysis-confirm-button').listeners.click();
  assert.equal(h.state.confirmedRequirementsProfile.identity.location, 'Remote');
  assert.equal(h.state.confirmedRequirementsProfile.technical.requiredSkills[1].extractionStatus, 'user_provided');
});
test('duplicate corrected skills report an error; cancel preserves the previous analysis', () => {
  const h = harness();
  h.state.confirmedJobProfile = sourceProfile();
  h.controller.onJobConfirmed(); h.get('requirements-button').listeners.click(); h.run();
  const previous = h.state.draftAnalysis;
  h.get('analysis-edit-button').listeners.click();
  h.get('analysis-edit-preferredSkills').value = 'Selenium';
  submit(h.get('analysis-edit-form'));
  assert.equal(h.state.analysisStatus, 'editing');
  assert.match(h.get('analysis-edit-message').textContent, /more than one/);
  h.get('analysis-edit-cancel').listeners.click();
  assert.equal(h.state.draftAnalysis, previous);
  assert.equal(h.state.analysisStatus, 'analyzed');
});
test('reset cancels pending analysis and clears all analysis state and source text', () => {
  const h = harness();
  h.state.confirmedJobProfile = sourceProfile();
  h.controller.onJobConfirmed(); h.get('requirements-button').listeners.click();
  h.controller.reset(); h.state.confirmedJobProfile = null; h.run();
  assert.equal(h.state.analysisStatus, 'raw');
  assert.equal(h.state.draftAnalysis, null);
  assert.equal(h.state.confirmedRequirementsProfile, null);
  assert.equal(h.get('analysis-section').hidden, true);
  assert.equal(h.get('analysis-source-content').textContent, '');
  assert.equal(h.get('analysis-section').attributes['aria-busy'], 'false');
});
