import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { community } from '../../functions/src/community.js';
import { saveDraft, submit, review, type Actor } from '../../functions/src/service.js';
import { initialProcedureDraft } from '../../shared/procedures.js';

const app=initializeApp({projectId:'demo-placementstats'},'enhancement-tests'),db=getFirestore(app);
const token={email_verified:true,firebase:{sign_in_provider:'google.com'},name:'Test Contributor'};
const actor=():Actor=>({uid:randomUUID(),token});
const admin:Actor={uid:randomUUID(),token:{...token,role:'admin'}};
const companyKey=`enhancement-${randomUUID()}`;
const call=(who:Actor,action:string,payload:unknown={})=>community(db,who,{action,payload}) as Promise<any>;
before(async()=>{assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');await db.doc(`procedureCompanies/${companyKey}`).set({name:'Enhancement Company',years:[2026]});});
after(()=>deleteApp(app));
async function publishedFixture(){
  const owner=actor(),id=randomUUID(),draft={...initialProcedureDraft(),companyKey,title:'Coding interview for software engineer',summary:'Arrays, SQL joins and project reasoning.',rounds:['Coding','Technical interview'] as any,role:'Software Engineer',body:'## Coding\nI solved an array problem and explained its complexity.\n## Technical\nThe interviewer asked SQL joins and discussed project design decisions.'};
  await saveDraft(db,owner,{id,expectedVersion:0,draft});await submit(db,owner,{id,expectedVersion:1});await review(db,admin,{id,revision:1,decision:'approved',feedback:''});return {owner,id,draft};
}
test('structured discovery, remembered preferences, private bookmarks and notifications work with old posts',async()=>{
  const {owner,id,draft}=await publishedFixture(),reader=actor(),other=actor();
  const found=await call(reader,'browse',{company:companyKey,search:'software coding',round:'Coding',sort:'helpful'});
  assert(found.rows.some((row:any)=>row.id===id));
  assert.equal((await call(reader,'browse',{company:companyKey,search:'nonexistent'})).rows.length,0);
  assert.equal((await call(owner,'preferences')).role,'Software Engineer');
  assert.equal((await call(owner,'impact')).published,1);
  await call(reader,'bookmark',{postId:id,saved:true});assert.equal((await call(other,'saved')).rows.length,0);
  assert.equal((await call(reader,'saved')).rows[0].updated,false);
  await db.doc(`procedurePosts/${id}`).update({revision:2});assert.equal((await call(reader,'saved')).rows[0].updated,true);
  const notifications=await call(owner,'notifications');assert(notifications.rows.some((row:any)=>row.title==='Experience approved'));
  await call(owner,'readNotification',{id:notifications.rows[0].id});assert.equal((await call(owner,'notifications')).rows[0].read,true);
  assert.equal((await call(other,'notifications')).rows.length,0);
  await assert.rejects(call(other,'timeline',{submissionId:id}));
  assert((await call(owner,'timeline',{submissionId:id})).some((row:any)=>row.action==='approved'));
  const legacy=randomUUID();await db.doc(`procedurePosts/${legacy}`).set({...draft,title:'',rounds:[],summary:'',published:true,authorUid:owner.uid,authorName:'Community contributor',companyName:'Enhancement Company',appearanceYear:2026,publishedAt:Date.now(),score:0,upvotes:0,downvotes:0,revision:1});
  assert((await call(reader,'browse',{company:companyKey})).rows.some((row:any)=>row.id===legacy));
  await db.doc(`procedurePosts/${id}`).update({published:false});
  assert.equal((await call(reader,'saved')).rows[0].available,false);await assert.rejects(call(other,'bookmark',{postId:id,saved:true}));
  await call(reader,'bookmark',{postId:id,saved:false});assert.equal((await call(reader,'saved')).rows.length,0);
});
test('removed questions reject old clients; reports require an explicit admin decision',async()=>{
  const {owner,id}=await publishedFixture(),reader=actor(),other=actor();
  await assert.rejects(call(reader,'ask',{postId:id,body:'How many coding questions were in this round?'}),{code:'failed-precondition'});
  await assert.rejects(call(owner,'answer',{questionId:randomUUID(),body:'A previously supported reply.'}),{code:'failed-precondition'});
  assert.equal((await db.collection('procedureQuestions').where('postId','==',id).get()).size,0);
  await call(reader,'report',{postId:id,target:'post',reason:'outdated',details:'Drive format changed.'});
  assert.equal((await db.doc(`procedurePosts/${id}`).get()).data()!.published,true);
  await assert.rejects(call(reader,'moderationInbox',{kind:'reports'}));
  const report=(await call(admin,'moderationInbox',{kind:'reports'})).rows.find((row:any)=>row.postId===id);
  await call(admin,'resolveReport',{id:report.id,action:'hide',reason:'Needs an updated account.',updatedAt:report.updatedAt});
  assert.equal((await db.doc(`procedurePosts/${id}`).get()).data()!.published,false);
  await assert.rejects(call(reader,'questions',{postId:id}));
  await assert.rejects(call(admin,'resolveReport',{id:report.id,action:'dismiss',reason:'Already handled.',updatedAt:report.updatedAt}));
  assert((await call(reader,'notifications')).rows.some((row:any)=>row.title==='Report reviewed'));
});
test('admin queue and contributor history paginate beyond 100 entries without duplicate rows',async()=>{
  const owner=actor(),batch=db.batch(),base=Date.now()-10*86400000;
  for(let i=0;i<121;i++)batch.set(db.doc(`procedureSubmissions/${randomUUID()}`),{ownerUid:owner.uid,draft:{...initialProcedureDraft(),companyKey,title:`Queue ${i}`},companyName:'Enhancement Company',draftVersion:1,revision:1,status:'pending',feedback:'',updatedAt:base+i,hasPublished:false});
  await batch.commit();
  for(const action of ['queue','contributions']){
    let cursor=null,more=true;const ids=new Set<string>();let attempts=0;
    while(more&&attempts++<30){const result=await call(action==='queue'?admin:owner,action,{...(action==='queue'?{tab:'pending',company:companyKey,oldest:true}:{}),cursor});for(const row of result.rows){assert(!ids.has(row.id));ids.add(row.id);}cursor=result.cursor;more=result.more;}
    assert.equal(ids.size,121);
  }
  await assert.rejects(call(owner,'overview'));
  const overview=await call(admin,'overview');assert(overview.pending>=121);assert(overview.oldestAt<=base);
});

test('admin overview is in-app only and the removed email retry action is unavailable', async () => {
  const overview = await call(admin, 'overview');
  assert.equal(typeof overview.pending, 'number');
  assert.equal(typeof overview.reports, 'number');
  assert.equal('emailConfigured' in overview, false);
  assert.equal('emailFailures' in overview, false);
  await assert.rejects(call(admin, 'retryEmails'), (error: any) => error.code === 'invalid-argument');
});

test('notification counts and bounded batch read operations stay private to the recipient',async()=>{
  const owner=actor(),other=actor(),ids=[randomUUID(),randomUUID()];
  for(const item of ids)await db.doc(`procedureNotifications/${owner.uid}/items/${item}`).set({title:'Review update',read:false,createdAt:Date.now()});
  assert.equal((await call(owner,'notificationSummary')).unread,2);
  assert.equal((await call(other,'notificationSummary')).unread,0);
  await assert.rejects(call(other,'readNotifications',{ids}));
  assert.equal((await call(owner,'notificationSummary')).unread,2);
  await assert.rejects(call(owner,'readNotifications',{ids:Array(51).fill(ids[0])}));
  await call(owner,'readNotifications',{ids});
  assert.equal((await call(owner,'notificationSummary')).unread,0);
  assert.equal((await call(owner,'notifications',{unread:true})).rows.length,0);
  assert.equal((await call(owner,'notifications')).rows.length,2);
});
