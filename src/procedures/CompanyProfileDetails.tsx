import { readCompanyProfile, companyProfileCtc } from '../../shared/company-profile';
import type { ProcedureCompany } from '../../shared/procedures';

export function CompanyProfileDetails({company,role}:{company:ProcedureCompany;role?:string}) {
  const profile=readCompanyProfile(company.profile);
  if(!profile)return null;
  const matches=!role||profile.roles.length===0||profile.roles.includes(role);
  return <div className="company-profile-details">
    <p><strong>{matches?companyProfileCtc(profile):'CTC not recorded for this role'}</strong> · {profile.roles.length?profile.roles.join(' · '):'Role not specified'}</p>
    <p className="procedure-note">Community listing · maintainer-supplied details</p>
  </div>;
}
