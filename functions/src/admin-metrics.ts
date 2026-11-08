import type {Firestore} from 'firebase-admin/firestore';
import {z} from 'zod';
import type {Actor} from './service.js';
import {isOwner} from './access.js';
import {parse,jobView} from './admin-common.js';
import {canonicalCompanyKey} from '../../shared/company-identity.js';
export async function dashboard(db:Firestore,actor:Actor) {
  const [pending,reports,oldest,events,jobs,batches]=await Promise.all([
    db.collection('procedureSubmissions').where('status','==','pending').count().get(),db.collection('procedureReports').where('status','==','open').count().get(),
    db.collection('procedureSubmissions').where('status','==','pending').orderBy('updatedAt').limit(1).get(),db.collection('adminTelemetry').orderBy('createdAt','desc').limit(1).get(),db.collection('adminJobs').orderBy('createdAt','desc').limit(12).get(),Promise.all([2025,2026,2027].map(value=>db.doc(`batches/${value}`).get()))]);
  return {owner:isOwner(actor.uid),pending:pending.data().count,reports:reports.data().count,oldestAt:oldest.docs[0]?.data().updatedAt||null,lastError:events.docs[0]?.data()||null,jobs:jobs.docs.map(doc=>({id:doc.id,...jobView(doc.data())})),batches:batches.map(doc=>({year:Number(doc.id),activeVersion:doc.data()?.activeVersion||null,publishedAt:doc.data()?.publishedAt||null})),checkedAt:Date.now()};
}
export async function operations(db:Firestore,input:unknown) {
  const data=parse(z.object({cursor:z.object({time:z.number(),id:z.string().max(128)}).optional()}).strict(),input);let query=db.collection('adminJobs').orderBy('createdAt','desc').orderBy('__name__','desc').limit(26);if(data.cursor)query=query.startAfter(data.cursor.time,data.cursor.id);const [jobs,errors]=await Promise.all([query.get(),db.collection('adminTelemetry').orderBy('createdAt','desc').limit(10).get()]);return {jobs:jobs.docs.slice(0,25).map(doc=>({id:doc.id,...jobView(doc.data())})),cursor:jobs.size>25?{time:jobs.docs[24].data().createdAt,id:jobs.docs[24].id}:null,errors:errors.docs.map(doc=>({id:doc.id,...doc.data()})),telemetry:'Admin jobs and sampled community API failures are instrumented. Notification delivery and infrastructure health are not monitored here.',checkedAt:Date.now()};
}
const eventCursor=z.object({time:z.number(),id:z.string().max(1500)}).nullable().optional();
export async function auditTrail(db:Firestore,input:unknown) {
  const data=parse(z.object({admin:eventCursor,moderation:eventCursor,record:z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/).optional(),kind:z.enum(['all','users','data','moderation']).default('all')}).strict(),input);
  const sources=['adminAudit','procedureModeration'] as const;
  if(data.record){const docs=await Promise.all(sources.map(source=>db.doc(`${source}/${data.record}`).get()));return {rows:docs.filter(doc=>doc.exists).map(doc=>{const row=doc.data()!;return {id:doc.id,source:doc.ref.parent.id,...row,actorUid:row.actorUid||row.adminUid||row.ownerUid||'',target:row.target||row.submissionId||'',reason:row.reason||row.feedback||'',status:row.status||'succeeded',summary:row.summary||{revision:row.revision||null}};}),cursor:null,scanned:docs.length};}
  const pages=await Promise.all(sources.map(async(source,index)=>{let query=db.collection(source).orderBy('createdAt','desc').orderBy('__name__','desc').limit(26);const cursor=index?data.moderation:data.admin;if(cursor)query=query.startAfter(cursor.time,cursor.id);const page=await query.get();return page.docs.map(doc=>{const row=doc.data();return {id:doc.id,source,createdAt:row.createdAt,actorUid:row.actorUid||row.adminUid||row.ownerUid||'',action:row.action,target:row.target||row.submissionId||row.reportId||'',reason:row.reason||row.feedback||'',status:row.status||'succeeded',summary:row.summary||{revision:row.revision||null}};});}));
  const selected=pages.flat().sort((a,b)=>b.createdAt-a.createdAt||(a.id===b.id?0:a.id>b.id?-1:1)).slice(0,25);
  const cursors=sources.map((source,index)=>{const row=selected.filter(row=>row.source===source).at(-1);return row?{time:row.createdAt,id:row.id}:index?data.moderation||null:data.admin||null;});
  return {rows:selected.filter(row=>data.kind==='all'||(data.kind==='moderation'?row.source==='procedureModeration':data.kind==='users'?row.action.startsWith('user.'):row.source==='adminAudit'&&!row.action.startsWith('user.'))),cursor:selected.length===25?{admin:cursors[0],moderation:cursors[1]}:null,scanned:selected.length};
}
export async function analytics(db:Firestore,input:unknown) {
  const {days}=parse(z.object({days:z.union([z.literal(7),z.literal(30),z.literal(90)])}).strict(),input);
  const midnight=new Date();midnight.setUTCHours(0,0,0,0);const since=midnight.getTime()-(days-1)*86400000;
  const [events,reports,posts]=await Promise.all([db.collection('procedureModeration').where('createdAt','>=',since).orderBy('createdAt').limit(5001).get(),db.collection('procedureReports').where('createdAt','>=',since).orderBy('createdAt').select('createdAt').limit(5001).get(),db.collection('procedurePosts').where('published','==',true).select('companyKey','appearanceYear').limit(5001).get()]);
  const daily=new Map<string,{date:string;submissions:number;approvals:number;reports:number}>();for(let index=days-1;index>=0;index--){const date=new Date(midnight.getTime()-index*86400000).toISOString().slice(0,10);daily.set(date,{date,submissions:0,approvals:0,reports:0});}
  let reviewMs=0,reviewCount=0;
  for(const doc of events.docs.slice(0,5000)){const event=doc.data(),day=daily.get(new Date(event.createdAt).toISOString().slice(0,10));if(day&&event.action==='submitted')day.submissions++;if(day&&event.action==='approved')day.approvals++;if(typeof event.turnaroundMs==='number'){reviewMs+=event.turnaroundMs;reviewCount++;}}
  for(const doc of reports.docs.slice(0,5000)){const day=daily.get(new Date(doc.data().createdAt).toISOString().slice(0,10));if(day)day.reports++;}
  const coverage=new Map<string,number>();for(const doc of posts.docs.slice(0,5000)){const row=doc.data(),key=`${canonicalCompanyKey(row.companyKey||'unknown')} · ${row.appearanceYear}`;coverage.set(key,(coverage.get(key)||0)+1);}
  return {days,daily:[...daily.values()],reviewHours:reviewCount?reviewMs/reviewCount/3600000:null,reviewCount,coverage:[...coverage].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count),limited:events.size>5000||reports.size>5000||posts.size>5000,checkedAt:Date.now(),definitions:'UTC calendar-day counts of recorded submission/approval events and reports. Review time averages recorded turnaroundMs. Coverage counts currently published experiences, across all dates. Each source is capped at 5,000 records; this is not a user-activity tracker.'};
}
