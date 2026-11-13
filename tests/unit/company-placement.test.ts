import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companyPlacement } from '../../src/procedures/company-placement';
import { preparePublication } from '../../scripts/publication';

test('writer context combines reviewed aliases and retains all recorded roles without modifying snapshots',async()=>{
  const {dashboard}=await preparePublication(2026),source=dashboard.statistics.companies[0];
  const first={...source,key:'aptia',name:'Aptia',roles:['Role one']};
  const second={...source,key:'aptia-india',name:'Aptia India',roles:['Role two']};
  const input=[first,second],before=JSON.stringify(input),result=companyPlacement(input,'aptia-india')!;
  assert.equal(result.key,'aptia');assert.equal(result.name,'Aptia');assert.deepEqual(result.roles,['Role one','Role two']);
  assert.equal(result.announcements.length,source.announcements.length);
  assert.equal(result.totalHired,source.totalHired);assert.equal(result.highestCtc,source.highestCtc);
  assert.equal(JSON.stringify(input),before);
  assert.equal(companyPlacement(input,'colgate'),undefined);
});
