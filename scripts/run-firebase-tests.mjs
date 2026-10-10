import { spawn } from 'node:child_process';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Run via npm run test:firebase; isolated Firebase emulators are required.');
const commands = [
  ['node_modules/tsx/dist/cli.mjs', 'scripts/seed-firestore.ts', '--emulator'],
  ['node_modules/tsx/dist/cli.mjs', 'scripts/verify-firestore.ts', '--emulator'],
  ['node_modules/tsx/dist/cli.mjs', 'scripts/seed-firestore.ts', '--year', '2025', '--emulator'],
  ['node_modules/tsx/dist/cli.mjs', 'scripts/verify-firestore.ts', '--year', '2025', '--emulator'],
  ['node_modules/tsx/dist/cli.mjs', 'scripts/seed-firestore.ts', '--year', '2027', '--emulator'],
  ['node_modules/tsx/dist/cli.mjs', 'scripts/verify-firestore.ts', '--year', '2027', '--emulator'],
  ['node_modules/tsx/dist/cli.mjs', 'scripts/seed-procedure-companies.ts', '--emulator'],
  ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/firebase/rules.test.ts', 'tests/firebase/migration.test.ts', 'tests/firebase/procedures.test.ts', 'tests/firebase/procedures-api.test.ts', 'tests/firebase/community.test.ts'],
  ['node_modules/@playwright/test/cli.js', 'test'],
];
for (const args of commands) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, E2E_FIREBASE: 'true' } });
    child.on('error', reject); child.on('exit', code => resolve(code));
  });
  if (code !== 0) { process.exitCode = 1; break; }
}
