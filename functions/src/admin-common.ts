import {createHash} from 'node:crypto';
import type {Firestore,DocumentData,Transaction} from 'firebase-admin/firestore';
import {z} from 'zod';
import {HttpsError,type Actor} from './service.js';
export const id=z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),reason=z.string().trim().min(8,'Explain the reason in at least 8 characters.').max(500);
export const year=z.union([z.literal(2025),z.literal(2026),z.literal(2027)]),after=z.string().max(1000).optional();
export function parse<T>(schema:z.ZodType<T>,value:unknown):T {const result=schema.safeParse(value);if(!result.success)throw new HttpsError('invalid-argument',result.error.issues[0]?.message||'Invalid input.');return result.data;}
export function requireValue(value:unknown,message:string):asserts value {if(!value)throw new HttpsError('failed-precondition',message);}
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function audit(db:Firestore,actor:Actor,action:string,target:string,why:string,summary:DocumentData={},status='succeeded') {
  const ref=db.collection('adminAudit').doc();return {ref,data:{actorUid:actor.uid,action,target,reason:why,summary,status,createdAt:Date.now()}};
}
export function writeAudit(tx:Transaction,entry:ReturnType<typeof audit>){tx.create(entry.ref,entry.data);return entry.ref.id;}
export function jobView(data:DocumentData){return {auditId:data.lastAuditId||data.auditId||null,type:data.type,state:data.state,createdAt:data.createdAt,updatedAt:data.updatedAt,createdBy:data.createdBy,year:data.year??null,sourceName:data.sourceName||'',progress:data.progress||0,total:data.total||0,message:data.message||'',preview:data.preview||null,version:data.version||null,previousVersion:data.previousVersion||null,reason:data.reason||'',leaseUntil:data.leaseUntil||0};}
