import { useEffect, useState } from 'react';
import { community, onInvalidatePages } from '../community/community-api';
import { canonicalCompanyKey } from '../../shared/company-identity';

type CompanyCounts = Map<string, number>;
let cachedCounts: CompanyCounts | null = null;
let cachedPromise: Promise<CompanyCounts> | null = null;
let lastFetched = 0;

export function invalidateCompanyExperienceCounts() {
  cachedCounts = null;
  cachedPromise = null;
  lastFetched = 0;
}

onInvalidatePages(action => {
  if (action === 'browse' || action === 'companyBrowse') {
    invalidateCompanyExperienceCounts();
  }
});

export function fetchCompanyExperienceCounts(): Promise<CompanyCounts> {
  if (cachedCounts && Date.now() - lastFetched < 120000) {
    return Promise.resolve(cachedCounts);
  }
  if (cachedPromise) return cachedPromise;
  cachedPromise = community<{ rows: { companyKey: string; count: number }[] }>('companyBrowse', {})
    .then(result => {
      const map = new Map<string, number>();
      for (const row of result?.rows || []) {
        if (row.companyKey && row.count > 0) {
          map.set(canonicalCompanyKey(row.companyKey), row.count);
        }
      }
      cachedCounts = map;
      lastFetched = Date.now();
      return map;
    })
    .catch(() => cachedCounts || new Map<string, number>())
    .finally(() => {
      cachedPromise = null;
    });
  return cachedPromise;
}

export function useCompanyExperienceCount(companyKey: string | undefined): { count: number; hasExperiences: boolean; loading: boolean } {
  const canonical = companyKey ? canonicalCompanyKey(companyKey) : '';
  const [counts, setCounts] = useState<CompanyCounts | null>(cachedCounts);
  const [loading, setLoading] = useState<boolean>(!cachedCounts);

  useEffect(() => {
    if (!canonical) {
      setLoading(false);
      return;
    }
    if (cachedCounts && Date.now() - lastFetched < 120000) {
      setCounts(cachedCounts);
      setLoading(false);
      return;
    }
    let active = true;
    void fetchCompanyExperienceCounts().then(map => {
      if (active) {
        setCounts(map);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [canonical]);

  const count = canonical && counts ? counts.get(canonical) || 0 : 0;
  return {
    count,
    hasExperiences: count > 0,
    loading: loading && !counts,
  };
}
