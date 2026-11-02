// Explicit reviewed identities only. Financial subsidiaries and hiring programmes remain separate.
export const companyGroups = [
  ['jpmc', 'JPMorgan Chase & Co.', 'jp-morgan-chase-co'],
  ['godrej-and-boyce', 'Godrej & Boyce', 'godrej-boyce', 'godrej-and-boyce-ppo'],
  ['browserstack', 'BrowserStack', 'browserstack-software-pvt-ltd'],
  ['greylabs-ai', 'GreyLabs AI', 'greylabs-ai-ahg-technologies-private-limited'],
  ['loylty-rewardz', 'Loylty Rewardz', 'loylty-rewardz-mngt-pvt-ltd'],
  ['ncsi-technologies-india', 'NCSI Technologies (India)', 'ncsi-technologies-india-private-limited'],
  ['interactive-brokers', 'Interactive Brokers', 'interactive-broker'],
  ['nouryon-chemicals', 'Nouryon Chemicals', 'nouryon-chemicals-india-private-limited'],
  ['synergetics-it-services-india', 'Synergetics IT Services India', 'synergetics-information-technology-services-india-pvt-ltd'],
  ['icici-prudential-amc', 'ICICI Prudential AMC', 'icici-prudential-amc-ltd'],
  ['edra-labs', 'EDRA Labs', 'edra-labs-llp'],
] as const;
const identities = new Map<string, { key: string; name: string }>();
for (const [key, name, ...aliases] of companyGroups) for (const alias of [key, ...aliases]) identities.set(alias, { key, name });
export function canonicalCompanyKey(key: string) { const normalized = key.replaceAll('_', '-'); return identities.get(normalized)?.key || normalized; }
export function canonicalCompanyName(key: string, name: string) { return identities.get(key.replaceAll('_', '-'))?.name || name; }
export function mergeCompanyDirectory<T extends { key: string; name: string; years: number[] }>(rows: T[]): T[] {
  const merged = new Map<string, T>();
  for (const row of rows) {
    if (!row.key || !row.name || !Array.isArray(row.years)) continue;
    const key = canonicalCompanyKey(row.key), previous = merged.get(key);
    merged.set(key, { ...row, key, name: canonicalCompanyName(key, row.name), years: [...new Set([...(previous?.years || []), ...row.years])].sort() });
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}
