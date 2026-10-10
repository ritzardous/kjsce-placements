import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { initializeApp as adminApp, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import handler from '../../api/procedures.mjs';
import { configureProcedureApi } from '../../functions/lib/functions/src/http.js';
import { initialProcedureDraft } from '../../shared/procedures.js';

test('app API verifies Google tokens, rejects forged auth and enforces approval and voting through HTTP', async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  const admin = adminApp({ projectId: 'demo-placementstats' }, 'http-api-test');
  configureProcedureApi(admin);
  await getFirestore(admin).doc('procedureCompanies/barclays').set({ key: 'barclays', name: 'Barclays', years: [2025, 2026, 2027] });
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const apps: ReturnType<typeof initializeApp>[] = [];
  async function user(role = '') {
    const app = initializeApp({ projectId: 'demo-placementstats', apiKey: 'demo-api-key' }, crypto.randomUUID()); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const sub = crypto.randomUUID(); const account = (await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email: `${sub}@example.test`, email_verified: true })))).user;
    if (role) await adminAuth(admin).setCustomUserClaims(account.uid, { role });
    return { uid: account.uid, token: await account.getIdToken(true) };
  }
  async function call(token: string | undefined, name: string, data: unknown) {
    const response = await fetch(`http://127.0.0.1:${port}/api/procedures`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ name, data }) });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await call(undefined, 'saveProcedureDraft', {})).status, 401);
    assert.equal((await call('forged-token', 'saveProcedureDraft', {})).status, 401);
    const author = await user(), moderator = await user('admin'), reader = await user();
    const id = crypto.randomUUID();
    const draft = { ...initialProcedureDraft(), companyKey: 'barclays', body: 'API beta test experience: I attended the aptitude and technical rounds. Practise arrays, SQL joins and explaining your project design before interviewing.' };
    const saved = await call(author.token, 'saveProcedureDraft', { id, expectedVersion: 0, draft });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal((await call(reader.token, 'saveProcedureDraft', { id, expectedVersion: 1, draft })).status, 403);
    assert.equal((await call(author.token, 'submitProcedure', { id, expectedVersion: 1 })).status, 200);
    assert.equal((await getFirestore(admin).doc(`procedurePosts/${id}`).get()).exists, false);
    assert.equal((await call(reader.token, 'reviewProcedure', { id, revision: 1, decision: 'approved', feedback: '' })).status, 403);
    assert.equal((await call(moderator.token, 'reviewProcedure', { id, revision: 1, decision: 'approved', feedback: '' })).status, 200);
    assert.equal((await call(reader.token, 'setProcedureVote', { id, value: 1 })).status, 200);
    assert.equal((await getFirestore(admin).doc(`procedurePosts/${id}`).get()).data()?.score, 1);
    assert.equal((await call(reader.token, 'procedureCommunity', { action: 'browse', payload: { company: 'barclays' } })).status, 200);
    assert.equal((await call(reader.token, 'procedureCommunity', { action: 'bookmark', payload: { postId: id, saved: true } })).status, 200);
    assert.equal((await call(reader.token, 'procedureCommunity', { action: 'overview' })).status, 403);
    assert.equal((await call(moderator.token, 'procedureCommunity', { action: 'overview' })).status, 200);
    await adminAuth(admin).setCustomUserClaims(moderator.uid, {});
    assert.equal((await call(moderator.token, 'unpublishProcedure', { id, reason: 'Revoked admin' })).status, 403);
    assert.equal((await call(moderator.token, 'procedureCommunity', { action: 'overview' })).status, 403);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await Promise.all(apps.map(app => deleteApp(app))); await deleteAdmin(admin);
  }
});

