import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { companyDirectoryPath, companyDirectorySchema, directoryEntry, directoryPublication } from '../../shared/company-directory.js';

/** Read before writes. Missing publication stays missing during staged rollout. */
export async function prepareDirectoryChange(db: Firestore, tx: Transaction, changes: {key:string;value:Record<string,unknown>}[]) {
  const ref = db.doc(companyDirectoryPath), snapshot = await tx.get(ref);
  if (!snapshot.exists) return () => {};
  const rows = new Map(companyDirectorySchema.parse(snapshot.data()).companies.map(company => [company.key, company]));
  for (const {key,value} of changes) {
    rows.delete(key);
    const entry = directoryEntry(key,value);
    if (entry) rows.set(entry.key,entry);
  }
  const next = directoryPublication([...rows.values()]);
  return () => { tx.set(ref,next); };
}

/** Trusted maintenance only; retries if catalog changes during publication. */
export async function publishCompanyDirectory(db: Firestore) {
  return db.runTransaction(async tx => {
    await tx.get(db.doc(companyDirectoryPath));
    const snapshot = await tx.get(db.collection('procedureCompanies'));
    const companies = snapshot.docs.flatMap(doc => {
      const entry = directoryEntry(doc.id,doc.data()); return entry ? [entry] : [];
    });
    const value = directoryPublication(companies);
    tx.set(db.doc(companyDirectoryPath),value);
    return { companies:value.companies.length, bytes:Buffer.byteLength(JSON.stringify(value)) };
  });
}
