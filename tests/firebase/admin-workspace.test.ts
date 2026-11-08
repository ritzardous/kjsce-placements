import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {adminApi} from '../../functions/src/admin.js';
import {changeUser} from '../../functions/src/admin-users.js';
import {currentActor} from '../../functions/src/access.js';
import {prepareUploadedPublication,stagePublication,activatePublication} from '../../scripts/publication.js';
import {initialProcedureDraft} from '../../shared/procedures.js';
const app=initializeApp({projectId:'demo-placementstats-admin-tests'},'admin-workspace-tests'),db=getFirestore(app),auth=getAuth(app);
async function account(role='') {const uid=randomUUID();await auth.createUser({uid,email:`${uid}@example.test`,displayName:'Admin test account',emailVerified:true});if(role)await auth.setCustomUserClaims(uid,{role});return {uid,token:{firebase:{sign_in_provider:'google.com'},email_verified:true,auth_time:Math.floor(Date.now()/1000),role}};}
test('admin workspace permissions, access changes, jobs, audit, analytics and publication integrity',async t=>{
 t.after(()=>deleteApp(app));
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
 const owner=await account('admin'),member=await account(),otherAdmin=await account('admin');process.env.ADMIN_OWNER_UIDS=owner.uid;
 const call=(action:string,payload:unknown={})=>adminApi(db,auth,owner,{action,payload}) as Promise<any>;
 await t.test('private endpoints reject non-admins and stale role claims',async()=>{await assert.rejects(adminApi(db,auth,member,{action:'users'}));await auth.setCustomUserClaims(otherAdmin.uid,{});await assert.rejects(adminApi(db,auth,otherAdmin,{action:'overview'}));await auth.setCustomUserClaims(otherAdmin.uid,{role:'admin'});});
 await t.test('suspensions and revocations affect existing sessions, preserve content and have audit records',async()=>{
  const request={uid:member.uid,operation:'suspend',reason:'Investigate reported abuse',expectedVersion:0,requestId:randomUUID()};const result=await call('changeUser',request);assert.ok(result.auditId);assert.deepEqual(await call('changeUser',request),result);await assert.rejects(currentActor(db,auth,member));assert.equal((await auth.getUser(member.uid)).disabled,true);
  await assert.rejects(call('changeUser',{...request,requestId:randomUUID()}));
  await call('changeUser',{uid:member.uid,operation:'restore',reason:'Investigation completed',expectedVersion:1,requestId:randomUUID()});assert.equal((await auth.getUser(member.uid)).disabled,false);await assert.rejects(currentActor(db,auth,member));
  const fresh={...member,token:{...member.token,auth_time:Math.floor(Date.now()/1000)+5}};await currentActor(db,auth,fresh);
  await assert.rejects(call('changeUser',{uid:owner.uid,operation:'suspend',reason:'Self suspension attempt',expectedVersion:0,requestId:randomUUID()}));
  await assert.rejects(adminApi(db,auth,otherAdmin,{action:'changeUser',payload:{uid:member.uid,operation:'role',role:'admin',reason:'Unapproved role grant',expectedVersion:2,requestId:randomUUID()}}));
  const record=await call('audit',{record:result.auditId});assert.equal(record.rows[0].status,'succeeded');assert.equal(record.rows[0].actorUid,owner.uid);
 });
 await t.test('owner role changes preserve unrelated claims and invalidate old admin privileges',async()=>{const uid=randomUUID();const imported=await auth.importUsers([{uid,email:uid+'@example.test',emailVerified:true,providerData:[{uid,email:uid+'@example.test',providerId:'google.com'}]}]);assert.equal(imported.failureCount,0);await auth.setCustomUserClaims(uid,{unrelated:true});await call('changeUser',{uid,operation:'role',role:'admin',reason:'Grant verified owner-approved access',expectedVersion:0,requestId:randomUUID()});assert.deepEqual((await auth.getUser(uid)).customClaims,{unrelated:true,role:'admin'});await call('changeUser',{uid,operation:'role',role:'user',reason:'Remove test administrative access',expectedVersion:1,requestId:randomUUID()});assert.deepEqual((await auth.getUser(uid)).customClaims,{unrelated:true});});
 await t.test('last active administrator cannot be demoted even through the internal access operation',async()=>{await auth.setCustomUserClaims(owner.uid,{});try{await assert.rejects(changeUser(db,auth,owner,{uid:otherAdmin.uid,operation:'role',role:'user',reason:'Protect final administrator access',expectedVersion:0,requestId:randomUUID()}),/last active administrator/);}finally{await auth.setCustomUserClaims(owner.uid,{role:'admin'});}});
 await t.test('quality scans are resumable and reviewed alias repairs retain revision snapshots and backups',async()=>{
  await db.doc('procedureCompanies/jp-morgan-chase-co').set({name:'JP Morgan Chase',years:[2026]});
  const post=randomUUID();await db.doc(`procedureSubmissions/${post}`).set({ownerUid:member.uid,draft:{...initialProcedureDraft(),companyKey:'jp-morgan-chase-co'},status:'draft',revision:1});await db.doc(`procedureSubmissions/${post}/revisions/1`).set({companyKey:'jp-morgan-chase-co'});
  const scan=await call('createJob',{type:'quality',requestId:randomUUID(),reason:'Check imported company identities'});for(let step=0;step<30;step++){const result=await call('runJob',{id:scan.id});assert.ok(result.auditId);const event=await call('audit',{record:result.auditId});assert.equal(event.rows[0].actorUid,owner.uid);if(result.done)break;}
  assert.equal((await call('job',{id:scan.id})).state,'completed');assert.ok((await db.collection(`adminJobs/${scan.id}/issues`).get()).size>0);
  const preview=await call('repairPreview',{company:'jp-morgan-chase-co'});assert.equal(preview.target,'jpmc');assert.ok(preview.submissions>=1);
  const repair=await call('createJob',{type:'repair',company:'jp-morgan-chase-co',requestId:randomUUID(),reason:'Apply reviewed JPMorgan identity'});for(let step=0;step<20;step++){if((await call('runJob',{id:repair.id})).done)break;}
  assert.equal((await db.doc(`procedureSubmissions/${post}`).get()).data()!.draft.companyKey,'jpmc');assert.equal((await db.doc(`procedureSubmissions/${post}/revisions/1`).get()).data()!.companyKey,'jp-morgan-chase-co');assert.ok((await db.collection(`adminJobs/${repair.id}/backups`).get()).size>0);
  const recovery=await call('createJob',{type:'recover',repairId:repair.id,requestId:randomUUID(),reason:'Verify guarded reference recovery'});for(let step=0;step<20;step++){if((await call('runJob',{id:recovery.id})).done)break;}assert.equal((await db.doc(`procedureSubmissions/${post}`).get()).data()!.draft.companyKey,'jp-morgan-chase-co');
 });
 await t.test('imports stage privately, reject unsafe sources, publish once, preserve newer versions and roll back',async()=>{
  const raw=await readFile('data/placements-2025.json','utf8'),baseline=prepareUploadedPublication(raw,2025);await stagePublication(db,baseline);const active=(await db.doc('batches/2025').get()).data()?.activeVersion;await activatePublication(db,baseline,active);
  const dataset=JSON.parse(raw);dataset.metadata.adminTest=randomUUID();const text=JSON.stringify(dataset),chunks:string[]=[];for(let i=0;i<text.length;i+=12000)chunks.push(text.slice(i,i+12000));
  const job=await call('createJob',{type:'import',requestId:randomUUID(),reason:'Verify publication preview and recovery',year:2025,sourceName:'test.json',chunkCount:chunks.length});
  await assert.rejects(call('publish',{id:job.id,reason:'Attempt incomplete publication'}));
  for(let index=0;index<chunks.length;index++)await call('uploadChunk',{id:job.id,index,text:chunks[index]});
  await call('validateImport',{id:job.id});await assert.rejects(call('uploadChunk',{id:job.id,index:0,text:'different source'}));
  for(let step=0;step<100;step++){if((await call('runJob',{id:job.id})).done)break;}
  const ready=await call('job',{id:job.id});assert.equal(ready.state,'ready');assert.equal((await db.doc('batches/2025').get()).data()!.activeVersion,baseline.version);
  const published=await call('publish',{id:job.id,reason:'Approve validated test publication'});assert.ok(published.auditId);assert.deepEqual(await call('publish',{id:job.id,reason:'Safe duplicate publish response'}),published);
  await db.doc('batches/2025').update({activeVersion:baseline.version});await assert.rejects(call('rollback',{id:job.id,reason:'Do not overwrite another publication'}));await db.doc('batches/2025').update({activeVersion:ready.version});
  const rolled=await call('rollback',{id:job.id,reason:'Restore verified previous statistics'});assert.ok(rolled.auditId);assert.equal((await db.doc('batches/2025').get()).data()!.activeVersion,baseline.version);
  const bad=await call('createJob',{type:'import',requestId:randomUUID(),reason:'Check malformed JSON source rejection',year:2026,sourceName:'bad.json',chunkCount:1});await call('uploadChunk',{id:bad.id,index:0,text:'{"placements":[]}'});await assert.rejects(call('validateImport',{id:bad.id}));
 });
 await t.test('operational failures and measured analytics are labelled without private content',async()=>{const metrics=await call('analytics',{days:7});assert.equal(metrics.daily.length,7);assert.equal('users' in metrics,false);const ops=await call('operations');assert.ok(ops.errors.length);assert.ok(ops.telemetry.includes('not monitored'));assert.equal(JSON.stringify(ops).includes('refreshToken'),false);});

});
