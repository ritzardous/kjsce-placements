import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { authorize, saveDraft, submit, review, unpublish, vote, type Actor } from './service.js';
import { community, adminCommunityActions } from './community.js';

initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });
const db = getFirestore();
const options = { cors: true };
export const saveProcedureDraft = onCall(options, request => saveDraft(db, request.auth, request.data));
export const submitProcedure = onCall(options, request => submit(db, request.auth, request.data));
async function currentAdmin(actor: Actor | undefined) {
  const authenticated = authorize(actor, true), account = await getAuth().getUser(authenticated.uid);
  if (account.disabled || account.customClaims?.role !== 'admin') throw new HttpsError('permission-denied', 'Admin access has been revoked.');
  return authenticated;
}
export const reviewProcedure = onCall(options, async request => review(db, await currentAdmin(request.auth), request.data));
export const unpublishProcedure = onCall(options, async request => unpublish(db, await currentAdmin(request.auth), request.data));
export const setProcedureVote = onCall(options, request => vote(db, request.auth, request.data));
export const procedureCommunity = onCall(options, async request => community(db, adminCommunityActions.has(request.data?.action) || request.auth?.token.role === 'admin' ? await currentAdmin(request.auth) : request.auth, request.data, getAuth()));
