import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { authorize, saveDraft, submit, review, vote, unpublish, type Actor } from '../../functions/src/service.js';
import { initialProcedureDraft } from '../../shared/procedures.js';

const app = initializeApp({ projectId: 'demo-placementstats' }, 'procedure-tests');
const db = getFirestore(app);
const google = { email_verified: true, firebase: { sign_in_provider: 'google.com' }, name: 'Private Contributor', email: 'private@example.test' };
const admin: Actor = { uid: 'procedures-admin', token: { ...google, role: 'admin' } };
const contributor = (): Actor => ({ uid: randomUUID(), token: google });
const body = 'I attended an aptitude test and then a technical interview covering arrays, SQL joins and my final year project. Practise the basics and explain your reasoning aloud.';
before(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Emulator-only procedures test.');
  await db.doc('procedureCompanies/procedure-test-company').set({ name: 'Procedure Test Company', years: [2026] });
});
after(async () => { await deleteApp(app); });
async function fixture() {
  const actor = contributor(), id = randomUUID(), draft = { ...initialProcedureDraft(), companyKey: 'procedure-test-company', body };
  await saveDraft(db, actor, { id, expectedVersion: 0, draft });
  await submit(db, actor, { id, expectedVersion: 1 });
  return { actor, id, draft };
}
test('only verified Google accounts can mutate; admin claims are required for moderation', async () => {
  for (const actor of [undefined, { uid: 'a', token: {} }, { uid: 'a', token: { ...google, email_verified: false } }, { uid: 'a', token: { ...google, firebase: { sign_in_provider: 'password' } } }]) assert.throws(() => authorize(actor));
  assert.throws(() => authorize(contributor(), true));
  assert.doesNotThrow(() => authorize(admin, true));
  await assert.rejects(review(db, contributor(), { id: 'a', revision: 1, decision: 'approved', feedback: '' }));
});
test('submission stays private; pending locks drafts; approval publishes only the exact revision without email', async () => {
  const { actor, id, draft } = await fixture();
  assert.equal((await db.doc(`procedurePosts/${id}`).get()).exists, false);
  await assert.rejects(saveDraft(db, actor, { id, expectedVersion: 1, draft }));
  await assert.rejects(saveDraft(db, contributor(), { id, expectedVersion: 1, draft }));
  await assert.rejects(review(db, admin, { id, revision: 2, decision: 'approved', feedback: '' }));
  assert.deepEqual(await submit(db, actor, { id, expectedVersion: 1 }), { revision: 1 });
  assert.equal((await db.collection('procedureEmailOutbox').where('submissionId', '==', id).get()).size, 0);
  assert.equal((await db.doc(`procedureNotifications/${actor.uid}/items/${id}-1-submitted`).get()).data()!.title, 'Submitted for review');
  assert.equal((await db.doc(`procedureModeration/${id}-1-submitted`).get()).data()!.action, 'submitted');
  await review(db, admin, { id, revision: 1, decision: 'approved', feedback: '' });
  const published = (await db.doc(`procedurePosts/${id}`).get()).data()!;
  assert.equal(published.authorName, 'Community contributor');
  assert.equal(published.body, body);
  assert.equal(published.email, undefined);
  assert.equal(published.feedback, undefined);
  assert.equal(published.submittedAt, undefined);
  assert.equal(published.published, true);
  await review(db, admin, { id, revision: 1, decision: 'approved', feedback: '' });
  await assert.rejects(review(db, admin, { id, revision: 1, decision: 'rejected', feedback: 'Duplicate' }));
});
test('optimistic draft saves reject stale tabs, and changes requested can be revised while approval remains intact', async () => {
  const { actor, id, draft } = await fixture();
  await review(db, admin, { id, revision: 1, decision: 'changes_requested', feedback: 'Please identify the rounds you attended.' });
  await db.doc(`procedureLimits/${actor.uid}-draft`).delete();
  await saveDraft(db, actor, { id, expectedVersion: 1, draft: { ...draft, body: body + ' I attended the first two rounds.' } });
  await assert.rejects(saveDraft(db, actor, { id, expectedVersion: 1, draft }));
  await db.doc(`procedureLimits/${actor.uid}-submit`).delete();
  await submit(db, actor, { id, expectedVersion: 2 });
  await review(db, admin, { id, revision: 2, decision: 'approved', feedback: '' });
  const first = (await db.doc(`procedurePosts/${id}`).get()).data()!;
  await db.doc(`procedureLimits/${actor.uid}-draft`).delete();
  await saveDraft(db, actor, { id, expectedVersion: 2, draft: { ...draft, body: body + ' Additional preparation advice.' } });
  assert.equal((await db.doc(`procedurePosts/${id}`).get()).data()!.body, first.body);
  await db.doc(`procedureLimits/${actor.uid}-submit`).delete();
  await submit(db, actor, { id, expectedVersion: 3 });
  await assert.rejects(review(db, admin, { id, revision: 2, decision: 'approved', feedback: '' }));
  await review(db, admin, { id, revision: 3, decision: 'approved', feedback: '' });
  assert.equal((await db.doc(`procedurePosts/${id}`).get()).data()!.body, body + ' Additional preparation advice.');
});
test('concurrent readers have exact totals; vote switching/removal, self-votes and unpublishing are enforced', async () => {
  const { actor, id } = await fixture();
  await review(db, admin, { id, revision: 1, decision: 'approved', feedback: '' });
  await assert.rejects(vote(db, actor, { id, value: 1 }));
  const readers = Array.from({ length: 6 }, contributor);
  await Promise.all(readers.map(reader => vote(db, reader, { id, value: 1 })));
  let data = (await db.doc(`procedurePosts/${id}`).get()).data()!;
  assert.deepEqual([data.score, data.upvotes, data.downvotes], [6, 6, 0]);
  await vote(db, readers[0], { id, value: 1 }); // Retry does not count twice.
  await db.doc(`procedureLimits/${readers[0].uid}-vote`).delete();
  await vote(db, readers[0], { id, value: -1 });
  await db.doc(`procedureLimits/${readers[0].uid}-vote`).delete();
  await vote(db, readers[0], { id, value: 0 });
  data = (await db.doc(`procedurePosts/${id}`).get()).data()!;
  assert.deepEqual([data.score, data.upvotes, data.downvotes], [5, 5, 0]);
  await unpublish(db, admin, { id, reason: 'Needs correction' });
  assert.equal((await db.doc(`procedurePosts/${id}`).get()).data()!.published, false);
  await assert.rejects(vote(db, contributor(), { id, value: 1 }));
});
test('submission validation and throttling reject empty content and rapid separate submissions', async () => {
  const actor = contributor(), id = randomUUID();
  await saveDraft(db, actor, { id, expectedVersion: 0, draft: initialProcedureDraft() });
  await assert.rejects(submit(db, actor, { id, expectedVersion: 1 }));
  const first = await fixture(), second = randomUUID();
  await db.doc(`procedureLimits/${first.actor.uid}-draft`).delete();
  await saveDraft(db, first.actor, { id: second, expectedVersion: 0, draft: first.draft });
  await assert.rejects(submit(db, first.actor, { id: second, expectedVersion: 1 }), (e: unknown) => (e as { code: string }).code === 'resource-exhausted');
});


