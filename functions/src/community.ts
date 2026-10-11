import { type Firestore, type Query, type DocumentData } from 'firebase-admin/firestore';
import { z } from 'zod';
import { authorize, manageSubmission, HttpsError, type Actor } from './service.js';
import { postTitle } from '../../shared/procedures.js';

export const adminCommunityActions = new Set(['queue', 'reviewContext', 'moderationInbox', 'moderateQuestion', 'resolveReport', 'overview']);
const id = z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);
const cursorSchema = z.object({ id, values: z.array(z.number()).max(2) }).nullable().optional();
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpsError('invalid-argument', result.error.issues[0]?.message || 'Invalid request.');
  return result.data;
}
function required(condition: unknown, message: string): asserts condition { if (!condition) throw new HttpsError('failed-precondition', message); }
const pageInput = z.object({ cursor: cursorSchema }).passthrough();
const normalize = (text: unknown) => String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function matches(row: DocumentData, filters: DocumentData) {
  const draft = row.draft || row;
  const words = normalize(filters.search).trim().split(/\s+/).filter(Boolean);
  const text = normalize(`${row.companyName || draft.companyKey} ${draft.title || ''} ${draft.role || ''}`);
  return (!filters.company || draft.companyKey === filters.company)
    && (!filters.year || draft.appearanceYear === Number(filters.year))
    && (!filters.coverage || draft.coverage === filters.coverage)
    && (!filters.outcome || draft.outcome === filters.outcome)
    && (!filters.round || (draft.rounds || []).includes(filters.round))
    && words.every(word => text.includes(word));
}
async function page(q: Query, fields: string[], direction: 'asc' | 'desc', rawCursor: unknown, accept: (row: DocumentData) => boolean = () => true, size = 20) {
  const cursor = parse(cursorSchema, rawCursor);
  for (const field of fields) q = q.orderBy(field, direction);
  q = q.orderBy('__name__', direction);
  if (cursor) { required(cursor.values.length === fields.length, 'Invalid page cursor.'); q = q.startAfter(...cursor.values, cursor.id); }
  const rows: DocumentData[] = [];
  let next: { id: string; values: number[] } | null = cursor || null, more = false, scanned = 0;
  // A selective filter may need another page; never scan an unbounded archive.
  for (let batch = 0; batch < 4; batch++) {
    const snap = await q.limit(50).get();
    if (snap.empty) { more = false; break; }
    for (const doc of snap.docs) {
      const row = { ...doc.data(), id: doc.id };
      next = { id: doc.id, values: fields.map(field => Number(doc.data()[field])) };
      scanned++;
      if (accept(row)) rows.push(row);
      if (rows.length === size) return { rows, cursor: next, more: true, scanned };
    }
    more = snap.size === 50;
    if (!more) break;
    q = q.startAfter(...next!.values, next!.id);
  }
  return { rows, cursor: next, more, scanned };
}
async function published(db: Firestore, postId: string) {
  const snap = await db.doc(`procedurePosts/${postId}`).get();
  required(snap.exists && snap.data()!.published, 'This experience is unavailable or has been unpublished.');
  return snap.data()!;
}
function notify(db: Firestore, tx: FirebaseFirestore.Transaction, uid: string, title: string, message: string, submissionId: string) {
  tx.create(db.collection(`procedureNotifications/${uid}/items`).doc(), { title, message, submissionId, href: `#procedures/${submissionId}`, createdAt: Date.now(), read: false });
}
async function throttle(db: Firestore, tx: FirebaseFirestore.Transaction, uid: string, action: string) {
  const ref = db.doc(`procedureLimits/${uid}-${action}`), snap = await tx.get(ref), now = Date.now();
  if (snap.exists && now - snap.data()!.at < 3000) throw new HttpsError('resource-exhausted', 'Please wait a few seconds before trying again.');
  return () => tx.set(ref, { at: now });
}

