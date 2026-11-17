import { inject, pageview, type BeforeSend } from '@vercel/analytics';
import { analyticsOrigin, type AnalyticsPage } from './analytics';

type ConsentWindow = Window & { placementStatsAnalyticsConsent?: 'granted' | 'denied' };

export function vercelAnalyticsAllowed(settings: {
  production: boolean; origin: string; emulators?: string; consent?: string;
  doNotTrack?: string | null; globalPrivacyControl?: boolean;
}): boolean {
  return settings.production && settings.origin === analyticsOrigin && settings.emulators !== 'true'
    && settings.consent !== 'denied' && !settings.globalPrivacyControl
    && !['1', 'yes'].includes(settings.doNotTrack ?? '');
}

// Module state survives StrictMode effects and route-boundary remounts.
let initialized = false;
let listening = false;
let discardInitialReferrer = true;
let previousKey = '';
let current: { page: AnalyticsPage; key: string } | undefined;
const allowed = () => vercelAnalyticsAllowed({
  production: import.meta.env.PROD, origin: location.origin,
  emulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS,
  consent: (window as ConsentWindow).placementStatsAnalyticsConsent,
  doNotTrack: navigator.doNotTrack,
  globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
});

// Only virtual, query-free paths produced by the shared route mapper may leave the app.
const beforeSend: BeforeSend = event => {
  if (event.type !== 'pageview') return null;
  // The SDK attaches document.referrer only to its first manual view. Cancel that
  // internal view so external query strings cannot leak; GA4 retains acquisition.
  if (discardInitialReferrer) { discardInitialReferrer = false; return null; }
  if (!allowed()) return null;
  try {
    const url = new URL(event.url);
    if (url.origin !== analyticsOrigin
      || !/^\/(?:landing|home|statistics|account|about|support|not-found|admin\/(?:overview|procedures|hiring|users|data|analytics|operations)|experiences(?:\/(?:invitation|contribute|company|saved|compare|notifications|contributions|read))?|202[567]\/(?:overview|companies|company|branches|explore\/(?:candidates|timeline|insights)))$/.test(url.pathname)) return null;
    return { ...event, url: analyticsOrigin + url.pathname };
  } catch { return null; }
};

export function trackVercelPage(page: AnalyticsPage | null, key: string): void {
  try {
    current = page ? { page, key } : undefined;
    if (!listening) {
      listening = true;
      window.addEventListener('placementstats:analytics-consent', event => {
        const consent: unknown = (event as CustomEvent<unknown>).detail;
        if (consent !== 'granted' && consent !== 'denied') return;
        (window as ConsentWindow).placementStatsAnalyticsConsent = consent;
        if (consent === 'denied') previousKey = '';
        else if (current) trackVercelPage(current.page, current.key);
      });
    }
    if (!page || !allowed() || previousKey === key) return;
    if (!initialized) {
      inject({ framework: 'react', mode: 'production', disableAutoTrack: true, beforeSend });
      initialized = true;
      pageview({ route: page.path, path: page.path });
    }
    pageview({ route: page.path, path: page.path });
    previousKey = key;
  } catch { /* Optional telemetry must never interrupt the application. */ }
}
