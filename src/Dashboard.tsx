import { FetchLoader } from './FetchLoader';
import { useEffect, useState } from 'react';
import type { DashboardResponse } from '../shared/statistics';
import { useBackgroundSync } from './background-sync';
import { loadDashboard, watchDashboardVersion } from './repository';
import { firebaseMessage } from './firebase';
import type { Route } from './routing';
import { AppHeader } from './Portal';
import { MobileAppNav } from './MobileAppNav';
import { AppIcon, type IconName } from './AppIcon';
import { date, routeHref } from './components';
import { Branches, Companies, CompanyDetail, CareerExplorer, Overview, initialCompanyFilters, type CandidateFilters } from './pages';

import {statisticsSections as nav} from './statistics-navigation';
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
  if (!s) page = !error?<FetchLoader label={`Loading ${route.year} placement statistics…`}/>:<div className="page-message" role={error ? 'alert' : 'status'}><h1>{error ? 'Placement data unavailable' : 'Loading placement statistics…'}</h1><p>{error ?? `Fetching the ${route.year} dataset.`}</p>{error && <button className="action-button" onClick={() => setAttempt(a => a + 1)}>Try again</button>}</div>;
  else if (route.page === 'company') page = <CompanyDetail company={s.companies.find(c => c.key === route.parameter)} year={route.year} />;
  else if (active === 'companies') page = <Companies statistics={s} filters={companyFilters} setFilters={setCompanyFilters} />;
  else if (active === 'branches') page = <Branches statistics={s} selected={route.parameter} onCandidates={branch => setCandidateFilters({ search: branch, role: null })} />;
  else if(active==='explore')page=<CareerExplorer statistics={s} view={route.page==='explore'?route.parameter:route.page} filters={candidateFilters} setFilters={setCandidateFilters}/>;
  else page = <Overview statistics={s} />;
  const notes = data?.metadata.extraction_notes;
  return <div id="app"><AppHeader active="statistics"/>
    <main id="main" key={route.year}><nav className="nav dashboard-desktop-nav" aria-label="Dashboard">{nav.map(([key, label]) => <a className={'nav-item ' + (active === key ? 'active' : '')} aria-current={active === key ? 'page' : undefined} key={key} href={routeHref(key, route.year)}><AppIcon name={sectionIcons[key]}/><span>{label}</span></a>)}</nav>{s && route.year === 2027 && <aside className="coverage-notice live-notice"><strong><span className="live-badge">LIVE</span> 2026–27 · Placements ongoing</strong><span>Season in progress. these totals are provisional. Latest included email: {typeof data?.metadata.source_updated_at === 'string' ? date(data.metadata.source_updated_at.slice(0, 10), true) : 'Not available'}; latest declared result: {date(s.summary.latestDate, true)}. Updates appear automatically when reviewed results are published. Registration total is unavailable, so no placement rate is calculated.</span><span className="sync-indicator">Published updates appear automatically.</span></aside>}{s && route.year === 2025 && route.page === 'overview' && <aside className="coverage-notice"><strong>2024–25 · Final UG report + email results</strong>{s.candidates.filter(c => c.campus === 'On campus').length} on-campus and {s.candidates.filter(c => c.campus === 'Off campus').length} off-campus selections. {s.candidates.filter(c => c.date === null).length} selections have no confirmed date; undated entries remain in totals but are excluded from timeline charts. Registration total is unavailable, so no placement rate is calculated.</aside>}{page}{s && route.page !== 'company' && Array.isArray(notes) && <details className="source-notes"><summary>Data sources, extraction notes & limitations</summary><ul>{notes.map((note, i) => <li key={i}>{String(note)}</li>)}</ul></details>}</main>
    <footer><div className="footer-inner"><div className="footer-left"><span>KJSCE T&amp;PO PLACEMENT DATA{s ? ` · ${date(s.summary.firstDate, true)} → ${date(s.summary.latestDate, true)} · ${s.summary.announcements} ${route.year === 2025 ? "RECORD GROUPS" : "ANNOUNCEMENTS"} · ${s.summary.selections} CANDIDATE SELECTIONS RECORDED` : ''}</span><span className="footer-credit">Made with <span className="footer-heart">♥</span> by Ritzardous</span></div><a href="https://github.com/RiteshJha912/placementsatkjsce-26" target="_blank" rel="noopener noreferrer" className="footer-source-btn">Source code ↗</a></div></footer>
    <MobileAppNav active="statistics" statisticsHref={routeHref("overview",route.year)} year={route.year} section={active}/>
  </div>;
}
