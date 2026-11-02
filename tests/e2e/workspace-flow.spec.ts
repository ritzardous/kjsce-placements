import { test, expect as baseExpect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { initialProcedureDraft } from '../../shared/procedures';
import { signInGoogle } from './auth-helper';
const db = getFirestore(initializeApp({projectId:'demo-placementstats'},'workspace-flow'));
const expect=baseExpect.configure({timeout:20000});
test.setTimeout(60000);
test.beforeEach(()=>{if(process.env.E2E_FIREBASE!=='true')throw new Error('Emulators required.');});
test('contributor workspace has one filter, compact rows and confirmed secondary actions',async({page},info)=>{
 const uid=await signInGoogle(page),ids=[randomUUID(),randomUUID()];
 for(const [index,id] of ids.entries())await db.doc(`procedureSubmissions/${id}`).set({ownerUid:uid,draft:{...initialProcedureDraft(),companyKey:'barclays',title:index?'Another experience':'My first experience',body:'A meaningful account of the interview and its preparation.'},companyName:'Barclays',draftVersion:1,revision:0,status:'draft',hasPublished:false,feedback:'',updatedAt:Date.now()+index});
 await page.goto('/#procedures/contributions');
 await expect(page.getByRole('combobox',{name:'Contribution status',exact:true})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'All contributions',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Review notifications',exact:true})).toHaveCount(0);
 const rows=page.locator('.account-contributions .procedure-list>.procedure-card');await expect(rows).toHaveCount(2);
 await expect(page.getByRole('button',{name:'Delete experience',exact:true})).toHaveCount(0);
 const a=await rows.nth(0).boundingBox(),b=await rows.nth(1).boundingBox(),list=await page.locator('.account-contributions .procedure-list').boundingBox();expect(a!.x).toBe(b!.x);expect(a!.width).toBe(b!.width);expect(Math.abs(a!.width-list!.width)).toBeLessThan(2);
 await rows.nth(0).locator('.action-disclosure>summary').click();
 await rows.nth(0).getByRole('button',{name:'Delete experience',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Permanently delete this experience?'});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.keyboard.press('Escape');await expect(rows.nth(0).locator('.action-disclosure')).not.toHaveAttribute('open','');
 await page.screenshot({path:`artifacts/workspace-contributions-${info.project.name}.png`,fullPage:true});
 await rows.nth(0).getByRole('link',{name:'Continue writing',exact:true}).click();
 await expect(page.getByRole('link',{name:'← Back to My contributions',exact:true})).toBeVisible();
 await page.getByText('Experience details ·',{exact:false}).click();await expect(page.getByLabel('Year you appeared',{exact:true})).toBeVisible();
 await page.screenshot({path:`artifacts/workspace-editor-${info.project.name}.png`,fullPage:true});
 await page.getByRole('link',{name:'← Back to My contributions',exact:true}).click();await expect(rows).toHaveCount(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const width of [320,390,768,1280,1920]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const field=await page.getByRole('combobox',{name:'Contribution status',exact:true}).boundingBox(),row=await rows.first().boundingBox();expect(Math.abs(field!.x-row!.x)).toBeLessThan(2);if(width>720)expect((await rows.first().getByRole('link',{name:'Continue writing',exact:true}).boundingBox())!.width).toBeGreaterThan(180);}
});
test('pending submission is read-only and account no longer duplicates writing management',async({page})=>{
 const uid=await signInGoogle(page),id=randomUUID();await db.doc(`procedureSubmissions/${id}`).set({ownerUid:uid,draft:{...initialProcedureDraft(),companyKey:'barclays',title:'Pending experience',body:'I attended a technical interview and explained my project design decisions.'},companyName:'Barclays',draftVersion:1,revision:1,status:'pending',hasPublished:false,feedback:'',updatedAt:Date.now()});
 await page.goto(`/#procedures/contribute?draft=${id}`);await expect(page.getByRole('heading',{name:'Pending approval',exact:true})).toBeVisible();await expect(page.getByRole('textbox')).toHaveCount(0);await expect(page.getByRole('button',{name:'Submit for review',exact:true})).toHaveCount(0);
 await page.goto('/#account');await expect(page.locator('.account-contributions')).toHaveCount(0);await expect(page.getByRole('link',{name:/My writing/})).toBeVisible();
});
test('notifications keep secondary actions tucked away and the global bell has one trigger',async({page},info)=>{
 await signInGoogle(page);await page.goto('/#procedures/notifications');
 await expect(page.getByRole('button',{name:'All notifications',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Unread notifications',exact:true})).toBeVisible();await expect(page.getByRole('combobox',{name:'Activity type',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Following',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/Mark all read/})).toHaveCount(0);
 await page.locator('.notification-toolbar .action-disclosure>summary').click();await expect(page.getByRole('button',{name:/Mark all read/})).toBeVisible();await page.keyboard.press('Escape');
 await expect(page.locator('.notification-preview-toggle')).toHaveCount(0);
 const filtered=page.waitForRequest(request=>{try{const data=request.postDataJSON()?.data;return data?.action==='notifications'&&data.payload?.view==='reports'&&data.payload?.unread===true;}catch{return false;}});
 await page.getByRole('combobox',{name:'Activity type',exact:true}).selectOption('reports');await page.getByRole('button',{name:'Unread notifications',exact:true}).click();await filtered;await expect(page.getByRole('combobox',{name:'Activity type',exact:true})).toHaveValue('reports');await expect(page.getByRole('button',{name:'Unread notifications',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:`artifacts/workspace-inbox-${info.project.name}.png`,fullPage:true});
});
test('saved readers return to their source and batch navigation retains its context',async({page})=>{
 const uid=await signInGoogle(page),id=randomUUID();const title='Saved return journey';
 await db.doc(`procedurePosts/${id}`).set({...initialProcedureDraft(),companyKey:'barclays',companyName:'Barclays',title,body:'I prepared arrays and SQL joins before the technical interview.',authorUid:'another-user',authorName:'Contributor',published:true,publishedAt:Date.now(),revision:1,score:0,upvotes:0,downvotes:0});
 await db.doc(`procedureBookmarks/${uid}/items/${id}`).set({postId:id,title,companyName:'Barclays',appearanceYear:2026,revision:1,savedAt:Date.now()});
 await page.goto('/#procedures/saved');await page.getByRole('link',{name:'Read experience',exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await page.getByRole('link',{name:'← Back to Saved for prep',exact:true}).click();await expect(page.getByRole('heading',{name:'Saved for prep',exact:true})).toBeVisible();
 await page.goto('/#2025/companies');await page.getByRole('combobox',{name:'Salary range',exact:true}).selectOption('<5L');await page.goto('/#procedures');await expect(page.locator('.area-switcher a').first()).toHaveAttribute('href',/#2025\//);await expect(page.getByRole('link',{name:'Browse experiences',exact:true})).toHaveAttribute('aria-current','page');
});
