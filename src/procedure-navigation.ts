import { roundOptions } from '../shared/procedures';

export const browseDefaults = { company: '', year: '', coverage: '', outcome: '', sort: 'newest', search: '', round: '' };
export type BrowseFilters = typeof browseDefaults;
export function browseFilters(hash: string, stored: Partial<BrowseFilters> = {}, company?: string): BrowseFilters {
  const params = new URLSearchParams(hash.split('?')[1]);
  const explicit = Object.keys(browseDefaults).some(key => params.has(key));
  const source = explicit ? Object.fromEntries(params) : stored;
  return {
    company: company || String(source.company || '').slice(0, 120),
    year: /^\d{4}$/.test(String(source.year || '')) ? String(source.year) : '',
    coverage: ['Full', 'Partial'].includes(String(source.coverage)) ? String(source.coverage) : '',
    outcome: ['Selected', 'Not selected', 'Result pending'].includes(String(source.outcome)) ? String(source.outcome) : '',
    sort: source.sort === 'helpful' ? 'helpful' : 'newest',
    search: String(source.search || '').slice(0, 120),
    round: roundOptions.includes(source.round as typeof roundOptions[number]) ? String(source.round) : '',
  };
}
export function browseHref(filters: BrowseFilters, company?: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && value !== browseDefaults[key as keyof BrowseFilters]) params.set(key, value);
  if (company) params.set('company', company);
  return `#procedures${company ? '/company' : ''}${params.size ? `?${params}` : ''}`;
}
export function safeBrowseReturn(value: unknown) {
  return typeof value === 'string' && /^#procedures(?:\/company)?(?:\?|$)/.test(value) ? value : '#procedures';
}
