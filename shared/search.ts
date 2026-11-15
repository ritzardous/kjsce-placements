import { companyGroups } from './company-identity.js';

export function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\band\b/g, '&')
    .replace(/\s*&\s*/g, '&')
    .replace(/[^\p{L}\p{N}+#&]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function oneTypo(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const mismatches: number[] = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) mismatches.push(i);
    return mismatches.length <= 1 || (mismatches.length === 2 && mismatches[1] === mismatches[0] + 1 && a[mismatches[0]] === b[mismatches[1]] && a[mismatches[1]] === b[mismatches[0]]);
  }
  const shorter = a.length < b.length ? a : b, longer = a.length < b.length ? b : a;
  let i = 0, j = 0, skips = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) { i++; j++; }
    else { if (++skips > 1) return false; j++; }
  }
  return true;
}

const corporateSuffixes = new Set(['ltd', 'limited', 'pvt', 'private', 'inc', 'incorporated', 'corp', 'corporation', 'llp', 'co']);

function getInitials(text: string): string {
  const words = text.replace(/&/g, ' ').split(' ').filter(w => w && !corporateSuffixes.has(w));
  return words.map(w => w[0]).join('');
}

/** All query words must match. Short terms and roll numbers remain exact. */
export function matchesSearch(value: unknown, query: unknown): boolean {
  const search = normalizeSearch(query);
  if (!search) return true;
  const text = normalizeSearch(value);
  if (!text) return false;

  // Direct substring on normalized text
  if (text.includes(search)) return true;

  const textCompact = text.replace(/[^a-z0-9]/g, '');
  const searchCompact = search.replace(/[^a-z0-9]/g, '');
  if (searchCompact && (textCompact === searchCompact || textCompact.startsWith(searchCompact))) return true;
  if (searchCompact.length >= 4 && textCompact.includes(searchCompact)) return true;

  const words = text.split(' ');
  const searchWords = search.split(' ');

  // All query words must match
  return searchWords.every(term => {
    if (term.length <= 2) {
      return words.some(w => w === term || (term.length === 2 && w.startsWith(term) && !corporateSuffixes.has(w)));
    }
    if (words.some(w => w.startsWith(term)) || text.includes(term)) return true;
    if (term.length >= 4 && !/\d/.test(term)) {
      return textCompact.includes(term) || words.some(w => oneTypo(term, w));
    }
    return false;
  });
}

/**
 * Calculates a relevance score for a company against a search query.
 * Higher scores represent closer, more relevant matches.
 * Returns 0 if the company does not match the query.
 */
export function companyMatchScore(
  company: { name: string; key?: string; type?: string; roles?: string[] },
  query: string
): number {
  const q = normalizeSearch(query);
  if (!q) return 1;

  const n = normalizeSearch(company.name);
  const qCompact = q.replace(/[^a-z0-9]/g, '');
  const nCompact = n.replace(/[^a-z0-9]/g, '');
  const nWords = n.split(' ');
  const qWords = q.split(' ');
  const initials = getInitials(n);

  // Collect known aliases from companyGroups
  const allGroups: readonly (readonly string[])[] = companyGroups;
  const group = company.key
    ? allGroups.find(g => g.some(alias => alias.toLowerCase() === company.key!.toLowerCase() || alias.toLowerCase() === n))
    : undefined;
  const aliases: string[] = group ? group.map((a: string) => normalizeSearch(a)) : [];

  // Tier 1: Exact matches (1000)
  if (n === q || (qCompact.length >= 2 && nCompact === qCompact)) return 1000;
  if (company.key && (company.key.toLowerCase() === q || company.key.toLowerCase().replace(/[^a-z0-9]/g, '') === qCompact)) return 950;
  if (aliases.some((a: string) => a === q || a.replace(/[^a-z0-9]/g, '') === qCompact)) return 950;

  // Tier 2: Name starts with query prefix (800+)
  if (n.startsWith(q) || (qCompact.length >= 2 && nCompact.startsWith(qCompact))) {
    return 800 + Math.max(0, 50 - company.name.length);
  }
  if (aliases.some((a: string) => a.startsWith(q))) {
    return 800;
  }

  // Tier 3: Acronym / initials or ampersand variants (700-750)
  if (n.includes('&')) {
    const parts = n.split(' ')[0].split('&');
    if (parts.length === 2) {
      const alt = parts[0] + parts[1]; // e.g. "lt"
      const altN = parts[0] + 'n' + parts[1]; // e.g. "lnt"
      if (qCompact === alt || qCompact === altN || q === parts[0] + '&' + parts[1]) {
        return 750;
      }
    }
  }
  if (initials && (initials === qCompact || (qCompact.length >= 2 && initials.startsWith(qCompact)))) {
    return 700;
  }

  // Tier 4: Whole word or word prefix match in name (550-600)
  if (nWords.some(w => w === q)) return 600;
  if (nWords.some(w => w.startsWith(q) && q.length >= 3)) return 550;

  // Tier 5: Substring match in name (500)
  if (q.length >= 3 && n.includes(q)) return 500;
  if (qWords.length === 1 && qCompact.length >= 4) {
    const strippedSuffix = nCompact.replace(/(ltd|limited|pvt|private)$/, '');
    if (strippedSuffix.includes(qCompact) || nCompact === qCompact) return 450;
  }

  // Tier 6: Multi-word query where all words match in name (400)
  if (qWords.length > 1 && qWords.every(qw => {
    if (qw === 'l&t' || qw === 'lt') return nWords.some(w => w === 'l&t' || w === 'lt');
    return nWords.some(w => w.startsWith(qw) || (qw.length >= 4 && oneTypo(qw, w)));
  })) {
    return 400;
  }

  // Tier 7: Fuzzy / Typo match in name (300)
  if (q.length >= 4 && (nWords.some(w => oneTypo(q, w)) || oneTypo(q, n))) {
    return 300;
  }

  // Tier 8: Role match (200)
  if (company.roles && company.roles.some(r => {
    const nr = normalizeSearch(r);
    if (q.length <= 2) {
      return nr.split(' ').some(w => w === q);
    }
    return nr.includes(q) || (q.length >= 4 && nr.split(' ').some(w => oneTypo(q, w)));
  })) {
    return 200;
  }

  // Tier 9: Type match (150)
  if (company.type && normalizeSearch(company.type) === q) {
    return 150;
  }

  return 0;
}
