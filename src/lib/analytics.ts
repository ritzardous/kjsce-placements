import { parseRoute, type Route } from '../app/routing';
import { analyticsCampaign, safeEventParameters, type AnalyticsParameters, type ProductEvent } from './analytics-events';

export const analyticsOrigin = 'https://kjsce-placements.vercel.app';
export type AnalyticsPage = { path: string; title: string };
type Command = (...args: unknown[]) => void;
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Command;
  placementStatsAnalyticsConsent?: 'granted' | 'denied';
};

// Only fixed labels reach GA. Never use document.title, user input or route IDs.
export function analyticsPage(route: Route, access: { ready: boolean; allowed: boolean; invitation: boolean; redirecting: boolean }): AnalyticsPage | null {
  const page = (path: string, title: string) => ({ path, title: `${title} · Placement Stats` });
  if (route.page === 'about') return page('/about', 'About');
  if (route.page === 'support') return page('/support', 'Support');
  if (!access.allowed && access.invitation) return page('/experiences/invitation', 'Experience invitation');
  if (!access.ready || access.redirecting) return null;
  if (!access.allowed) return page('/landing', 'Welcome');
  if (['home', 'landing', 'login'].includes(route.page)) return page('/home', 'Home');
  if (route.page === 'statistics') return page('/statistics', 'Choose a batch');
  if (route.page === 'account') return page('/account', 'Account');
  if (route.page === 'admin') {
    const section = ['procedures', 'hiring', 'users', 'data', 'analytics', 'operations'].includes(route.parameter ?? '') ? route.parameter : 'overview';
    return page(`/admin/${section}`, `Administration: ${section}`);
  }
  if (route.page === 'procedures') {
    const sections: Record<string, string> = { contribute: 'Write an experience', company: 'Company experiences', saved: 'Saved experiences', compare: 'Compare experiences', notifications: 'Notifications', contributions: 'Your contributions' };
    if (!route.parameter) return page('/experiences', 'Experiences');
    return Object.hasOwn(sections, route.parameter)
      ? page(`/experiences/${route.parameter}`, sections[route.parameter])
      : page('/experiences/read', 'Read an experience');
  }
  if ([2025, 2026, 2027].includes(route.year) && ['overview', 'companies', 'company', 'branches', 'candidates', 'timeline', 'insights', 'explore'].includes(route.page)) {
    if (['explore', 'candidates', 'timeline', 'insights'].includes(route.page)) {
      const view = route.page === 'explore' ? (['timeline', 'insights'].includes(route.parameter ?? '') ? route.parameter : 'candidates') : route.page;
      return page(`/${route.year}/explore/${view}`, `Class of ${route.year}: career explorer ${view}`);
    }
    return page(`/${route.year}/${route.page}`, `Class of ${route.year}: ${route.page}`);
  }
  return page('/not-found', 'Page not found');
}

export function analyticsContext(page: AnalyticsPage): AnalyticsParameters {
  const segments = page.path.split('/').filter(Boolean);
  if (['2025', '2026', '2027'].includes(segments[0])) return { academic_year: segments[0], section: segments[1] === 'explore' ? 'career_explorer' : segments[1] };
  if (segments[0] === 'experiences') {
    const sections: Record<string, string> = { company: 'experience_company', read: 'experience_read', contribute: 'experience_write', saved: 'saved', notifications: 'notifications', contributions: 'contributions' };
    return { section: Object.hasOwn(sections, segments[1]) ? sections[segments[1]] : 'experiences' };
  }
  const sections: Record<string, string> = { landing: 'landing', home: 'home', statistics: 'statistics', account: 'account', admin: 'admin', about: 'about', support: 'support' };
  return { section: Object.hasOwn(sections, segments[0]) ? sections[segments[0]] : 'not_found' };
}

export function analyticsNavigationKey(route: Route, page: AnalyticsPage | null, hash: string): string {
  if (!page) return '';
  if (page.path.endsWith('/company') && route.page === 'procedures') return `${page.path}/${new URLSearchParams(hash.split('?')[1]).get('company') ?? ''}`;
  if (/\/(company|branches)$/.test(page.path) || page.path === '/experiences/read') return `${page.path}/${route.parameter ?? ''}`;
  return page.path;
}

export function analyticsEnabled(settings: { production: boolean; enabled?: string; id?: string; origin: string; emulators?: string; doNotTrack?: string | null; globalPrivacyControl?: boolean; consent?: string; disabled?: boolean }): boolean {
  return settings.production && settings.enabled === 'true' && /^G-[A-Z0-9]+$/.test(settings.id ?? '')
    && settings.origin === analyticsOrigin && settings.emulators !== 'true'
    && !['1', 'yes'].includes(settings.doNotTrack ?? '') && !settings.globalPrivacyControl
    && settings.consent !== 'denied' && !settings.disabled;
}

export function analyticsReferrer(value: string): string {
  try {
    const url = new URL(value);
    // Authentication redirects must not become acquisition sources.
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === analyticsOrigin || url.hostname === 'accounts.google.com' || url.hostname.endsWith('.firebaseapp.com')) return '';
    return url.origin + '/';
  } catch { return ''; }
}

