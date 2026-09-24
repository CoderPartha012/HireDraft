import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJobUrl } from '../src/validate-job-url.js';

for (const [input, code] of [
  ['', 'empty'], ['   ', 'empty'], ['QA Engineer LinkedIn', 'format'],
  ['https://', 'format'], ['https://www.google.com/jobs/view/123', 'domain'],
  ['https://www.linkedin.com/in/person', 'job'],
  ['https://linkedin.com/company/example', 'job'],
  ['https://linkedin.com/feed/', 'job'], ['https://linkedin.com/messaging/', 'job'],
  ['https://linkedin.com/posts/example', 'job'],
  ['https://linkedin.com/jobs/view/', 'job'], ['https://linkedin.com/jobs/view/nonsense', 'job'],
  ['https://linkedin.com.evil.example/jobs/view/123', 'domain'],
  ['https://evil-linkedin.com/jobs/view/123', 'domain'],
  ['https://linkedin.com@evil.example/jobs/view/123', 'format'],
  ['ftp://linkedin.com/jobs/view/123', 'format'],
  ['https://linkedin.com/jobs/view/12 3', 'format'],
  ['https://linkedin.com:444/jobs/view/123', 'format'],
]) {
  test(`rejects ${JSON.stringify(input)}`, () => {
    const result = validateJobUrl(input);
    assert.equal(result.valid, false);
    assert.equal(result.code, code);
    assert.equal(result.validatedJobUrl, null);
  });
}
for (const input of [
  'https://www.linkedin.com/jobs/view/1234567890',
  'https://linkedin.com/jobs/view/1234567890/',
  'https://www.linkedin.com/jobs/view/qa-engineer-at-example-1234567890?trackingId=abc#details',
  '  https://www.linkedin.com/jobs/view/1234567890  ',
  'https://WWW.LINKEDIN.COM/jobs/view/1234567890',
]) {
  test(`accepts ${JSON.stringify(input)}`, () => {
    const result = validateJobUrl(input);
    assert.equal(result.valid, true);
    assert.equal(result.validatedJobUrl, new URL(input.trim()).href);
  });
}
