import { chromium, expect } from '@playwright/test';
import { createAdminTarget, safeMigrationError } from './firebase-admin.js';
// Read-only cloud smoke check. Actual Google OAuth requires the owner's account.
let target: ReturnType<typeof createAdminTarget> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  target = createAdminTarget();
  if (target.emulator) throw new Error('Use test:firebase for isolated Auth tests.');
  browser = await chromium.launch();
  const page = await browser.newPage();
  const reads: string[] = [];
  page.on('request', request => { if (request.url().includes('firestore.googleapis.com')) reads.push(request.url()); });
  await page.goto('http://localhost:5173');
  await expect(page.getByRole('heading', { name: /Your placement prep/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.goto('http://localhost:5173/#2027/overview');
  await expect(page.getByRole('heading', { name: 'Good to see you.' })).toBeVisible();
  if (reads.length) throw new Error('Signed-out pages requested protected data.');
  const denied = await page.evaluate(`(async () => {
    const { getFirebase } = await import('/src/lib/firebase.ts');
    const { doc, getDocFromServer } = await import('/node_modules/.vite/deps/firebase_firestore.js');
    try { await getDocFromServer(doc(getFirebase().db, 'batches', '2026')); return false; }
    catch (error) { return error.code === 'permission-denied'; }
  })()`);
  if (!denied) throw new Error('Anonymous Firestore access is still allowed. Publish the new firestore.rules after deploying this frontend.');
  console.log('Cloud smoke passed: signed-out landing and deep-link gating; anonymous batch reads denied. Test Google OAuth manually with your own account.');
} catch (error) { console.error(safeMigrationError(error)); process.exitCode = 1; }
finally { await browser?.close(); await target?.close(); }
