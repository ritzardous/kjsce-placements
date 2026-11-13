import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalCompanyKey, mergeCompanyDirectory } from '../../shared/company-identity';
import { initialProcedureDraft, procedureDraftSchema } from '../../shared/procedures';
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

test('maintainer confirmed five aliases while other reviewed names remain distinct',()=>{
  for(const [key,alias] of [['aptia','aptia-india'],['impactguru','impact-guru-technology-venture'],['ion','ion-group'],['pravaayu','pravaayu-healthcare'],['transbnk-solutions','transbnk-solutions-pvt-ltd-tbx']]){
    assert.equal(canonicalCompanyKey(alias),key);
    assert.equal(procedureDraftSchema.parse({...initialProcedureDraft(),companyKey:alias}).companyKey,key);
    const merged=mergeCompanyDirectory([{key,name:key,years:[2025]},{key:alias,name:alias,years:[2026]}]);
    assert.equal(merged.length,1);assert.deepEqual(merged[0].years,[2025,2026]);
  }
  for(const [a,b] of [['colgate','colgate-palmolive'],['icici-prudential','icici-prudential-amc'],['icici-prudential','icici-prudential-life-insurance'],['oracle','oracle-financial-software-services-ltd'],['tata-consultancy-services','tcs-ninja'],['tata-consultancy-services','tata-motors-insurance-broking-and-advisory-services-limited']])assert.notEqual(canonicalCompanyKey(a),canonicalCompanyKey(b));
});
