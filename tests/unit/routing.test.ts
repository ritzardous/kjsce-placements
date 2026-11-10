import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../../src/app/routing';
test('new public and portal routes remain distinct from legacy statistics links', () => {
  assert.equal(parseRoute('').page, 'landing');
  assert.equal(parseRoute('#login').page, 'login');
  assert.equal(parseRoute('#home').page, 'home');
  assert.deepEqual(parseRoute('#procedures/contribute'), { page: 'procedures', parameter: 'contribute', year: 2026 });
  assert.deepEqual(parseRoute('#companies'), { page: 'companies', parameter: undefined, year: 2026 });
  assert.deepEqual(parseRoute('#2025/company/google'), { page: 'company', parameter: 'google', year: 2025 });
  assert.deepEqual(parseRoute('#2027/branches/AI%20%26%20DS'), { page: 'branches', parameter: 'AI & DS', year: 2027 });
  assert.equal(parseRoute('#2025').page, 'overview');
  assert.equal(parseRoute('#2027/').page, 'overview');
  assert.equal(parseRoute('#2026/overview').year, 2026);
  assert.equal(parseRoute('#2025/company/%bad').parameter, undefined);
});
