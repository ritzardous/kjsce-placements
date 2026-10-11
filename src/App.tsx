import { ThemeProvider } from './ThemeControl';
import { FetchLoader } from './FetchLoader';
import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import Dashboard, { initAnalytics } from './Dashboard';
import { AuthProvider, useAuth } from './auth';
import { Home, Landing, Login, Account, PortalShell } from './Portal';
import {rememberBatch,selectedBatch,batchHref} from './statistics-navigation';
import {hiddenYears,statisticsPages} from './routing';
import { useRoute } from './routing';
const Procedures = lazy(() => import('./Procedures'));
const AdminProcedures = lazy(() => import('./Procedures').then(module => ({ default: module.AdminProcedures })));
const communityLoading = <PortalShell active="procedures"><FetchLoader label="Loading community…"/></PortalShell>;
function Application() {
  const route = useRoute();
  const auth = useAuth();
  useEffect(() => { initAnalytics(); }, []);
  useEffect(()=>{if(!auth.allowed)return;if(statisticsPages.includes(route.page)&&hiddenYears.has(route.year)){location.replace('#home');return;}rememberBatch(route);if(route.page==='statistics'&&selectedBatch())location.replace(batchHref(selectedBatch()!));},[auth.allowed,route.page,route.year]);
  useEffect(() => {
    if (auth.ready && auth.allowed && ['login', 'landing'].includes(route.page)) location.replace('#home');
  }, [auth.ready, auth.allowed, route.page]);
  useEffect(() => {
    if (['landing','login','home','statistics','account'].includes(route.page)) document.title = route.page === 'account' ? 'My Account · Placement Stats KJSCE' : 'Placement Stats KJSCE';
  }, [route.page]);
  useEffect(() => {
    if (route.page === 'contributions') location.replace('#procedures/contributions');
    if (route.page === 'alumni') location.replace('#statistics');
  }, [route.page]);
  if (!auth.ready) return <div className="login-page session-loading"><FetchLoader label="Getting your session ready…"/></div>;
  if (!auth.allowed) return route.page === 'landing' ? <Landing /> : <Login deepLink={route.page !== 'login'} />;
  if (route.page === 'home' || route.page === 'landing' || route.page === 'login') return <Home />;
  if (route.page === 'statistics') return selectedBatch()?<PortalShell active="statistics"><FetchLoader label="Opening your selected batch…"/></PortalShell>:<Home statisticsOnly />;
  if(statisticsPages.includes(route.page)&&hiddenYears.has(route.year))return <Home />;
  if (route.page === 'procedures') return <Suspense fallback={communityLoading}><Procedures parameter={route.parameter} draftId={new URLSearchParams(location.hash.split('?')[1]).get('draft') || undefined} /></Suspense>;
  if (route.page === 'admin' && route.parameter === 'procedures') return <Suspense fallback={communityLoading}><AdminProcedures /></Suspense>;
  if (route.page === 'account' || route.page === 'contributions') return <Account />;
  if (route.page === 'alumni') return <Home statisticsOnly />;
  if (statisticsPages.includes(route.page)) return <Dashboard route={route} />;
  return <PortalShell active="home"><section className="portal-welcome"><h1>Page not found</h1><p>Choose a placement year or another section from Home.</p><a className="portal-link" href="#home">Back to Home ↗</a></section></PortalShell>;
}
class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="portal-shell app-recovery"><main className="portal-main" role="alert"><span className="eyebrow">LET’S GET YOU BACK</span><h1>This page could not load.</h1><p>Reload to get the latest app files. Your saved writing stays in your account.</p><div className="procedure-actions"><button className="action-button" onClick={() => location.reload()}>Reload app</button><a href="#home">Back to Home</a></div></main></div> : this.props.children;
  }
}
export default function App() {
  const route = useRoute();
  return <ThemeProvider><AuthProvider><AppBoundary key={statisticsPages.includes(route.page) ? 'dashboard' : route.page}><Application /></AppBoundary></AuthProvider></ThemeProvider>;
}
