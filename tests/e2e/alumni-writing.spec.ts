import {test,expect} from '@playwright/test';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {initialProcedureDraft} from '../../shared/procedures';
import {signInGoogle} from './auth-helper';
const text='My interview started with a coding problem about arrays. Then we discussed SQL joins and my projects. Practising the basics and explaining trade-offs clearly helped me more than memorising answers.';

test('a company invitation survives sign-in and accepts writing with only the required interview details',async({page},info)=>{
 await page.goto('/#procedures/contribute?company=barclays&name=Barclays');
 await expect(page.getByRole('heading',{name:'Share your Barclays experience.'})).toBeVisible();
 await expect(page.locator('.opportunity-index')).toHaveCount(0);
 await signInGoogle(page,false);
 await expect(page).toHaveURL(/company=barclays/);
 await expect(page.locator('.studio-doc-title')).toHaveText('Barclays experience');
 await expect(page.locator('#procedure-companyKey')).toHaveValue('Barclays');
 await expect(page.locator('.studio-optional')).not.toHaveAttribute('open','');
 await expect(page.locator('.mobile-app-nav')).toHaveCount(0);
 const body=page.getByRole('textbox',{name:'Your experience',exact:true});
 await expect(body).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(info.project.name==='desktop') expect((await body.boundingBox())!.width).toBeGreaterThan(600);
 await expect(page.locator('.studio-layout')).toHaveCSS('display','block');
 await page.getByLabel('Recruitment route',{exact:true}).selectOption('On campus');
 await page.getByLabel('Batch year (graduation)',{exact:true}).fill('2025');
 await expect(page.locator('#procedure-role')).toHaveValue('Technology Trainee');
 await expect(page.locator('.writing-company-context')).toContainText('Class of 2025');
 await expect(page.locator('.writing-company-context img')).toBeVisible();
 await body.fill(text);
 await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});
 expect(await body.evaluate((e:HTMLElement)=>e.scrollHeight<=e.clientHeight+2)).toBe(true);
 await page.getByRole('button',{name:'Preview',exact:true}).click();
 await expect(page.locator('.procedure-reader-preview')).toContainText(text);
 await page.getByRole('button',{name:'Continue writing',exact:true}).click();
 await expect(body).toHaveText(text);
 await page.screenshot({path:'artifacts/alumni-editor-'+info.project.name+'.png',fullPage:true});
 await page.getByRole('button',{name:'Switch to dark mode'}).click();
 const title=page.getByLabel('Experience title (optional)',{exact:true});await title.focus();await expect(title).toHaveCSS('outline-style','none');
 await page.screenshot({path:'artifacts/alumni-editor-dark-'+info.project.name+'.png',fullPage:true});
 await page.getByRole('button',{name:'Submit experience',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Pending approval',exact:true})).toBeVisible();
 await expect(page.locator('.studio-submission')).toContainText(text);
});

