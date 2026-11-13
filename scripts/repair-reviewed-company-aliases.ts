import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createAdminTarget, safeMigrationError } from './firebase-admin.js';
import { planReviewedAliases, reviewedAliasPairs, type CatalogFields } from './reviewed-company-aliases.js';

let target:ReturnType<typeof createAdminTarget>|undefined;
try {
  target=createAdminTarget();
  const refs=reviewedAliasPairs.flatMap(pair=>pair.map(key=>target!.db.doc('procedureCompanies/'+key)));
  const snapshot=await target.db.getAll(...refs);
  const backup=snapshot.map(doc=>({key:doc.id,revision:doc.updateTime?{seconds:doc.updateTime.seconds,nanoseconds:doc.updateTime.nanoseconds}:null,fields:doc.exists?{
    name:doc.data()!.name,years:doc.data()!.years,...(Object.hasOwn(doc.data()!,'aliasOf')?{aliasOf:doc.data()!.aliasOf}:{}),
  }:null}));
  const hash=createHash('sha256').update(JSON.stringify(backup)).digest('hex');
  const rows=new Map(backup.flatMap(row=>row.fields?[[row.key,row.fields as CatalogFields] as const]:[]));
  const plan=planReviewedAliases(rows);
  const at=process.argv.indexOf('--expected-hash'),expected=at<0?undefined:process.argv[at+1];
  const apply=process.argv.includes('--apply');
  if(apply&&expected!==hash)throw new Error('Repair requires the exact current --expected-hash from a reviewed dry run. No records changed.');
  mkdirSync('artifacts',{recursive:true});
  const file='artifacts/reviewed-company-aliases-'+Date.now()+(apply?'-apply':'-preview')+'.json';
  writeFileSync(file,JSON.stringify({project:target.projectId,hash,backup,plan},null,2)+'\n',{flag:'wx'});
  let changed=0;
  if(apply){
    changed=await target.db.runTransaction(async tx=>{
      const current=await tx.getAll(...refs);
      if(current.some((doc,index)=>!doc.updateTime?.isEqual(snapshot[index].updateTime!)))throw new Error('A company changed after preview. Run a new dry run; no repair applied.');
      let count=0;
      for(const entry of plan){
        const doc=current.find(row=>row.id===entry.key)!;
        if(Object.entries(entry.fields).some(([key,value])=>JSON.stringify(doc.data()![key])!==JSON.stringify(value))){tx.update(doc.ref,entry.fields);count++;}
      }
      return count;
    });
    const checked=await target.db.getAll(...refs);
    for(const entry of plan){const row=checked.find(doc=>doc.id===entry.key)!.data()!;if(Object.entries(entry.fields).some(([key,value])=>JSON.stringify(row[key])!==JSON.stringify(value)))throw new Error('Repair committed but read-back differs. Inspect the saved backup before retrying.');}
  }
  console.log(JSON.stringify({project:target.projectId,mode:apply?'applied':'preview',hash,changed,backup:file,plan},null,2));
}catch(cause){console.error(safeMigrationError(cause));process.exitCode=1;}
finally{await target?.close();}
