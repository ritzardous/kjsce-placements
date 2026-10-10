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
test('questions and replies stay private until moderation; reports never automatically hide content',async()=>{
  const {owner,id}=await publishedFixture(),reader=actor(),other=actor();
  const asked=await call(reader,'ask',{postId:id,body:'How many coding questions were in this round?'});
  assert.equal((await call(other,'questions',{postId:id})).rows.length,0);
  let question=(await call(reader,'questions',{postId:id})).rows[0];assert.equal(question.status,'pending');
  await assert.rejects(call(reader,'moderateQuestion',{id:asked.id,target:'question',decision:'visible',reason:'Fine',updatedAt:question.updatedAt}));
  await call(admin,'moderateQuestion',{id:asked.id,target:'question',decision:'visible',reason:'Relevant question',updatedAt:question.updatedAt});
  await assert.rejects(call(admin,'moderateQuestion',{id:asked.id,target:'question',decision:'hidden',reason:'Stale decision',updatedAt:question.updatedAt}));
  await assert.rejects(call(other,'answer',{questionId:asked.id,body:'A forged answer'}));
  await call(owner,'answer',{questionId:asked.id,body:'There were two coding questions in my attempt.'});
  assert.equal((await call(reader,'questions',{postId:id})).rows[0].answer,null);
  question=(await call(owner,'questions',{postId:id})).rows[0];assert.equal(question.answer.status,'pending');
  await call(admin,'moderateQuestion',{id:asked.id,target:'answer',decision:'visible',reason:'Firsthand answer',updatedAt:question.updatedAt});
  assert.match((await call(reader,'questions',{postId:id})).rows[0].answer.body,/two coding/);
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
