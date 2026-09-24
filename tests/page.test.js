import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';

test('review/manual forms have unique IDs, associated labels and no nested forms', async () => {
  const $ = load(await readFile(new URL('./legacy/index.html', import.meta.url), 'utf8'));
  const ids = $('[id]').toArray().map(node => $(node).attr('id'));
  assert.equal(new Set(ids).size, ids.length);
  for (const node of $('input, textarea, select').toArray()) {
    const id = $(node).attr('id');
    assert.equal($(`label[for="${id}"]`).length, 1, `Label for ${id}`);
  }
  assert.equal($('form form').length, 0);
  assert.equal($('#edit-form').is('[hidden]'), true);
  assert.equal($('#manual-form input[required], #manual-form textarea[required]').length, 2);
  assert.equal($('#role-select').closest('#role-selection').length, 1);
  assert.equal($('#review-message').attr('aria-live'), 'polite');
});
