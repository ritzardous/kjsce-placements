import { spawn } from 'node:child_process';

async function run(args) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60', E2E_PORT: process.env.E2E_PORT ?? '5174' } });
    child.on('error', reject); child.on('exit', resolve);
  });
  if (result !== 0) throw new Error('Firebase beta verification failed.');
}
try {
  await run(['functions/node_modules/typescript/bin/tsc', '-p', 'functions/tsconfig.json']);
  await run(['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:exec', '--config', 'firebase.test.json', '--only', 'auth,firestore,functions', '--project', 'demo-placementstats', 'node scripts/run-firebase-tests.mjs']);
} catch (cause) { console.error(cause.message); process.exitCode = 1; }
