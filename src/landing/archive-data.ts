/** Public examples verified against the checked-in 2025/2026 source datasets.
 * Routes retain source-specific keys; no private records are requested by the landing page. */
export const archiveCompanies = [
  {id:'google',name:'Google',short:'Google',logo:'/company-logos/google.png',routes:{2025:'google',2026:'google'}},
  {id:'jpmc',name:'JPMorgan Chase & Co.',short:'JPMorgan',logo:'/company-logos/jpmorgan.svg',routes:{2026:'jp_morgan_chase_co'}},
  {id:'barclays',name:'Barclays',short:'Barclays',logo:'/company-logos/barclays.png',routes:{2025:'barclays',2026:'barclays'}},
  {id:'amazon',name:'Amazon India',short:'Amazon',logo:'/company-logos/amazon.png',routes:{2025:'amazon-india'}},
  {id:'deloitte',name:'Deloitte India',short:'Deloitte',logo:'/company-logos/deloitte.png',routes:{2025:'deloitte-india',2026:'deloitte_india'}},
] satisfies {id:string;name:string;short:string;logo:string;routes:Partial<Record<number,string>>}[];
export type ArchiveCompany = typeof archiveCompanies[number];
export function companyYears(company:ArchiveCompany){return Object.keys(company.routes).map(Number).sort();}
export function companyRoute(company:ArchiveCompany,year:number){return `#${year}/company/${encodeURIComponent((company.routes as Partial<Record<number,string>>)[year]||'')}`;}
