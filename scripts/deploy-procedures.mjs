import { spawn } from 'node:child_process';

// Explicit live target; never import emulator fixtures or beta accounts.
const project = 'placement-stats-kjsce';
const adminEmail = 'runasjha1@gmail.com';
const cli = 'node_modules/firebase-tools/lib/bin/firebase.js';
const trustedTarget = ['--project', project, '--allow-production', '--cli-auth'];
const env = { ...process.env };
if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  throw new Error('Run live deployment in a normal terminal without emulator environment variables.');
}
// This operation explicitly uses the CLI login, not an old service-account key.
delete env.GOOGLE_APPLICATION_CREDENTIALS;

async function run(label, args) {
  console.log(`\n${label}`);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', resolve);
  });
  if (code !== 0) throw new Error(`${label} failed. Fix that step and rerun; completed imports are safe to repeat. See 4amchanges.md.`);
}

try {
  await run('Checking live Firebase access', [cli, 'apps:list', '--project', project, '--non-interactive']);
  await run('Publishing and verifying secured rules', ['node_modules/tsx/dist/cli.mjs', 'scripts/deploy-rules.ts', ...trustedTarget]);
  await run('Deploying community indexes', [cli, 'deploy', '--project', project, '--only', 'firestore:indexes', '--non-interactive']);
  await run('Seeding source-backed campus companies', ['node_modules/tsx/dist/cli.mjs', 'scripts/seed-procedure-companies.ts', ...trustedTarget]);
  await run('Assigning the chosen admin account', ['node_modules/tsx/dist/cli.mjs', 'scripts/set-role.ts', ...trustedTarget, '--email', adminEmail, '--role', 'admin']);
  await run('Verifying live community setup', ['node_modules/tsx/dist/cli.mjs', 'scripts/verify-procedures.ts', ...trustedTarget]);
  console.log('\nLive Firebase community data and access are configured. Deploy the /api/procedures endpoint on Vercel, then wait for Firestore indexes to become enabled, then sign out/in on the normal app to refresh admin access.');
  console.log('Firebase Cloud Functions are not used. All submission and moderation notifications stay in the app. See 4amchanges.md.');
} catch (cause) { console.error(cause.message); process.exitCode = 1; }
