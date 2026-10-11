import {test,expect} from '@playwright/test';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {initialProcedureDraft} from '../../shared/procedures';
import {signInGoogle} from './auth-helper';
const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'phone-readability-tests'));
const postId='phone-readable-experience',title='ACI Worldwide interview and preparation';
test.beforeAll(async()=>{
 if(process.env.E2E_FIREBASE!=='true')throw new Error('Emulators required');
 await db.doc(`procedurePosts/${postId}`).set({...initialProcedureDraft(),id:postId,title,companyKey:'aci-worldwide',companyName:'ACI Worldwide',coverage:'Full',body:'## My interview\nI solved an array problem, then discussed SQL joins and my final year project.',authorUid:'fixture-owner',authorName:'Contributor',revision:1,published:true,publishedAt:Date.now(),score:1,upvotes:1,downvotes:0});
});
test('phone controls, bookmark clearance and return to companies work at narrow widths',async({page},info)=>{
 test.skip(info.project.name!=='mobile','Phone-specific layout');
 await signInGoogle(page);
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('button',{name:'Switch to dark mode'}).click();
  for(const width of [320,387,433]){
   await page.setViewportSize({width,height:780});
   await page.goto('/#procedures/company?company=aci-worldwide');
   const back=page.getByRole('link',{name:'Back to companies',exact:true});
   await expect(back).toBeVisible();
   await expect(page.getByRole('heading',{name:'ACI Worldwide experiences',exact:true})).toBeVisible();
   const card=page.locator('.procedure-card').filter({has:page.getByRole('link',{name:title,exact:true})});
   await expect(card).toBeVisible({timeout:20000});
   const bookmark=card.locator('.article-bookmark');
   const geometry=await card.evaluate(node=>{const button=node.querySelector('.article-bookmark')!.getBoundingClientRect(),bounds=node.getBoundingClientRect();return {inside:button.left>=bounds.left&&button.right<=bounds.right&&button.top>=bounds.top&&button.bottom<=bounds.bottom,overlap:[...node.querySelectorAll('.company-identity,.procedure-badge,h3')].some(element=>{const r=element.getBoundingClientRect();return button.left<r.right&&button.right>r.left&&button.top<r.bottom&&button.bottom>r.top;})};});
   expect(geometry.inside).toBe(true);expect(geometry.overlap).toBe(false);
   await expect(bookmark).toHaveCSS('width','44px');
   await expect(page.getByRole('searchbox',{name:'Search experiences'})).toHaveCSS('height','48px');
   await expect(page.getByRole('button',{name:'More filters',exact:true})).toHaveCSS('width',`${(await page.getByRole('searchbox').boundingBox())!.width}px`);
   expect(await card.locator('.procedure-card-title').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBe(18);
   await expect(card.getByRole('link',{name:'Company details',exact:true})).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await card.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/phone-company-${theme}-${width}.png`});
   await back.click();
   await expect(page).toHaveURL(/#procedures$/);
   await expect(page.getByRole('searchbox',{name:'Search companies'})).toBeVisible();
   const tabs=await page.locator('.procedure-tabs > a').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
   expect(new Set(tabs).size).toBe(1);
  }
 }
 await page.goto('/#procedures/company?company=aci-worldwide');
 const card=page.locator('.procedure-card').filter({has:page.getByRole('link',{name:title,exact:true})});
 await card.getByRole('button',{name:'Save for prep',exact:true}).click();
 await expect(card.getByRole('button',{name:'Remove from saved experiences'})).toHaveAttribute('aria-pressed','true');
 await page.goto('/#procedures/saved');
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await page.goto(`/#procedures/${postId}`);
 await expect(page.locator('.procedure-markdown p')).toHaveCSS('font-size','16px');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
