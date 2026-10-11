import { invalidateCompanyDiscovery } from './company-discovery.js';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
export { HttpsError };
import { z } from 'zod';
import { procedureDraftSchema, submissionSchema } from '../../shared/procedures.js';

export type Actor = { uid: string; token: Record<string, unknown> };
export function authorize(actor: Actor | undefined, admin = false): Actor {
  const firebase = actor?.token.firebase as { sign_in_provider?: string } | undefined;
  if (!actor || firebase?.sign_in_provider !== 'google.com' || actor.token.email_verified !== true) throw new HttpsError('unauthenticated', 'Sign in with a verified Google account.');
  if (admin && actor.token.role !== 'admin') throw new HttpsError('permission-denied', 'Admin access is required.');
  return actor;
}
const idSchema = z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);
const versionSchema = z.number().int().nonnegative();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new HttpsError('invalid-argument', result.error.issues[0]?.message ?? 'Invalid request.'); return result.data; }
function requireCondition(value: unknown, message: string): asserts value { if (!value) throw new HttpsError('failed-precondition', message); }
async function limit(db: Firestore, tx: Transaction, actor: Actor, action: string, minimum: number) {
  const ref = db.doc(`procedureLimits/${actor.uid}-${action}`), snap = await tx.get(ref), now = Date.now();
  if (snap.exists && now - snap.data()!.at < minimum) throw new HttpsError('resource-exhausted', 'Please wait a moment before trying again.');
  return () => tx.set(ref, { at: now });
}

export async function saveDraft(db: Firestore, actorValue: Actor | undefined, value: unknown) {
  const actor = authorize(actorValue), input = parse(z.object({ id: idSchema, expectedVersion: versionSchema, draft: procedureDraftSchema }).strict(), value);
  return db.runTransaction(async tx => {
    const ref = db.doc(`procedureSubmissions/${input.id}`), snap = await tx.get(ref), old = snap.data();
    if (old && old.ownerUid !== actor.uid) throw new HttpsError('permission-denied', 'This draft belongs to another contributor.');
    requireCondition(!old?.deleted, 'This experience was deleted. Start a new experience instead.');
    requireCondition((old?.draftVersion ?? 0) === input.expectedVersion, 'This draft changed in another tab. Reload before editing.');
    requireCondition(old?.status !== 'pending', 'This revision is awaiting review.');
    const stampLimit = await limit(db, tx, actor, 'draft', 300);
    const version = input.expectedVersion + 1;
    tx.set(ref, { ownerUid: actor.uid, draft: input.draft, draftVersion: version, revision: old?.revision ?? 0, status: 'draft', feedback: old?.feedback ?? '', updatedAt: Date.now(), hasPublished: old?.hasPublished ?? false }, { merge: true });
    tx.set(db.doc(`procedurePreferences/${actor.uid}`), { graduationYear: input.draft.graduationYear, role: input.draft.role, attribution: input.draft.attribution, customName: input.draft.customName });
    stampLimit();
    return { version };
  });
}

export async function submit(db: Firestore, actorValue: Actor | undefined, value: unknown) {
  const actor = authorize(actorValue), input = parse(z.object({ id: idSchema, expectedVersion: versionSchema }).strict(), value);
  return db.runTransaction(async tx => {
    const ref = db.doc(`procedureSubmissions/${input.id}`), snap = await tx.get(ref), old = snap.data();
    if (!old || old.ownerUid !== actor.uid) throw new HttpsError('permission-denied', 'Draft not available.');
    requireCondition(!old.deleted, 'This experience was deleted. Start a new experience instead.');
    requireCondition(old.draftVersion === input.expectedVersion, 'Draft changed. Reload and try again.');
    if (old.status === 'pending') return { revision: old.revision }; // Safe retry after a lost response.
    const draft = parse(submissionSchema, old.draft), company = await tx.get(db.doc(`procedureCompanies/${draft.companyKey}`));
    requireCondition(company.exists, 'Choose a company from the campus recruiter directory.');
    const stampLimit = await limit(db, tx, actor, 'submit', 30_000);
    const revision = old.revision + 1, eventId = `${input.id}-${revision}-submitted`, now = Date.now();
    const authorName = draft.attribution === 'custom' ? draft.customName : draft.attribution === 'name' ? String(actor.token.name ?? 'Contributor').slice(0, 100) : 'Community contributor';
    // An unused custom name stays private when another attribution option is chosen.
    tx.create(ref.collection('revisions').doc(String(revision)), { ...draft, customName: draft.attribution === 'custom' ? draft.customName : '', authorUid: actor.uid, authorName, companyName: company.data()!.name, revision, submittedAt: now });
    tx.update(ref, { status: 'pending', revision, companyName: company.data()!.name, feedback: '', updatedAt: now });
    tx.create(db.doc(`procedureModeration/${eventId}`), { submissionId: input.id, ownerUid: actor.uid, actorUid: actor.uid, revision, action: 'submitted', companyName: company.data()!.name, createdAt: now });
    tx.set(db.doc(`procedureNotifications/${actor.uid}/items/${eventId}`), { submissionId: input.id, title: 'Submitted for review', message: `${company.data()!.name}: revision ${revision} is awaiting approval.`, createdAt: now, read: false });
    stampLimit();
    return { revision };
  });
}

