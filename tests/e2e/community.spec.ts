import { test, expect as baseExpect } from '@playwright/test';
const expect=baseExpect.configure({timeout:20000});
test.use({actionTimeout:20000});
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import { initialProcedureDraft } from '../../shared/procedures';
import { signInGoogle } from './auth-helper';

const app=initializeApp({projectId:'demo-placementstats'},'community-browser-tests'),db=getFirestore(app);
test.beforeEach(()=>{if(process.env.E2E_FIREBASE!=='true')throw new Error('Emulators required.');});
test('discovery, clean reading, saved prep and report moderation work together',async({page,browser})=>{
  test.setTimeout(120000);
  const owner=await signInGoogle(page),ids=[randomUUID(),randomUUID()],tag=`Experience ${randomUUID()}`;
  for(const [index,id] of ids.entries())await db.doc(`procedurePosts/${id}`).set({...initialProcedureDraft(),id,title:`${tag} ${index}`,summary:'A focused coding round with arrays and SQL.',rounds:['Coding'],companyKey:'barclays',companyName:'Barclays',role:'Software Engineer',body:'## Coding\nI solved an array problem and explained its complexity before discussing SQL joins.\n\nPreparation\n-----------\nPractise explaining projects clearly.',published:true,publishedAt:Date.now()+index,authorUid:owner,authorName:'Community contributor',revision:1,score:0,upvotes:0,downvotes:0});
  const context=await browser.newContext({viewport:page.viewportSize()!,baseURL:new URL(page.url()).origin}),reader=await context.newPage();
  const adminContext=await browser.newContext({viewport:page.viewportSize()!,baseURL:new URL(page.url()).origin}),admin=await adminContext.newPage();
  try{
    await signInGoogle(reader);await reader.goto('/#procedures');
    await reader.getByRole('searchbox',{name:'Search experiences'}).fill(tag);
    await reader.getByRole('button',{name:'More filters',exact:true}).click();
    const sheet=reader.getByRole('dialog',{name:'Filter experiences'});
    await sheet.getByLabel('Round',{exact:true}).selectOption('Coding');
    await sheet.getByRole('button',{name:'Apply filters',exact:true}).click();
    await expect(reader.getByRole('link',{name:'Barclays experiences',exact:true})).toContainText('2 experiences');
    await reader.getByRole('link',{name:'Barclays experiences',exact:true}).click();
    await expect(reader.locator('.procedure-card h3').filter({hasText:tag})).toHaveCount(2);
    await expect(reader.getByRole('button',{name:'Compare',exact:true})).toHaveCount(0);
    await reader.getByRole('link',{name:'Company details',exact:true}).first().click();
    await expect(reader.getByRole('heading',{name:'Barclays experiences'})).toBeVisible();
    await expect(reader.getByRole('link',{name:'2025 placement statistics',exact:false})).toBeVisible();
    await reader.goto(`/#procedures/${ids[0]}`);
    await expect(reader.getByRole('navigation',{name:'Experience sections'})).toHaveCount(0);
    await expect(reader.getByLabel('Ask a question')).toHaveCount(0);
    await reader.getByRole('button',{name:'Save for prep',exact:true}).click();
    await expect(reader.getByRole('button',{name:'Remove from saved experiences'})).toBeVisible();
    await reader.goto('/#procedures/saved');
    await expect(reader.getByRole('heading',{name:`${tag} 0`,exact:true})).toBeVisible();
    await db.doc(`procedurePosts/${ids[0]}`).update({revision:2});await reader.reload();
    await expect(reader.getByText('A newer approved revision is available.')).toBeVisible();
    await reader.goto(`/#procedures/${ids[0]}`);
    const adminUid=await signInGoogle(admin);await getAuth(app).setCustomUserClaims(adminUid,{role:'admin'});
    await admin.evaluate(`(async()=>{const {getFirebase}=await import('/src/firebase.ts');await getFirebase().auth.currentUser.getIdToken(true);})()`);
    await admin.goto('/#admin/procedures');
    await admin.locator('summary').filter({hasText:'Moderation overview'}).click();
    await expect(admin.getByText('All notifications are delivered in the app.', {exact:false})).toBeVisible();
    await expect(admin.getByRole('button',{name:'Retry failed emails'})).toHaveCount(0);
    await reader.locator('.reader-footer > details').filter({hasText:'Report experience'}).locator('summary').click();
    const report=reader.locator('.reader-footer > details').filter({hasText:'Report experience'});
    await report.getByLabel('Details (optional)').fill(`Please check whether the coding format has changed. ${tag}`);
    await report.getByRole('button',{name:'Send report'}).click();
    await expect(report.getByText('Report received',{exact:false})).toBeVisible();
    await admin.getByRole('button',{name:'Reports',exact:true}).click();
    const reportCard=admin.locator('.procedure-card').filter({hasText:`Please check whether the coding format has changed. ${tag}`});
    await reportCard.getByLabel('Moderation reason').fill('Contributor should confirm the latest format.');await reportCard.getByRole('button',{name:'Request correction'}).click();
    await expect(reportCard).toHaveCount(0);await page.goto('/#procedures/notifications');
    await expect(page.getByRole('heading',{name:'Correction requested',exact:false})).toBeVisible();
    await reader.screenshot({path:`artifacts/community-${test.info().project.name}.png`,fullPage:true});
  }finally{await context.close();await adminContext.close();}
});

test('device writing survives a new tab and cloud conflicts require an explicit choice',async({page,context})=>{
  test.setTimeout(60000);const uid=await signInGoogle(page),id=randomUUID(),account={...initialProcedureDraft(),companyKey:'barclays',role:'Software Engineer',graduationYear:2026,body:'Account writing contains the latest saved SQL and arrays interview experience.'};
  await db.doc(`procedureSubmissions/${id}`).set({ownerUid:uid,draft:account,draftVersion:2,revision:0,status:'draft',feedback:'',updatedAt:Date.now()});
  await page.evaluate(({uid,id,account})=>localStorage.setItem(`procedure-backup:${uid}:${id}`,JSON.stringify({id,version:1,draft:{...account,body:'Device writing must survive a closed tab and never overwrite the newer account version silently.'},updatedAt:Date.now()})),{uid,id,account});
  const reopened=await context.newPage();try{
    await reopened.goto(`/#procedures/contribute?draft=${id}`);
    await expect(reopened.getByRole('heading',{name:'This draft changed on your account.'})).toBeVisible();
    await expect(reopened.getByLabel('Your experience',{exact:true})).toContainText('Device writing');
    await expect(reopened.getByRole('button',{name:'Save now',exact:true})).toBeDisabled();
    await reopened.getByRole('button',{name:'Keep this device version'}).click();
    await reopened.getByRole('button',{name:'Save now',exact:true}).click();
    await expect(reopened.getByRole('status')).toContainText('Saved to your account');
    expect((await db.doc(`procedureSubmissions/${id}`).get()).data()!.draft.body).toContain('Device writing');
    await reopened.getByRole('button',{name:'Cancel',exact:true}).click();
    await reopened.getByRole('link',{name:'Share an experience',exact:true}).click();
    await reopened.locator('summary').filter({hasText:'Optional details'}).click();
    await expect(reopened.getByLabel('Role',{exact:true})).toHaveValue('Software Engineer');
    await expect(reopened.getByLabel('Graduation year',{exact:true})).toHaveValue('2026');
    await expect(reopened.getByLabel('Your experience',{exact:true})).not.toContainText('Device writing');
  }finally{await reopened.close();}
});
