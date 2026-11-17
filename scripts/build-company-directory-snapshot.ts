import {readFileSync,writeFileSync} from 'node:fs';
import {preparePublication} from './publication.js';
import {mergeCompanyDirectory} from '../shared/company-identity.js';
import {directoryEntry,directoryPublication} from '../shared/company-directory.js';
import type {ProcedureCompany} from '../shared/procedures.js';
import {z} from 'zod';
import {companyProfileSchema} from '../shared/company-profile.js';

// Offline only. Never serialize candidate records or infer current hiring status.
const entries=new Map<string,ProcedureCompany>();
for(const year of [2025,2026,2027]) {
  const {dashboard}=await preparePublication(year);
  for(const company of dashboard.statistics.companies) {
    if(!dashboard.statistics.candidates.some(row=>row.companyKey===company.key&&row.campus!=='Off campus'))continue;
    const key=company.key.replaceAll('_','-'), row=entries.get(key)??{key,name:company.name,years:[]};
    if(!row.years.includes(year))row.years.push(year);
    entries.set(key,row);
  }
}
const additions=z.array(z.object({key:z.string(),name:z.string(),profile:companyProfileSchema.optional()}).strict()).parse(JSON.parse(readFileSync(new URL('../data/company-profiles/community-additions-2026-11-16.json',import.meta.url),'utf8')));
for(const raw of additions){const row=directoryEntry(raw.key,{...raw,years:[]});if(row)entries.set(row.key,row);}
const profile=JSON.parse(readFileSync(new URL('../data/company-profiles/wissen-technology.json',import.meta.url),'utf8'));
const wissen=directoryEntry('wissen-technology',{name:'Wissen Technology',years:[],profile})!;
entries.set(wissen.key,{...wissen,years:entries.get(wissen.key)?.years??[]});
const value=directoryPublication(mergeCompanyDirectory([...entries.values()]));
writeFileSync(new URL('../src/data/company-directory-snapshot.json',import.meta.url),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({companies:value.companies.length,bytes:Buffer.byteLength(JSON.stringify(value)),source:'reviewed repository data only'}));
