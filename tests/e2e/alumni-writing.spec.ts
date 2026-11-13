import {test,expect} from '@playwright/test';
import {signInGoogle} from './auth-helper';
const text='My interview started with a coding problem about arrays. Then we discussed SQL joins and my projects. Practising the basics and explaining trade-offs clearly helped me more than memorising answers.';

test('a company invitation survives sign-in and accepts writing without extra metadata',async({page},info)=>{
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
 await body.fill(text);
 await expect(page.locator('.studio-save-status')).toHaveText('Saved',{timeout:20000});
 expect(await body.evaluate((e:HTMLTextAreaElement)=>e.scrollHeight<=e.clientHeight+2)).toBe(true);
 await page.getByRole('button',{name:'Preview',exact:true}).click();
 await expect(page.locator('.procedure-reader-preview')).toContainText(text);
 await page.getByRole('button',{name:'Continue writing',exact:true}).click();
 await expect(body).toHaveValue(text);
 await page.screenshot({path:'artifacts/alumni-editor-'+info.project.name+'.png',fullPage:true});
 await page.getByRole('button',{name:'Submit experience',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Pending approval',exact:true})).toBeVisible();
 await expect(page.locator('.studio-submission')).toContainText(text);
});

test('company pages offer a company-specific invitation with a manual-copy fallback',async({page})=>{
 await signInGoogle(page);await page.goto('/#procedures/company?company=barclays');
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
 await expect(page.getByRole('textbox',{name:'Your experience',exact:true})).toHaveValue('');
});

test('the phone document grows with writing and optional details stay optional',async({page})=>{
 await signInGoogle(page);await page.goto('/#procedures/contribute?company=barclays&name=Barclays');
 const body=page.getByRole('textbox',{name:'Your experience',exact:true});
 await body.fill(text.repeat(12));
 expect((await body.boundingBox())!.height).toBeGreaterThan(600);
 expect(await body.evaluate((e:HTMLTextAreaElement)=>e.scrollHeight<=e.clientHeight+2)).toBe(true);
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
