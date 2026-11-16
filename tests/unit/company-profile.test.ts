import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companyProfileSchema, readCompanyProfile, companyProfileCtc } from '../../shared/company-profile';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
test('community profile preserves supplied CTC and rejects unsafe or misleading metadata',()=>{
  const profile=companyProfileSchema.parse(JSON.parse(readFileSync('data/company-profiles/wissen-technology.json','utf8')));
  assert.deepEqual(profile.roles,['Software Engineer']);assert.equal(profile.ctcMinLpa,11);assert.equal(profile.ctcMaxLpa,11);
  assert.equal(companyProfileCtc(profile),'₹11 LPA');
  assert.equal(readCompanyProfile(undefined),undefined);
  for(const patch of [{ctcMinLpa:12},{source:'official'},{logoPath:'https://example.com/logo.png'},{logoPath:'/company-logos/../secret.png'},{website:'javascript:alert(1)'},{website:'not a URL'},{roles:['x'.repeat(101)]}])assert.equal(companyProfileSchema.safeParse({...profile,...patch}).success,false);
});

test('community salary context preserves unknown roles and explicitly labels estimates',()=>{
  const rows=JSON.parse(readFileSync('data/company-profiles/community-additions-2026-11-16.json','utf8')) as {key:string;profile?:unknown}[];
  const gracenote=companyProfileSchema.parse(rows.find(row=>row.key==='gracenote-nielsen')!.profile);
  const intrade=companyProfileSchema.parse(rows.find(row=>row.key==='intrade')!.profile);
  assert.deepEqual(gracenote.roles,[]);assert.deepEqual(intrade.roles,[]);
  assert.equal(companyProfileCtc(gracenote),'₹16 LPA');
  assert.equal(companyProfileCtc(intrade),'Estimated ₹12–14 LPA');
  const {roles,...withoutRoles}=intrade;assert.deepEqual(companyProfileSchema.parse(withoutRoles).roles,[]);
  assert.equal(companyProfileSchema.safeParse({...intrade,ctcEstimated:'yes'}).success,false);
  assert.equal(companyProfileSchema.safeParse({...intrade,ctcMinLpa:15}).success,false);
  assert.equal(rows.find(row=>row.key==='marico-limited')!.profile,undefined);
  const morganStanley=companyProfileSchema.parse(rows.find(row=>row.key==='morgan-stanley')!.profile);
  assert.equal(companyProfileCtc(morganStanley),'₹25 LPA');assert.deepEqual(morganStanley.roles,[]);
  const magellan=companyProfileSchema.parse(rows.find(row=>row.key==='magellan')!.profile);
  assert.deepEqual(magellan.roles,['Full Stack Engineer']);assert.equal(companyProfileCtc(magellan),'₹6–8 LPA');
});

test('all 2027 company keys resolve to bundled logo assets',()=>{
  const data=JSON.parse(readFileSync('data/placements-2027.json','utf8')) as {placements:{company:{normalized_name:string}}[]};
  const logos=JSON.parse(readFileSync('src/data/company-logos.json','utf8')) as {aliases:string[];file:string}[];
  const magellan=companyProfileSchema.parse((JSON.parse(readFileSync('data/company-profiles/community-additions-2026-11-16.json','utf8')) as {key:string;profile?:unknown}[]).find(row=>row.key==='magellan')!.profile);
  const magellanLogo=logos.find(row=>row.aliases.includes('magellan'));
  assert.ok(magellanLogo);assert.equal(magellanLogo.file,magellan.logoPath);assert.ok(existsSync('public'+magellanLogo.file));
  for(const key of new Set(data.placements.map(row=>row.company.normalized_name.replaceAll('_','-')))){
    const logo=logos.find(row=>row.aliases.includes(key));
    assert.ok(logo,`Missing reviewed logo mapping: ${key}`);assert.ok(existsSync('public'+logo.file));
  }
});