export function createAnalyticsTracker(send: Command, initialReferrer: string) {
  let previous = '';
  let previousKey = '';
  let scrolled = false;
  let context: AnalyticsParameters = {};
  let sequence = 0;
  let windowStart = 0, eventCount = 0;
  const lastEvent = new Map<string, number>();
  const contentViews = new Set<string>();
  return {
    reset() { previous = ''; previousKey = ''; scrolled = false; lastEvent.clear(); contentViews.clear(); },
    view(page: AnalyticsPage, navigationKey = page.path) {
      const location = analyticsOrigin + page.path;
      if (navigationKey === previousKey) return;
      context = analyticsContext(page);
      const fields = { page_location: location, page_path: page.path, page_title: page.title, page_referrer: previous || analyticsReferrer(initialReferrer), ...context, instrumentation_version: '2' };
      send('set', { academic_year: null, ...fields });
      send('event', 'page_view', fields);
      sequence++;
      contentViews.clear();
      previous = location;
      previousKey = navigationKey;
      scrolled = false;
    },
    scroll() {
      if (!previous || scrolled) return;
      scrolled = true;
      send('event', 'scroll', { percent_scrolled: 90, ...context, instrumentation_version: '2' });
    },
    event(name: ProductEvent, input: unknown = {}, identity?: string) {
      if (!previous) return;
      const safe = safeEventParameters(name, input);
      if (!safe) return;
      if (identity && contentViews.has(`${name}:${identity}`)) return;
      const params = { ...context, ...safe, instrumentation_version: '2' };
      const key = JSON.stringify([sequence, name, params]);
      const now = Date.now();
      if (now - windowStart >= 60000) { windowStart = now; eventCount = 0; }
      if (eventCount >= 60 || (!identity && now - (lastEvent.get(key) ?? 0) < 1000)) return;
      if (identity) contentViews.add(`${name}:${identity}`);
      lastEvent.set(key, now);
      if (lastEvent.size > 100) lastEvent.delete(lastEvent.keys().next().value!);
      eventCount++;
      send('event', name, params);
    },
  };
}

let tracker: ReturnType<typeof createAnalyticsTracker> | undefined;
let consentListenerInstalled = false;
let loadFailed = false;
let entryCampaign: Record<string, string> | undefined;

export function trackProductEvent(name: ProductEvent, parameters: AnalyticsParameters = {}, identity?: string): void {
  try { tracker?.event(name, parameters, identity); } catch { /* Telemetry must never interrupt a product action. */ }
}
export function trackFilter(filter: string, selected: boolean, category?: string): void {
  trackProductEvent('filter_apply', { filter_name: filter, filter_state: selected ? 'selected' : 'all', ...(category ? { company_category: category } : {}) });
}

export function trackPage(page: AnalyticsPage | null, navigationKey = page?.path ?? ''): void {
  if (!page) return;
  // Analytics failures must never affect authentication, navigation or writing.
  try {
    const win = window as AnalyticsWindow;
    entryCampaign ??= analyticsCampaign(location.search, location.hash);
    const id: string | undefined = import.meta.env.VITE_GA_ID;
    const optedOut = () => loadFailed || !analyticsEnabled({
      production: import.meta.env.PROD, enabled: import.meta.env.VITE_GA_ENABLED, id,
      origin: location.origin, emulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS,
      doNotTrack: navigator.doNotTrack,
      globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
      consent: win.placementStatsAnalyticsConsent,
      disabled: Reflect.get(win, `ga-disable-${id}`) === true,
    });
    if (!consentListenerInstalled) {
      consentListenerInstalled = true;
      // A consent manager can revoke immediately, or grant and track the current page.
      window.addEventListener('placementstats:analytics-consent', event => {
        const consent: unknown = (event as CustomEvent<unknown>).detail;
        if (consent !== 'granted' && consent !== 'denied') return;
        const wasDenied = win.placementStatsAnalyticsConsent === 'denied';
        win.placementStatsAnalyticsConsent = consent;
        if (id) Reflect.set(win, `ga-disable-${id}`, consent === 'denied');
        win.gtag?.('consent', 'update', { analytics_storage: consent });
        if (consent === 'granted') { if (wasDenied) tracker?.reset(); trackPage(currentPage, currentKey); }
      });
    }
    currentPage = page;
    currentKey = navigationKey;
    if (optedOut() || !id) return;
    if (!tracker) {
      // Do not replace a tag/container installed by another integration.
      if (win.gtag || document.querySelector('script[src*="googletagmanager.com/"], #google-analytics')) return;
      win.dataLayer ??= [];
      const send: Command = function () { win.dataLayer!.push(arguments); };
      win.gtag = send;
      send('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
      send('set', { page_location: analyticsOrigin + page.path, page_path: page.path, page_title: page.title, page_referrer: analyticsReferrer(document.referrer), ...analyticsContext(page) });
      send('js', new Date());
      send('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...entryCampaign });
      tracker = createAnalyticsTracker((...args) => {
        if (optedOut()) return;
        if (args[0] === 'event') args[2] = { ...(args[2] as Record<string, unknown>), send_to: id };
        send(...args);
      }, document.referrer);
      const script = document.createElement('script');
      script.id = 'google-analytics';
      script.async = true;
      script.referrerPolicy = 'origin';
      script.onerror = () => { loadFailed = true; };
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
      window.addEventListener('scroll', () => {
        const height = document.documentElement.scrollHeight;
        if (height > innerHeight && (scrollY + innerHeight) / height >= 0.9) tracker?.scroll();
      }, { passive: true });
      document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return;
        const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
        if (!anchor) return;
        if (anchor.matches('.candidate-linkedin')) {
          trackProductEvent('alumni_contact', { action_type: 'linkedin' });
          return;
        }
        const href = anchor.getAttribute('href');
        if (!href?.startsWith('#')) return;
        const destination = analyticsPage(parseRoute(href), { ready: true, allowed: true, invitation: false, redirecting: false });
        if (destination && destination.path !== currentPage?.path) trackProductEvent('navigation', { destination: analyticsContext(destination).section });
      });
    }
    tracker.view(page, navigationKey);
  } catch { /* Optional telemetry must fail silently. */ }
}
let currentPage: AnalyticsPage | null = null;
// Route identity is used only for in-memory deduplication, never as an event field.
let currentKey = '';