export async function review(db: Firestore, actorValue: Actor | undefined, value: unknown) {
  const actor = authorize(actorValue, true), input = parse(z.object({ id: idSchema, revision: versionSchema, decision: z.enum(['approved', 'changes_requested', 'rejected']), feedback: z.string().trim().max(2000) }).strict(), value);
  requireCondition(input.decision === 'approved' || input.feedback.length > 0, 'Explain what needs changing or why the post was rejected.');
  const result=await db.runTransaction(async tx => {
    const ref = db.doc(`procedureSubmissions/${input.id}`), snap = await tx.get(ref), old = snap.data();
    requireCondition(old && old.revision === input.revision, 'A newer revision exists. Refresh the review queue.');
    if (old.status === input.decision) return { status: old.status };
    requireCondition(old.status === 'pending', 'This revision has already been reviewed.');
    const revision = await tx.get(ref.collection('revisions').doc(String(input.revision)));
    requireCondition(revision.exists, 'Submitted revision is missing.');
    const postRef = db.doc(`procedurePosts/${input.id}`), post = await tx.get(postRef), now = Date.now();
    if (input.decision === 'approved') {
      const { submittedAt: _submitted, ...snapshot } = revision.data()!;
      tx.set(postRef, { ...snapshot, published: true, publishedAt: now, score: post.data()?.score ?? 0, upvotes: post.data()?.upvotes ?? 0, downvotes: post.data()?.downvotes ?? 0 });
    }
    tx.update(ref, { status: input.decision, feedback: input.feedback, updatedAt: now, hasPublished: input.decision === 'approved' || old.hasPublished === true });
    tx.create(db.doc(`procedureModeration/${input.id}-${input.revision}-reviewed`), { submissionId: input.id, ownerUid: old.ownerUid, actorUid: actor.uid, revision: input.revision, action: input.decision, feedback: input.feedback, adminUid: actor.uid, turnaroundMs: now - revision.data()!.submittedAt, createdAt: now });
    tx.set(db.doc(`procedureNotifications/${old.ownerUid}/items/${input.id}-${input.revision}-reviewed`), { submissionId: input.id, title: input.decision === 'approved' ? 'Experience approved' : input.decision === 'changes_requested' ? 'Changes requested' : 'Submission rejected', message: input.feedback || 'Your experience is now available to readers.', createdAt: now, read: false });
    return { status: input.decision };
  });
  invalidateCompanyDiscovery(db);
  return result;
}

export async function unpublish(db: Firestore, actorValue: Actor | undefined, value: unknown) {
  const actor = authorize(actorValue, true), input = parse(z.object({ id: idSchema, reason: z.string().trim().min(1).max(2000) }).strict(), value);
  const result=await db.runTransaction(async tx => {
    const ref = db.doc(`procedurePosts/${input.id}`), post = await tx.get(ref);
    requireCondition(post.exists, 'Post not found.');
    if (!post.data()!.published) return { unpublished: true };
    tx.update(ref, { published: false });
    tx.update(db.doc(`procedureSubmissions/${input.id}`), { hasPublished: false, feedback: input.reason, updatedAt: Date.now() });
    tx.create(db.collection('procedureModeration').doc(), { submissionId: input.id, revision: post.data()!.revision, action: 'unpublished', feedback: input.reason, adminUid: actor.uid, createdAt: Date.now() });
    tx.set(db.collection(`procedureNotifications/${post.data()!.authorUid}/items`).doc(), { submissionId: input.id, title: 'Experience unpublished', message: input.reason, createdAt: Date.now(), read: false });
    return { unpublished: true };
  });
  invalidateCompanyDiscovery(db);
  return result;
}

