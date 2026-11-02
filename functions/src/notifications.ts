import { createHash } from 'node:crypto';
import type { Firestore, Transaction, DocumentData } from 'firebase-admin/firestore';
import { normalizeNotification, notificationCategory, notificationSettingsSchema, type AppNotification, type NotificationSettings } from '../../shared/notifications.js';

export type NotificationEvent = Pick<AppNotification, 'type' | 'title' | 'message' | 'submissionId'> & Partial<Pick<AppNotification, 'entityType' | 'entityId' | 'revision' | 'questionId' | 'reportId' | 'companyKey' | 'companyName' | 'experienceTitle'>>;
export function eventKey(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function writeNotification(db: Firestore, tx: Transaction, uid: string, eventId: string, event: NotificationEvent, createdAt = Date.now(), documentId = eventKey(eventId)) {
  tx.create(db.doc(`procedureNotifications/${uid}/items/${documentId}`), Object.fromEntries(Object.entries({
    schemaVersion: 1, eventId, ...event, category: notificationCategory(event.type), entityType: event.entityType || 'submission',
    entityId: event.entityId || event.submissionId, createdAt, read: false, readAt: null, archived: false,
  }).filter(([, value]) => value !== undefined)));
}
export async function settingsFor(db: Firestore, uid: string): Promise<NotificationSettings> {
  const raw = (await db.doc(`notificationSettings/${uid}`).get()).data();
  return notificationSettingsSchema.parse({ version: raw?.version ?? 0, discovery: raw?.discovery ?? false, following: raw?.following ?? [] });
}

/** Current task state is fetched once per distinct entity, bounded by a single API page. */
export async function enrichNotifications(db: Firestore, uid: string, rows: DocumentData[]) {
  const notifications = rows.map(normalizeNotification);
  const ids = [...new Set(notifications.filter(row => row.category === 'contributions').map(row => row.submissionId).filter(Boolean))];
  const docs = ids.length ? await db.getAll(...ids.map(id => db.doc(`procedureSubmissions/${id}`)), { fieldMask: ['ownerUid', 'deleted', 'status', 'feedback', 'revision', 'hasPublished'] }) : [];
  const states = new Map(docs.map(doc => [doc.id, doc.data()]));
  return notifications.map(row => {
    const state = states.get(row.submissionId);
    if (state?.ownerUid === uid && !state.deleted) {
      row.currentStatus = state.status;
      row.needsAction = ['changes_requested', 'rejected'].includes(state.status) || (['unpublished', 'content_hidden', 'correction_requested'].includes(row.type) && state.status !== 'pending' && state.feedback === row.message && (row.revision === undefined || state.revision <= row.revision));
    } else if (row.category === 'contributions' && row.submissionId) row.currentStatus = 'unavailable';
    return row;
  });
}

/** Pull discovery for at most 20 explicit follows, never fan out approval writes. */
export async function syncDiscovery(db: Firestore, uid: string) {
  const settingsRef = db.doc(`notificationSettings/${uid}`), now = Date.now();
  const settings = await db.runTransaction(async tx => {
    const raw = (await tx.get(settingsRef)).data();
    if (!raw?.discovery || now - (raw.lastDiscoveryAt || 0) < 300000) return null;
    const parsed = notificationSettingsSchema.parse({ discovery: raw.discovery, following: raw.following });
    tx.update(settingsRef, { lastDiscoveryAt: now });
    return parsed;
  });
  if (!settings) return;
  try {
    const candidates: { key: string; event: NotificationEvent; at: number }[] = [];
    for (const follow of settings.following.filter(item => !item.muted)) {
      if (follow.kind === 'batch') {
        if (!['2025', '2026'].includes(follow.key)) continue;
        const manifest = (await db.doc(`batches/${follow.key}`).get()).data();
        if (!manifest || !/^[a-f0-9]{64}$/.test(manifest.activeVersion)) continue;
        const version = (await db.doc(`batches/${follow.key}/versions/${manifest.activeVersion}`).get()).data();
        if (!version || version.schemaVersion !== 1 || !Number.isInteger(version.chunkCount) || version.chunkCount < 1 || version.chunkCount > 128 || !/^[a-f0-9]{64}$/.test(version.payloadHash)) continue;
        // A baseline is recorded at follow time; only later active versions create activity.
        const baseline = (await db.doc(`notificationSettings/${uid}/baselines/${eventKey(`batch:${follow.key}:${follow.since}`)}`).get()).data();
        if (baseline?.version === manifest.activeVersion) continue;
        candidates.push({ key: `batch:${follow.key}:${follow.since}:${manifest.activeVersion}`, at: Number(manifest.publishedAt) || now, event: { type: 'batch_update', title: `Class of ${follow.key} statistics updated`, message: 'A validated dataset version is now active. Open the batch to see the published figures.', submissionId: '', entityType: 'batch', entityId: follow.key } });
      } else {
        const docs = follow.kind === 'experience' ? [await db.doc(`procedurePosts/${follow.key}`).get()] : (await db.collection('procedurePosts').where('published', '==', true).where('companyKey', '==', follow.key).orderBy('publishedAt', 'desc').limit(5).get()).docs;
        const fresh = docs.filter(doc => doc.exists && doc.data()!.published && doc.data()!.publishedAt > follow.since);
        if (!fresh.length) continue;
        const latest = fresh[0], post = latest.data()!;
        candidates.push({ key: `${follow.kind}:${follow.key}:${follow.since}:${latest.id}:${post.revision}`, at: post.publishedAt, event: { type: follow.kind === 'company' ? 'company_update' : 'experience_update', title: `${follow.label}: approved update`, message: follow.kind === 'company' ? 'New or revised approved experiences are available for this company.' : 'A new approved revision of this experience is available.', submissionId: latest.id, entityId: latest.id, entityType: 'post', companyKey: post.companyKey, companyName: post.companyName, experienceTitle: post.title || '', revision: post.revision } });
      }
    }
    if (candidates.length) await db.runTransaction(async tx => {
      const current = (await tx.get(settingsRef)).data();
      if (!current?.discovery) return;
      // A concurrent unfollow/mute must win over a running pull.
      if (JSON.stringify(current.following) !== JSON.stringify(settings.following)) return;
      const refs = candidates.map(item => db.doc(`procedureNotifications/${uid}/items/${eventKey(item.key)}`));
      const existing = await tx.getAll(...refs);
      candidates.forEach((item, index) => { if (!existing[index].exists) writeNotification(db, tx, uid, item.key, item.event, item.at); });
    });
  } catch (cause) {
    await db.runTransaction(async tx => { const current = (await tx.get(settingsRef)).data(); if (current?.lastDiscoveryAt === now) tx.update(settingsRef, { lastDiscoveryAt: 0 }); });
    throw cause;
  }
}
