import {test,expect} from '@playwright/test';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {initialProcedureDraft} from '../../shared/procedures';
import {signInGoogle} from './auth-helper';
const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'overlay-polish'));
test.setTimeout(60000);
test.beforeEach(()=>{if(process.env.E2E_FIREBASE!=='true')throw Error('Emulators required');});
const long='unbroken'.repeat(170);
async function contained(page:import('@playwright/test').Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
async function surfaceContained(surface:import('@playwright/test').Locator,page:import('@playwright/test').Page){const box=await surface.boundingBox(),size=page.viewportSize()!;expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(size.width+1);expect(box!.y+box!.height).toBeLessThanOrEqual(size.height+1);}

test('pending and published Markdown contain hostile widths; report uses a separate recoverable dialog',async({page},info)=>{
 const uid=await signInGoogle(page),id=randomUUID();
 const body=`# ${long}\n\n${long}\n\n[${long}](https://example.test/${long})\n\n\`\`\`\n${long}\n\`\`\`\n\n| Column | Value |\n| --- | --- |\n| ${long} | example |`;
 const draft={...initialProcedureDraft(),companyKey:'barclays',title:'Containment experience',body};
 await db.doc(`procedureSubmissions/${id}`).set({ownerUid:uid,draft,companyName:'Barclays',draftVersion:1,revision:1,status:'pending',hasPublished:false,feedback:'',updatedAt:Date.now()});
 await db.doc(`procedurePosts/${id}`).set({...draft,companyName:'Barclays',authorUid:'another-user',authorName:'Contributor',published:true,publishedAt:Date.now(),revision:1,score:0,upvotes:0,downvotes:0});
 await page.goto(`/#procedures/contribute?draft=${id}`);await expect(page.getByRole('heading',{name:'Pending approval',exact:true})).toBeVisible();
 await expect(page.getByText('Your writing saves automatically as you work.',{exact:true})).toHaveCount(0);
 for(const width of [320,390,768,1280,1920]){await page.setViewportSize({width,height:900});await contained(page);expect(await page.locator('.procedure-markdown pre').evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);}
 await page.setViewportSize(info.project.name==='mobile'?{width:393,height:851}:{width:1280,height:720});
 await page.goto(`/#procedures/${id}`);await expect(page.getByRole('heading',{name:'Containment experience',exact:true})).toBeVisible();await contained(page);
 const trigger=page.locator('summary[aria-label="Experience options"]');await trigger.scrollIntoViewIfNeeded();await trigger.click();
 const menu=page.locator('.action-disclosure-content:visible');await surfaceContained(menu,page);await expect(menu.getByRole('button',{name:'Report experience',exact:true})).toBeVisible();
 await menu.getByRole('button',{name:'Report experience',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Report experience',exact:true});await expect(dialog).toBeVisible();await expect(menu).toBeHidden();await surfaceContained(dialog,page);
 await dialog.getByRole('textbox',{name:'Details (optional)',exact:true}).fill('Please verify this information.');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 await trigger.click();await page.getByRole('button',{name:'Report experience',exact:true}).click();await expect(dialog.getByRole('textbox',{name:'Details (optional)',exact:true})).toHaveValue('Please verify this information.');
 let release!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/procedureCommunity',async route=>{if(route.request().postDataJSON()?.data?.action!=='report')return route.continue();await hold;await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{status:'INTERNAL',message:'Could not send report. Try again.'}})});});
 await dialog.getByRole('button',{name:'Send report',exact:true}).click();await expect(dialog.getByRole('button',{name:'Sending report…',exact:true})).toBeDisabled();release();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Details (optional)',exact:true})).toHaveValue('Please verify this information.');
 await page.screenshot({path:`artifacts/polish-report-${info.project.name}.png`});await page.unroute('**/procedureCommunity');await dialog.getByRole('button',{name:'Send report',exact:true}).click();await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
});

test('account identity, compact edge menus, popup switching and preference navigation',async({page},info)=>{
 const uid=await signInGoogle(page),id=randomUUID();
 await db.doc(`procedureSubmissions/${id}`).set({ownerUid:uid,draft:{...initialProcedureDraft(),companyKey:'barclays',title:'Published experience',body:'A useful interview account.'},companyName:'Barclays',draftVersion:1,revision:1,status:'approved',hasPublished:true,feedback:'',updatedAt:Date.now()});
 await page.goto('/#procedures/contributions');await expect(page.getByRole('link',{name:'Read experience',exact:true})).toBeVisible();const trigger=page.locator('.account-contributions .action-disclosure>summary');await trigger.click();let menu=page.locator('.action-disclosure-content:visible');await surfaceContained(menu,page);await expect(menu.getByText('Read approved version',{exact:true})).toHaveCount(0);await expect(menu.getByText('Close options',{exact:true})).toBeHidden();expect(await menu.evaluate(node=>node.scrollHeight<=node.clientHeight+1)).toBe(true);
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 const account=page.locator('.account-menu>summary');await account.click();const panel=page.getByRole('dialog',{name:'Account',exact:true});await expect(panel.getByText('Test Student',{exact:true})).toBeVisible();await expect(panel.getByText(/@example.test/)).toBeVisible();await surfaceContained(panel,page);await contained(page);
 await page.screenshot({path:`artifacts/polish-account-${info.project.name}.png`});
 await page.keyboard.press('Escape');await expect(account).toBeFocused();
 if(info.project.name==='desktop'){await trigger.click();await account.click();await expect(page.locator('.action-disclosure-content:visible')).toHaveCount(1);await page.locator('.notification-entry').click();await expect(panel).toBeHidden();await expect(page.getByRole('region',{name:'Recent notifications'})).toBeVisible();await account.click();await expect(page.locator('.notification-preview')).toHaveCount(0);}else await account.click();
 await panel.getByRole('link',{name:'Notification preferences',exact:true}).click();await expect(page.locator('#notification-preferences')).toHaveAttribute('open','');await expect(page.getByText('Notification preferences and following',{exact:true})).toBeVisible();
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');await account.click();await expect(panel).toBeVisible();expect(await panel.evaluate(node=>getComputedStyle(node).backgroundColor)).not.toBe('rgb(255, 255, 255)');await page.keyboard.press('Escape');
});
