import { applicationDefault, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { config } from 'dotenv';
import { createRequire } from 'node:module';

// Trusted CLI scripts can read their private credential path from the root .env.
config({ quiet: true });

export function createAdminTarget(args = process.argv.slice(2)) {
  const emulator = args.includes('--emulator');
  const projectAt = args.indexOf('--project');
  const projectId = projectAt >= 0 ? args[projectAt + 1] : emulator ? 'demo-placementstats' : undefined;
  if (!projectId || projectId.startsWith('--')) throw new Error('Specify --emulator or --project YOUR_PROJECT_ID --allow-production.');
  if (emulator) {
    if (!projectId.startsWith('demo-')) throw new Error('Emulator operations require a demo- project ID.');
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  } else {
    if (!args.includes('--allow-production') || projectId.startsWith('demo-')) throw new Error('Live Firebase operations require an explicit real --project and --allow-production.');
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Unset emulator environment variables before accessing a live project.');
    if (!args.includes('--cli-auth') && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credential = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      if (credential.project_id && credential.project_id !== projectId) throw new Error('The service-account credential belongs to a different Firebase project.');
    }
  }
  let credential = emulator ? undefined : applicationDefault();
  let cliDirectory: string | undefined;
  const previousCredential = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!emulator && args.includes('--cli-auth')) {
    const require = createRequire(import.meta.url);
    const cliAuth = require('firebase-tools/lib/auth.js');
    const account = cliAuth.getGlobalDefaultAccount();
    if (!account?.tokens?.refresh_token) throw new Error('Run firebase login --reauth before using --cli-auth.');
    const api = require('firebase-tools/lib/api.js');
    cliDirectory = mkdtempSync(join(tmpdir(), 'placementstats-cli-'));
    const credentialPath = join(cliDirectory, 'credential.json');
    writeFileSync(credentialPath, JSON.stringify({ type: 'authorized_user', client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: account.tokens.refresh_token }), { mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
    credential = applicationDefault();
  }
  const app = initializeApp({ projectId, ...(credential ? { credential } : {}) }, 'migration');
  const db = getFirestore(app);
  console.log(`Target: ${emulator ? 'LOCAL EMULATOR' : 'LIVE FIREBASE PROJECT'} ${projectId}`);
  return { app, db, projectId, emulator, close: async () => {
    await deleteApp(app);
    if (cliDirectory) {
      unlinkSync(join(cliDirectory, 'credential.json')); rmdirSync(cliDirectory);
      if (previousCredential === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS; else process.env.GOOGLE_APPLICATION_CREDENTIALS = previousCredential;
    }
  } };
}
export function safeMigrationError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === '8' || code.includes('resource-exhausted')) return 'Firestore quota exceeded. Wait for quota reset or enable billing before retrying; no quota repair can be performed by this command.';
  if (code === 'app/invalid-credential') return 'Firebase rejected the Admin SDK credential. Replace the private service-account credential with a valid key for this project, then retry.';
  if (code === 'auth/user-not-found') return 'This Google email has no Firebase account yet. Sign in to the app with Google once, then retry role assignment.';
  if (code === '7' || code.includes('permission-denied') || code.includes('permission_denied') || error instanceof Error && error.message === 'The caller does not have permission') return 'Firebase denied the service account access. Check Cloud Datastore User (data) and Firebase Rules Admin (rules) IAM roles; see 4amchanges.md.';
  // SDK errors may include credential paths or service-account data; never echo them.
  if (error instanceof Error && error.name === 'Error' && !('code' in error)) return error.message;
  return 'Firebase operation failed. Check emulator availability or your project ID, Firestore setup, and Admin credentials; see 4amchanges.md.';
}
