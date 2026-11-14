import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { companyProfileSchema } from '../shared/company-profile.js';
import { createAdminTarget, safeMigrationError } from './firebase-admin.js';

let target:ReturnType<typeof createAdminTarget>|undefined;
try {
  const profile=companyProfileSchema.parse(JSON.parse(readFileSync(new URL('../data/company-profiles/wissen-technology.json',import.meta.url),'utf8')));
  if(!existsSync(new URL('../public'+profile.logoPath,import.meta.url)))throw new Error('The bundled Wissen logo is missing.');
  target=createAdminTarget();
  const ref=target.db.doc('procedureCompanies/wissen-technology'),snapshot=await ref.get();
  if(!snapshot.exists||snapshot.get('name')!=='Wissen Technology'||snapshot.get('aliasOf'))throw new Error('The expected existing Wissen Technology company was not found.');
  const previous=snapshot.get('profile');
  if(previous!==undefined&&!companyProfileSchema.safeParse(previous).success)throw new Error('Existing company profile needs review before replacement.');
  const before={name:snapshot.get('name'),years:snapshot.get('years'),profile:previous??null,revision:{seconds:snapshot.updateTime!.seconds,nanoseconds:snapshot.updateTime!.nanoseconds}};
  const hash=createHash('sha256').update(JSON.stringify({before,profile})).digest('hex');
  const apply=process.argv.includes('--apply'),at=process.argv.indexOf('--expected-hash');
  if(apply&&(at<0||process.argv[at+1]!==hash))throw new Error('Use the exact current --expected-hash from an inspected preview. No records changed.');
  mkdirSync('artifacts',{recursive:true});
  const backup=`artifacts/wissen-company-profile-${Date.now()}-${apply?'apply':'preview'}.json`;
  writeFileSync(backup,JSON.stringify({project:target.projectId,key:ref.id,before,profile,hash},null,2)+'\n',{flag:'wx'});
  let changed=false;
  if(apply){
    changed=await target.db.runTransaction(async tx=>{
      const current=await tx.get(ref);
      if(!current.updateTime?.isEqual(snapshot.updateTime!))throw new Error('Company changed after preview; rerun the preview.');
      if(current.get('profile')!==undefined&&JSON.stringify(companyProfileSchema.parse(current.get('profile')))===JSON.stringify(profile))return false;
      tx.update(ref,{profile});return true;
    });
    const actual=await ref.get();
    if(JSON.stringify(companyProfileSchema.parse(actual.get('profile')))!==JSON.stringify(profile)||actual.get('name')!==before.name||JSON.stringify(actual.get('years'))!==JSON.stringify(before.years))throw new Error('Post-update verification differs; inspect the saved backup.');
  }
  console.log(JSON.stringify({project:target.projectId,key:ref.id,mode:apply?'applied':'preview',hash,changed,years:before.years,profile,backup},null,2));
}catch(cause){console.error(safeMigrationError(cause));process.exitCode=1;}
finally{await target?.close();}
