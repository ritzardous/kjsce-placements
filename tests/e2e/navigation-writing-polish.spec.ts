import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {signInGoogle} from './auth-helper';
import {initialProcedureDraft} from '../../shared/procedures';
const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'navigation-writing-polish'));

test('home starts light, shows the account photo, and its community card is a full accessible link',async({page},info)=>{
  await page.emulateMedia({colorScheme:'dark'});
  const photo='https://lh3.googleusercontent.com/navigation-test-photo';
  await page.route(photo,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76"><rect width="76" height="76" fill="#2445eb"/></svg>'}));
  await signInGoogle(page,true,photo);
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(page.getByRole('link',{name:'Back to Home / change batch',exact:true})).toHaveCount(0);
  const avatar=info.project.name==='mobile'?page.locator('.mobile-app-nav .navigation-avatar img'):page.locator('.account-header-link .navigation-avatar img');
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute('src',photo);
  const card=page.getByRole('link',{name:'Company Procedures',exact:true}).filter({has:page.locator('#home-community-title')});
  await expect(card).toHaveAttribute('href','#procedures');
  await page.screenshot({animations:'disabled',path:`artifacts/home-personal-light-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  const year=page.locator('.year-card').filter({has:page.getByRole('heading',{name:'Class of 2026',exact:true})});
  expect(await year.locator('h3').evaluate(element=>getComputedStyle(element).color)).toBe('rgb(245, 245, 245)');
  expect(await year.evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(20, 20, 20)');
  for(const destination of await page.locator('.home-card').all()) {
    expect(await destination.evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(20, 20, 20)');
    expect(await destination.locator('h2,h3').evaluate(element=>getComputedStyle(element).color)).toBe('rgb(245, 245, 245)');
    if(info.project.name==='desktop') {
      await destination.hover();
      await expect(destination).toHaveCSS('background-color','rgb(40, 40, 40)');
      expect(await destination.locator('p').evaluate(element=>getComputedStyle(element).color)).toBe('rgb(185, 185, 185)');
      await page.mouse.move(0,0);
      await expect(destination).toHaveCSS('background-color','rgb(20, 20, 20)');
    }
  }
  await page.screenshot({animations:'disabled',path:`artifacts/home-personal-dark-${info.project.name}.png`,fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await card.evaluate(element=>getComputedStyle(element,'::after').animationName)).toBe('none');
  await card.click({position:{x:12,y:12}});
  await expect(page).toHaveURL(/#procedures$/);
  await expect(avatar).toBeVisible();
  expect((await page.getByRole('link',{name:'Back to Home / change batch',exact:true}).boundingBox())!.width).toBe(44);
  await page.getByRole('searchbox',{name:'Search experiences'}).fill(`No matches ${randomUUID()}`);
  const empty=page.locator('.experience-empty');
  await expect(empty).toBeVisible({timeout:20000});
  const emptyBox=(await empty.boundingBox())!,headingBox=(await empty.getByRole('heading').boundingBox())!;
  expect(Math.abs(emptyBox.x+emptyBox.width/2-headingBox.x-headingBox.width/2)).toBeLessThan(2);
  await page.screenshot({animations:'disabled',path:`artifacts/centered-experiences-${info.project.name}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('bookmark on the article boundary toggles and cancel keeps an editable draft',async({page},info)=>{
  const uid=await signInGoogle(page),id=randomUUID(),title=`Bookmark ${id}`;
  await db.doc(`procedurePosts/${id}`).set({...initialProcedureDraft(),id,title,companyKey:'barclays',companyName:'Barclays',authorUid:uid,authorName:'Test Student',body:'I attended the coding round and explained a project. Prepare arrays and practise SQL joins.',published:true,publishedAt:Date.now(),score:0,upvotes:0,downvotes:0,revision:1});
  await page.goto(`/#procedures?search=${encodeURIComponent(title)}`);
  const card=page.locator('.procedure-card').filter({has:page.getByRole('link',{name:title,exact:true})});
  const bookmark=card.getByRole('button',{name:'Save for prep',exact:true});
  await expect(bookmark).toBeEnabled();
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({animations:'disabled',path:`artifacts/article-bookmark-${info.project.name}.png`});
  await bookmark.click();
  await expect(card.getByRole('button',{name:'Remove from saved experiences',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect.poll(async()=>(await db.doc(`procedureBookmarks/${uid}/items/${id}`).get()).exists,{timeout:20000}).toBe(true);
  await page.goto('/#procedures/saved');
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Remove from saved experiences',exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
  await page.goto('/#procedures/contribute');
  await page.getByRole('combobox',{name:'Company',exact:true}).fill('Barclys');
  await page.getByRole('option',{name:/Barclays/}).click();
  const body='My coding round included arrays and SQL joins. I would practise explaining each step and time complexity before the interview.';
  await page.getByLabel('Your experience',{exact:true}).fill(body);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page).toHaveURL(/#procedures\/contributions$/,{timeout:20000});
  const draft=(await db.collection('procedureSubmissions').where('ownerUid','==',uid).get()).docs.find(doc=>doc.data().draft.body===body)!;
  expect(draft).toBeDefined();expect(draft.data().status).toBe('draft');
  await page.goto(`/#procedures/contribute?draft=${draft.id}`);
  await expect(page.getByLabel('Your experience',{exact:true})).toHaveValue(body);
  await page.screenshot({animations:'disabled',path:`artifacts/writing-bookmark-polish-${info.project.name}.png`});
});
