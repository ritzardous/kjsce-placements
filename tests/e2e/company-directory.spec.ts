import {test,expect} from '@playwright/test';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {signInGoogle} from './auth-helper';
import {initialProcedureDraft} from '../../shared/procedures';
const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'company-directory-tests'));
const tag='Directory pagination fixture';
test.beforeAll(async()=>{
 if(process.env.E2E_FIREBASE!=='true')throw new Error('Emulators required');
 const batch=db.batch();
 for(let i=0;i<16;i++)batch.set(db.doc(`procedurePosts/company-directory-${i}`),{...initialProcedureDraft(),id:`company-directory-${i}`,companyKey:'barclays',companyName:'Barclays',title:`${tag} ${i}`,body:'My interview included SQL joins and a coding exercise.',authorUid:'fixture-owner',authorName:'Contributor',revision:1,published:i<14,publishedAt:1900000000000+i,score:0,upvotes:0,downvotes:0});
 await batch.commit();
});
test('company directory counts all published posts and opens their paginated articles',async({page},info)=>{
 await signInGoogle(page);
 await page.goto('/#procedures');
 await page.getByRole('searchbox').fill(tag);
 const company=page.getByRole('link',{name:'Barclays experiences',exact:true});
 await expect(company).toContainText('14 experiences',{timeout:20000});
 await expect(page.locator('.procedure-card-title')).toHaveCount(0);
 await page.screenshot({path:`artifacts/company-directory-${info.project.name}.png`,fullPage:true});
 await company.locator('.company-experience-count').click();
 await expect(page).toHaveURL(/#procedures\/company\?/);
 await expect(page.getByRole('heading',{name:'Barclays experiences',exact:true})).toBeVisible();
 await expect(page.locator('.procedure-card-title')).toHaveCount(12,{timeout:20000});
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await expect(page.locator('.procedure-card-title')).toHaveCount(14,{timeout:20000});
 await expect(page.locator('.procedure-card-title').filter({hasText:`${tag} 15`})).toHaveCount(0);
 await page.getByRole('link',{name:'Back to companies',exact:true}).click();
 await expect(company).toContainText('14 experiences');
 await expect(page.getByRole('searchbox')).toHaveValue(tag);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('footer is flush with the page and both themes keep restrained surfaces',async({page},info)=>{
 await signInGoogle(page);
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('button',{name:'Switch to dark mode'}).click();
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  const footer=page.locator('.portal-footer');
  await expect(footer.getByRole('button',{name:'Scroll to top'})).toBeVisible();
  const layout=await footer.evaluate(node=>{const r=node.getBoundingClientRect(),shell=node.closest('.portal-shell')!,main=shell.querySelector('main')!;return {left:r.left,right:r.right,width:shell.getBoundingClientRect().right,bg:getComputedStyle(node).backgroundColor,pageBg:getComputedStyle(shell).backgroundColor,padding:getComputedStyle(main).paddingBottom,after:document.documentElement.scrollHeight-(r.bottom+scrollY)};});
  expect(layout.left).toBe(0);expect(layout.right).toBe(layout.width);expect(layout.bg).toBe(layout.pageBg);expect(parseFloat(layout.padding)).toBeLessThanOrEqual(36);
  if(info.project.name==='desktop')expect(layout.after).toBeLessThanOrEqual(1);
  if(theme==='dark'){expect(layout.bg).toBe('rgb(16, 16, 16)');expect(await page.locator('.year-card').first().evaluate(node=>getComputedStyle(node).color)).toBe('rgb(222, 222, 222)');}
  await page.screenshot({path:`artifacts/company-footer-${theme}-${info.project.name}.png`,fullPage:true});
  await footer.getByRole('button',{name:'Scroll to top'}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(20);
 }
});
