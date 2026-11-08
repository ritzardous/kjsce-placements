import type {Firestore,DocumentData} from 'firebase-admin/firestore';
import {canonicalCompanyKey,canonicalCompanyName} from '../../shared/company-identity.js';
import {procedureDraftSchema} from '../../shared/procedures.js';
import {requireValue,hash} from './admin-common.js';
import {invalidateCompanyDiscovery} from './company-discovery.js';
async function addIssue(db:Firestore,jobId:string,collection:string,docId:string,issue:string,repairable=false) {await db.doc(`adminJobs/${jobId}/issues/${hash(collection+docId+issue)}`).set({collection,documentId:docId,issue,repairable});}
export async function qualityStep(db:Firestore,jobId:string,data:DocumentData) {
  const collections=['procedureCompanies','procedureSubmissions','procedurePosts'],collection=collections[data.phase||0];
  let query=db.collection(collection).orderBy('__name__').limit(100);if(data.cursor)query=query.startAfter(data.cursor);
  const page=await query.get();
  for(const doc of page.docs){const row=doc.data();if(row.deleted)continue;
    if(collection==='procedureCompanies'){
      const key=canonicalCompanyKey(doc.id);
      if(key!==doc.id&&!row.aliasOf)await addIssue(db,jobId,collection,doc.id,`Reviewed alias of ${key}`,true);
      if(typeof row.name!=='string'||!Array.isArray(row.years))await addIssue(db,jobId,collection,doc.id,'Malformed company record');
      if(typeof row.name==='string'){const normalized=row.name.toLowerCase().replace(/[^a-z0-9]/g,''),ref=db.doc(`adminJobs/${jobId}/names/${hash(normalized)}`),seen=await ref.get();if(seen.exists&&seen.data()!.key!==key)await addIssue(db,jobId,collection,doc.id,`Similar company name to ${seen.data()!.key}; manual review required`);else await ref.set({key});}
    }else{
      const draft=row.draft||row,key=canonicalCompanyKey(typeof draft.companyKey==='string'?draft.companyKey:'');
      if(key&&!/^[a-zA-Z0-9_-]{1,100}$/.test(key))await addIssue(db,jobId,collection,doc.id,'Invalid company identifier; manual review required');
      else if(key&&!(await db.doc(`procedureCompanies/${key}`).get()).exists)await addIssue(db,jobId,collection,doc.id,'Unknown company reference; preserve for review');
      if(collection==='procedureSubmissions'&&!procedureDraftSchema.safeParse(draft).success)await addIssue(db,jobId,collection,doc.id,'Draft does not meet current validation; private writing retained');
    }
  }
  const phase=page.size<100?(data.phase||0)+1:(data.phase||0);
  return {phase,cursor:page.size<100?null:page.docs.at(-1)!.id,progress:(data.progress||0)+page.size,done:phase===collections.length};
}
async function backupAndPatch(db:Firestore,jobId:string,path:string,changes:DocumentData) {
  const ref=db.doc(path),backup=db.doc(`adminJobs/${jobId}/backups/${hash(path)}`);
  await db.runTransaction(async tx=>{const [current,previous]=await Promise.all([tx.get(ref),tx.get(backup)]);if(previous.exists)return;requireValue(current.exists,'A repair target disappeared. Run a new scan.');
    const field=Object.keys(changes)[0];if(canonicalCompanyKey(current.get(field)||'')!==changes[field])throw new Error('A company reference changed during repair. Reload before retrying.');
    const before:DocumentData={},missing:string[]=[];for(const field of Object.keys(changes)){if(current.get(field)===undefined)missing.push(field);else before[field]=current.get(field);}
    tx.create(backup,{path,before,missing,after:changes});tx.update(ref,changes);
  });
}
export async function repairStep(db:Firestore,jobId:string,data:DocumentData) {
  const source=data.company as string,target=canonicalCompanyKey(source);
  if(!data.phase){
    const ref=db.doc(`procedureCompanies/${source}`),canonical=db.doc(`procedureCompanies/${target}`),backup=db.doc(`adminJobs/${jobId}/backups/directory`);
    await db.runTransaction(async tx=>{const [from,to,saved]=await Promise.all([tx.get(ref),tx.get(canonical),tx.get(backup)]);if(saved.exists)return;requireValue(from.exists&&Array.isArray(from.data()!.years),'Company alias is not available.');
      const before={source:from.data(),target:to.data()||null},after={name:canonicalCompanyName(target,from.data()!.name),years:[...new Set([...(to.data()?.years||[]),...from.data()!.years])].sort(),key:target};
      tx.create(backup,{source,target,before,after});tx.set(canonical,after,{merge:true});tx.update(ref,{aliasOf:target});
    });return {phase:1,cursor:null,progress:1,done:false};
  }
  const collection=data.phase===1?'procedureSubmissions':'procedurePosts',field=data.phase===1?'draft.companyKey':'companyKey';
  const page=await db.collection(collection).where(field,'==',source).limit(50).get();
  for(const doc of page.docs)await backupAndPatch(db,jobId,doc.ref.path,{[field]:target,companyName:canonicalCompanyName(target,doc.data().companyName||'')});
  invalidateCompanyDiscovery(db);
  return {phase:page.size<50?data.phase+1:data.phase,cursor:null,progress:(data.progress||0)+page.size,done:page.size<50&&data.phase===2};
}
export async function recoverStep(db:Firestore,jobId:string,data:DocumentData) {
  const source=await db.doc(`adminJobs/${data.repairId}`).get();requireValue(source.data()?.type==='repair'&&source.data()?.state==='completed','Only completed repairs can be recovered.');
  let query=db.collection(`adminJobs/${data.repairId}/backups`).orderBy('__name__').limit(50);if(data.cursor)query=query.startAfter(data.cursor);
  const page=await query.get();
  for(const record of page.docs){const saved=record.data();if(record.id==='directory')continue;
    await db.runTransaction(async tx=>{const ref=db.doc(saved.path),marker=db.doc(`adminJobs/${jobId}/recovered/${record.id}`);const [current,previous]=await Promise.all([tx.get(ref),tx.get(marker)]);if(previous.exists)return;
      requireValue(current.exists&&Object.entries(saved.after).every(([key,value])=>JSON.stringify(current.get(key))===JSON.stringify(value)),'A repaired field changed afterwards. Recovery stopped for manual review.');const restored={...current.data()!};
      for(const [field,value] of Object.entries(saved.before)){const parts=field.split('.');if(parts.length===1)restored[field]=value;else restored[parts[0]]={...restored[parts[0]],[parts[1]]:value};}
      for(const field of saved.missing||[]){const parts=field.split('.');if(parts.length===1)delete restored[field];else {restored[parts[0]]={...restored[parts[0]]};delete restored[parts[0]][parts[1]];}}
      tx.set(ref,restored);tx.create(marker,{at:Date.now()});});
  }
  invalidateCompanyDiscovery(db);
  return {cursor:page.docs.at(-1)?.id||data.cursor||null,progress:(data.progress||0)+page.size,done:page.size<50,message:'Restored unchanged reference fields; canonical directory and alias redirects are retained.'};
}
export async function repairPreview(db:Firestore,source:string) {
  requireValue(canonicalCompanyKey(source)!==source,'Only reviewed aliases have automatic repair.');
  const [company,submissions,posts]=await Promise.all([db.doc(`procedureCompanies/${source}`).get(),db.collection('procedureSubmissions').where('draft.companyKey','==',source).count().get(),db.collection('procedurePosts').where('companyKey','==',source).count().get()]);
  requireValue(company.exists,'Company alias not found.');return {source,target:canonicalCompanyKey(source),name:canonicalCompanyName(source,company.data()!.name),submissions:submissions.data().count,posts:posts.data().count,policy:'Back up and redirect the alias, combine directory years, then update current references. Source imports and submitted revision snapshots are preserved.'};
}