export async function vote(db: Firestore, actorValue: Actor | undefined, value: unknown) {
  const actor = authorize(actorValue), input = parse(z.object({ id: idSchema, value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) }).strict(), value);
  const result=await db.runTransaction(async tx => {
    const postRef = db.doc(`procedurePosts/${input.id}`), voteRef = postRef.collection('votes').doc(actor.uid);
    const post = await tx.get(postRef), previous = await tx.get(voteRef);
    requireCondition(post.exists && post.data()!.published, 'This post is not available.');
    requireCondition(post.data()!.authorUid !== actor.uid, 'You cannot vote on your own experience.');
    const before = previous.data()?.value ?? 0, after = input.value;
    if (before === after) return { value: after };
    const stampLimit = await limit(db, tx, actor, 'vote', 500);
    tx.update(postRef, { score: post.data()!.score + after - before, upvotes: post.data()!.upvotes + Number(after === 1) - Number(before === 1), downvotes: post.data()!.downvotes + Number(after === -1) - Number(before === -1) });
    if (after === 0) tx.delete(voteRef); else tx.set(voteRef, { value: after });
    stampLimit();
    return { value: after };
  });
  invalidateCompanyDiscovery(db);
  return result;
}

export async function manageSubmission(db: Firestore, actorValue: Actor | undefined, value: unknown) {
  const actor=authorize(actorValue),input=parse(z.object({id:idSchema,expectedVersion:versionSchema,action:z.enum(['withdraw','hide','delete'])}).strict(),value);
  const ref=db.doc(`procedureSubmissions/${input.id}`),postRef=db.doc(`procedurePosts/${input.id}`);
  const result=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),old=snap.data();
    if(!old||old.ownerUid!==actor.uid)throw new HttpsError('permission-denied','You can only manage your own experiences.');
    if(old.deleted){requireCondition(input.action==='delete','This experience has already been deleted.');return {deleted:true};}
    requireCondition(old.draftVersion===input.expectedVersion,'Your experience changed. Refresh contributions before trying again.');
    const post=await tx.get(postRef),now=Date.now();
    if(input.action==='delete'){
      // Retain an empty ownership/version marker so autosave in an old tab cannot recreate deleted writing.
      tx.set(ref,{ownerUid:actor.uid,draftVersion:old.draftVersion+1,revision:old.revision,deleted:true,updatedAt:now});
      tx.delete(postRef);
      return {deleted:true};
    }
    if(input.action==='withdraw'){
      requireCondition(old.status==='pending','Only a pending submission can be withdrawn. Refresh contributions.');
      tx.update(ref,{status:'draft',draftVersion:old.draftVersion+1,updatedAt:now});
    }else{
      requireCondition(post.exists&&post.data()!.published,'This experience is already offline. Refresh contributions.');
      tx.update(postRef,{published:false});
      tx.update(ref,{hasPublished:false,...(old.status==='pending'?{status:'draft'}:{}),draftVersion:old.draftVersion+1,updatedAt:now});
    }
    tx.create(db.collection('procedureModeration').doc(),{submissionId:input.id,ownerUid:actor.uid,actorUid:actor.uid,revision:old.revision,action:input.action==='withdraw'?'withdrawn':'unpublished_by_author',createdAt:now});
    return {deleted:false};
  });
  invalidateCompanyDiscovery(db);
  if(input.action==='delete'){
    // Cleanup is retryable after a lost response; the transaction already removed public access.
    await db.recursiveDelete(ref.collection('revisions'));
    await db.recursiveDelete(postRef);
    for(const collection of ['procedureQuestions','procedureReports']){
      for(;;){const rows=await db.collection(collection).where('postId','==',input.id).limit(400).get();if(rows.empty)break;const batch=db.batch();rows.docs.forEach(row=>batch.delete(row.ref));await batch.commit();}
    }
  }
  return result;
}
