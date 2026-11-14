import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companyProfileSchema, readCompanyProfile, companyProfileCtc } from '../../shared/company-profile';
import { readFileSync } from 'node:fs';
test('community profile preserves supplied CTC and rejects unsafe or misleading metadata',()=>{
  const profile=companyProfileSchema.parse(JSON.parse(readFileSync('data/company-profiles/wissen-technology.json','utf8')));
  assert.deepEqual(profile.roles,['Software Engineer']);assert.equal(profile.ctcMinLpa,11);assert.equal(profile.ctcMaxLpa,11);
  assert.equal(companyProfileCtc(profile),'₹11 LPA');
  assert.equal(readCompanyProfile(undefined),undefined);
  for(const patch of [{ctcMinLpa:12},{source:'official'},{logoPath:'https://example.com/logo.png'},{logoPath:'/company-logos/../secret.png'},{website:'javascript:alert(1)'},{website:'not a URL'},{roles:['x'.repeat(101)]}])assert.equal(companyProfileSchema.safeParse({...profile,...patch}).success,false);
});