test('only admins see company invitation controls with a manual-copy fallback',async({page})=>{
 const uid=await signInGoogle(page);
 await page.goto('/#2026/company/barclays');await expect(page.getByRole('heading',{name:'Barclays',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Invite an alum',exact:true})).toHaveCount(0);
 await page.goto('/#procedures/company?company=barclays');await expect(page.getByRole('heading',{name:'Barclays experiences'})).toBeVisible();await expect(page.getByRole('button',{name:'Invite an alum',exact:true})).toHaveCount(0);
 await getAuth(initializeApp({projectId:'demo-placementstats'},'invite-admin-'+crypto.randomUUID())).setCustomUserClaims(uid,{role:'admin'});
 await page.evaluate(async()=>{const{getFirebase}=await import('/src/lib/firebase.ts' as string);await getFirebase().auth.currentUser.getIdToken(true);});
 await page.goto('/#2026/company/barclays');await expect(page.getByRole('button',{name:'Invite an alum',exact:true})).toBeVisible();await expect(page.locator('.company-contacts')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await page.locator('.company-contacts').screenshot({path:'artifacts/admin-invite-'+test.info().project.name+'.png'});await page.goto('/#procedures/company?company=barclays');
 await expect(page.getByRole('button',{name:'Invite an alum',exact:true})).toBeVisible();
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Clipboard unavailable');}},configurable:true});});
 await page.getByRole('button',{name:'Invite an alum',exact:true}).click();
 const value=await page.getByRole('textbox',{name:'Experience invitation link'}).inputValue();
 expect(new URL(value).hash).toMatch(/^#procedures\/contribute\?company=barclays&name=Barclays$/);
});

test('different company invitations do not reuse another company’s writing',async({page})=>{
 await signInGoogle(page);await page.goto('/#procedures/contribute?company=barclays&name=Barclays');
 await page.getByRole('textbox',{name:'Your experience',exact:true}).fill(text);
 await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});
 await page.goto('/#procedures/contribute?company=oracle&name=Oracle');
 await expect(page.locator('.studio-doc-title')).toHaveText('Oracle experience');
 await expect(page.getByRole('textbox',{name:'Your experience',exact:true})).toHaveText('');
});

test('the phone document grows with writing and optional details stay optional',async({page})=>{
 await signInGoogle(page);await page.goto('/#procedures/contribute?company=barclays&name=Barclays');
 const body=page.getByRole('textbox',{name:'Your experience',exact:true});
 await body.fill(text.repeat(12));
 expect((await body.boundingBox())!.height).toBeGreaterThan(600);
 expect(await body.evaluate((e:HTMLElement)=>e.scrollHeight<=e.clientHeight+2)).toBe(true);
 await body.fill(text);await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});
 await page.locator('.studio-optional>summary').click();
 await expect(page.getByRole('spinbutton',{name:'Year you appeared',exact:true})).toHaveValue('');
 await page.getByRole('spinbutton',{name:'Year you appeared',exact:true}).fill('2025');
 await page.getByRole('combobox',{name:'Recruitment route',exact:true}).selectOption('On campus');
 await page.getByRole('button',{name:'Save now',exact:true}).click();
 await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});
 await page.getByRole('button',{name:'Preview',exact:true}).click();
 await expect(page.locator('.studio-preview-kicker')).toContainText('2025');
 await expect(page.locator('.studio-preview-kicker')).toContainText('On campus');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('company roles offer a choice and custom roles survive batch changes and reload',async({page})=>{
 await signInGoogle(page);await page.goto('/#procedures/contribute?company=ey&name=EY');
 await expect(page.locator('.writing-company-context')).toContainText('Class of 2026');
 const role=page.getByLabel('Role',{exact:true});await expect(role).toBeEnabled();
 expect(await role.locator('option').count()).toBeGreaterThan(3);
 await role.selectOption({index:1});await expect(page.locator('.writing-company-context')).toContainText('highest recorded for this role');
 await role.selectOption('__custom__');await page.getByLabel('Custom role',{exact:true}).fill('Alumni custom role');
 await page.getByLabel('Batch year (graduation)',{exact:true}).fill('2027');await expect(page.getByLabel('Custom role',{exact:true})).toHaveValue('Alumni custom role');
 await page.getByLabel('Recruitment route',{exact:true}).selectOption('Off campus');await page.getByRole('button',{name:'Save now',exact:true}).click();
 await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});await page.reload();
 await expect(page.getByLabel('Custom role',{exact:true})).toHaveValue('Alumni custom role');await expect(page.getByLabel('Batch year (graduation)',{exact:true})).toHaveValue('2027');
 await expect(page.locator('.writing-company-context')).toContainText('Class of 2026');await expect(page.locator('.writing-company-context')).toContainText('CTC not recorded');
});

