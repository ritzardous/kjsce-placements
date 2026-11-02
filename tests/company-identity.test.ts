import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalCompanyKey, mergeCompanyDirectory } from '../shared/company-identity';
import { initialProcedureDraft, procedureDraftSchema } from '../shared/procedures';
test('reviewed identities collapse aliases and combine years without merging subsidiaries', () => {
  const rows = mergeCompanyDirectory([{ key: 'jpmc', name: 'JPMC', years: [2025] }, { key: 'jp_morgan_chase_co', name: 'JP Morgan Chase & Co.', years: [2026] }]);
  assert.equal(rows.length, 1); assert.deepEqual(rows[0].years, [2025, 2026]);
  assert.equal(canonicalCompanyKey('godrej-boyce'), 'godrej-and-boyce');
  assert.notEqual(canonicalCompanyKey('icici-prudential-amc'), canonicalCompanyKey('icici-prudential-life-insurance'));
  assert.notEqual(canonicalCompanyKey('oracle'), canonicalCompanyKey('oracle-financial-software-services-ltd'));
});
test('draft ingress rejects path injection, duplicate rounds, forged fields and hidden title controls', () => {
  for (const patch of [{ companyKey: '../users/admin' }, { rounds: ['HR', 'HR'] }, { ownerUid: 'forged' }, { title: 'Hidden\u202ename' }]) assert.equal(procedureDraftSchema.safeParse({ ...initialProcedureDraft(), ...patch }).success, false);
  assert.equal(procedureDraftSchema.parse({ ...initialProcedureDraft(), companyKey: 'jp-morgan-chase-co' }).companyKey, 'jpmc');
});
