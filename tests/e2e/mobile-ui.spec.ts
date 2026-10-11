import { test, expect, type Page } from '@playwright/test';
import { signInGoogle } from './auth-helper';

async function fits(page: Page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
test.beforeEach(()=>{if(process.env.E2E_FIREBASE!=='true')throw new Error('Use isolated emulators.');});

for(const width of [320,390,430]) {
  test(`phone navigation and layouts stay usable at ${width}px`,async({page},info)=>{
    test.skip(info.project.name!=='mobile','Phone layouts only');
    test.setTimeout(120000);
    await page.setViewportSize({width,height:844});
    await page.goto('/');
    await expect(page.getByRole('heading',{name:/Your placement prep/})).toBeVisible();
    await fits(page);
    await signInGoogle(page);
    const quick=page.getByRole('navigation',{name:'Quick navigation'});
    await expect(quick).toBeVisible();
    for(const link of await quick.getByRole('link').all()) {
      const box=await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await fits(page);
    await quick.getByRole('link',{name:'Experiences',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Company Procedures',exact:true})).toBeVisible();
    await expect(quick.getByRole('link',{name:'Experiences'})).toHaveAttribute('aria-current','page');
    await fits(page);
    const views=page.getByRole('navigation',{name:'Company procedures views'});
    for(const link of await views.getByRole('link').all())expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if(width===390)await page.screenshot({path:'artifacts/mobile-browse-refined.png',fullPage:false});
    await page.getByRole('link',{name:'Share an experience',exact:true}).click();
    const body=page.getByLabel('Your experience',{exact:true});
    await expect(body).toBeVisible();
    expect(await body.evaluate(el=>getComputedStyle(el).fontSize)).toBe('16px');
    await page.getByRole('combobox',{name:'Company',exact:true}).fill('Barclays');
    await page.getByRole('option',{name:/Barclays/}).click();
    await body.fill('I attended a coding round with arrays and SQL questions. Practise explaining your approach and review the fundamentals.');
    await page.getByRole('button',{name:'Preview Markdown',exact:true}).click();
    await expect(page.locator('.procedure-reader-preview')).toBeVisible();
    await fits(page);
    if(width===390){await page.locator('.procedure-composer').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/mobile-editor-refined.png',fullPage:false});}
    await page.getByRole('button',{name:'Save now',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Saved');
    await quick.getByRole('link',{name:'Account',exact:true}).click();
    await expect(page.getByRole('heading',{name:'My Account',exact:true})).toBeVisible();
    await fits(page);
    for(const section of ['overview','companies','branches','candidates','timeline','insights','company/barclays']) {
      await page.goto(`/#2026/${section}`);
      await expect(page.locator('#main .hero, #main .detail-head, #main .section').first()).toBeVisible();
      await fits(page);
      await expect(page.getByRole('combobox',{name:'Placement year'})).toHaveCount(0);await expect(page.getByRole('navigation',{name:'App',exact:true})).not.toBeVisible();
      if(width===390&&section==='overview')await page.screenshot({path:'artifacts/mobile-statistics-refined.png',fullPage:false});
    }
    await quick.getByRole('button',{name:'Statistics',exact:true}).click();
    const menu=page.getByRole('dialog');
    await expect(menu.getByRole('navigation',{name:'Statistics sections'}).getByRole('link')).toHaveCount(4);
    for(const link of await menu.getByRole('navigation',{name:'Statistics sections'}).getByRole('link').all())expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await menu.getByRole('link',{name:'Career explorer',exact:true}).click();
    await page.getByRole('navigation',{name:'Career explorer views'}).getByRole('link',{name:'Insights',exact:true}).click();
    await expect(page).toHaveURL(/#explore\/insights$/);
    await expect(menu).not.toBeVisible();
    await fits(page);
    const uid=await page.evaluate(`(async()=>{const {getFirebase}=await import('/src/firebase.ts');return getFirebase().auth.currentUser.uid;})()`);
    const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key', {method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({localId:uid,customAttributes:JSON.stringify({role:'admin'})})});
    expect(response.ok).toBe(true);
    await page.evaluate(`(async()=>{const {getFirebase}=await import('/src/firebase.ts');await getFirebase().auth.currentUser.getIdToken(true);})()`);
    await page.goto('/#admin/procedures');
    await expect(page.getByLabel('Review company',{exact:true})).toBeVisible();
    await fits(page);
    if(width===390)await page.screenshot({path:'artifacts/mobile-admin-refined.png',fullPage:false});
  });
}