test('clear is visible and cancelling removes a new autosaved draft and device copies',async({page})=>{
 const uid=await signInGoogle(page);await page.goto('/#procedures/contribute?company=barclays&name=Barclays');
 const body=page.getByRole('textbox',{name:'Your experience',exact:true});await body.fill(text);
 await page.getByLabel('Recruitment route',{exact:true}).selectOption('Off campus');await page.getByLabel('Batch year (graduation)',{exact:true}).fill('2026');await expect(page.locator('#procedure-role')).toHaveValue('Graduate Technology Trainee');
 await page.getByLabel('Experience title (optional)',{exact:true}).fill('Reset this title');
 await page.locator('.studio-optional>summary').click();await page.getByLabel('Year you appeared',{exact:true}).fill('2025');await page.getByLabel('Short summary (optional)',{exact:true}).fill('Reset this summary');await page.locator('.procedure-rounds label').filter({hasText:/^Coding$/}).click();await page.getByLabel('Coverage',{exact:true}).selectOption('Full');await page.getByLabel('Did you get selected?',{exact:true}).selectOption('Selected');await page.getByLabel('Public name',{exact:true}).selectOption('custom');await page.getByLabel('Custom public name',{exact:true}).fill('Reset this name');
 await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});
 const id=new URLSearchParams(page.url().split('?')[1]).get('draft')!;
 await page.getByRole('button',{name:'Clear',exact:true}).click();await page.getByRole('dialog',{name:'Clear your writing?'}).getByRole('button',{name:'Clear writing',exact:true}).click();
 await expect(body).toHaveText('');await expect(page.locator('#procedure-companyKey')).toHaveValue('Barclays');
 await expect(page.getByLabel('Experience title (optional)',{exact:true})).toHaveValue('');await expect(page.getByLabel('Year you appeared',{exact:true})).toHaveValue('');await expect(page.getByLabel('Short summary (optional)',{exact:true})).toHaveValue('');await expect(page.getByRole('checkbox',{name:'Coding',exact:true})).not.toBeChecked();await expect(page.getByLabel('Coverage',{exact:true})).toHaveValue('Not specified');await expect(page.getByLabel('Did you get selected?',{exact:true})).toHaveValue('Not specified');await expect(page.getByLabel('Recruitment route',{exact:true})).toHaveValue('Off campus');await expect(page.getByLabel('Batch year (graduation)',{exact:true})).toHaveValue('2026');await expect(page.locator('#procedure-role')).toHaveValue('Graduate Technology Trainee');await expect(page.getByLabel('Public name',{exact:true})).toHaveValue('anonymous');await expect(page.getByLabel('Custom public name',{exact:true})).toHaveCount(0);
 await body.fill(text);await page.getByRole('button',{name:'Cancel & back',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Discard changes and go back?'});await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(body).toContainText(text);
 await page.getByRole('button',{name:'Cancel & back',exact:true}).click();await dialog.getByRole('button',{name:'Discard & go back',exact:true}).click();
 await expect(page).toHaveURL(/#procedures$/,{timeout:20000});
 const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'cancel-new-'+crypto.randomUUID()));const record=(await db.doc(`procedureSubmissions/${id}`).get()).data()!;
 expect(record.deleted).toBe(true);expect(record.draft).toBeUndefined();
 expect(await page.evaluate(({uid,id})=>Object.keys(localStorage).filter(key=>key.startsWith('procedure-backup:'+uid+':')).some(key=>JSON.parse(localStorage.getItem(key)||'{}').id===id),{uid,id})).toBe(false);
 await page.goto('/#procedures/contribute?company=barclays&name=Barclays');await expect(body).toHaveText('');
});

test('cancel restores an existing draft and never deletes its published experience',async({page})=>{
 const uid=await signInGoogle(page),id=crypto.randomUUID(),db=getFirestore(initializeApp({projectId:'demo-placementstats'},'cancel-existing-'+crypto.randomUUID()));
 const original={...initialProcedureDraft(),companyKey:'barclays',body:text,role:'Graduate Technology Trainee',graduationYear:2026,campus:'On campus'};
 await db.doc(`procedureSubmissions/${id}`).set({ownerUid:uid,draft:original,draftVersion:1,revision:1,status:'approved',feedback:'',hasPublished:true,updatedAt:Date.now()});
 await db.doc(`procedurePosts/${id}`).set({...original,id,authorUid:uid,published:true,publishedAt:Date.now(),companyName:'Barclays',authorName:'Contributor',revision:1,score:0,upvotes:0,downvotes:0});
 await page.goto('/#procedures/contribute?draft='+id);const body=page.getByRole('textbox',{name:'Your experience',exact:true});await expect(body).toHaveText(text);
 await body.click();await body.press('ControlOrMeta+a');await page.keyboard.insertText('Replacement writing that must be discarded rather than kept in the account.');
 await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});
 await page.getByRole('button',{name:'Cancel & back',exact:true}).click();await page.getByRole('dialog',{name:'Discard changes and go back?'}).getByRole('button',{name:'Discard & go back',exact:true}).click();
 await expect(page).toHaveURL(/#procedures$/,{timeout:20000});
 expect((await db.doc(`procedureSubmissions/${id}`).get()).data()!.draft.body).toBe(text);
 const post=(await db.doc(`procedurePosts/${id}`).get()).data()!;expect(post.published).toBe(true);expect(post.body).toBe(text);
});
