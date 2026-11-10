import { safeStored, storeSession } from '../community/community-api';
export function rememberExperienceOrigin(uid: string | undefined, anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute('href') || '';
  if (!/^#procedures\/(?!company(?:\?|$)|saved(?:\?|$)|contributions(?:\?|$)|notifications(?:\?|$))/.test(href)) return;
  const current = location.hash;
  const label = current.startsWith('#procedures/saved') ? 'Saved for prep' : current.startsWith('#procedures/notifications') ? 'Notifications' : current.startsWith('#procedures/contributions') ? 'My contributions' : current.startsWith('#procedures/company') ? 'Company experiences' : current === '#procedures' || current.startsWith('#procedures?') ? 'Companies' : '';
  if (label) storeSession(`experience-origin:${uid}`, { href: current, target: href, label });
}
export function experienceOrigin(uid: string | undefined) {
  const value = safeStored<{ href: string; target: string; label: string } | null>(`experience-origin:${uid}`, null);
  if (!value || !/^#procedures(?:\?|\/|$)/.test(value.href) || value.href.includes('//') || value.target !== location.hash) return null;
  return value;
}
export function updateExperienceTarget(uid: string | undefined, from: string, to: string) {
  const value = safeStored<{ href: string; target: string; label: string } | null>(`experience-origin:${uid}`, null);
  if (value?.target === from) storeSession(`experience-origin:${uid}`, { ...value, target: to });
}
