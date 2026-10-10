import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createConnection } from 'node:net';

async function portOpen(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(1000);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}
const requiredPorts = [5174, 9099, 8080, 5001, 4400];
const occupied = (await Promise.all(requiredPorts.map(async port => await portOpen(port) ? port : null))).filter(port => port !== null);
if (occupied.length) {
  let existingBeta = false;
  try {
    const [hub, page] = await Promise.all([
      fetch('http://127.0.0.1:4400/emulators', { signal: AbortSignal.timeout(3000) }).then(response => response.json()),
      fetch('http://127.0.0.1:5174/src/auth.tsx', { signal: AbortSignal.timeout(3000) }).then(response => response.text()),
    ]);
    existingBeta = occupied.length === requiredPorts.length && hub.auth?.port === 9099 && hub.firestore?.port === 8080 && hub.functions?.port === 5001
      && /"VITE_LOCAL_BETA"\s*:\s*"true"/.test(page) && /"VITE_FIREBASE_PROJECT_ID"\s*:\s*"demo-placementstats"/.test(page);
  } catch { /* Report the occupied ports without stopping unrelated processes. */ }
  if (existingBeta) {
    console.log('The local beta is already running at http://localhost:5174');
    console.log('Open that URL and use Test as contributor, admin or reader. No second server is needed.');
    process.exit(0);
  }
  console.error(`Cannot start the beta: local ports ${occupied.join(', ')} are already in use.`);
  console.error('Stop the existing beta/emulator terminal with Ctrl+C, or let its startup finish, then retry npm run dev:beta.');
  process.exit(1);
}

const env = { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60' };
const javaCache = join(process.env.USERPROFILE ?? '', '.cache', 'codex-runtimes', 'java21');
if (existsSync(javaCache)) {
  const runtime = readdirSync(javaCache).find(name => existsSync(join(javaCache, name, 'bin', 'java.exe')));
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') ?? 'PATH';
  if (runtime) env[pathKey] = `${join(javaCache, runtime, 'bin')};${env[pathKey] ?? ''}`;
}
async function run(args) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', resolve);
  });
  if (code !== 0) throw new Error('Local beta stopped. Check the error above.');
}
try {
  await run(['functions/node_modules/typescript/bin/tsc', '-p', 'functions/tsconfig.json']);
  await run(['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:exec', '--config', 'firebase.test.json', '--only', 'auth,firestore,functions', '--project', 'demo-placementstats', 'node scripts/run-local-beta.mjs']);
} catch (cause) { console.error(cause.message); process.exitCode = 1; }
