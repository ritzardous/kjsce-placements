import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {community} from '../../functions/src/community.js';
import {publishCompanyDirectory} from '../../functions/src/company-directory.js';
import {companyDirectorySchema} from '../../shared/company-directory.js';

test('compact catalog includes concurrent company creation atomically without private metadata',async t=>{
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  const app=initializeApp({projectId:'demo-compact-directory'},'compact-directory-test'),db=getFirestore(app);
  t.after(()=>deleteApp(app));
  await db.doc('procedureCompanies/example').set({name:'Example',years:[2027],createdBy:'private'});
  const publication=await publishCompanyDirectory(db);
  assert.equal(publication.companies,1);
  await Promise.all(['Alpha','Beta'].map((name,i)=>community(db,{uid:'directory-creator-'+i,token:{firebase:{sign_in_provider:'google.com'},email_verified:true}},{action:'createCompany',payload:{name:'Compact '+name}})));
  const data=companyDirectorySchema.parse((await db.doc('companyDirectory/current').get()).data());
  assert.equal(data.companies.length,3);
  assert(!JSON.stringify(data).includes('createdBy'));
  assert(!JSON.stringify(data).includes('directory-creator'));
  for(const row of data.companies)assert((await db.doc('procedureCompanies/'+row.key).get()).exists);
});
