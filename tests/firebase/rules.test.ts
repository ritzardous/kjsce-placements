import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createRequire } from 'node:module';
import { preparePublication } from '../../scripts/publication.js';

// Keep the compatibility SDK used by rules-unit-testing and its modular wrappers
// on the same Node module instance (avoids mixed ESM/CJS service registration).
const require = createRequire(import.meta.url);
const { initializeTestEnvironment, assertFails, assertSucceeds }: typeof import('@firebase/rules-unit-testing') = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, collection, getDocs }: typeof import('firebase/firestore') = require('firebase/firestore');

let env: RulesTestEnvironment;
let version: string;
before(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Emulator-only rules test.');
  version = (await preparePublication()).version;
  env = await initializeTestEnvironment({ projectId: 'demo-placementstats', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
});

test('bookmarks and notifications are private; pending replies cannot bypass the API sanitizer', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'procedureBookmarks/rules-alice/items/rules-public'), { postId: 'rules-public' });
    await setDoc(doc(db, 'procedureNotifications/rules-alice/items/private-note'), { message: 'Private feedback' });
    await setDoc(doc(db, 'procedureQuestions/privacy-question'), { status: 'visible', answer: { status: 'pending', body: 'Unapproved reply' } });
  });
  const alice = env.authenticatedContext('rules-alice', googleClaims).firestore();
  const bob = env.authenticatedContext('rules-bob', googleClaims).firestore();
  const admin = env.authenticatedContext('rules-admin', { ...googleClaims, role: 'admin' }).firestore();
  for (const path of ['procedureBookmarks/rules-alice/items/rules-public', 'procedureNotifications/rules-alice/items/private-note']) {
    await assertSucceeds(getDoc(doc(alice, path)));
    await assertFails(getDoc(doc(bob, path)));
    await assertFails(getDoc(doc(admin, path)));
    await assertFails(updateDoc(doc(alice, path), { forged: true }));
  }
  await assertFails(getDoc(doc(alice, 'procedureQuestions/privacy-question')));
  await assertFails(getDoc(doc(bob, 'procedureQuestions/privacy-question')));
  await assertSucceeds(getDoc(doc(admin, 'procedureQuestions/privacy-question')));
});
after(async () => { await env?.cleanup(); });
const googleClaims = { email_verified: true, firebase: { sign_in_provider: 'google.com' as const } };
test('only verified Google sessions can read active published manifests, versions and chunks', async () => {
  const db = env.authenticatedContext('google-reader', googleClaims).firestore();
  await assertSucceeds(getDoc(doc(db, 'batches/2026')));
  await assertSucceeds(getDoc(doc(db, `batches/2026/versions/${version}`)));
  await assertSucceeds(getDoc(doc(db, `batches/2026/versions/${version}/views/chunk-0000`)));
  await assertFails(getDocs(collection(db, 'batches')));
  await assertFails(getDoc(doc(db, 'batches/2026/versions/inactive/views/chunk-0000')));
  await assertFails(getDoc(doc(db, `batches/2026/versions/${version}/views/private-notes`)));
});
test('anonymous, password, custom and unverified Google sessions cannot read placement data', async () => {
  const contexts = [env.unauthenticatedContext(), env.authenticatedContext('password-reader', { email_verified: true, firebase: { sign_in_provider: 'password' } }), env.authenticatedContext('custom-reader', { email_verified: true, firebase: { sign_in_provider: 'custom' } }), env.authenticatedContext('unverified-reader', { ...googleClaims, email_verified: false })];
  for (const context of contexts) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, 'batches/2026')));
    await assertFails(getDoc(doc(db, `batches/2026/versions/${version}`)));
    await assertFails(getDoc(doc(db, `batches/2026/versions/${version}/views/chunk-0000`)));
  }
});
test('private originals and future submissions cannot be read by clients', async () => {
  const publicDb = env.unauthenticatedContext().firestore();
  const adminDb = env.authenticatedContext('admin-client', { role: 'admin' }).firestore();
  await assertFails(getDoc(doc(publicDb, `imports/2026-${version}/announcements/PL001`)));
  await assertFails(getDoc(doc(adminDb, `imports/2026-${version}`)));
  await assertFails(getDoc(doc(publicDb, 'experiences/anything')));
});
test('owners can write allowed profile fields, but cannot impersonate others or assign roles', async () => {
  const alice = env.authenticatedContext('rules-alice', googleClaims).firestore();
  const bob = env.authenticatedContext('rules-bob', googleClaims).firestore();
  const guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(alice, 'users/rules-alice'), { displayName: 'Alice' }));
  await assertSucceeds(getDoc(doc(alice, 'users/rules-alice')));
  await assertFails(getDoc(doc(bob, 'users/rules-alice')));
  await assertFails(getDoc(doc(guest, 'users/rules-alice')));
  await assertFails(setDoc(doc(alice, 'users/rules-bob'), { displayName: 'Pretend Bob' }));
  await assertFails(updateDoc(doc(alice, 'users/rules-alice'), { role: 'admin' }));
  await assertFails(setDoc(doc(alice, 'users/rules-alice'), { displayName: 'Alice', email: 'private@example.test' }));
});
test('all clients, including admin claims, are denied publication/import writes', async () => {
  const db = env.authenticatedContext('admin-client', { role: 'admin' }).firestore();
  await assertFails(updateDoc(doc(db, 'batches/2026'), { activeVersion: 'attacker' }));
  await assertFails(setDoc(doc(db, `batches/2026/versions/${version}/views/chunk-0000`), { payload: '{}' }));
  await assertFails(setDoc(doc(db, 'imports/forged'), { sourceHash: 'forged' }));
});

