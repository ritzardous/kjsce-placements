import { canonicalCompanyKey, companyGroups } from '../../shared/company-identity';

// Every event and string value is bounded here. Callers cannot send arbitrary text.
export const analyticsValues = {
  section: ['landing', 'home', 'statistics', 'overview', 'companies', 'company', 'branches', 'career_explorer', 'experiences', 'experience_company', 'experience_read', 'experience_write', 'saved', 'notifications', 'contributions', 'account', 'admin', 'about', 'support', 'not_found'],
  academic_year: ['2025', '2026', '2027'],
  search_surface: ['companies', 'candidates', 'experiences', 'company_picker'],
  result_bucket: ['none', '1_5', '6_20', '21_50', '51_plus'],
  filter_name: ['company_category', 'salary', 'role', 'campus', 'company', 'appearance_year', 'coverage', 'outcome', 'round', 'sort', 'timeline_metric'],
  filter_state: ['all', 'selected'],
  company_category: ['it', 'bfsi', 'core', 'consultancy', 'fmcg', 'ecommerce', 'other', 'unknown'],
  company_group: [...companyGroups.map(group => group[0]), 'other_company'],
  action_type: ['apply', 'clear', 'next', 'previous', 'upvote', 'downvote', 'remove', 'save', 'cancel', 'submit', 'start', 'linkedin'],
  outcome: ['success', 'cancelled', 'failed', 'not_authorized'],
  method: ['Google', 'native', 'clipboard'],
  content_type: ['company', 'experience', 'invitation'],
  destination: ['landing', 'home', 'statistics', 'overview', 'companies', 'company', 'branches', 'career_explorer', 'experiences', 'experience_company', 'experience_read', 'experience_write', 'saved', 'notifications', 'contributions', 'account', 'admin', 'about', 'support', 'not_found'],
} as const;
export type AnalyticsParameters = Partial<Record<keyof typeof analyticsValues, string | number>>;
export const productEvents = ['search', 'filter_apply', 'view_company', 'view_experience', 'navigation', 'alumni_contact', 'auth_start', 'auth_result', 'login', 'logout', 'writing_start', 'experience_submit', 'bookmark', 'vote', 'share', 'pagination'] as const;
export type ProductEvent = typeof productEvents[number];
const fields: Record<ProductEvent, readonly (keyof typeof analyticsValues)[]> = {
  search: ['search_surface', 'result_bucket'], filter_apply: ['filter_name', 'filter_state', 'company_category'],
  view_company: ['company_category', 'company_group', 'content_type'], view_experience: ['company_group', 'content_type'],
  navigation: ['destination'], alumni_contact: ['action_type'], auth_start: ['method'], auth_result: ['method', 'outcome'],
  login: ['method'], logout: [], writing_start: [], experience_submit: ['outcome'],
  bookmark: ['action_type'], vote: ['action_type'], share: ['method', 'content_type'], pagination: ['action_type'],
};

export function safeEventParameters(name: string, input: unknown): AnalyticsParameters | null {
  if (!Object.hasOwn(fields, name) || !input || typeof input !== 'object') return null;
  const result: AnalyticsParameters = {};
  for (const key of ['section', 'academic_year', ...fields[name as ProductEvent]] as const) {
    const value: unknown = Reflect.get(input, key);
    if ((typeof value === 'string' || typeof value === 'number') && (analyticsValues[key] as readonly string[]).includes(String(value))) result[key] = String(value);
  }
  return result;
}
export function companyAnalytics(key: string, category?: string): AnalyticsParameters {
  const group = canonicalCompanyKey(key);
  const categories: Record<string, string> = { IT: 'it', BFSI: 'bfsi', Core: 'core', Consultancy: 'consultancy', FMCG: 'fmcg', 'E-commerce': 'ecommerce', Other: 'other', 'Other - Advertising': 'other', Advertising: 'other' };
  return { company_group: companyGroups.some(entry => entry[0] === group) ? group : 'other_company', company_category: Object.hasOwn(categories, category ?? '') ? categories[category!] : 'unknown' };
}
export function resultBucket(count: number): string {
  return count <= 0 ? 'none' : count <= 5 ? '1_5' : count <= 20 ? '6_20' : count <= 50 ? '21_50' : '51_plus';
}

// Publish campaign links using these reviewed, non-personal labels only.
const campaigns = {
  utm_source: ['google', 'linkedin', 'instagram', 'whatsapp', 'telegram', 'github', 'college'],
  utm_medium: ['organic', 'social', 'referral', 'email', 'cpc', 'paid_social', 'qr'],
  utm_campaign: ['public_launch', 'alumni_invite', 'campus_launch', 'community_share'],
} as const;
export function analyticsCampaign(search: string, hash = ''): Record<string, string> {
  const query = new URLSearchParams(search), fragment = new URLSearchParams(hash.split('?')[1]);
  const result: Record<string, string> = {};
  const fields: Record<string, string> = { utm_source: 'campaign_source', utm_medium: 'campaign_medium', utm_campaign: 'campaign_name' };
  for (const [key, values] of Object.entries(campaigns)) {
    const value = query.get(key) ?? fragment.get(key);
    if (value && (values as readonly string[]).includes(value)) result[fields[key]] = value;
  }
  return result;
}
