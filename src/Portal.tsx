import { ProductFooter } from './ProductFooter';
import LandingPage from './landing/LandingPage';
import {AppUtilities} from './AppUtilities';
import { ProfileAvatar } from './ProfileAvatar';
import { type ReactNode } from 'react';
import AuthControls from './AuthControls';
import { useAuth } from './auth';
import { academicYear, routeHref } from './components';
import { visibleYears } from './routing';
import {useStatisticsHref} from './statistics-navigation';

import { MobileAppNav } from './MobileAppNav';
import { AppIcon } from './AppIcon';

const areas = [['statistics', 'Placement Stats'], ['procedures', 'Company Procedures']];
export function AreaNav({ active }: { active: string }) {
  const statisticsHref=useStatisticsHref();
  return <nav className="area-nav" aria-label="App"><div className="area-switcher">{areas.map(([key, label]) => <a key={key} href={key==='statistics'?statisticsHref:`#${key}`} aria-current={active === key ? 'page' : undefined}><AppIcon name={key==='statistics'?'chart':'book'}/><span>{label}</span></a>)}</div></nav>;
}
function Brand() { return <a className="brand" href="#home" aria-label="Placement Stats KJSCE home"><span className="brand-mark workspace-brand-mark" aria-hidden="true"><span>p</span><svg viewBox="0 0 16 16" fill="none"><path d="M3 13L13 3M5 3H13V11" stroke="currentColor" strokeWidth="1.5"/></svg></span><span className="brand-name">Placement<br/>Stats.</span></a>; }
export function AppHeader({active}:{active:string}) {
 return <><header className="app-header"><div className="app-header-inner"><Brand/>{location.hash.split('?')[0]!=='#home'&&<button type="button" className="batch-back home-control" onClick={()=>window.history.back()} aria-label="Go back to the previous page" title="Go back to the previous page"><AppIcon name="back"/></button>}<AuthControls/></div></header><div className="workspace-area-navigation"><AreaNav active={active}/></div></>;
}
export function PortalFooter() { return <ProductFooter/>; }
export function PortalShell({ active, children }: { active: string; children: ReactNode }) {
  return <div className="portal-shell" data-app-page={active}><a className="skip-link" href="#portal-main" onClick={event => { event.preventDefault(); document.getElementById('portal-main')?.focus(); }}>Skip to content</a><AppHeader active={active}/><main className="portal-main" id="portal-main" tabIndex={-1}>{children}</main><PortalFooter /><MobileAppNav active={active}/><AppUtilities/></div>;
}
export function Landing({ deepLink = false }: { deepLink?: boolean }) { return <LandingPage deepLink={deepLink}/>; }
export function YearChoices() {
  return <section aria-labelledby="years-title"><div className="portal-section-heading"><span className="eyebrow">PLACEMENT STATISTICS</span><h2 id="years-title">Choose your batch.</h2><p>Choose a batch to explore its companies and placement outcomes.</p></div><div className="year-grid">{visibleYears.map(year => <a className={`year-card home-card ${year === 2027 ? 'year-card-live' : ''}`} key={year} href={routeHref('overview',year)}><div className="year-card-top"><span>{academicYear(year)}</span>{year === 2027 ? <span className="live-badge">LIVE</span> : <span className="year-status">HISTORICAL</span>}</div><h3>Class of {year}</h3><p>{year === 2027 ? 'Placements ongoing. Provisional results, updated from reviewed placement emails.' : year === 2025 ? 'Explore companies, packages and placement outcomes.' : 'Explore companies, packages and hiring timelines.'}</p><span className="year-card-link">View statistics <span aria-hidden="true">↗</span></span></a>)}</div></section>;
}
export function Home({ statisticsOnly = false }: { statisticsOnly?: boolean }) {
  const { user } = useAuth();
  return <PortalShell active={statisticsOnly ? 'statistics' : 'home'}><section className="portal-welcome"><span className="eyebrow">YOUR NEXT STEP STARTS HERE</span><h1>{statisticsOnly ? 'Placement Stats' : `Welcome${user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}.`}</h1><p>{statisticsOnly ? 'Explore one placement season at a time.' : 'Explore placement stats by batch, or company procedures for recruitment experiences.'}</p></section><YearChoices />{!statisticsOnly && <a className="community-entry home-community-link home-card" href="#procedures" aria-labelledby="home-community-title"><div><span className="eyebrow">BEYOND THE NUMBERS</span><h2 id="home-community-title">Company Procedures</h2><p>Explore interview experiences and share your own.</p><span className="coming-label">Share your experience · reviewed before publication</span></div><span className="portal-link">Explore experiences <AppIcon name="arrow"/></span></a>}</PortalShell>;
}
export function Account() {
  const { user, admin, busy, error, profileError, logout } = useAuth();
  const accountDate = (value: string | undefined) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';
  return <PortalShell active="account"><section className="portal-welcome"><span className="eyebrow">YOUR PERSONAL SPACE</span><h1>My Account</h1><p>Manage your profile and experiences.</p></section>
    <section className="account-details" aria-labelledby="account-details-title"><div className="profile-identity"><ProfileAvatar user={user}/><div><span className="eyebrow">YOUR ACCOUNT</span><h2 id="account-details-title">{user?.displayName || 'Your profile'}</h2><p>{user?.email}</p></div><span className="profile-connected"><AppIcon name="check"/>Google connected</span></div>{profileError&&<p className="procedure-note" role="status">Your account details could not be saved yet. We will try again automatically.</p>}<details className="profile-account-meta"><summary>Account information</summary><dl className="account-fields"><div><dt>Name</dt><dd>{user?.displayName || 'Not provided'}</dd></div><div><dt>Email</dt><dd>{user?.email || 'Not provided'}</dd></div><div><dt>Sign-in method</dt><dd>Google</dd></div><div><dt>Email verification</dt><dd>{user?.emailVerified ? 'Verified' : 'Not verified'}</dd></div><div><dt>Account created</dt><dd>{accountDate(user?.metadata.creationTime)}</dd></div><div><dt>Last sign-in</dt><dd>{accountDate(user?.metadata.lastSignInTime)}</dd></div></dl></details><button className="text-button profile-signout" disabled={busy} onClick={() => void logout()}><AppIcon name="logout"/>{busy ? 'Signing out...' : 'Sign out'}</button>{error && <p className="auth-message" role="alert">{error}</p>}</section>
    <nav className="account-content-shortcuts" aria-label="Manage your content"><a href="#procedures/contributions"><AppIcon name="pen"/><strong>My writing</strong><span>Drafts, submissions and feedback</span></a><a href="#procedures/saved"><AppIcon name="bookmark"/><strong>Saved for prep</strong><span>Your reading list</span></a><a href="#procedures/notifications?preferences=1"><AppIcon name="bell"/><strong>Notification preferences</strong><span>Updates and companies you follow</span></a></nav>
    {admin&&<a className="portal-link" href="#admin">Admin workspace →</a>}
  </PortalShell>;
}
