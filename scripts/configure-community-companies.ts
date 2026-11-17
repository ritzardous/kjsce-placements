import {createHash} from 'node:crypto';
import {prepareDirectoryChange} from '../functions/src/company-directory.js';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {z} from 'zod';
import {companyProfileSchema} from '../shared/company-profile.js';
import {documentId} from '../shared/document-id.js';
import {createAdminTarget,safeMigrationError} from './firebase-admin.js';

// This command applies only the reviewed community listings, never a catalog reseed.
const keys=['gracenote-nielsen','intrade','marico-limited','morgan-stanley','magellan'];
let target:ReturnType<typeof createAdminTarget>|undefined;
try {
  const entries=z.array(z.object({key:documentId(),name:z.string().trim().min(2).max(100),profile:companyProfileSchema.optional()}).strict()).length(5)
    .parse(JSON.parse(readFileSync(new URL('../data/company-profiles/community-additions-2026-11-16.json',import.meta.url),'utf8')));
  if(!isDeepStrictEqual(entries.map(row=>row.key),keys))throw new Error('The reviewed company scope differs. Stop and review the input.');
  for(const row of entries)if(row.profile&&!existsSync(new URL('../public'+row.profile.logoPath,import.meta.url)))throw new Error('A reviewed logo asset is missing.');
  target=createAdminTarget();
  const db=target.db,refs=entries.map(row=>db.doc(`procedureCompanies/${row.key}`)),snapshots=await db.getAll(...refs);
  const before=snapshots.map((snapshot,i)=>{
    if(snapshot.exists&&(snapshot.get('name')!==entries[i].name||snapshot.get('aliasOf')))throw new Error('An existing company identity needs review; no merge or rename was attempted.');
    if(snapshot.exists&&!z.array(z.number().int()).safeParse(snapshot.get('years')).success)throw new Error('Existing company years need review.');
    const data=snapshot.data();
    if(data?.profile!==undefined&&!companyProfileSchema.safeParse(data.profile).success)throw new Error('An existing profile needs review.');
    return {key:entries[i].key,exists:snapshot.exists,data:data??null,revision:snapshot.updateTime?{seconds:snapshot.updateTime.seconds,nanoseconds:snapshot.updateTime.nanoseconds}:null};
  });
  const hash=createHash('sha256').update(JSON.stringify({project:target.projectId,before,entries})).digest('hex');
  const apply=process.argv.includes('--apply'),at=process.argv.indexOf('--expected-hash');
  if(apply&&(at<0||process.argv[at+1]!==hash))throw new Error('Use the exact current --expected-hash from a reviewed preview. No records changed.');
  mkdirSync('artifacts',{recursive:true});
  const backup=`artifacts/community-companies-${Date.now()}-${apply?'apply':'preview'}.json`;
  writeFileSync(backup,JSON.stringify({project:target.projectId,before,entries,hash},null,2)+'\n',{flag:'wx'});
  let changed=0;
  if(apply){
    changed=await db.runTransaction(async tx=>{
      const current=await tx.getAll(...refs);let count=0;
      const publish=await prepareDirectoryChange(db,tx,entries.map((row,i)=>({key:row.key,value:{...(current[i].data()??{name:row.name,years:[]}),...(row.profile?{profile:row.profile}:{})}})));
      for(const [i,row]of entries.entries()){
        if(current[i].exists!==snapshots[i].exists||(current[i].exists&&!current[i].updateTime!.isEqual(snapshots[i].updateTime!)))throw new Error('Company changed after preview; rerun the preview.');
        if(!current[i].exists){tx.create(refs[i],{name:row.name,years:[],source:'community',...(row.profile?{profile:row.profile}:{})});count++;}
        else if(row.profile&&!isDeepStrictEqual(current[i].get('profile'),row.profile)){tx.update(refs[i],{profile:row.profile});count++;}
      }
      publish();return count;
    });
    const saved=await db.getAll(...refs);
    for(const [i,row]of entries.entries()){
      const actual=saved[i].data();
      if(!actual||actual.name!==row.name||!isDeepStrictEqual(actual.years,before[i].data?.years??[]))throw new Error('Company read-back differs; inspect the saved backup.');
      if(row.profile&&!isDeepStrictEqual(companyProfileSchema.parse(actual.profile),row.profile))throw new Error('Profile read-back differs.');
      if(before[i].data){const {profile:oldProfile,...oldOther}=before[i].data!;const {profile:newProfile,...newOther}=actual;if(!isDeepStrictEqual(oldOther,newOther)||(!row.profile&&!isDeepStrictEqual(oldProfile,newProfile)))throw new Error('Unrelated company metadata changed.');}
    }
  }
  console.log(JSON.stringify({project:target.projectId,mode:apply?'applied':'preview',hash,changed,companies:entries.map(row=>({key:row.key,name:row.name,profile:row.profile??null})),backup},null,2));
}catch(cause){console.error(safeMigrationError(cause));process.exitCode=1;}
finally{await target?.close();}
