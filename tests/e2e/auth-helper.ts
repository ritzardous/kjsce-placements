import { expect, type Page } from '@playwright/test';
export async function signInGoogle(page: Page, navigate = true) {
  if (navigate) await page.goto('/#login');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  // The isolated Auth emulator accepts a synthetic provider token. This uses the
  // actual Firebase SDK/session persistence and has no production app bypass.
  await page.evaluate(`(async () => {
    const {getFirebase} = await import('/src/firebase.ts');
    const {GoogleAuthProvider,signInWithCredential} = await import('/node_modules/.vite/deps/firebase_auth.js');
    const id = crypto.randomUUID();
    await signInWithCredential(getFirebase().auth, GoogleAuthProvider.credential(JSON.stringify({sub:id,email:id+'@example.test',email_verified:true,name:'Test Student'})));
  })()`);
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible();
  if(navigate)await expect(page).toHaveURL(/#home$/);
  return page.evaluate(`(async () => { const {getFirebase} = await import('/src/firebase.ts'); return getFirebase().auth.currentUser.uid; })()` ) as Promise<string>;
}