test('community snapshots are readable only when published; drafts, revisions and votes remain scoped', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'procedureSubmissions/rules-private'), { ownerUid: 'rules-alice', status: 'pending', draft: { body: 'private' } });
    await setDoc(doc(db, 'procedureSubmissions/rules-private/revisions/1'), { body: 'private revision' });
    await setDoc(doc(db, 'procedurePosts/rules-public'), { published: true, body: 'approved' });
    await setDoc(doc(db, 'procedurePosts/rules-hidden'), { published: false, body: 'withdrawn' });
    await setDoc(doc(db, 'procedurePosts/rules-public/votes/rules-alice'), { value: 1 });
    await setDoc(doc(db, 'procedureEmailOutbox/rules-event'), { to: 'private@example.test' });
    await setDoc(doc(db, 'procedureModeration/rules-event'), { feedback: 'private review' });
  });
  const alice = env.authenticatedContext('rules-alice', googleClaims).firestore();
  const bob = env.authenticatedContext('rules-bob', googleClaims).firestore();
  const admin = env.authenticatedContext('rules-admin', { ...googleClaims, role: 'admin' }).firestore();
  const guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(bob, 'procedurePosts/rules-public')));
  await assertFails(getDoc(doc(guest, 'procedurePosts/rules-public')));
  await assertFails(getDoc(doc(bob, 'procedurePosts/rules-hidden')));
  await assertSucceeds(getDoc(doc(admin, 'procedurePosts/rules-hidden')));
  await assertSucceeds(getDoc(doc(alice, 'procedureSubmissions/rules-private')));
  await assertSucceeds(getDoc(doc(admin, 'procedureSubmissions/rules-private/revisions/1')));
  await assertFails(getDoc(doc(bob, 'procedureSubmissions/rules-private')));
  await assertFails(getDoc(doc(bob, 'procedureSubmissions/rules-private/revisions/1')));
  await assertSucceeds(getDoc(doc(alice, 'procedurePosts/rules-public/votes/rules-alice')));
  await assertFails(getDoc(doc(bob, 'procedurePosts/rules-public/votes/rules-alice')));
  await assertFails(getDoc(doc(admin, 'procedureEmailOutbox/rules-event')));
  await assertFails(getDoc(doc(bob, 'procedureModeration/rules-event')));
  await assertSucceeds(getDoc(doc(admin, 'procedureModeration/rules-event')));
  for (const db of [alice, bob, admin]) {
    await assertFails(updateDoc(doc(db, 'procedureSubmissions/rules-private'), { status: 'approved' }));
    await assertFails(updateDoc(doc(db, 'procedurePosts/rules-public'), { score: 999 }));
    await assertFails(setDoc(doc(db, 'procedurePosts/rules-public/votes/rules-bob'), { value: 1 }));
    await assertFails(setDoc(doc(db, 'procedureCompanies/forged-company'), { name: 'Forged' }));
  }
});
