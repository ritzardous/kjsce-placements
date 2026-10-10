import type { IncomingMessage, ServerResponse } from 'node:http';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, authorize, saveDraft, submit, review, unpublish, vote, type Actor } from './service.js';
import { community, adminCommunityActions } from './community.js';

let serverApp: App | undefined;
export function configureProcedureApi(app: App) { serverApp = app; }
function app() {
  if (serverApp) return serverApp;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new HttpsError('unavailable', 'The community API needs its private server configuration.');
  const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (account.project_id !== projectId || projectId.startsWith('demo-')) throw new HttpsError('unavailable', 'The community API configuration does not match the live project.');
  return serverApp = getApps().find(value => value.name === 'procedures-api') ?? initializeApp({ projectId, credential: cert(account) }, 'procedures-api');
}
const statuses: Record<string, number> = { unauthenticated: 401, 'permission-denied': 403, 'invalid-argument': 400, 'failed-precondition': 409, 'resource-exhausted': 429, 'not-found': 404, unavailable: 503 };
type Request = IncomingMessage & { body?: unknown };
async function readBody(req: Request) {
  if (req.body !== undefined) {
    const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(text) > 100000) throw new HttpsError('invalid-argument', 'Request too large.');
    return JSON.parse(text);
  }
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > 100000) throw new HttpsError('invalid-argument', 'Request too large.'); chunks.push(buffer); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export default async function handler(req: Request, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.statusCode = 405; res.end(JSON.stringify({ error: { code: 'invalid-argument', message: 'POST required.' } })); return; }
  try {
    const bearer = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!bearer) throw new HttpsError('unauthenticated', 'Sign in with Google.');
    const auth = getAuth(app());
    const token = await auth.verifyIdToken(bearer, true).catch(() => { throw new HttpsError('unauthenticated', 'Your session expired. Sign in again.'); });
    const actor: Actor = { uid: token.uid, token };
    authorize(actor);
    let body;
    try { body = await readBody(req); } catch (cause) { if (cause instanceof HttpsError) throw cause; throw new HttpsError('invalid-argument', 'Send a valid JSON request.'); }
    const name = body?.name;
    if (['reviewProcedure', 'unpublishProcedure'].includes(name) || name === 'procedureCommunity' && (adminCommunityActions.has(body.data?.action) || actor.token.role === 'admin')) {
      authorize(actor, true);
      const account = await auth.getUser(actor.uid);
      if (account.disabled || account.customClaims?.role !== 'admin') throw new HttpsError('permission-denied', 'Admin access has been revoked.');
    }
    const db = getFirestore(app());
    let data;
    switch (name) {
      case 'procedureCommunity': data = await community(db, actor, body.data); break;
      case 'saveProcedureDraft': data = await saveDraft(db, actor, body.data); break;
      case 'submitProcedure': data = await submit(db, actor, body.data); break;
      case 'reviewProcedure': data = await review(db, actor, body.data); break;
      case 'unpublishProcedure': data = await unpublish(db, actor, body.data); break;
      case 'setProcedureVote': data = await vote(db, actor, body.data); break;
      default: throw new HttpsError('invalid-argument', 'Unknown community action.');
    }
    res.statusCode = 200; res.end(JSON.stringify({ data }));
  } catch (cause) {
    const known = cause instanceof HttpsError;
    const code = known ? cause.code : 'unavailable';
    res.statusCode = statuses[code] ?? 500;
    res.end(JSON.stringify({ error: { code, message: known ? cause.message : 'The community service could not complete the request. Retry or check its server configuration.' } }));
  }
}

