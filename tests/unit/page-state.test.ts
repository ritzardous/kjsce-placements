import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageFromHash, pageHref } from '../../src/app/page-state';

test('pageFromHash reads only valid positive page numbers', () => {
  assert.equal(pageFromHash('#companies'), 1);
  assert.equal(pageFromHash('#companies?page=3'), 3);
  assert.equal(pageFromHash('#2025/companies?page=2'), 2);
  assert.equal(pageFromHash('#companies?page=0'), 1);
  assert.equal(pageFromHash('#companies?page=-1'), 1);
  assert.equal(pageFromHash('#companies?page=2.5'), 1);
  assert.equal(pageFromHash('#companies?page=abc'), 1);
  assert.equal(pageFromHash('#companies?page=10001'), 1);
});

test('pageHref preserves other query parameters and removes the first page', () => {
  assert.equal(pageHref('#companies', 1), '#companies');
  assert.equal(pageHref('#companies', 3), '#companies?page=3');
  assert.equal(pageHref('#2025/companies?page=2', 4), '#2025/companies?page=4');
  assert.equal(pageHref('#companies?page=3&type=IT', 2), '#companies?page=2&type=IT');
  assert.equal(pageHref('#companies?page=3&type=IT', 1), '#companies?type=IT');
});
