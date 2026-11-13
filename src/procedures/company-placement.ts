import { canonicalCompanyKey, canonicalCompanyName } from '../../shared/company-identity';
import type { Company } from '../../shared/statistics';

/** Combine writer context without changing the verified historical dashboard. */
export function companyPlacement(companies:Company[],key:string):Company|undefined {
  const canonical=canonicalCompanyKey(key),rows=companies.filter(row=>canonicalCompanyKey(row.key)===canonical);
  if(!rows.length)return undefined;
  const first=rows.find(row=>row.key===canonical)||rows[0];
  const announcements=[...new Map(rows.flatMap(row=>row.announcements).map(row=>[row.placement_id,row])).values()];
  const ctcs=announcements.flatMap(row=>row.compensation.ctc_value_lpa===null?[]:[row.compensation.ctc_value_lpa]);
  const dates=announcements.flatMap(row=>row.result.declared_date?[row.result.declared_date]:[]).sort();
  return {...first,key:canonical,name:canonicalCompanyName(canonical,first.name),announcements,
    totalHired:announcements.reduce((sum,row)=>sum+row.hiring.students_hired,0),highestCtc:ctcs.length?Math.max(...ctcs):null,
    roles:[...new Set(rows.flatMap(row=>row.roles))],branches:[...new Set(rows.flatMap(row=>row.branches))],
    firstDate:dates.at(0)??null,lastDate:dates.at(-1)??null};
}
