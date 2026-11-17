import test from 'node:test';
import assert from 'node:assert/strict';
import {bundledCompanies} from '../../src/procedures/bundled-company-directory';

test('offline company snapshot is populated, canonical and contains only company projection fields',()=>{
 assert(bundledCompanies.length>100);
 assert.equal(new Set(bundledCompanies.map(row=>row.key)).size,bundledCompanies.length);
 for(const row of bundledCompanies){
  assert(Object.keys(row).every(key=>['key','name','years','profile','hiring'].includes(key)));
  assert.equal(row.hiring,undefined,'Offline sources cannot establish current hiring status');
 }
 assert(bundledCompanies.some(row=>row.key==='barclays'));
 assert(bundledCompanies.some(row=>row.key==='wissen-technology'&&row.profile?.ctcMinLpa===11));
});
