import { readCompanyProfile, companyProfileCtc } from '../../shared/company-profile';
import type { ProcedureCompany } from '../../shared/procedures';

export function CompanyProfileDetails({company,role}:{company:ProcedureCompany;role?:string}) {
  const profile=readCompanyProfile(company.profile);
  if(!profile)return null;
  const matches=!role||profile.roles.includes(role);
  return <div className="company-profile-details">
    <p><strong>{matches?companyProfileCtc(profile):'CTC not recorded for this role'}</strong> · {profile.roles.join(' · ')}</p>
    <p className="procedure-note">Community listing · maintainer-supplied details</p>
  </div>;
}
