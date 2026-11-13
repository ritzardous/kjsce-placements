import type { ProcedureCompany } from '../../shared/procedures';
import { CompanyIdentity } from '../dashboard/CompanyIdentity';
import type { CompanyPlacement } from './useCompanyPlacement';
export function ProcedureCompanyPreview({company,placement,role}:{company:ProcedureCompany;placement:CompanyPlacement;role:string}) {
  const records=placement.company?.announcements||[];
  const roleValues=records.filter(p=>p.roles.includes(role)||p.candidates.some(c=>c.role===role)).flatMap(p=>p.compensation.ctc_value_lpa===null?[]:[p.compensation.ctc_value_lpa]);
  const ctc=role?(roleValues.length?Math.max(...roleValues):null):placement.company?.highestCtc??null;
  return <aside className="procedure-company-preview writing-company-context" aria-label="Selected company information">
    <CompanyIdentity companyKey={company.key} name={company.name}/>
    <div aria-live="polite">{placement.loading?<p>Loading recorded roles and CTC…</p>:placement.error?<p>Placement details unavailable. You can enter your role below. <button type="button" onClick={placement.retry}>Retry</button></p>:<>
      <p><strong>{ctc===null?'CTC not recorded':`₹${ctc.toFixed(2)} LPA`}</strong>{placement.year&&<span>{ctc!==null&&` · ${role?'highest recorded for this role':'highest recorded CTC'}`} · Class of {placement.year}</span>}</p>
      {placement.company?.roles.length?<p>{placement.company.roles.slice(0,3).join(' · ')}{placement.company.roles.length>3&&` · +${placement.company.roles.length-3} roles`}</p>:<p>No recorded role details. Add your own role below.</p>}
    </>}</div>
  </aside>;
}
