import type { Route } from '../app/routing';

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
  if (!access.allowed && access.invitation) return page('/experiences/invitation', 'Experience invitation');
  if (!access.ready || access.redirecting) return null;
  if (!access.allowed) return page('/landing', 'Welcome');
  if (['home', 'landing', 'login'].includes(route.page)) return page('/home', 'Home');
  if (route.page === 'statistics') return page('/statistics', 'Choose a batch');
  if (route.page === 'account') return page('/account', 'Account');
  if (route.page === 'admin') return page('/admin', 'Administration');
  if (route.page === 'procedures') {
    const sections: Record<string, string> = { contribute: 'Write an experience', company: 'Company experiences', saved: 'Saved experiences', compare: 'Compare experiences', notifications: 'Notifications', contributions: 'Your contributions' };
    if (!route.parameter) return page('/experiences', 'Experiences');
    return sections[route.parameter]
      ? page(`/experiences/${route.parameter}`, sections[route.parameter])
      : page('/experiences/read', 'Read an experience');
  }
  if ([2025, 2026, 2027].includes(route.year) && ['overview', 'companies', 'company', 'branches', 'candidates', 'timeline', 'insights', 'explore'].includes(route.page)) {
    return page(`/${route.year}/${route.page}`, `Class of ${route.year}: ${route.page}`);
  }
  return page('/not-found', 'Page not found');
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
  return {
    reset() { previous = ''; previousKey = ''; scrolled = false; },
    view(page: AnalyticsPage, navigationKey = page.path) {
      const location = analyticsOrigin + page.path;
      if (navigationKey === previousKey) return;
      const fields = { page_location: location, page_title: page.title, page_referrer: previous || analyticsReferrer(initialReferrer) };
      send('set', fields);
      send('event', 'page_view', fields);
      previous = location;
      previousKey = navigationKey;
      scrolled = false;
    },
    scroll() {
      if (!previous || scrolled) return;
      scrolled = true;
      send('event', 'scroll', { percent_scrolled: 90 });
    },
  };
}

let tracker: ReturnType<typeof createAnalyticsTracker> | undefined;
let consentListenerInstalled = false;

export function trackPage(page: AnalyticsPage | null, navigationKey = page?.path ?? ''): void {
  if (!page) return;
  // Analytics failures must never affect authentication, navigation or writing.
  try {
    const win = window as AnalyticsWindow;
    const id: string | undefined = import.meta.env.VITE_GA_ID;
    const optedOut = () => !analyticsEnabled({
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
      send('set', { page_location: analyticsOrigin + page.path, page_title: page.title, page_referrer: analyticsReferrer(document.referrer) });
      send('js', new Date());
      send('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      tracker = createAnalyticsTracker((...args) => { if (!optedOut()) send(...args); }, document.referrer);
      const script = document.createElement('script');
      script.id = 'google-analytics';
      script.async = true;
      script.referrerPolicy = 'origin';
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
      window.addEventListener('scroll', () => {
        const height = document.documentElement.scrollHeight;
        if (height > innerHeight && (scrollY + innerHeight) / height >= 0.9) tracker?.scroll();
      }, { passive: true });
    }
    tracker.view(page, navigationKey);
  } catch { /* Optional telemetry must fail silently. */ }
}
let currentPage: AnalyticsPage | null = null;
// Route identity is used only for in-memory deduplication, never as an event field.
let currentKey = '';
