import { mergeCompanyDirectory } from '../shared/company-identity.js';
import { createAdminTarget, safeMigrationError } from './firebase-admin.js';
import { preparePublication } from './publication.js';
import type { ProcedureCompany } from '../shared/procedures.js';

let target: ReturnType<typeof createAdminTarget> | undefined;
try {
  const directory = new Map<string, ProcedureCompany>();
  for (const year of [2025, 2026, 2027]) {
    const { dashboard } = await preparePublication(year);
    for (const company of dashboard.statistics.companies) {
      if (!dashboard.statistics.candidates.some(c => c.companyKey === company.key && c.campus !== 'Off campus')) continue;
      const key = company.key.replaceAll('_', '-'), entry = directory.get(key) ?? { key, name: company.name, years: [] };
      if (!entry.years.includes(year)) entry.years.push(year);
      directory.set(key, entry);
    }
  }
  if (!process.argv.includes('--dry-run')) {
    target = createAdminTarget();
    const batch = target.db.batch();
    for (const entry of mergeCompanyDirectory([...directory.values()])) batch.set(target.db.doc(`procedureCompanies/${entry.key}`), entry);
    await batch.commit();
  }
  console.log(`Prepared ${mergeCompanyDirectory([...directory.values()]).length} source-backed campus recruiters${target ? ' and seeded Firestore' : ' (dry run)'}.`);
} catch (cause) { console.error(safeMigrationError(cause)); process.exitCode = 1; }
finally { await target?.close(); }
