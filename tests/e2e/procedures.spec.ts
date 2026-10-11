import { test, expect, expect as testExpect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { signInGoogle } from './auth-helper';

const app = initializeApp({ projectId: 'demo-placementstats' }, 'procedure-browser-tests');
const db = getFirestore(app);
test.beforeEach(() => { if (process.env.E2E_FIREBASE !== 'true') throw new Error('Isolated emulators are required.'); });

test('a stalled draft save never blocks navigation and unsaved writing can be recovered', async ({ page }) => {
  await signInGoogle(page);
  await page.goto('/#procedures/contribute');
  await expect(page.getByLabel('Company', { exact: true })).toBeVisible();
  const saving = page.waitForRequest(request => request.url().includes('/saveProcedureDraft'));
  await page.route('**/saveProcedureDraft', async route => { await new Promise(resolve => setTimeout(resolve, 5000)); await route.abort(); });
  await page.getByLabel('Your experience', { exact: true }).fill('My unsaved interview experience should survive navigation when the community backend is slow.');
  await saving;
  if(await page.getByRole('navigation',{name:'Quick navigation'}).isVisible())await page.getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Account',exact:true}).click();else await page.getByRole('link', { name: 'My Account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Account', exact: true })).toBeVisible({ timeout: 3000 });
  await page.getByRole('link', { name: 'Share an experience', exact: false }).click();
  await expect(page.getByLabel('Your experience', { exact: true })).toHaveValue('My unsaved interview experience should survive navigation when the community backend is slow.');
});

test('draft recovery, revision approval, voting and unpublishing work across contributor/admin/reader accounts', async ({ page, browser }) => {
  test.setTimeout(120000);
  const expect = testExpect.configure({ timeout: 20000 });
  const uid = await signInGoogle(page);
  await page.goto('/#procedures/contribute');
  await page.getByRole('combobox', { name: 'Company', exact:true }).fill('Barclays');
  await page.getByRole('option', {name:/Barclays/}).click();
  await page.getByLabel('Year you appeared').fill('2026');
  await page.getByLabel('Your experience', { exact: true }).fill('I attended an aptitude test and a technical interview on arrays and SQL joins. Practise explaining your project and review database fundamentals before the interview.');
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  await expect(page).toHaveURL(/draft=/);
  const id = new URLSearchParams(page.url().split('?')[1]).get('draft')!;
  await page.reload();
  await expect(page.getByLabel('Your experience', { exact: true })).toContainText('database fundamentals');
  await page.getByRole('button', { name: 'Preview Markdown' }).click();
  await expect(page.locator('.procedure-markdown')).toContainText('SQL joins');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('button', { name: 'Pending approval', exact: true })).toBeDisabled({ timeout: 20000 });
  expect((await db.doc(`procedurePosts/${id}`).get()).exists).toBe(false);
  await page.goto('/#admin/procedures');
  await expect(page.getByRole('alert')).toContainText('Admin access is required');

  const adminContext = await browser.newContext({ viewport: page.viewportSize()!, baseURL: new URL(page.url()).origin });
  const adminPage = await adminContext.newPage();
  const readerContext = await browser.newContext({ viewport: page.viewportSize()!, baseURL: new URL(page.url()).origin });
  const readerPage = await readerContext.newPage();
  try {
    const adminUid = await signInGoogle(adminPage);
    await setClaims(adminUid, { role: 'admin' });
    await adminPage.evaluate(`(async () => { const {getFirebase} = await import('/src/firebase.ts'); await getFirebase().auth.currentUser.getIdToken(true); })()`);
    await adminPage.goto('/#admin/procedures');
    await adminPage.getByLabel('Review company', { exact: true }).selectOption('barclays');
    const pending = await db.collection('procedureSubmissions').where('ownerUid', '==', uid).get();
    expect(pending.docs.some(d => d.id === id)).toBe(true);
    await adminPage.locator(`button[data-submission-id="${id}"]`).click();
    await expect(adminPage.locator('.procedure-markdown')).toContainText('database fundamentals');
    await adminPage.screenshot({ path: `artifacts/procedures-admin-${test.info().project.name}.png`, fullPage: true });
    await adminPage.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(adminPage.locator(`button[data-submission-id="${id}"]`)).toHaveCount(0);

    await signInGoogle(readerPage);
    await readerPage.goto(`/#procedures/${id}`);
    await expect(readerPage.getByText('By Community contributor', { exact: false })).toBeVisible();
    await expect(readerPage.locator('.procedure-markdown')).toContainText('database fundamentals');
    await readerPage.getByRole('button', { name: /Upvote/ }).click();
    await expect(readerPage.getByRole('button', { name: /Upvote/ })).toContainText('(1)');
    await expect(readerPage.getByRole('button', { name: /Upvote/ })).toBeEnabled();
    await db.doc(`procedureLimits/${(await signInGoogleUid(readerPage))}-vote`).delete();
    await readerPage.getByRole('button', { name: /Downvote/ }).click();
    await expect(readerPage.getByRole('button', { name: /Downvote/ })).toContainText('(1)');
    await expect(readerPage.getByRole('button', { name: /Upvote/ })).toContainText('(0)');
    await readerPage.screenshot({ path: `artifacts/procedures-post-${test.info().project.name}.png`, fullPage: true });
    expect(await readerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto(`/#procedures/contribute?draft=${id}`);
    await expect(page.getByLabel('Your experience', { exact: true })).toBeEnabled();
    await page.getByLabel('Your experience', { exact: true }).fill('Updated experience: I attended an aptitude test and technical interview. Revise SQL joins, practise arrays, and prepare to explain your project design decisions.');
    await db.doc(`procedureLimits/${uid}-submit`).delete();
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByRole('button', { name: 'Pending approval', exact: true })).toBeDisabled({ timeout: 20000 });
    expect((await db.doc(`procedurePosts/${id}`).get()).data()!.body).toContain('database fundamentals');
    await adminPage.getByRole('button', { name: 'Refresh review queue', exact: true }).click();
    await adminPage.locator(`button[data-submission-id="${id}"]`).click();
    await adminPage.getByLabel('Review feedback / unpublish reason').fill('Clarify which technical round you attended.');
    await adminPage.getByRole('button', { name: 'Request changes', exact: true }).click();
    await expect(adminPage.locator(`button[data-submission-id="${id}"]`)).toHaveCount(0);
    await page.goto('/#account');
    await expect(page.locator('.procedure-badge').filter({hasText:'Changes requested'})).toBeVisible();
    await expect(page.locator('.procedure-feedback')).toContainText('Clarify');
    await page.goto(`/#procedures/contribute?draft=${id}`);
    await page.getByLabel('Your experience', { exact: true }).fill('Another draft: I attended the aptitude and technical rounds. Practice arrays, SQL joins and explaining project decisions clearly during the interview.');
    await page.getByRole('button', { name: 'Save now', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved');
    await adminPage.getByRole('button', { name: 'Published', exact: true }).click();
    await adminPage.locator(`button[data-submission-id="${id}"]`).click();
    await adminPage.getByLabel('Review feedback / unpublish reason').fill('Procedure needs further correction.');
    await adminPage.getByRole('button', { name: 'Unpublish approved version', exact: true }).click();
    await adminPage.getByRole('dialog').getByRole('button',{name:'Confirm unpublish',exact:true}).click();
    await expect(readerPage.getByRole('alert')).toContainText(/unavailable|unpublished/);
    await setClaims(adminUid, {});
    const revoked = await adminPage.evaluate(async postId => {
      const api = await import('/src/procedures-api.ts' as string);
      try { await api.callProcedure('unpublishProcedure', { id: postId, reason: 'stale token test' }); return 'unexpected success'; }
      catch (cause) { return (cause as { code: string }).code; }
    }, id);
    expect(revoked).toBe('functions/permission-denied');
  } finally { await adminContext.close(); await readerContext.close(); }
});
async function signInGoogleUid(page: import('@playwright/test').Page): Promise<string> { return page.evaluate(`(async () => { const {getFirebase} = await import('/src/firebase.ts'); return getFirebase().auth.currentUser.uid; })()`); }
async function setClaims(uid: string, claims: Record<string, string>) {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Role fixtures are emulator-only.');
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key', { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }) });
  if (!response.ok) throw new Error('Could not set emulator role fixture.');
}

test('Markdown preview suppresses HTML, scripts and remote images', async ({ page }) => {
  await signInGoogle(page);
  await page.goto('/#procedures/contribute');
  await page.getByLabel('Your experience', { exact: true }).fill('<script>window.pwned=true</script>\n<img src="https://example.test/tracker">\n[unsafe](javascript:alert(1))\n![remote](https://example.test/pixel.png)\n\n## Tips\nPrepare arrays and SQL joins.');
  await page.getByRole('button', { name: 'Preview Markdown' }).click();
  await expect(page.locator('.procedure-markdown')).toContainText('Prepare arrays');
  await expect(page.locator('.procedure-markdown img')).toHaveCount(0);
  await expect(page.locator('.procedure-markdown script')).toHaveCount(0);
  await expect(page.locator('.procedure-markdown a[href^="javascript:"]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `artifacts/procedures-editor-${test.info().project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
