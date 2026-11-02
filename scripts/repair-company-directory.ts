import { mkdirSync, writeFileSync } from 'node:fs';
import { createAdminTarget, safeMigrationError } from './firebase-admin.js';
import { mergeCompanyDirectory, canonicalCompanyKey } from '../shared/company-identity.js';
import { preparePublication } from './publication.js';
import { procedureDraftSchema } from '../shared/procedures.js';
import type { ProcedureCompany } from '../shared/procedures.js';

let target: ReturnType<typeof createAdminTarget> | undefined;
try {
  target = createAdminTarget();
  const original = await target.db.collection('procedureCompanies').get();
  const sources: ProcedureCompany[] = [];
  for (const year of [2025, 2026, 2027]) {
    const { dashboard } = await preparePublication(year);
    for (const company of dashboard.statistics.companies) if (dashboard.statistics.candidates.some(row => row.companyKey === company.key && row.campus !== 'Off campus')) sources.push({ key: company.key, name: company.name, years: [year] });
  }
  const valid = original.docs.filter(doc => typeof doc.data().name === 'string' && Array.isArray(doc.data().years));
  const merged = mergeCompanyDirectory([...sources, ...valid.map(doc => ({ ...doc.data(), key: doc.id } as ProcedureCompany))]);
  const aliases = valid.filter(doc => canonicalCompanyKey(doc.id) !== doc.id).map(doc => ({ from: doc.id, to: canonicalCompanyKey(doc.id) }));
  const issues: { collection: string; id: string; issue: string }[] = [];
  const keys = new Set(merged.map(row=>row.key));
  for (const collection of ['procedureSubmissions','procedurePosts']) {
    let after: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = target.db.collection(collection).orderBy('__name__').limit(100);
      if (after) query = query.startAfter(after);
      const page = await query.get();
      for (const doc of page.docs) {
        const row = doc.data(), draft = row.draft || row;
        if (row.deleted) continue;
        if (draft.companyKey && !keys.has(canonicalCompanyKey(draft.companyKey))) issues.push({collection,id:doc.id,issue:'Unknown company reference; requires review, not deletion.'});
        if (collection==='procedureSubmissions' && !procedureDraftSchema.safeParse(draft).success) issues.push({collection,id:doc.id,issue:'Draft does not meet current validation; private content retained.'});
      }
      if(page.size<100)break;after=page.docs.at(-1);
    }
  }
  const report = { issues, project: target.projectId, apply: process.argv.includes('--apply'), before: original.size, canonical: merged.length, aliases, malformed: original.docs.filter(doc => !valid.includes(doc)).map(doc => doc.id), preserved: 'Historical source data, revisions, drafts, post IDs and account activity are not deleted or rewritten.' };
  mkdirSync('artifacts', { recursive: true });
  // Catalog backup only: no credentials or private user content in reports.
  writeFileSync('artifacts/company-directory-backup.json', JSON.stringify(original.docs.map(doc => ({ id: doc.id, data: doc.data() })), null, 2));
  writeFileSync('artifacts/company-directory-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--apply')) {
    for (const entry of merged) await target.db.runTransaction(async tx => {
      const ref = target!.db.doc(`procedureCompanies/${entry.key}`), current = await tx.get(ref);
      const years = [...new Set([...entry.years, ...(Array.isArray(current.data()?.years) ? current.data()!.years : [])])].sort();
      tx.set(ref, { ...entry, years, aliasOf: null }, { merge: true });
    });
    for (const alias of aliases) await target.db.doc(`procedureCompanies/${alias.from}`).set({ aliasOf: alias.to }, { merge: true });
    console.log('Applied canonical catalog repair; legacy identifiers retained as aliases.');
  }
} catch (cause) { console.error(safeMigrationError(cause)); process.exitCode = 1; }
finally { await target?.close(); }
