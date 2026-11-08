import {randomUUID} from 'node:crypto';
import type {Firestore,DocumentData} from 'firebase-admin/firestore';
import {z} from 'zod';
import {HttpsError,type Actor} from './service.js';
import {canonicalCompanyKey} from '../../shared/company-identity.js';
import {chunkId,parseDashboard,versionSchema} from '../../shared/publication.js';
import {prepareUploadedPublication,stagePublication,verifyPublication,sha256,type Publication} from '../../scripts/publication.js';
import {id,reason,year,after,parse,requireValue,hash,audit,writeAudit,jobView} from './admin-common.js';
import {qualityStep,repairStep,recoverStep,repairPreview} from './admin-quality.js';
export async function readDashboard(db:Firestore,year:number,version:string) {
  const path=`batches/${year}/versions/${version}`,manifest=versionSchema.parse((await db.doc(path).get()).data());
  const rows=await db.getAll(...Array.from({length:manifest.chunkCount},(_,index)=>db.doc(`${path}/views/${chunkId(index)}`)));
  const payload=rows.map(row=>row.data()?.payload||'').join('');requireValue(sha256(payload)===manifest.payloadHash,'Published version failed integrity checks.');
  const dashboard=parseDashboard(JSON.parse(payload));requireValue(dashboard.statistics.batch.year===year,'The publication belongs to another year.');return dashboard;
}
async function loadImport(db:Firestore,jobId:string,data:DocumentData):Promise<Publication> {
  const chunks=await db.collection(`adminJobs/${jobId}/uploads`).orderBy('__name__').limit(101).get();requireValue(chunks.size===data.chunkCount,'Upload incomplete. Resume the upload before validation.');
  const raw=chunks.docs.map(doc=>doc.data().text).join('');requireValue(Buffer.byteLength(raw)<=5_000_000,'Upload exceeds 5 MB.');
  try{return prepareUploadedPublication(raw,data.year);}catch(error){const detail=error instanceof z.ZodError?error.issues.slice(0,5).map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; '):error instanceof Error?error.message:'Invalid dataset';throw new HttpsError('invalid-argument',`Dataset validation failed: ${detail.slice(0,1200)}`);}
}
export async function createJob(db:Firestore,actor:Actor,input:unknown) {
  const data=parse(z.object({type:z.enum(['quality','import','repair','recover']),requestId:id,reason,year:year.optional(),sourceName:z.string().trim().min(1).max(120).optional(),chunkCount:z.number().int().min(1).max(100).optional(),company:id.optional(),repairId:id.optional()}).strict(),input);
  if(data.type==='import')requireValue(data.year&&data.chunkCount&&data.sourceName,'Choose a batch and source file.');
  if(data.type==='repair')requireValue(data.company&&canonicalCompanyKey(data.company)!==data.company,'Only reviewed aliases can be repaired automatically.');
  if(data.type==='recover')requireValue(data.repairId,'Choose the repair to recover.');
  const preview=data.type==='repair'?await repairPreview(db,data.company!):null;
  const ref=db.doc(`adminJobs/${data.requestId}`),digest=hash(JSON.stringify(data));
  return db.runTransaction(async tx=>{const existing=await tx.get(ref);if(existing.exists){requireValue(existing.data()!.inputHash===digest&&existing.data()!.createdBy===actor.uid,'Job ID is already used.');return {id:ref.id};}
    let previousVersion:string|null=null;
    if(data.type==='import'){const active=await tx.get(db.doc(`batches/${data.year}`));previousVersion=active.data()?.activeVersion||null;}
    const entry=audit(db,actor,`job.${data.type}.created`,ref.id,data.reason);
    tx.create(ref,{...data,inputHash:digest,createdBy:actor.uid,createdAt:Date.now(),updatedAt:Date.now(),state:data.type==='import'?'uploading':'queued',progress:0,total:0,phase:0,cursor:null,previousVersion,preview,leaseUntil:0,auditId:entry.ref.id});writeAudit(tx,entry);return {id:ref.id,auditId:entry.ref.id};});
}
export async function uploadChunk(db:Firestore,input:unknown) {
  const data=parse(z.object({id,index:z.number().int().min(0).max(99),text:z.string().max(50000)}).strict(),input);requireValue(Buffer.byteLength(data.text)<=50000,'Upload chunk too large.');
  await db.runTransaction(async tx=>{const job=await tx.get(db.doc(`adminJobs/${data.id}`));requireValue(['uploading','invalid'].includes(job.data()?.state)&&data.index<job.data()!.chunkCount,'This import is not accepting uploads.');const ref=db.doc(`adminJobs/${data.id}/uploads/${String(data.index).padStart(3,'0')}`),old=await tx.get(ref);requireValue(!old.exists||old.data()!.text===data.text,'Uploaded chunk differs; start a new import.');if(!old.exists)tx.create(ref,{text:data.text});});return {saved:true};
}
export async function validateImport(db:Firestore,actor:Actor,input:unknown) {
  const {id:jobId}=parse(z.object({id}).strict(),input),ref=db.doc(`adminJobs/${jobId}`),snapshot=await ref.get(),data=snapshot.data();requireValue(data?.type==='import','Import not found.');if(data.state!=='uploading'&&data.state!=='invalid')return {id:jobId};
  try {
  const publication=await loadImport(db,jobId,data);const active=data.previousVersion?await readDashboard(db,data.year,data.previousVersion):null;
  const preview={before:active?.statistics.summary||null,after:publication.dashboard.statistics.summary,announcements:publication.dataset.placements.length,sourceHash:publication.sourceHash};
  const entry=audit(db,actor,'import.validated',jobId,data.reason,{version:publication.version});
  await db.runTransaction(async tx=>{const latest=await tx.get(ref);requireValue(['uploading','invalid'].includes(latest.data()?.state),'Import validation already completed.');tx.update(ref,{state:'queued',message:'',preview,version:publication.version,lastAuditId:entry.ref.id,updatedAt:Date.now()});writeAudit(tx,entry);});return {id:jobId,preview,auditId:entry.ref.id};
  }catch(error){await db.runTransaction(async tx=>{const current=await tx.get(ref);if(['uploading','invalid'].includes(current.data()?.state)){const entry=audit(db,actor,'import.validation_failed',jobId,data.reason,{},'failed');tx.update(ref,{lastAuditId:entry.ref.id,state:'invalid',message:error instanceof HttpsError?error.message:'Validation could not finish. Retry or start a new source import.',updatedAt:Date.now()});writeAudit(tx,entry);}});throw error;}
}
export async function runJob(db:Firestore,actor:Actor,input:unknown) {
  const {id:jobId}=parse(z.object({id}).strict(),input),ref=db.doc(`adminJobs/${jobId}`),lease=randomUUID();
  const data=await db.runTransaction(async tx=>{const doc=await tx.get(ref),data=doc.data();requireValue(data,'Job not found.');if(['completed','ready','published','rolled_back'].includes(data.state))return null;requireValue(['queued','failed','running'].includes(data.state),'Finish uploading and validate first.');requireValue(!data.leaseUntil||data.leaseUntil<Date.now(),'This job is running. Retry after its lease expires.');tx.update(ref,{lease,leaseUntil:Date.now()+60000,state:'running',updatedAt:Date.now()});return data;});
  if(!data)return {id:jobId,done:true};
  try {
    let result:DocumentData;
    if(data.type==='import'){const publication=await loadImport(db,jobId,data);requireValue(publication.version===data.version,'Import contents changed.');result=await stagePublication(db,publication,data.progress||0,100);result.progress=result.offset;delete result.offset;if(result.done)await verifyPublication(db,publication,false);}
    else if(data.type==='quality')result=await qualityStep(db,jobId,data);
    else if(data.type==='repair')result=await repairStep(db,jobId,data);
    else result=await recoverStep(db,jobId,data);
    const {done,...progress}=result,state=done?(data.type==='import'?'ready':'completed'):'queued';
    const entry=audit(db,actor,done?`job.${data.type}.completed`:data.state==='failed'?`job.${data.type}.retried`:`job.${data.type}.progress`,jobId,data.reason,{progress:progress.progress||0});
    await db.runTransaction(async tx=>{const current=await tx.get(ref);requireValue(current.data()?.lease===lease,'Job lease changed. Reload the job.');tx.update(ref,{...progress,state,lastAuditId:entry.ref.id,leaseUntil:0,updatedAt:Date.now(),message:progress.message||''});writeAudit(tx,entry);});
    return {id:jobId,done:!!done,state,progress:progress.progress,auditId:entry.ref.id};
  }catch(error){await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.lease===lease){const entry=audit(db,actor,`job.${data.type}.failed`,jobId,data.reason,{},'failed');tx.update(ref,{lastAuditId:entry.ref.id,state:'failed',leaseUntil:0,updatedAt:Date.now(),message:error instanceof HttpsError?error.message:'Validation or job execution failed. Review the source and retry; staged data stays private.'});writeAudit(tx,entry);}});throw error;}
}
export async function publish(db:Firestore,actor:Actor,input:unknown,rollback=false) {
  const data=parse(z.object({id,reason}).strict(),input),ref=db.doc(`adminJobs/${data.id}`),job=(await ref.get()).data();requireValue(job?.type==='import','Import not found.');
  if(rollback){if(job.state==='rolled_back')return {auditId:job.rollbackAuditId};requireValue(job.state==='published'&&job.previousVersion,'No previous publication is available to restore.');await readDashboard(db,job.year,job.previousVersion);}
  else {if(job.state==='published')return {auditId:job.publishAuditId};requireValue(job.state==='ready','Validate and stage the import first.');const p=await loadImport(db,data.id,job);await verifyPublication(db,p,false);}
  const entry=audit(db,actor,rollback?'publication.rollback':'publication.publish',String(job.year),data.reason,{before:rollback?job.version:job.previousVersion,after:rollback?job.previousVersion:job.version});
  await db.runTransaction(async tx=>{const [manifest,latest]=await Promise.all([tx.get(db.doc(`batches/${job.year}`)),tx.get(ref)]);requireValue(latest.data()?.state===job.state,'Import changed. Reload before publishing.');requireValue((manifest.data()?.activeVersion||null)===(rollback?job.version:job.previousVersion),rollback?'A newer version is active. Open its publication job; this rollback is blocked.':'Another version was published. Stage a new import against the current version before replacing it.');
    tx.set(db.doc(`batches/${job.year}`),{year:job.year,activeVersion:rollback?job.previousVersion:job.version,publishedAt:Date.now()},{merge:true});
    tx.update(ref,{state:rollback?'rolled_back':'published',lastAuditId:entry.ref.id,updatedAt:Date.now(),[rollback?'rollbackAuditId':'publishAuditId']:entry.ref.id});writeAudit(tx,entry);
  });return {auditId:entry.ref.id};
}
export async function jobDetails(db:Firestore,input:unknown) {
  const data=parse(z.object({id,cursor:after}).strict(),input),job=await db.doc(`adminJobs/${data.id}`).get();requireValue(job.exists,'Job not found.');let query=db.collection(`adminJobs/${data.id}/issues`).orderBy('__name__').limit(51);if(data.cursor)query=query.startAfter(data.cursor);const page=await query.get(),rows=page.docs.slice(0,50);return {id:job.id,...jobView(job.data()!),issues:rows.map(doc=>({id:doc.id,...doc.data()})),cursor:page.size>50?rows.at(-1)!.id:null};
}
