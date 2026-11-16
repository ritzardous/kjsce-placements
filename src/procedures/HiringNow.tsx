import { readCompanyHiring } from '../../shared/company-hiring';
import type { ProcedureCompany } from '../../shared/procedures';
import { CompanyLogo } from '../dashboard/CompanyIdentity';
import { AppIcon } from '../ui/AppIcon';
import { useCompanies } from './useCompanyDirectory';
import '../styles/hiring-now.css';

export function hiringCompanies(companies: ProcedureCompany[]) {
  return companies.map(company => ({ ...company, hiring: readCompanyHiring(company.key, company.hiring) }))
    .filter(company => company.hiring.status !== 'none')
    .sort((a, b) => Number(a.hiring.status === 'upcoming') - Number(b.hiring.status === 'upcoming') || a.name.localeCompare(b.name));
}
export function HiringNow({ companies }: { companies: ProcedureCompany[] }) {
  const featured = hiringCompanies(companies);
  if (!featured.length) return null;
  return <section className="hiring-now" aria-labelledby="hiring-now-title">
    <header className="hiring-now-heading"><span className="hiring-cohort">Class of 2027 · In focus</span><h2 id="hiring-now-title">Your next rounds.<br/><em>A head start.</em></h2><p>Alumni experiences for the companies on your radar.</p></header>
    <div className="hiring-now-grid">{featured.map((company, index) => <a className="hiring-company" key={company.key} href={`#procedures/company?company=${encodeURIComponent(company.key)}`}>
      <span className="hiring-company-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><CompanyLogo companyKey={company.key} name={company.name}/>
      <div className="hiring-company-copy"><h3>{company.name}</h3><span className={`hiring-state hiring-state-${company.hiring.status}`}>{company.hiring.status === 'ongoing' ? 'Ongoing' : 'Upcoming'}</span></div><AppIcon name="arrow"/>
    </a>)}</div>
    <p className="hiring-curation">Selected by the team. Check official college announcements for dates and eligibility.</p>
  </section>;
}

export function HomeExperienceCard() {
  const { companies } = useCompanies();
  const featured = hiringCompanies(companies);
  return <a className="community-entry home-community-link home-card" href="#procedures" aria-labelledby="home-community-title">
    <div><h2 id="home-community-title">Company Procedures</h2><p className="home-experience-copy">The next rounds feel different when someone’s been there.</p>
      {featured.length > 0 && <div className="home-hiring-preview"><span className="home-hiring-label">In focus for ’27</span><span className="home-hiring-companies">{featured.slice(0, 4).map(company => <span key={company.key}><CompanyLogo companyKey={company.key} name={company.name}/>{company.name}</span>)}{featured.length > 4 && <span>+{featured.length - 4}</span>}</span></div>}
    </div><span className="portal-link">Explore experiences <AppIcon name="arrow"/></span>
  </a>;
}
