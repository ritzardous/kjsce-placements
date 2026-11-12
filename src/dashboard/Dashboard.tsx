import { SourceNotes } from './SourceNotes';
import {AppUtilities} from '../ui/AppUtilities';
import { FetchLoader } from '../ui/FetchLoader';
import { useEffect, useState } from 'react';
import type { DashboardResponse } from '../../shared/statistics';
import { useBackgroundSync } from '../lib/background-sync';
import { loadDashboard, watchDashboardVersion } from './repository';
import { firebaseMessage } from '../lib/firebase';
import type { Route } from '../app/routing';
import { AppHeader, PortalFooter } from '../app/Portal';
import { MobileAppNav } from '../app/MobileAppNav';
import { AppIcon, type IconName } from '../ui/AppIcon';
import { date, routeHref } from './components';
import { Branches, Companies, CompanyDetail, CareerExplorer, Overview, initialCompanyFilters, type CandidateFilters } from './pages';

import {statisticsSections as nav} from '../app/statistics-navigation';
const sectionIcons: Record<string,IconName> = {overview:'chart',companies:'building',branches:'branches',explore:'compass'};
export function initAnalytics() {
  const id = import.meta.env.VITE_GA_ID;
  if (!import.meta.env.PROD || !id || document.getElementById('google-analytics')) return;
  const dataLayer: unknown[][] = [];
  Object.assign(window, { dataLayer });
  const gtag = (...args: unknown[]) => dataLayer.push(args);
  Object.assign(window, { gtag });
  const script = document.createElement('script');
  script.id = 'google-analytics'; script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(script);
  gtag('js', new Date()); gtag('config', id);
}
export default function Dashboard({ route }: { route: Route }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [companyFilters, setCompanyFilters] = useState(initialCompanyFilters);
  const [candidateFilters, setCandidateFilters] = useState<CandidateFilters>({ search: '', role: null });
  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => {
    setCompanyFilters(initialCompanyFilters); setCandidateFilters({ search: '', role: null });
    document.title = `Placement Stats @ KJSCE '${String(route.year).slice(-2)}`;
  }, [route.year]);
  useEffect(() => {
    let active = true;
    let timeout: number | undefined;
    setError(null);
    async function load() {
      try {
        const result = await Promise.race([
          loadDashboard(route.year),
          new Promise<never>((_, reject) => { timeout = window.setTimeout(() => reject(new Error('Loading timed out. Check your connection and Firebase connectivity, then try again.')), 20000); }),
        ]);
        if (active) setData(result);
      } catch (cause) {
        if (active) setError(firebaseMessage(cause));
      } finally { window.clearTimeout(timeout); }
    }
    void load();
    return () => { active = false; window.clearTimeout(timeout); };
  }, [attempt, route.year]);
  useEffect(() => watchDashboardVersion(route.year, () => setAttempt(value => value + 1)), [route.year]);
  useBackgroundSync(async () => { setAttempt(value => value + 1); }, 120000, Boolean(error));
  const s = data?.statistics.batch.year === route.year ? data.statistics : undefined;
  const active = ['candidates','timeline','insights','explore'].includes(route.page)?'explore':route.page === 'company' ? 'companies' : nav.some(([key]) => key === route.page) ? route.page : 'overview';
  let page;
  if (!s) page = !error?<FetchLoader variant="dashboard" label={`Loading ${route.year} placement statistics…`}/>:<div className="page-message" role={error ? 'alert' : 'status'}><h1>{error ? 'Placement data unavailable' : 'Loading placement statistics…'}</h1><p>{error ?? `Fetching the ${route.year} dataset.`}</p>{error && <button className="action-button" onClick={() => setAttempt(a => a + 1)}>Try again</button>}</div>;
  else if (route.page === 'company') page = <CompanyDetail company={s.companies.find(c => c.key === route.parameter)} year={route.year} />;
  else if (active === 'companies') page = <Companies statistics={s} filters={companyFilters} setFilters={setCompanyFilters} />;
  else if (active === 'branches') page = <Branches statistics={s} selected={route.parameter} onCandidates={branch => setCandidateFilters({ search: branch, role: null })} />;
  else if(active==='explore')page=<CareerExplorer statistics={s} view={route.page==='explore'?route.parameter:route.page} filters={candidateFilters} setFilters={setCandidateFilters}/>;
  else page = <Overview statistics={s} />;
  const notes = data?.metadata.extraction_notes;
  return <div id="app"><AppHeader active="statistics"/>
    <main id="main" key={route.year}><nav className="nav dashboard-desktop-nav" aria-label="Dashboard">{nav.map(([key, label]) => <a className={'nav-item ' + (active === key ? 'active' : '')} aria-current={active === key ? 'page' : undefined} key={key} href={routeHref(key, route.year)}><AppIcon name={sectionIcons[key]}/><span>{label}</span></a>)}</nav>{page}{s && route.page !== 'company' && <SourceNotes key={`${route.year}/${route.page}/${route.parameter ?? ""}`}><ul>
      <li>{s.batch.registrationSource} Placement rate counts unique students, not selections. No rate is shown without a registration total.</li>
      <li>{s.batch.year === 2025 ? 'Final UG report, enriched with email results. Includes on-campus and off-campus selections. CTC averages are selection-weighted.' : 'Reviewed T&PO announcements; coverage is limited to supplied records. CTC averages are announcement-weighted.'} Unknown or mixed CTC values are excluded from averages.</li>
      <li>TPO counters, selections and unique students are separate measures. Missing counters remain unknown. {s.candidates.filter(c=>c.date===null).length} undated selections count toward totals but not timeline charts.</li>
      <li>Company CTC rankings show each company once, using its highest recorded package. Campus labels describe the recorded selection route, not every role at an employer.</li>
      <li>Google is labeled off campus per maintainer clarification; other campus labels use the source report where available. Unspecified routes remain unknown.</li>
      {Array.isArray(notes) && notes.map((note,i)=><li key={i}>{String(note)}</li>)}
    </ul></SourceNotes>}</main>
    <PortalFooter/>
    <AppUtilities/><MobileAppNav active="statistics" statisticsHref={routeHref("overview",route.year)} year={route.year} section={active}/>
  </div>;
}
