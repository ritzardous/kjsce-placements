import test from 'node:test';
import assert from 'node:assert/strict';
import {directoryEntry,directoryPublication,companyDirectorySchema} from '../../shared/company-directory.js';

test('compact directory projects only approved company fields and validates its size',()=>{
  const entry=directoryEntry('example',{name:'Example',years:[2027],createdBy:'private-owner',createdAt:1,body:'private',profile:{malformed:true}})!;
  assert.deepEqual(entry,{key:'example',name:'Example',years:[2027]});
  assert.equal(directoryEntry('alias',{name:'Alias',aliasOf:'example'}),undefined);
  assert.equal(directoryPublication([entry],1).companies.length,1);
  const merged=directoryPublication([
    {key:'ion',name:'ION',years:[2027],hiring:{status:'none',year:2027,version:1}},
    {key:'ion-group',name:'ION Group',years:[2026]},
  ]);
  assert.equal(merged.companies.length,1);
  assert.equal(merged.companies[0].hiring?.status,'none');
  assert.equal(companyDirectorySchema.safeParse({schemaVersion:2,updatedAt:1,companies:[entry]}).success,false);
  assert.throws(()=>directoryEntry('bad/path',{name:'Invalid',years:[]}));
  assert.throws(()=>directoryPublication(Array.from({length:1500},(_,i)=>({key:'company-'+i,name:'😀'.repeat(150),years:[]}))),/capacity reached/);
});
