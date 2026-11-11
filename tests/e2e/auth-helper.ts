import { expect, type Page } from '@playwright/test';
export async function signInGoogle(page: Page, navigate = true, photoURL?: string) {
  if (navigate) await page.goto('/#login');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  // The isolated Auth emulator accepts a synthetic provider token. This uses the
  // actual Firebase SDK/session persistence and has no production app bypass.
  await page.evaluate(`(async () => {
    const {getFirebase} = await import('/src/lib/firebase.ts');
    const {GoogleAuthProvider,signInWithCredential} = await import('/node_modules/.vite/deps/firebase_auth.js');
    const id = crypto.randomUUID();
    await signInWithCredential(getFirebase().auth, GoogleAuthProvider.credential(JSON.stringify({sub:id,email:id+'@example.test',email_verified:true,name:'Test Student',picture:${JSON.stringify(photoURL ?? '')}})));
  })()`);
  await expect(page.locator('.auth-controls .account-menu>summary')).toBeVisible();
  if(navigate)await expect(page).toHaveURL(/#home$/);
  return page.evaluate(`(async () => { const {getFirebase} = await import('/src/lib/firebase.ts'); return getFirebase().auth.currentUser.uid; })()` ) as Promise<string>;
}

// Direct Admin SDK fixtures bypass service invalidation. Wait for the real shared
// directory cache to observe them before asserting UI results; no arbitrary sleep.
export async function awaitCompanyDirectory(page: Page, search: string, count: number) {
  await expect.poll(() => page.evaluate(async ({search}) => {
    const {community} = await import('/src/community/community-api.ts' as string);
    const result = await community('companyBrowse', {search}) as {rows:{companyKey:string;count:number}[]};
    return result.rows.find(row => row.companyKey === 'barclays')?.count ?? 0;
  }, {search}), {timeout:60000,intervals:[500,1000,2500]}).toBe(count);
}

export async function openAccount(page: Page) {
  await page.locator('.auth-controls .account-menu > summary').click();
  await page.getByRole('link', {name:'My account',exact:true}).click();
}
