import { useEffect, useRef } from 'react';
import { companyAnalytics, resultBucket, type AnalyticsParameters } from './analytics-events';
import { trackProductEvent } from './analytics';

// The raw query is used only to notice a deliberate change, never sent to GA.
export function useAnalyticsSearch(surface: string, query: string, count: number, ready = true) {
  const previous = useRef(query);
  const latestCount = useRef(count);
  latestCount.current = count;
  useEffect(() => {
    if (query === previous.current || !ready) return;
    const timer = setTimeout(() => {
      previous.current = query;
      if (query.trim()) trackProductEvent('search', { search_surface: surface, result_bucket: resultBucket(latestCount.current) });
    }, 800);
    return () => clearTimeout(timer);
  }, [surface, query, ready]);
}

export function useAnalyticsContent(kind: 'company' | 'experience', identity: string | undefined, companyKey: string, category?: string) {
  useEffect(() => {
    if (!identity) return;
    // Parent routing effects establish the sanitized page context first.
    const timer = setTimeout(() => trackProductEvent(kind === 'company' ? 'view_company' : 'view_experience', {
      ...companyAnalytics(companyKey, category), content_type: kind,
    }, identity), 0);
    return () => clearTimeout(timer);
  }, [kind, identity, companyKey, category]);
}

export function trackChangedFilters(previous: Record<string, string>, next: Record<string, string>) {
  const names: Record<string, string> = { company: 'company', year: 'appearance_year', sort: 'sort', coverage: 'coverage', outcome: 'outcome', round: 'round' };
  for (const [key, name] of Object.entries(names)) {
    if (previous[key] === next[key]) continue;
    const parameters: AnalyticsParameters = { filter_name: name, filter_state: next[key] && next[key] !== 'newest' ? 'selected' : 'all' };
    trackProductEvent('filter_apply', parameters);
  }
}
