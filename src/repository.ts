import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { chunkId, manifestSchema, parseDashboard, versionSchema } from '../shared/publication';
import type { DashboardResponse } from '../shared/statistics';

const dashboards = new Map<string, {version:string;data:DashboardResponse}>();
const pending = new Map<string, Promise<DashboardResponse>>();
export function loadDashboard(year:number):Promise<DashboardResponse> {
  const key = `${getFirebase().auth.currentUser?.uid}:${year}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = fetchDashboard(year).finally(() => { if (pending.get(key) === request) pending.delete(key); });
  pending.set(key, request);
  return request;
}
async function fetchDashboard(year: number): Promise<DashboardResponse> {
  const { db, auth } = getFirebase();
  const token = await auth.currentUser?.getIdTokenResult();
  if (token?.signInProvider !== 'google.com' || token.claims.email_verified !== true) throw new Error('Sign in with Google to access placement data.');
  const manifestDocument = await getDocFromServer(doc(db, 'batches', String(year)));
  if (!manifestDocument.exists()) throw new Error('No published data for this batch. Run the Firestore seed command in 4amchanges.md.');
  const manifest = manifestSchema.parse(manifestDocument.data());
  if (manifest.year !== year) throw new Error('Published batch does not match the requested graduation year.');
  const cacheKey = `${auth.currentUser?.uid}:${year}`;
  const cached = dashboards.get(cacheKey);
  if (cached?.version === manifest.activeVersion) return cached.data;
  const path = `batches/${year}/versions/${manifest.activeVersion}`;
  const versionDocument = await getDocFromServer(doc(db, path));
  if (!versionDocument.exists()) throw new Error('The published dataset version is incomplete. Run db:verify before publishing.');
  const version = versionSchema.parse(versionDocument.data());
  // Pin one version for the whole load; no function invocation or statistics recomputation.
  const chunks = await Promise.all(Array.from({ length: version.chunkCount }, (_, i) => getDocFromServer(doc(db, `${path}/views/${chunkId(i)}`))));
  const json = chunks.map(chunk => {
    if (!chunk.exists() || typeof chunk.data().payload !== 'string') throw new Error('A published data chunk is missing or invalid.');
    return chunk.data().payload as string;
  }).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  const hash = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
  if (hash !== version.payloadHash) throw new Error('Published data integrity check failed. Please ask the owner to run db:verify.');
  const dashboard = parseDashboard(JSON.parse(json));
  if (dashboard.statistics.batch.year !== year) throw new Error('Dashboard data belongs to a different batch.');
  dashboards.set(cacheKey, { version: manifest.activeVersion, data: dashboard });
  while (dashboards.size > 6) dashboards.delete(dashboards.keys().next().value!);
  return dashboard;
}

/** Observe only the tiny publication pointer; download the dataset only when it changes. */
export function watchDashboardVersion(year: number, changed: () => void) {
  let version: string | undefined;
  return onSnapshot(doc(getFirebase().db, 'batches', String(year)), snapshot => {
    if (snapshot.metadata.fromCache) return;
    const next = snapshot.data()?.activeVersion as string | undefined;
    if (version !== undefined && next !== version) changed();
    version = next;
  }, () => { /* Initial load reports errors; the SDK reconnects transient failures. */ });
}
