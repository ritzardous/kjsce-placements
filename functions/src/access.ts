import {createHash} from 'node:crypto';
import type {Auth} from 'firebase-admin/auth';
import type {Firestore} from 'firebase-admin/firestore';
import {authorize,HttpsError,type Actor} from './service.js';
/** Check live account state, including requests made with an existing token. */
export async function currentActor(db:Firestore,auth:Auth,value:Actor|undefined,admin=false) {
  const actor=authorize(value,admin);
  const [account,access]=await Promise.all([auth.getUser(actor.uid),db.doc(`accountAccess/${actor.uid}`).get()]);
  const policy=access.data();
  if(account.disabled||policy?.suspended)throw new HttpsError('permission-denied','This account is suspended. Contact the app owner.');
  if(policy?.revokedBefore && Number(actor.token.auth_time||0)<policy.revokedBefore)throw new HttpsError('unauthenticated','Sign in again to continue.');
  if(admin&&account.customClaims?.role!=='admin')throw new HttpsError('permission-denied','Admin access has been revoked.');
  return actor;
}
export function isOwner(uid:string) {return (process.env.ADMIN_OWNER_UIDS||'').split(',').map(value=>value.trim()).filter(Boolean).includes(uid);}

export async function recordServiceFailure(db:Firestore,uid:string,action:string,code:string,scope='community') {
  if(scope==='community'&&!['unavailable','internal','unknown','deadline-exceeded'].includes(code))return;
  const key=createHash('sha256').update(uid+':'+action+':'+Math.floor(Date.now()/60000)).digest('hex');
  await db.doc('adminTelemetry/'+key).set({action,scope,code,createdAt:Date.now(),message:'A service request failed. Review the affected workflow and retry.'}).catch(()=>{});
}
export async function securedCall<T>(db:Firestore,auth:Auth,value:Actor|undefined,action:string,admin:boolean,run:(actor:Actor)=>Promise<T>) {
  const actor=await currentActor(db,auth,value,admin);
  try{return await run(actor);}catch(error){await recordServiceFailure(db,actor.uid,action,error instanceof HttpsError?error.code:'internal');throw error;}
}
