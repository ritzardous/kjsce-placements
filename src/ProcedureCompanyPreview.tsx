import { useEffect, useState } from 'react';
import type { ProcedureCompany } from '../shared/procedures';
import type { DashboardResponse } from '../shared/statistics';
import { CompanyIdentity } from './CompanyIdentity';
import { loadDashboard } from './repository';
import { withTimeout } from './request-timeout';
import { useAuth } from './auth';

type Company = DashboardResponse['statistics']['companies'][number];
const cache=new Map<string,{at:number;request:Promise<Company[]>}>();
function companyStats(uid:string,year:number) {
  const key=`${uid}:${year}`, found=cache.get(key);
  if(found&&Date.now()-found.at<300000)return found.request;
  if(cache.size>=6)cache.delete(cache.keys().next().value!);
  const request=withTimeout(loadDashboard(year)).then(data=>data.statistics.companies);
  const entry={at:Date.now(),request};cache.set(key,entry);
  void request.catch(()=>{if(cache.get(key)===entry)cache.delete(key);});
  return request;
}
export function ProcedureCompanyPreview({ company, appearanceYear }: {company:ProcedureCompany;appearanceYear:number}) {
  const {user}=useAuth(),[state,setState]=useState<{key:string;company?:Company;error?:boolean}|null>(null);
  const year=company.years.includes(appearanceYear)?appearanceYear:Math.max(...company.years),key=`${company.key}:${year}`;
  const current=state?.key===key?state:null;
  useEffect(()=>{
    let active=true;
    if(!user||!Number.isFinite(year)){setState({key,error:true});return;}
    void companyStats(user.uid,year).then(rows=>{if(active)setState({key,company:rows.find(row=>row.key===company.key)});}).catch(()=>{if(active)setState({key,error:true});});
    return()=>{active=false;};
  },[user?.uid,company.key,year,key]);
  return <aside className="procedure-company-preview" aria-label="Selected company information">
    <CompanyIdentity companyKey={company.key} name={company.name}/>
    <div>{!current?<p className="procedure-note">Loading recorded placement details…</p>:current.company?<>
      <p><strong>{current.company.highestCtc===null?'CTC not recorded':`₹${current.company.highestCtc.toFixed(2)} LPA`}</strong> <span>highest recorded CTC · Class of {year}</span></p>
      <p className="procedure-note">{current.company.totalHired} recorded selections{current.company.roles.length?` · ${current.company.roles.slice(0,2).join(' / ')}`:''}</p>
    </>:<p className="procedure-note">Placement details are unavailable. You can continue writing.</p>}
    {Number.isFinite(year)&&<a href={`#${year}/company/${encodeURIComponent(company.key)}`} target="_blank" rel="noopener noreferrer">View placement stats ↗</a>}
    {year!==appearanceYear&&Number.isFinite(year)&&<p className="procedure-note">Showing the latest available batch; no record for your appearance year.</p>}
    </div>
  </aside>;
}
