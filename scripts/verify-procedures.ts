import { getAuth } from 'firebase-admin/auth';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { readFile } from 'node:fs/promises';
import { createAdminTarget, safeMigrationError } from './firebase-admin.js';
import { community } from '../functions/src/community.js';

let target: ReturnType<typeof createAdminTarget> | undefined;
try {
  target = createAdminTarget();
  if (target.emulator) throw new Error('This smoke check is for the live community. Use test:firebase locally.');
  const source = await readFile('firestore.rules', 'utf8');
  const rules = await getSecurityRules(target.app).getFirestoreRuleset();
  if (!rules.source.some(file => file.content === source)) throw new Error('Live Firestore rules differ from the reviewed repository rules.');
  const catalog = await target.db.collection('procedureCompanies').get();
  if (catalog.empty || !catalog.docs.some(doc => doc.id === 'barclays')) throw new Error('The live campus company catalog has not been seeded.');
  const admin = await getAuth(target.app).getUserByEmail('runasjha1@gmail.com');
  if (admin.disabled || !admin.emailVerified || !admin.providerData.some(provider => provider.providerId === 'google.com') || admin.customClaims?.role !== 'admin') throw new Error('The chosen Google account does not yet have active admin access.');
  const token = await target.app.options.credential!.getAccessToken();
  const indexResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${target.projectId}/databases/(default)/collectionGroups/-/indexes`, { headers: { Authorization: `Bearer ${token.access_token}`, 'X-Goog-User-Project': target.projectId }, signal: AbortSignal.timeout(20000) });
  if (!indexResponse.ok) throw new Error(`Could not verify live index readiness (HTTP ${indexResponse.status}). Check Firestore indexes in Firebase Console.`);
  const indexes = await indexResponse.json() as { indexes?: { state: string }[] };
  const waiting = indexes.indexes?.filter(index => index.state !== 'READY').length ?? 0;
  console.log(waiting ? `${waiting} live indexes are still building; wait before testing combined filters.` : 'All listed live Firestore indexes are READY.');
  if (!waiting) {
    const actor = { uid: admin.uid, token: { role: 'admin', email_verified: true, firebase: { sign_in_provider: 'google.com' } } };
    for (const sort of ['newest', 'helpful']) await community(target.db, actor, { action: 'browse', payload: { sort } });
    for (const tab of ['pending', 'reviewed', 'published']) for (const oldest of [true, false]) await community(target.db, actor, { action: 'queue', payload: { tab, oldest } });
    for (const action of ['overview', 'impact', 'contributions', 'saved', 'notifications']) await community(target.db, actor, { action });
    for (const kind of ['reports', 'questions']) await community(target.db, actor, { action: 'moderationInbox', payload: { kind } });
    console.log('Live enhancement read queries passed: browsing, all review queues, impact, private lists, discussion inbox and overview. No test content was written.');
  }
  console.log(`Verified live rules, ${catalog.size} campus companies and the chosen admin role. The community writes use /api/procedures on the app server, with no Firebase billing upgrade. Check index readiness and test Google sign-in on the normal app.`);
} catch (cause) { console.error(safeMigrationError(cause)); process.exitCode = 1; }
finally { await target?.close(); }
