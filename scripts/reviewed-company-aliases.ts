import { canonicalCompanyKey, canonicalCompanyName } from '../shared/company-identity.js';

// Exact scope confirmed by the maintainer. Never expand this through fuzzy matching.
export const reviewedAliasPairs=[
  ['aptia','aptia-india'],['impactguru','impact-guru-technology-venture'],
  ['ion','ion-group'],['pravaayu','pravaayu-healthcare'],
  ['transbnk-solutions','transbnk-solutions-pvt-ltd-tbx'],
] as const;
export type CatalogFields={name:string;years:number[];aliasOf?:string|null};
export function planReviewedAliases(rows:Map<string,CatalogFields>) {
  return reviewedAliasPairs.flatMap(([canonical,alias])=>{
    const target=rows.get(canonical),source=rows.get(alias);
    if(!target||!source)throw new Error('A reviewed company document is missing; no repair applied.');
    for(const row of [target,source])if(typeof row.name!=='string'||!Array.isArray(row.years)||!row.years.every(year=>Number.isInteger(year)&&year>=2000&&year<=2100))throw new Error('A reviewed company has invalid catalog fields; no repair applied.');
    if(target.aliasOf||source.aliasOf&&source.aliasOf!==canonical)throw new Error('A reviewed company points to a conflicting alias; no repair applied.');
    if(canonicalCompanyKey(alias)!==canonical)throw new Error('Deploy the reviewed identity mapping before repairing the catalog.');
    const years=[...new Set([...target.years,...source.years])].sort();
    return [
      {key:canonical,fields:{name:canonicalCompanyName(canonical,target.name),years,aliasOf:null}},
      {key:alias,fields:{aliasOf:canonical}},
    ];
  });
}
