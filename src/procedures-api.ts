import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, startAfter, where, type DocumentData, type QueryConstraint, type QueryDocumentSnapshot } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { withTimeout } from './request-timeout';
import type { ProcedureCompany, ProcedureDraft, ProcedurePost, ProcedureSubmission } from '../shared/procedures';

export function procedureError(cause: unknown) {
  const code = (cause as { code?: string })?.code ?? '';
  if (code.includes('not-found') || code.includes('unavailable') || code.includes('internal')) return 'The community service is unavailable. Check your connection or ask the app owner to finish the beta setup, then retry.';
  if (code.includes('permission-denied')) return 'You do not have access to this action. Ask the app owner to check your role and the community setup.';
  return cause instanceof Error ? cause.message : 'Could not complete the request. Please retry.';
}
export async function callProcedure<T>(name: string, data: unknown): Promise<T> {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') return (await httpsCallable<unknown, T>(getFirebase().functions, name, { timeout: 20000 })(data)).data;
  const token = await withTimeout(getFirebase().auth.currentUser?.getIdToken() ?? Promise.reject(new Error('Sign in with Google.')));
  const response = await fetch('/api/procedures', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, data }), signal: AbortSignal.timeout(20000) });
  const result = await response.json().catch(() => null) as { data: T; error?: { code: string; message: string } } | null;
  if (!response.ok || !result || result.error) {
    const error = new Error(result?.error?.message || 'The community API is unavailable. Check its server setup and retry.') as Error & { code: string };
    error.code = `functions/${result?.error?.code || 'unavailable'}`; throw error;
  }
  return result.data;
}
export async function procedureCompanies() { return (await withTimeout(getDocs(query(collection(getFirebase().db, 'procedureCompanies'), orderBy('name'))))).docs.map(d => ({ ...d.data(), key: d.id }) as ProcedureCompany); }
export function watchContributions(uid: string, callback: (rows: ProcedureSubmission[]) => void, error: (cause: unknown) => void) {
  const timer = setTimeout(() => error(new Error('Your contributions could not load. Check your connection and retry.')), 15000);
  const stop = onSnapshot(query(collection(getFirebase().db, 'procedureSubmissions'), where('ownerUid', '==', uid), orderBy('updatedAt', 'desc'), limit(100)), s => { clearTimeout(timer); callback(s.docs.map(d => ({ ...d.data(), id: d.id }) as ProcedureSubmission)); }, cause => { clearTimeout(timer); error(cause); });
  return () => { clearTimeout(timer); stop(); };
}
export async function getSubmission(id: string): Promise<ProcedureSubmission | null> { const d = await withTimeout(getDoc(doc(getFirebase().db, 'procedureSubmissions', id))); return d.exists() && !d.data().deleted ? { ...d.data(), id: d.id } as ProcedureSubmission : null; }
export async function saveProcedure(id: string, expectedVersion: number, draft: ProcedureDraft) { return callProcedure<{ version: number }>('saveProcedureDraft', { id, expectedVersion, draft }); }
export type PostFilters = { company: string; year: string; coverage: string; outcome: string; sort: string };
export const defaultPostFilters: PostFilters = { company: '', year: '', coverage: '', outcome: '', sort: 'newest' };
export async function loadProcedurePosts(filters: PostFilters, cursor?: QueryDocumentSnapshot<DocumentData>) {
  const clauses: QueryConstraint[] = [where('published', '==', true)];
  if (filters.company) clauses.push(where('companyKey', '==', filters.company));
  if (filters.year) clauses.push(where('appearanceYear', '==', Number(filters.year)));
  if (filters.coverage) clauses.push(where('coverage', '==', filters.coverage));
  if (filters.outcome) clauses.push(where('outcome', '==', filters.outcome));
  clauses.push(...(filters.sort === 'helpful' ? [orderBy('score', 'desc'), orderBy('publishedAt', 'desc')] : [orderBy('publishedAt', 'desc')]));
  if (cursor) clauses.push(startAfter(cursor));
  clauses.push(limit(12));
  const result = await withTimeout(getDocs(query(collection(getFirebase().db, 'procedurePosts'), ...clauses)));
  return { rows: result.docs.map(d => ({ ...d.data(), id: d.id }) as ProcedurePost), cursor: result.docs.at(-1), more: result.size === 12 };
}
