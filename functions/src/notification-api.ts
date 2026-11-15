import type { Firestore, Query, DocumentData } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { enrichNotifications, eventKey, settingsFor, syncDiscovery } from './notifications.js';
import { notificationSettingsSchema } from '../../shared/notifications.js';

const id = z.string().regex(/^[a-zA-Z0-9-]{1,200}$/);
const cursor = z.object({ id, values: z.tuple([z.number().nonnegative()]) }).nullable().optional();
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpsError('invalid-argument', result.error.issues[0]?.message || 'Invalid notification request.');
  return result.data;
}
export const notificationActions = new Set(['notifications', 'notificationSummary', 'readNotification', 'readNotifications', 'updateNotifications', 'readAllNotifications', 'notificationSettings', 'saveNotificationSettings', 'notificationOutcome', 'cleanupNotifications']);
export async function notificationApi(db: Firestore, uid: string, action: string, input: unknown) {
  const items = db.collection(`procedureNotifications/${uid}/items`);
  switch (action) {
    case 'notifications': {
      const data = parse(z.object({ cursor, unread: z.boolean().default(false), view: z.enum(['all', 'unread', 'attention', 'contributions', 'discussions', 'reports', 'following', 'statistics', 'archived']).default('all') }).strict(), input);
      let query: Query = items;
      if (data.unread || data.view === 'unread') query = query.where('read', '==', false);
      if (data.view === 'archived') query = query.where('archived', '==', true);
      query = query.orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
      if (data.cursor) query = query.startAfter(data.cursor.values[0], data.cursor.id);
      const rows = []; let next = data.cursor || null, scanned = 0, fetched = 0, more = false;
      // Legacy records have no category/archive fields: retain bounded compatibility filtering.
      try {
        for (let batch = 0; batch < 4; batch++) {
          const snap = await query.limit(20).get();
          fetched += snap.size;
          const enriched = await enrichNotifications(db, uid, snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
          for (const row of enriched) {
            scanned++; next = { id: row.id, values: [row.createdAt] as [number] };
            const include = data.view === 'archived' ? row.archived : !row.archived && (data.view === 'attention' ? row.needsAction : ['all', 'unread'].includes(data.view) || row.category === data.view);
            if (include) rows.push(row);
            if (rows.length === 20) return { rows, cursor: next, more: true, scanned, fetched, checkedAt: Date.now() };
          }
          more = snap.size === 20;
          if (!more) break;
          query = query.startAfter(next!.values[0], next!.id);
        }
        return { rows, cursor: next, more, scanned, fetched, checkedAt: Date.now() };
      } catch {
        // Fail-safe fallback if index or startAfter query fails: fetch recent items and filter in memory
        const fallbackSnap = await items.orderBy('createdAt', 'desc').limit(80).get().catch(() => items.limit(80).get());
        const enriched = await enrichNotifications(db, uid, fallbackSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        const fallbackRows = enriched.filter(row => {
          if (data.unread || data.view === 'unread') return !row.read && !row.archived;
          if (data.view === 'archived') return row.archived;
          if (data.view === 'attention') return !row.archived && row.needsAction;
          return !row.archived && (['all', 'unread'].includes(data.view) || row.category === data.view);
        }).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
        return { rows: fallbackRows, cursor: null, more: false, scanned: fallbackRows.length, fetched: fallbackSnap.size, checkedAt: Date.now() };
      }
    }
    case 'notificationSummary': {
      parse(z.object({}).strict(), input);
      // Optional discovery cannot prevent direct decisions from being read.
      let discoveryError = false;
      try { await syncDiscovery(db, uid); } catch { discoveryError = true; }
      let unreadCount = 0;
      try {
        unreadCount = (await items.where('read', '==', false).count().get()).data().count;
      } catch {
        const snap = await items.limit(500).get().catch(() => null);
        unreadCount = snap ? snap.docs.filter(d => d.data().read === false).length : 0;
      }
      return { unread: unreadCount, checkedAt: Date.now(), discoveryError };
    }
    case 'readNotification':
    case 'readNotifications':
    case 'updateNotifications': {
      const data = action === 'readNotification' ? { ids: [parse(z.object({ id }).strict(), input).id], read: true } : action === 'readNotifications' ? { ...parse(z.object({ ids: z.array(id).min(1).max(50) }).strict(), input), read: true } : parse(z.object({ ids: z.array(id).min(1).max(50), read: z.boolean().optional(), archived: z.boolean().optional() }).strict().refine(value => value.read !== undefined || value.archived !== undefined, 'Choose a change.'), input);
      await db.runTransaction(async tx => {
        const refs = [...new Set(data.ids)].map(key => items.doc(key));
        const docs = await tx.getAll(...refs);
        if (docs.some(doc => !doc.exists)) throw new HttpsError('not-found', 'An update is no longer available in your inbox. Refresh and retry.');
        docs.forEach(doc => {
          const archived = 'archived' in data ? data.archived : undefined;
          if (data.read === false && doc.data()!.archived && archived !== false) throw new HttpsError('failed-precondition', 'Restore this archived update before marking it unread.');
          const read = archived === true ? true : data.read;
          tx.update(doc.ref, { ...(archived !== undefined ? { archived } : {}), ...(read !== undefined ? { read, readAt: read ? Date.now() : null } : {}) });
        });
      });
      return { read: data.read ?? true };
    }
    case 'readAllNotifications': {
      const data = parse(z.object({ cutoff: z.number().nonnegative().optional(), cursor }).strict(), input);
      const cutoff = data.cutoff ?? Date.now();
      let unreadDocs: DocumentData[] = [];
      try {
        const snap = await items.where('read', '==', false).limit(500).get();
        unreadDocs = snap.docs;
      } catch {
        const snap = await items.limit(500).get().catch(() => null);
        unreadDocs = snap ? snap.docs.filter(d => d.data().read === false) : [];
      }
      const eligible = unreadDocs.filter(d => {
        const val = d.data();
        return val.read === false && (val.createdAt ?? 0) <= cutoff;
      });
      if (eligible.length) {
        const batch = db.batch();
        const now = Date.now();
        eligible.forEach(doc => {
          batch.update(doc.ref, { read: true, readAt: now });
        });
        await batch.commit();
      }
      return { count: eligible.length, more: false, cursor: null, cutoff };
    }
    case 'notificationSettings': return settingsFor(db, uid);
    case 'saveNotificationSettings': {
      const data = parse(notificationSettingsSchema, input), now = Date.now(), ref = db.doc(`notificationSettings/${uid}`);
      const keys = data.following.map(item => `${item.kind}:${item.key}`);
      if (new Set(keys).size !== keys.length) throw new HttpsError('invalid-argument', 'A follow can only be listed once.');
      for (const follow of data.following) {
        if (follow.kind === 'batch' && !['2025', '2026'].includes(follow.key)) throw new HttpsError('invalid-argument', 'Choose an available batch.');
      }
      await db.runTransaction(async tx => {
        const previous = (await tx.get(ref)).data();
        if ((previous?.version || 0) !== data.version) throw new HttpsError('aborted', 'Your notification preferences changed in another tab. Retry preferences to load the latest settings before saving.');
        const following = data.following.map(item => ({ ...item, since: previous?.following?.find((old: { kind: string; key: string }) => old.kind === item.kind && old.key === item.key)?.since ?? now }));
        const addedContent = following.filter(item => item.kind !== 'batch' && !previous?.following?.some((old: { kind: string; key: string }) => old.kind === item.kind && old.key === item.key));
        const sources = addedContent.length ? await tx.getAll(...addedContent.map(item => db.doc(`${item.kind === 'company' ? 'procedureCompanies' : 'procedurePosts'}/${item.key}`))) : [];
        addedContent.forEach((item, index) => { if (!sources[index].exists || (item.kind === 'experience' && sources[index].data()!.published !== true)) throw new HttpsError('failed-precondition', 'This company or experience is no longer available to follow.'); });
        const addedBatches = following.filter(item => item.kind === 'batch' && !previous?.following?.some((old: { kind: string; key: string }) => old.kind === item.kind && old.key === item.key));
        const manifests = addedBatches.length ? await tx.getAll(...addedBatches.map(item => db.doc(`batches/${item.key}`))) : [];
        tx.set(ref, { ...data, version: data.version + 1, following, lastDiscoveryAt: 0 }, { merge: true });
        addedBatches.forEach((item, index) => tx.set(ref.collection('baselines').doc(eventKey(`batch:${item.key}:${item.since}`)), { version: manifests[index].data()?.activeVersion || '' }));
      });
      return settingsFor(db, uid);
    }
    case 'notificationOutcome': {
      const data = parse(z.object({ id }).strict(), input), notification = (await items.doc(data.id).get()).data();
      if (!notification) throw new HttpsError('not-found', 'This update is unavailable.');
      if (!notification.reportId) return { message: notification.message || 'No additional outcome is available.' };
      const report = (await db.doc(`procedureReports/${notification.reportId}`).get()).data();
      if (!report || report.reporterUid !== uid) return { message: notification.message, status: 'unavailable' };
      return { message: notification.message, status: report.status, resolution: report.resolution || null, companyName: report.companyName || '', updatedAt: report.updatedAt };
    }
    case 'cleanupNotifications': {
      parse(z.object({}).strict(), input);
      const snap = await items.where('read', '==', true).where('category', 'in', ['following', 'statistics']).where('createdAt', '<', Date.now() - 90 * 86400000).orderBy('createdAt').limit(50).get();
      const removed = await db.runTransaction(async tx => {
        if (!snap.size) return 0;
        const current = await tx.getAll(...snap.docs.map(doc => doc.ref));
        let count = 0;
        current.forEach(doc => { if (doc.exists && doc.data()!.read === true && ['following', 'statistics'].includes(doc.data()!.category) && doc.data()!.createdAt < Date.now() - 90 * 86400000) { tx.delete(doc.ref); count++; } });
        return count;
      });
      return { removed, more: snap.size === 50 };
    }
  }
}
