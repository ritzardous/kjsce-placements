import {test,expect} from '@playwright/test';
import {signInGoogle} from './auth-helper';

test.skip(process.env.E2E_READ_CONSERVATION!=='true','Requires explicit conservation-mode emulator run.');

test('static company selection uses no directory read and idle time does not poll notifications',async({page})=>{
 const directoryRequests:string[]=[],actions:string[]=[];
 page.on('request',request=>{
  if(request.url().includes('Firestore/Listen/channel')){
   try{const body=decodeURIComponent(request.postData()||'');if(body.includes('/companyDirectory/current')||body.includes('"collectionId":"procedureCompanies"'))directoryRequests.push(body);}catch{}
  }
  if(request.url().endsWith('/procedureCommunity')){
   try{actions.push(request.postDataJSON()?.data?.action);}catch{}
  }
 });
 await signInGoogle(page);
 await page.clock.install();
 await page.clock.fastForward(180000);
 expect(actions).not.toContain('notificationSummary');
 await page.goto('/#procedures/contribute?company=barclays');
 await page.locator('.document-company > summary').click();
 const company=page.getByRole('combobox',{name:'Company',exact:true});
 await expect(company).toBeEnabled({timeout:15000});
 await expect(company).toHaveValue('Barclays');
 expect(directoryRequests).toHaveLength(0);
});

test('impact aggregates and notification summaries load only on request',async({page})=>{
 const actions:string[]=[];
 page.on('request',request=>{if(request.url().endsWith('/procedureCommunity')){try{actions.push(request.postDataJSON()?.data?.action);}catch{}}});
 await signInGoogle(page);
 await page.goto('/#procedures/contributions');
 const load=page.getByRole('button',{name:'Load contribution impact',exact:true});
 await expect(load).toBeVisible();
 expect(actions).not.toContain('impact');
 expect(actions).not.toContain('notificationSummary');
 await load.click();
 await expect.poll(()=>actions.filter(action=>action==='impact').length).toBe(1);
 await expect(page.getByText('Contribution impact',{exact:true})).toBeVisible();
 await page.goto('/#procedures/notifications');
 await expect.poll(()=>actions.includes('notificationSummary')).toBe(true);
});
