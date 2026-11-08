import {randomUUID} from 'node:crypto';
import type {Firestore,DocumentData} from 'firebase-admin/firestore';
import type {Auth,UserRecord} from 'firebase-admin/auth';
import {z} from 'zod';
import {type Actor} from './service.js';
import {isOwner} from './access.js';
import {id,reason,after,parse,requireValue,hash,audit} from './admin-common.js';
function safeUser(user:UserRecord) {return {uid:user.uid,name:user.displayName||'',email:user.email||'',role:String(user.customClaims?.role||'user'),disabled:user.disabled,createdAt:user.metadata.creationTime,lastSignIn:user.metadata.lastSignInTime||null,verified:user.emailVerified};}
export async function userList(auth:Auth,input:unknown) {
  const data=parse(z.object({search:z.string().trim().max(120).default(''),cursor:after}).strict(),input);
  if(data.search.includes('@')) {try{return {rows:[safeUser(await auth.getUserByEmail(data.search))],cursor:null,scanned:1};}catch(error){if((error as {code?:string}).code==='auth/user-not-found')return {rows:[],cursor:null,scanned:1};throw error;}}
  if(data.search){try{return {rows:[safeUser(await auth.getUser(data.search))],cursor:null,scanned:1};}catch(error){if((error as {code?:string}).code!=='auth/user-not-found')throw error;}}
  const result=await auth.listUsers(50,data.cursor),query=data.search.toLowerCase();
  return {rows:result.users.filter(user=>!query||`${user.displayName||''} ${user.email||''} ${user.uid}`.toLowerCase().includes(query)).map(safeUser),cursor:result.pageToken||null,scanned:result.users.length};
}
export async function userDetail(db:Firestore,auth:Auth,input:unknown) {
  const {uid}=parse(z.object({uid:id}).strict(),input);const [user,access,contributions,reports]=await Promise.all([auth.getUser(uid),db.doc(`accountAccess/${uid}`).get(),db.collection('procedureSubmissions').where('ownerUid','==',uid).count().get(),db.collection('procedureReports').where('reporterUid','==',uid).count().get()]);
  return {...safeUser(user),accessVersion:access.data()?.version||0,suspended:!!access.data()?.suspended,contributions:contributions.data().count,reports:reports.data().count};
}
export async function changeUser(db:Firestore,auth:Auth,actor:Actor,input:unknown) {
  const data=parse(z.object({uid:id,operation:z.enum(['suspend','restore','revoke','role']),role:z.enum(['user','admin']).optional(),reason,expectedVersion:z.number().int().nonnegative(),requestId:id}).strict(),input);
  requireValue(data.uid!==actor.uid,'Use another authorised administrator to change your own access.');
  if(data.operation==='role')requireValue(isOwner(actor.uid),'Only a configured application owner can assign roles.');
  if(data.operation==='role')requireValue(data.role,'Choose the new role.');
  const operation=db.doc(`adminUserActions/${data.requestId}`),lock=db.doc('adminLocks/user-access'),token=randomUUID();
  const prior=await operation.get();if(prior.exists){requireValue(prior.data()!.actorUid===actor.uid&&prior.data()!.inputHash===hash(JSON.stringify(data)),'Request ID already used.');if(prior.data()!.status==='succeeded')return {auditId:prior.data()!.auditId};}
  await db.runTransaction(async tx=>{const found=await tx.get(lock);requireValue(!found.exists||found.data()!.until<Date.now(),'Another access change is running. Retry shortly.');tx.set(lock,{token,until:Date.now()+120000});});
  let entry:ReturnType<typeof audit>|undefined;
  try {
    const account=await auth.getUser(data.uid),access=await db.doc(`accountAccess/${data.uid}`).get();
    requireValue((access.data()?.version||0)===data.expectedVersion,'Account access changed. Reload the user before acting.');
    const targetAdmin=account.customClaims?.role==='admin';
    if(targetAdmin)requireValue(isOwner(actor.uid),'Only an application owner can change another administrator.');
    if(targetAdmin&&(data.operation==='suspend'||data.operation==='role'&&data.role!=='admin')) {
      let cursor:string|undefined,others=0,scanned=0;
      do {const users=await auth.listUsers(1000,cursor);scanned+=users.users.length;others+=users.users.filter(user=>user.uid!==data.uid&&!user.disabled&&user.customClaims?.role==='admin').length;cursor=users.pageToken;requireValue(scanned<10000||!cursor,'Admin inventory is too large to verify safely. Use the owner maintenance process.');}while(cursor&&!others);
      requireValue(others>0,'The last active administrator cannot be removed.');
    }
    if(data.operation==='role'&&data.role==='admin')requireValue(account.emailVerified&&!account.disabled&&!access.data()?.suspended&&account.providerData.some(provider=>provider.providerId==='google.com'),'An administrator must be an active, verified Google user.');
    entry=audit(db,actor,`user.${data.operation}`,data.uid,data.reason,{before:{role:String(account.customClaims?.role||'user'),suspended:account.disabled||!!access.data()?.suspended},after:{role:data.operation==='role'?data.role:String(account.customClaims?.role||'user'),suspended:data.operation==='suspend'?true:data.operation==='restore'?false:account.disabled}},'started');
    await entry.ref.create(entry.data);
    const policy:DocumentData={version:data.expectedVersion+1,updatedAt:Date.now()};
    if(data.operation==='suspend')policy.suspended=true;
    if(data.operation==='restore')policy.suspended=false;
    if(data.operation!=='restore')policy.revokedBefore=Math.floor(Date.now()/1000)+1;
    // Block old sessions before Auth writes; a partial failure remains blocked and audited.
    if(data.operation!=='restore')await db.doc(`accountAccess/${data.uid}`).set(policy,{merge:true});
    if(data.operation==='suspend'||data.operation==='restore')await auth.updateUser(data.uid,{disabled:data.operation==='suspend'});
    if(data.operation==='role'){const claims={...account.customClaims};if(data.role==='admin')claims.role='admin';else delete claims.role;await auth.setCustomUserClaims(data.uid,claims);}
    if(data.operation!=='restore')await auth.revokeRefreshTokens(data.uid);else await db.doc(`accountAccess/${data.uid}`).set(policy,{merge:true});
    await db.runTransaction(async tx=>{tx.update(entry!.ref,{status:'succeeded',completedAt:Date.now()});tx.set(operation,{actorUid:actor.uid,inputHash:hash(JSON.stringify(data)),status:'succeeded',auditId:entry!.ref.id});});
    return {auditId:entry.ref.id};
  } catch(error){if(entry)await entry.ref.update({status:'failed',completedAt:Date.now(),message:'Access change did not finish. Reload the account and review its current state.'});throw error;}
  finally {await db.runTransaction(async tx=>{const found=await tx.get(lock);if(found.data()?.token===token)tx.delete(lock);});}
}
