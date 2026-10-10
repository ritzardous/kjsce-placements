import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { deliverEmail } from './email.js';
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
export const procedureCommunity = onCall(options, async request => community(db, adminCommunityActions.has(request.data?.action) || request.auth?.token.role === 'admin' ? await currentAdmin(request.auth) : request.auth, request.data));

const resendKey = defineSecret('PROCEDURE_RESEND_API_KEY');
const recipients = defineString('PROCEDURE_ADMIN_EMAILS', { default: '' });
const sender = defineString('PROCEDURE_EMAIL_FROM', { default: '' });
const appUrl = defineString('PROCEDURE_APP_URL', { default: '' });

async function deliver(id: string) {
  // The dashboard works without email configuration; never send from test emulators.
  if (process.env.FUNCTIONS_EMULATOR === 'true' || !recipients.value() || !sender.value() || !appUrl.value()) return;
  await deliverEmail(db, id, { recipients: recipients.value(), sender: sender.value(), appUrl: appUrl.value(), apiKey: resendKey.value() });
}
export const procedureSubmissionEmail = onDocumentCreated({ document: 'procedureEmailOutbox/{eventId}', secrets: [resendKey] }, event => deliver(event.params.eventId));
export const retryProcedureEmails = onSchedule({ schedule: 'every 5 minutes', secrets: [resendKey] }, async () => {
  const items = await db.collection('procedureEmailOutbox').where('status', 'in', ['pending', 'sending']).orderBy('createdAt').limit(50).get();
  for (const item of items.docs) await deliver(item.id);
});
