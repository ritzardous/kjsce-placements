import { useEffect, useState } from 'react';
import { companyPlacement } from './company-placement';
import type { ProcedureCompany } from '../../shared/procedures';
import type { Company } from '../../shared/statistics';
import { loadDashboard } from '../dashboard/repository';
import { useAuth } from '../lib/auth';
export type CompanyPlacement = {year:number|null; company?:Company; loading:boolean; error:boolean; retry:()=>void};
export function useCompanyPlacement(company:ProcedureCompany|undefined,batchYear:number|null):CompanyPlacement {
  const {user}=useAuth();
  const years=company?.years.filter(Number.isFinite)||[];
  const year=batchYear&&years.includes(batchYear)?batchYear:years.length?Math.max(...years):null;
  const key=user?.uid+':'+company?.key+':'+year;
  const [attempt,retry]=useState(0),[state,setState]=useState<{key:string;company?:Company;error:boolean}|null>(null);
  useEffect(()=>{
    if(!company||!user||year===null)return;
    let active=true;
    void loadDashboard(year).then(data=>{if(active)setState({key,company:companyPlacement(data.statistics.companies,company.key),error:false});}).catch(()=>{if(active)setState({key,error:true});});
    return()=>{active=false;};
  },[key,attempt]);
  const current=state?.key===key?state:null;
  return {year,company:current?.company,loading:Boolean(company&&year!==null&&!current),error:current?.error||false,retry:()=>{setState(null);retry(value=>value+1);}};
}
