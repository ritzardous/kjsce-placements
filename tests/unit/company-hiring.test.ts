import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companyHiringSchema, readCompanyHiring, updateCompanyHiringSchema } from '../../shared/company-hiring';
import { analyticsContext, analyticsPage } from '../../src/lib/analytics';
import { createCompanySchema } from '../../shared/procedures';

test('only the four maintainer-named companies are initially ongoing', () => {
  for (const key of ['magellan', 'godrej-capital', 'sharekhan-limited', 'wissen-technology']) assert.deepEqual(readCompanyHiring(key), {status:'ongoing',year:2027,version:0});
  for (const key of ['jpmc', 'godrej-and-boyce', 'sharekhan', 'unknown']) assert.equal(readCompanyHiring(key).status, 'none');
});
test('explicit statuses override curated defaults and malformed metadata fails closed', () => {
  assert.equal(readCompanyHiring('magellan', {status:'none',year:2027,version:1}).status, 'none');
  assert.equal(readCompanyHiring('magellan', {status:'upcoming',year:2027,version:2}).status, 'upcoming');
  for (const value of [null, {status:'ongoing'}, {status:'ongoing',year:2026,version:1}, {status:'ongoing',year:2027,version:1,ownerUid:'forged'}]) assert.equal(readCompanyHiring('magellan',value).status,'none');
});
test('hiring update boundary rejects forged authority, versions, dates and record paths', () => {
  const valid = {companyKey:'magellan',status:'upcoming',year:2027,expectedVersion:0};
  assert.equal(updateCompanyHiringSchema.safeParse(valid).success,true);
  for (const change of [{companyKey:'../private'}, {companyKey:'magellan\n'}, {expectedVersion:-1}, {status:'approved'}, {year:2028}, {ownerUid:'forged'}, {updatedAt:1}, {version:123}]) assert.equal(updateCompanyHiringSchema.safeParse({...valid,...change}).success,false);
  assert.equal(companyHiringSchema.safeParse({status:'ongoing',year:2027,version:1,updatedAt:Date.now()}).success,true);
  assert.equal(createCompanySchema.safeParse({name:'Example Company',hiring:{status:'ongoing',year:2027,version:1}}).success,false);
});
test('support is public and has a fixed analytics label without payment details', () => {
  const page=analyticsPage({page:'support',year:2027},{ready:false,allowed:false,invitation:false,redirecting:false});
  assert.equal(page?.path,'/support');
  assert.deepEqual(analyticsContext(page!),{section:'support'});
});