export async function community(db: Firestore, actorValue: Actor | undefined, input: unknown) {
  const request = parse(z.object({ action: z.string().max(40), payload: z.record(z.string(), z.unknown()).default({}) }).strict(), input);
  const actor = authorize(actorValue, adminCommunityActions.has(request.action)), value = request.payload;
  switch (request.action) {
    case 'manageSubmission': return manageSubmission(db,actor,value);
    case 'browse': {
      const filters = parse(z.object({ company: z.string().max(120).default(''), year: z.string().max(4).default(''), coverage: z.string().max(20).default(''), outcome: z.string().max(30).default(''), search: z.string().max(120).default(''), round: z.string().max(40).default(''), sort: z.enum(['newest', 'helpful']).default('newest'), cursor: cursorSchema }).strict(), value);
      const fields = filters.sort === 'helpful' ? ['score', 'publishedAt'] : ['publishedAt'];
      return page(db.collection('procedurePosts').where('published', '==', true), fields, 'desc', filters.cursor, row => matches(row, filters), 12);
    }
    case 'bookmark': {
      const data = parse(z.object({ postId: id, saved: z.boolean() }).strict(), value);
      const ref = db.doc(`procedureBookmarks/${actor.uid}/items/${data.postId}`);
      if (!data.saved) { await ref.delete(); return { saved: false }; }
      const post = await published(db, data.postId);
      await ref.set({ postId: data.postId, title: postTitle(post), companyName: post.companyName, appearanceYear: post.appearanceYear, revision: post.revision, savedAt: Date.now() });
      return { saved: true };
    }
    case 'bookmarkState': {
      const data = parse(z.object({ postId: id }).strict(), value);
      return { saved: (await db.doc(`procedureBookmarks/${actor.uid}/items/${data.postId}`).get()).exists };
    }
    case 'saved': {
      const data = parse(pageInput, value);
      const result = await page(db.collection(`procedureBookmarks/${actor.uid}/items`), ['savedAt'], 'desc', data.cursor);
      result.rows = await Promise.all(result.rows.map(async row => {
        const post = await db.doc(`procedurePosts/${row.postId}`).get();
        return { ...row, available: post.exists && post.data()!.published === true, updated: post.exists && post.data()!.published === true && post.data()!.revision !== row.revision };
      }));
      return result;
    }
    case 'contributions': {
      const data = parse(pageInput, value);
      return page(db.collection('procedureSubmissions').where('ownerUid', '==', actor.uid), ['updatedAt'], 'desc', data.cursor, row => !row.deleted && (value.status === 'published' ? row.hasPublished === true : value.status === 'attention' ? ['changes_requested','rejected'].includes(row.status) : !value.status || row.status === value.status));
    }
    case 'impact': {
      const submissions = db.collection('procedureSubmissions').where('ownerUid', '==', actor.uid);
      const [total, drafts, pending, approved, votes, questions] = await Promise.all([
        submissions.count().get(), submissions.where('status', '==', 'draft').count().get(), submissions.where('status', '==', 'pending').count().get(), submissions.where('hasPublished', '==', true).count().get(),
        db.collection('procedurePosts').where('authorUid', '==', actor.uid).where('published', '==', true).aggregate({ helpful: (await import('firebase-admin/firestore')).AggregateField.sum('upvotes') }).get(),
        db.collection('procedureQuestions').where('postAuthorUid', '==', actor.uid).where('status', '==', 'visible').where('answered', '==', false).where('replyPending', '==', false).count().get(),
      ]);
      const deleted=await submissions.where('deleted','==',true).count().get();
      return { total: total.data().count-deleted.data().count, drafts: drafts.data().count, pending: pending.data().count, published: approved.data().count, helpful: votes.data().helpful || 0, unanswered: questions.data().count };
    }
    case 'preferences': return (await db.doc(`procedurePreferences/${actor.uid}`).get()).data() || {};
    case 'timeline': {
      const data = parse(z.object({ submissionId: id }).strict(), value);
      const submission = await db.doc(`procedureSubmissions/${data.submissionId}`).get();
      if (!submission.exists || (submission.data()!.ownerUid !== actor.uid && actor.token.role !== 'admin')) throw new HttpsError('permission-denied', 'This submission belongs to another contributor.');
      const events = await db.collection('procedureModeration').where('submissionId', '==', data.submissionId).orderBy('createdAt', 'desc').limit(50).get();
      return events.docs.map(doc => { const row = doc.data(); return { id: doc.id, action: row.action, revision: row.revision || 0, feedback: row.feedback || '', createdAt: row.createdAt }; });
    }
    case 'notifications': return page(db.collection(`procedureNotifications/${actor.uid}/items`), ['createdAt'], 'desc', parse(pageInput, value).cursor, row => !value.unread || row.read === false);
    case 'notificationSummary': {
      parse(z.object({}).strict(), value);
      return { unread: (await db.collection(`procedureNotifications/${actor.uid}/items`).where('read', '==', false).count().get()).data().count };
    }
    case 'readNotifications': {
      const data = parse(z.object({ ids: z.array(id).min(1).max(50) }).strict(), value);
      const batch = db.batch();
      for (const item of new Set(data.ids)) batch.update(db.doc(`procedureNotifications/${actor.uid}/items/${item}`), { read: true });
      await batch.commit(); return { read: true };
    }
    case 'readNotification': {
      const data = parse(z.object({ id }).strict(), value);
      await db.doc(`procedureNotifications/${actor.uid}/items/${data.id}`).update({ read: true }); return { read: true };
    }
    case 'questions': {
      const data = parse(z.object({ postId: id, cursor: cursorSchema }).strict(), value);
      await published(db, data.postId);
      const result = await page(db.collection('procedureQuestions').where('postId', '==', data.postId), ['createdAt'], 'desc', data.cursor, row => row.status === 'visible' || row.authorUid === actor.uid || actor.token.role === 'admin');
      result.rows = result.rows.map(row => ({ ...row, answer: row.answer?.status === 'visible' || row.answer?.authorUid === actor.uid || actor.token.role === 'admin' ? row.answer : null }));
      return result;
    }
    case 'ask': {
      const data = parse(z.object({ postId: id, body: z.string().trim().min(10).max(2000) }).strict(), value);
      const ref = db.collection('procedureQuestions').doc();
      await db.runTransaction(async tx => { const snapshot=await tx.get(db.doc(`procedurePosts/${data.postId}`));required(snapshot.exists&&snapshot.data()!.published,'Experience is unavailable.');const post=snapshot.data()!;const stamp = await throttle(db, tx, actor.uid, 'question'); tx.create(ref, { ...data, postAuthorUid: post.authorUid, authorUid: actor.uid, authorName: 'Community reader', companyName: post.companyName, status: 'pending', answered: false, replyPending: false, createdAt: Date.now(), updatedAt: Date.now() }); stamp(); });
      return { id: ref.id, status: 'pending' };
    }
    case 'answer': {
      const data = parse(z.object({ questionId: id, body: z.string().trim().min(5).max(3000) }).strict(), value);
      await db.runTransaction(async tx => {
        const ref = db.doc(`procedureQuestions/${data.questionId}`), question = await tx.get(ref);
        required(question.exists && question.data()!.status === 'visible', 'Question is unavailable.');
        const post = await tx.get(db.doc(`procedurePosts/${question.data()!.postId}`));
        required(post.exists && post.data()!.published, 'Experience is unavailable.');
        if (post.data()!.authorUid !== actor.uid) throw new HttpsError('permission-denied', 'Only this experience contributor can reply.');
        const stamp = await throttle(db, tx, actor.uid, 'answer');
        tx.update(ref, { answer: { body: data.body, authorUid: actor.uid, authorName: post.data()!.authorName, createdAt: Date.now(), status: 'pending' }, answered: false, replyPending: true, updatedAt: Math.max(Date.now(), question.data()!.updatedAt + 1) }); stamp();
      });
      return { status: 'pending' };
    }
    case 'report': {
      const data = parse(z.object({ postId: id, questionId: id.optional(), target: z.enum(['post', 'question', 'answer']), reason: z.enum(['outdated', 'incorrect', 'privacy', 'abuse', 'duplicate']), details: z.string().trim().max(1000) }).strict(), value);
      if (data.target !== 'post') {
        required(data.questionId, 'Select a question.');
        const question = await db.doc(`procedureQuestions/${data.questionId}`).get();
        required(question.exists && question.data()!.postId === data.postId && question.data()!.status === 'visible', 'Question is unavailable.');
        if (data.target === 'answer') required(question.data()!.answer?.status === 'visible', 'Reply is unavailable.');
      }
      const ref = db.doc(`procedureReports/${actor.uid}-${data.target}-${data.questionId || data.postId}`);
      await db.runTransaction(async tx => {
        const post=await tx.get(db.doc(`procedurePosts/${data.postId}`));
        required(post.exists&&post.data()!.published,'Experience is unavailable.');
        const previous = await tx.get(ref); if (previous.data()?.status === 'open') return;
        const stamp = await throttle(db, tx, actor.uid, 'report');
        tx.set(ref, { ...data, reporterUid: actor.uid, companyName: post.data()!.companyName, status: 'open', createdAt: Date.now(), updatedAt: Date.now() }); stamp();
      });
      return { received: true };
    }
    case 'queue': {
      const data = parse(z.object({ tab: z.enum(['pending', 'reviewed', 'published']), search: z.string().max(120).default(''), company: z.string().max(120).default(''), year: z.string().max(4).default(''), status: z.string().max(30).default(''), oldest: z.boolean().default(true), cursor: cursorSchema }).strict(), value);
      let q: Query = db.collection('procedureSubmissions');
      q = data.tab === 'pending' ? q.where('status', '==', 'pending') : data.tab === 'published' ? q.where('hasPublished', '==', true) : q.where('status', 'in', ['approved', 'changes_requested', 'rejected']);
      return page(q, ['updatedAt'], data.oldest ? 'asc' : 'desc', data.cursor, row => matches(row, data) && (!data.status || row.status === data.status));
    }
    case 'reviewContext': {
      const data = parse(z.object({ id, revision: z.number().int().nonnegative() }).strict(), value);
      const [submission, revision, current, duplicates] = await Promise.all([
        db.doc(`procedureSubmissions/${data.id}`).get(), db.doc(`procedureSubmissions/${data.id}/revisions/${data.revision}`).get(), db.doc(`procedurePosts/${data.id}`).get(), db.collection('procedurePosts').where('published', '==', true).orderBy('publishedAt', 'desc').limit(100).get(),
      ]);
      required(submission.exists && submission.data()!.revision === data.revision, 'A newer revision exists. Refresh the queue.');
      required(revision.exists, 'Submitted revision is missing.');
      const text = normalize(revision.data()!.body).replace(/\s+/g, ' ').trim();
      return { snapshot: revision.data(), current: current.exists ? current.data() : null, duplicates: duplicates.docs.filter(doc => doc.id !== data.id && normalize(doc.data().body).replace(/\s+/g, ' ').trim() === text).map(doc => ({ id: doc.id, title: postTitle(doc.data()) })) };
    }
    case 'moderationInbox': {
      const data = parse(z.object({ kind: z.enum(['reports', 'questions']), reason: z.string().max(30).default(''), cursor: cursorSchema }).strict(), value);
      const q = data.kind === 'reports' ? db.collection('procedureReports').where('status', '==', 'open') : db.collection('procedureQuestions');
      const result = await page(q, ['createdAt'], 'asc', data.cursor, row => data.kind === 'reports' ? !data.reason || row.reason === data.reason : row.status === 'pending' || row.answer?.status === 'pending');
      if (data.kind === 'reports') result.rows = await Promise.all(result.rows.map(async row => {
        const target = await db.doc(row.target === 'post' ? `procedurePosts/${row.postId}` : `procedureQuestions/${row.questionId}`).get();
        const content = row.target === 'answer' ? target.data()?.answer?.body : target.data()?.body;
        return { ...row, content: content || 'Reported content is no longer available.' };
      }));
      return result;
    }
    case 'moderateQuestion': {
      const data = parse(z.object({ id, target: z.enum(['question', 'answer']), decision: z.enum(['visible', 'hidden']), reason: z.string().trim().min(1).max(1000), updatedAt: z.number() }).strict(), value);
      await db.runTransaction(async tx => {
        const ref = db.doc(`procedureQuestions/${data.id}`), question = await tx.get(ref);
        required(question.exists && question.data()!.updatedAt === data.updatedAt, 'This discussion changed. Refresh before moderating.');
        const row = question.data()!;
        const post = await tx.get(db.doc(`procedurePosts/${row.postId}`));
        if (data.decision === 'visible') required(post.exists && post.data()!.published, 'Cannot publish discussion on an unavailable experience.');
        if (data.target === 'answer') {
          required(row.answer, 'Reply is missing.');
          if (data.decision === 'visible') required(row.status === 'visible', 'Approve the question before publishing its reply.');
        }
        tx.update(ref, data.target === 'question' ? { status: data.decision, updatedAt: Math.max(Date.now(), row.updatedAt + 1) } : { 'answer.status': data.decision, answered: data.decision === 'visible', replyPending: false, updatedAt: Math.max(Date.now(), row.updatedAt + 1) });
        tx.create(db.collection('procedureModeration').doc(), { submissionId: row.postId, questionId: data.id, action: `${data.target}_${data.decision}`, feedback: data.reason, adminUid: actor.uid, createdAt: Date.now() });
        notify(db, tx, data.target === 'question' ? row.authorUid : row.answer.authorUid, 'Discussion reviewed', data.reason, row.postId);
        if (data.target === 'question' && data.decision === 'visible') notify(db, tx, row.postAuthorUid, 'A reader has a question', row.body.slice(0, 200), row.postId);
        if (data.target === 'answer' && data.decision === 'visible') notify(db, tx, row.authorUid, 'Your question has a reply', row.answer.body.slice(0, 200), row.postId);
      }); return { moderated: true };
    }
    case 'resolveReport': {
      const data = parse(z.object({ id, action: z.enum(['dismiss', 'request_correction', 'hide']), reason: z.string().trim().min(1).max(1000), updatedAt: z.number() }).strict(), value);
      await db.runTransaction(async tx => {
        const ref = db.doc(`procedureReports/${data.id}`), report = await tx.get(ref);
        required(report.exists && report.data()!.status === 'open' && report.data()!.updatedAt === data.updatedAt, 'This report was already handled or changed. Refresh the inbox.');
        const row = report.data()!, postRef = db.doc(`procedurePosts/${row.postId}`), post = await tx.get(postRef);
        const questionRef = row.questionId ? db.doc(`procedureQuestions/${row.questionId}`) : null;
        const question = questionRef ? await tx.get(questionRef) : null;
        if (data.action === 'hide') {
          if (row.target === 'post') { required(post.exists, 'Experience no longer exists.'); tx.update(postRef, { published: false }); tx.update(db.doc(`procedureSubmissions/${row.postId}`), { hasPublished: false, feedback: data.reason, updatedAt: Date.now() }); }
          else { required(question?.exists, 'Question no longer exists.'); const updatedAt = Math.max(Date.now(), question!.data()!.updatedAt + 1); tx.update(questionRef!, row.target === 'answer' ? { 'answer.status': 'hidden', answered: false, replyPending: false, updatedAt } : { status: 'hidden', updatedAt }); }
        }
        tx.update(ref, { status: 'resolved', resolution: data.action, feedback: data.reason, adminUid: actor.uid, updatedAt: Math.max(Date.now(), row.updatedAt + 1) });
        tx.create(db.collection('procedureModeration').doc(), { submissionId: row.postId, reportId: data.id, action: `report_${data.action}`, feedback: data.reason, adminUid: actor.uid, createdAt: Date.now() });
        if (post.exists && data.action !== 'dismiss') notify(db, tx, post.data()!.authorUid, data.action === 'hide' ? 'Reported content hidden' : 'Correction requested', data.reason, row.postId);
        notify(db, tx, row.reporterUid, 'Report reviewed', data.reason, row.postId);
      }); return { resolved: true };
    }
    case 'overview': {
      const [pending, oldest, reports, questions, replies, events] = await Promise.all([
        db.collection('procedureSubmissions').where('status', '==', 'pending').count().get(), db.collection('procedureSubmissions').where('status', '==', 'pending').orderBy('updatedAt').limit(1).get(),
        db.collection('procedureReports').where('status', '==', 'open').count().get(), db.collection('procedureQuestions').where('status', '==', 'pending').count().get(),
        db.collection('procedureQuestions').where('answer.status', '==', 'pending').count().get(),
        db.collection('procedureModeration').orderBy('createdAt', 'desc').limit(50).get(),
      ]);
      const turnaround = events.docs.map(doc => doc.data().turnaroundMs).filter(n => typeof n === 'number');
      return { pending: pending.data().count, oldestAt: oldest.docs[0]?.data().updatedAt || null, reports: reports.data().count, questions: questions.data().count, replies: replies.data().count, reviewHours: turnaround.length ? turnaround.reduce((sum, n) => sum + n, 0) / turnaround.length / 3600000 : null, checkedAt: Date.now() };
    }
    default: throw new HttpsError('invalid-argument', 'Unknown community action.');
  }
}
