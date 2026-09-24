import { createEmailController } from './legacy/src/email-ui.js';
﻿import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateJobUrl } from '../src/validate-job-url.js';
import { normalizeJobProfile, selectProfileRole, validateProfileReview, confirmJobProfile } from '../src/job-profile.js';
import { createRequirementsController } from './legacy/src/requirements-ui.js';
import { createCandidateController } from './legacy/src/candidate-ui.js';
import { createRelevanceController } from './legacy/src/relevance-ui.js';

test('form loading, validation, editing, repeat submission, and reset lifecycle', async () => {
  const element = () => ({
    value: '', disabled: true, hidden: true, textContent: '', dataset: {}, attributes: {}, listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    replaceChildren() { this.textContent = ''; }, prepend() {}, append() {},
    focus() { this.focused = true; },
  });
  const elements = Object.fromEntries(['job-form', 'job-url', 'analyze-button', 'clear-button', 'validation-message', 'extraction-section', 'extraction-message', 'job-details', 'retry-button', 'manual-fallback', 'manual-title', 'manual-company', 'manual-description', 'manual-message', 'extracted-title', 'extracted-company', 'extracted-description', 'source-note'].map(id => [`#${id}`, element()]));
  const input = elements['#job-url'];
  const button = elements['#analyze-button'];
  const message = elements['#validation-message'];
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    validateJobUrl,
    normalizeJobProfile, selectProfileRole, validateProfileReview, confirmJobProfile,
    createRequirementsController, createCandidateController, createRelevanceController, createEmailController,
    AbortController,
    fetch: () => new Promise(() => {}),
    document: { querySelector: id => elements[id] ||= element(), createElement: element },
    setTimeout: (callback, delay) => { if (delay === 350) timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  const source = await readFile(new URL('./legacy/src/app.js', import.meta.url), 'utf8');
  vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace('export const jobAnalysisState', 'globalThis.jobAnalysisState'), context);
  const state = context.jobAnalysisState;
  const submit = () => elements['#job-form'].listeners.submit({ preventDefault() {} });
  const enter = value => { input.value = value; input.listeners.input(); };
  const finish = () => { for (const [id, callback] of timers) { timers.delete(id); callback(); } };
  assert.equal(button.disabled, true);
  enter('   ');
  assert.equal(button.disabled, true);
  enter('QA Engineer LinkedIn');
  assert.equal(button.disabled, false);
  submit();
  assert.equal(state.status, 'validating');
  assert.equal(button.disabled, true);
  assert.equal(message.textContent, 'Checking LinkedIn URL...');
  submit();
  assert.equal(timers.size, 1);
  finish();
  assert.equal(state.status, 'invalid');
  assert.equal(input.value, 'QA Engineer LinkedIn');
  assert.equal(input.attributes['aria-invalid'], 'true');
  enter('  https://www.linkedin.com/jobs/view/1234567890  ');
  submit();
  finish();
  assert.equal(input.value, 'https://www.linkedin.com/jobs/view/1234567890');
  assert.equal(state.status, 'valid');
  assert.equal(state.validatedJobUrl, input.value);
  enter('https://google.com');
  assert.equal(state.validatedJobUrl, null);
  submit();
  enter('new input');
  finish();
  assert.equal(state.status, 'default');
  assert.equal(message.hidden, true);
  submit();
  elements['#clear-button'].listeners.click();
  finish();
  assert.equal(input.value, '');
  assert.equal(state.status, 'default');
  assert.equal(state.validatedJobUrl, null);
  assert.equal(button.disabled, true);
  assert.equal(message.hidden, true);
  assert.equal(input.focused, true);
});


