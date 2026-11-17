import {createAdminTarget,safeMigrationError} from './firebase-admin.js';
import {publishCompanyDirectory} from '../functions/src/company-directory.js';
import {directoryEntry,directoryPublication} from '../shared/company-directory.js';

let target:ReturnType<typeof createAdminTarget>|undefined;
try {
  target=createAdminTarget();
  if(process.argv.includes('--apply')) {
    console.log(JSON.stringify({project:target.projectId,mode:'published',...await publishCompanyDirectory(target.db)}));
  } else {
    const snapshot=await target.db.collection('procedureCompanies').get();
    const value=directoryPublication(snapshot.docs.flatMap(doc=>{const row=directoryEntry(doc.id,doc.data());return row?[row]:[];}));
    console.log(JSON.stringify({project:target.projectId,mode:'preview',companies:value.companies.length,bytes:Buffer.byteLength(JSON.stringify(value))}));
  }
}catch(error){console.error(safeMigrationError(error));process.exitCode=1;}
finally{await target?.close();}
