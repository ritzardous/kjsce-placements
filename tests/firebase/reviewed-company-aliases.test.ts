import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { reviewedAliasPairs } from '../../scripts/reviewed-company-aliases.js';

test('scoped catalog repair is guarded, idempotent and preserves unrelated companies and writing',async()=>{
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  const app=initializeApp({projectId:'demo-placementstats'},'reviewed-alias-test'),db=getFirestore(app);
  const run=async(args:string[]=[])=>{
    const result=await promisify(execFile)(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/repair-reviewed-company-aliases.ts','--emulator',...args],{env:process.env});
    return JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))) as {hash:string;changed:number;plan:unknown[]};
  };
  try {
    for(const [canonical,alias] of reviewedAliasPairs){
      await db.doc('procedureCompanies/'+canonical).set({name:canonical,years:[2026],source:'preserved'});
      await db.doc('procedureCompanies/'+alias).set({name:alias,years:[2025],source:'legacy'});
    }
    const unrelated=db.doc('procedureCompanies/colgate-palmolive'),post=db.doc('procedurePosts/alias-repair-preserve');
    await unrelated.set({name:'Colgate Palmolive',years:[2026]});
    await post.set({companyKey:'aptia-india',body:'Existing author writing stays untouched.'});
    const previous=await unrelated.get(),preview=await run();assert.equal(preview.plan.length,10);
    await assert.rejects(()=>run(['--apply','--expected-hash','stale']));
    assert.equal((await db.doc('procedureCompanies/aptia-india').get()).data()!.aliasOf,undefined);
    const applied=await run(['--apply','--expected-hash',preview.hash]);assert.equal(applied.changed,10);
    for(const [canonical,alias] of reviewedAliasPairs){
      const target=(await db.doc('procedureCompanies/'+canonical).get()).data()!,legacy=(await db.doc('procedureCompanies/'+alias).get()).data()!;
      assert.deepEqual(target.years,[2025,2026]);assert.equal(target.source,'preserved');
      assert.equal(legacy.aliasOf,canonical);assert.equal(legacy.name,alias);assert.deepEqual(legacy.years,[2025]);assert.equal(legacy.source,'legacy');
    }
    assert.ok((await unrelated.get()).updateTime!.isEqual(previous.updateTime!));
    assert.deepEqual((await post.get()).data(),{companyKey:'aptia-india',body:'Existing author writing stays untouched.'});
    const again=await run();assert.equal((await run(['--apply','--expected-hash',again.hash])).changed,0);
    await db.doc('procedureCompanies/aptia').update({name:'Newer catalog edit'});
    await assert.rejects(()=>run(['--apply','--expected-hash',again.hash]));
    assert.equal((await db.doc('procedureCompanies/aptia').get()).data()!.name,'Newer catalog edit');
  }finally{await deleteApp(app);}
});
