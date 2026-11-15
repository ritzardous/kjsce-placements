const MAX_PAGE = 10000;

/** Read a validated 1-based page number from a hash query such as `#companies?page=3`. */
export function pageFromHash(hash: string): number {
  const raw = new URLSearchParams(hash.split('?')[1]).get('page');
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= MAX_PAGE ? value : 1;
}

/** Keep any existing hash query parameters while replacing the page number. */
export function pageHref(hash: string, page: number): string {
  const [base, query = ''] = hash.split('?');
  const params = new URLSearchParams(query);
  if (page > 1) params.set('page', String(page));
  else params.delete('page');
  const search = params.toString();
  return `${base}${search ? `?${search}` : ''}`;
}
