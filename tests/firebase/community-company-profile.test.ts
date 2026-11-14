import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

test('Wissen profile update is scoped, hash-guarded and idempotent',async()=>{
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  const projectId='demo-wissen-profile-tests',app=initializeApp({projectId},'wissen-profile-config'),db=getFirestore(app);
  const run=async(args:string[]=[])=>{
    const result=await promisify(execFile)(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/configure-wissen-company.ts','--emulator','--project',projectId,...args],{env:process.env});
    return JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))) as {hash:string;changed:boolean};
  };
  try{
    const company=db.doc('procedureCompanies/wissen-technology'),other=db.doc('procedureCompanies/unrelated');
    await company.set({name:'Wissen Technology',years:[],source:'community',customMarker:'preserve'});
    await other.set({name:'Other company',years:[2026]});const untouched=await other.get();
    const preview=await run();await assert.rejects(()=>run(['--apply','--expected-hash','stale']));
    assert.equal((await company.get()).get('profile'),undefined);
    assert.equal((await run(['--apply','--expected-hash',preview.hash])).changed,true);
    const saved=(await company.get()).data()!;
    assert.deepEqual(saved.years,[]);assert.equal(saved.source,'community');assert.equal(saved.customMarker,'preserve');
    assert.equal(saved.profile.ctcMinLpa,11);assert.equal(saved.profile.ctcMaxLpa,11);assert.deepEqual(saved.profile.roles,['Software Engineer']);
    assert.ok((await other.get()).updateTime!.isEqual(untouched.updateTime!));
    const again=await run();assert.equal((await run(['--apply','--expected-hash',again.hash])).changed,false);
    await company.update({customMarker:'newer edit'});await assert.rejects(()=>run(['--apply','--expected-hash',again.hash]));
    assert.equal((await company.get()).get('customMarker'),'newer edit');
  }finally{await deleteApp(app);}
});
