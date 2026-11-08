import type {Firestore} from 'firebase-admin/firestore';
import type {Auth} from 'firebase-admin/auth';
import {z} from 'zod';
import {HttpsError,type Actor} from './service.js';
import {currentActor,recordServiceFailure} from './access.js';
import {parse,id} from './admin-common.js';
import {userList,userDetail,changeUser} from './admin-users.js';
import {createJob,uploadChunk,validateImport,runJob,jobDetails,publish} from './admin-jobs.js';
import {repairPreview} from './admin-quality.js';
import {dashboard,operations,auditTrail,analytics} from './admin-metrics.js';
export async function adminApi(db:Firestore,auth:Auth,value:Actor|undefined,input:unknown) {
  const actor=await currentActor(db,auth,value,true);
  const request=parse(z.object({action:z.enum(['overview','users','user','changeUser','repairPreview','createJob','uploadChunk','validateImport','runJob','job','publish','rollback','operations','audit','analytics']),payload:z.unknown().default({})}).strict(),input);
  try {
    switch(request.action){
      case 'overview':parse(z.object({}).strict(),request.payload);return await dashboard(db,actor);
      case 'users':return await userList(auth,request.payload);
      case 'user':return await userDetail(db,auth,request.payload);
      case 'changeUser':return await changeUser(db,auth,actor,request.payload);
      case 'repairPreview':return await repairPreview(db,parse(z.object({company:id}).strict(),request.payload).company);
      case 'createJob':return await createJob(db,actor,request.payload);
      case 'uploadChunk':return await uploadChunk(db,request.payload);
      case 'validateImport':return await validateImport(db,actor,request.payload);
      case 'runJob':return await runJob(db,actor,request.payload);
      case 'job':return await jobDetails(db,request.payload);
      case 'publish':return await publish(db,actor,request.payload);
      case 'rollback':return await publish(db,actor,request.payload,true);
      case 'operations':return await operations(db,request.payload);
      case 'audit':return await auditTrail(db,request.payload);
      case 'analytics':return await analytics(db,request.payload);
    }
  }catch(error){await recordServiceFailure(db,actor.uid,request.action,error instanceof HttpsError?error.code:'internal','admin');throw error;}
}