test('custom attribution is validated and approval publishes the chosen name without leaking unused names', async()=>{
  for(const attribution of ['custom','name','anonymous'] as const){
    const actor=contributor(),id=randomUUID();
    const draft={...initialProcedureDraft(),companyKey:'procedure-test-company',body,attribution,customName:'  Campus Mentor  '};
    if(attribution==='custom'){
      await saveDraft(db,actor,{id,expectedVersion:0,draft:{...draft,customName:'   '}});
      await assert.rejects(submit(db,actor,{id,expectedVersion:1}),/public name/);
      await db.doc(`procedureLimits/${actor.uid}-draft`).delete();
      await saveDraft(db,actor,{id,expectedVersion:1,draft});
    }else await saveDraft(db,actor,{id,expectedVersion:0,draft});
    await submit(db,actor,{id,expectedVersion:attribution==='custom'?2:1});
    await review(db,admin,{id,revision:1,decision:'approved',feedback:''});
    const post=(await db.doc(`procedurePosts/${id}`).get()).data()!;
    assert.equal(post.authorName,attribution==='custom'?'Campus Mentor':attribution==='name'?'Private Contributor':'Community contributor');
    assert.equal(post.customName,attribution==='custom'?'Campus Mentor':'');
    assert.equal(post.email,undefined);
    assert.equal((await db.doc(`procedurePreferences/${actor.uid}`).get()).data()!.customName,'Campus Mentor');
  }
});
