import { mkdirSync, writeFileSync } from 'node:fs';
import { createAdminTarget, safeMigrationError } from './firebase-admin.js';
import { auditCompanyNames, type CatalogCompany } from './company-name-audit.js';

// No write API, user collection, raw import or placement payload is accessed.
let target:ReturnType<typeof createAdminTarget>|undefined;
try {
  if(process.argv.includes('--apply'))throw new Error('This audit is read-only; --apply is not supported.');
  target=createAdminTarget();
  const snapshot=await target.db.collection('procedureCompanies').select('name','years','aliasOf').limit(5001).get();
  if(snapshot.size>5000)throw new Error('Catalog exceeds the 5,000-record audit bound.');
  const malformed:string[]=[];
  const companies:CatalogCompany[]=snapshot.docs.flatMap(doc=>{
    const row=doc.data();
    if(typeof row.name!=='string'){malformed.push(doc.id);return [];}
    return [{key:doc.id,name:row.name,years:Array.isArray(row.years)?row.years.filter((year:unknown)=>typeof year==='number'):[],...(typeof row.aliasOf==='string'?{aliasOf:row.aliasOf}:{})}];
  });
  const pairs=auditCompanyNames(companies);
  const report={project:target.projectId,checkedAt:new Date().toISOString(),readOnly:true,scanned:snapshot.size,malformed,companies,pairs,
    limitation:'Heuristic name comparison of the recruiter catalog, not proof of shared identity. Existing aliases are reported separately; subsidiaries and hiring programmes may legitimately be distinct. No records were changed.'};
  mkdirSync('artifacts',{recursive:true});
  writeFileSync('artifacts/company-name-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,companies:undefined},null,2));
}catch(cause){console.error(safeMigrationError(cause));process.exitCode=1;}
finally{await target?.close();}
