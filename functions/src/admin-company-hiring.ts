import type { Firestore } from 'firebase-admin/firestore';
import type { Actor } from './service.js';
import { companyHiringSchema, readCompanyHiring, updateCompanyHiringSchema } from '../../shared/company-hiring.js';
import { canonicalCompanyKey } from '../../shared/company-identity.js';
import { audit, parse, requireValue, writeAudit } from './admin-common.js';
import { HttpsError } from './service.js';

// Called only after adminApi's current-account and current-claim verification.
export async function setCompanyHiring(db: Firestore, actor: Actor, input: unknown) {
  const data = parse(updateCompanyHiringSchema, input);
  requireValue(canonicalCompanyKey(data.companyKey) === data.companyKey, 'Choose the canonical company record.');
  const ref = db.doc(`procedureCompanies/${data.companyKey}`);
  const limiter = db.doc(`adminLocks/company-hiring-${actor.uid}`);
  return db.runTransaction(async tx => {
    const [company, limit] = await Promise.all([tx.get(ref), tx.get(limiter)]);
    if (!company.exists) throw new HttpsError('not-found', 'Company not found. Reload the company directory.');
    const stored: unknown = company.get('hiring');
    requireValue(stored === undefined || companyHiringSchema.safeParse(stored).success, 'The stored hiring status needs maintainer review.');
    const previous = readCompanyHiring(data.companyKey, stored);
    requireValue(previous.version === data.expectedVersion, 'This company was updated elsewhere. Reload before saving.');
    if (previous.status === data.status && previous.year === data.year) return { hiring: previous, auditId: null };
    const now = Date.now(), prior = limit.data();
    const recent = prior && now - prior.startedAt < 60000;
    if (recent && prior.count >= 30) throw new HttpsError('resource-exhausted', 'Please wait a minute before updating more companies.');
    const hiring = { status: data.status, year: data.year, version: previous.version + 1, updatedAt: now };
    const entry = audit(db, actor, 'setCompanyHiring', ref.path, `Set Class of 2027 hiring status to ${data.status}`, { before: previous.status, after: data.status, year: data.year });
    tx.update(ref, { hiring });
    tx.set(limiter, { startedAt: recent ? prior.startedAt : now, count: recent ? prior.count + 1 : 1 });
    writeAudit(tx, entry);
    return { hiring, auditId: entry.ref.id };
  });
}
