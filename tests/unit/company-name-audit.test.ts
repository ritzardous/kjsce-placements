import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditCompanyNames } from '../../scripts/company-name-audit.js';

test('catalog name audit surfaces aliases, close names and distinct programmes without merging',()=>{
  const rows=[{key:'jpmc',name:'JPMC',years:[2026]},{key:'jp-morgan-chase-co',name:'JPMorgan Chase & Co.',years:[2025],aliasOf:'jpmc'},
    {key:'acme',name:'Acme Labs',years:[]},{key:'acme-private',name:'Acme Labs Private Limited',years:[]},
    {key:'acme-typo',name:'Acme Labz',years:[]},{key:'acme-ppo',name:'Acme Labs PPO',years:[]},
    {key:'unrelated',name:'Different Recruiter',years:[]}];
  const before=JSON.stringify(rows),pairs=auditCompanyNames(rows);
  assert.ok(pairs.some(pair=>pair.reason==='Same reviewed canonical identity'&&pair.alreadyLinked));
  assert.ok(pairs.some(pair=>pair.reason.includes('legal-suffix')));
  assert.ok(pairs.some(pair=>pair.reason==='Close spelling'));
  assert.ok(pairs.some(pair=>pair.reason.includes('may be distinct')));
  assert.ok(pairs.every(pair=>pair.companies.every(company=>company.key!=='unrelated')));
  assert.equal(JSON.stringify(rows),before);
});

test('short brands and hiring acronyms are reviewed without matching a single initial',()=>{
  const pairs=auditCompanyNames([
    {key:'ion',name:'ION',years:[]},{key:'ion-group',name:'ION Group',years:[]},
    {key:'tcs',name:'Tata Consultancy Services',years:[]},{key:'tcs-ninja',name:'TCS Ninja',years:[]},
    {key:'c-prav',name:'C-Prav Labs',years:[]},{key:'capgemini',name:'Capgemini',years:[]},
  ]);
  assert.equal(pairs.length,2);
  assert.ok(pairs.some(pair=>pair.companies.every(company=>company.key.startsWith('ion'))));
  assert.ok(pairs.some(pair=>pair.companies.every(company=>company.key.startsWith('tcs'))));
});
