import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsContext, analyticsEnabled, analyticsNavigationKey, analyticsOrigin, analyticsPage, analyticsReferrer, createAnalyticsTracker } from '../../src/lib/analytics';
import { analyticsCampaign, companyAnalytics, resultBucket, safeEventParameters } from '../../src/lib/analytics-events';

const access = { ready: true, allowed: true, invitation: false, redirecting: false };
test('analytics routes never include personal identifiers or titles', () => {
  for (const parameter of ['person@example.com', 'private-draft-123', 'Student Full Name', '__proto__', 'constructor']) {
    const result = analyticsPage({ page: 'procedures', parameter, year: 2027 }, access);
    assert.equal(result?.path, '/experiences/read');
    assert.ok(!JSON.stringify(result).includes(parameter));
    assert.equal(analyticsPage({ page: 'company', parameter, year: 2027 }, access)?.path, '/2027/company');
  }
  assert.equal(analyticsPage({ page: 'procedures', parameter: 'contribute', year: 2027 }, access)?.path, '/experiences/contribute');
});
test('analytics measures rendered access states rather than protected destination requests', () => {
  const route = { page: 'companies', year: 2027 };
  assert.equal(analyticsPage(route, { ...access, ready: false }), null);
  assert.equal(analyticsPage(route, { ...access, redirecting: true }), null);
  assert.equal(analyticsPage(route, { ...access, allowed: false })?.path, '/landing');
  assert.equal(analyticsPage(route, { ...access, allowed: false, invitation: true })?.path, '/experiences/invitation');
});
test('analytics requires explicit canonical production enablement and honors privacy signals', () => {
  const settings = { production: true, enabled: 'true', id: 'G-C9YFLJ7WPC', origin: analyticsOrigin };
  assert.equal(analyticsEnabled(settings), true);
  for (const change of [{ production: false }, { enabled: undefined }, { enabled: 'false' }, { id: 'invalid' }, { origin: 'http://localhost:5173' }, { origin: 'https://preview.vercel.app' }, { emulators: 'true' }, { doNotTrack: '1' }, { globalPrivacyControl: true }, { consent: 'denied' }, { disabled: true }]) {
    assert.equal(analyticsEnabled({ ...settings, ...change }), false, JSON.stringify(change));
  }
});
test('page views deduplicate remounts but count back navigation and update engagement context', () => {
  const commands: unknown[][] = [];
  const tracker = createAnalyticsTracker((...args) => commands.push(args), 'https://www.google.com/search?q=private@example.com');
  const home = { path: '/home', title: 'Home · Placement Stats' };
  const overview = { path: '/2027/overview', title: 'Class of 2027: overview · Placement Stats' };
  tracker.view(home); tracker.view(home); tracker.scroll(); tracker.scroll();
  tracker.view(overview); tracker.scroll(); tracker.view(home);
  const views = commands.filter(command => command[1] === 'page_view');
  assert.equal(views.length, 3);
  assert.equal(commands.filter(command => command[1] === 'scroll').length, 2);
  assert.deepEqual(views[0][2], { page_location: analyticsOrigin + '/home', page_path: '/home', page_title: home.title, page_referrer: 'https://www.google.com/', section: 'home', instrumentation_version: '2' });
  assert.equal((views[1][2] as Record<string, string>).page_referrer, analyticsOrigin + '/home');
  assert.ok(!JSON.stringify(commands).includes('private@example.com'));
  tracker.reset(); tracker.view(home);
  assert.equal(commands.filter(command => command[1] === 'page_view').length, 4);
});

test('every important route has a bounded virtual path, context and title', () => {
  const cases = [
    ['landing', undefined, '/home'], ['home', undefined, '/home'], ['statistics', undefined, '/statistics'],
    ['overview', undefined, '/2027/overview'], ['companies', undefined, '/2027/companies'], ['company', 'private@example.test', '/2027/company'],
    ['branches', 'private@example.test', '/2027/branches'], ['explore', undefined, '/2027/explore/candidates'],
    ['explore', 'timeline', '/2027/explore/timeline'], ['explore', 'insights', '/2027/explore/insights'],
    ['candidates', undefined, '/2027/explore/candidates'], ['timeline', undefined, '/2027/explore/timeline'], ['insights', undefined, '/2027/explore/insights'],
    ['procedures', undefined, '/experiences'], ['procedures', 'company', '/experiences/company'], ['procedures', 'contribute', '/experiences/contribute'],
    ['procedures', 'private@example.test', '/experiences/read'], ['procedures', 'saved', '/experiences/saved'],
    ['procedures', 'notifications', '/experiences/notifications'], ['procedures', 'contributions', '/experiences/contributions'],
    ['admin', 'users', '/admin/users'], ['admin', 'private@example.test', '/admin/overview'], ['about', undefined, '/about'], ['account', undefined, '/account'],
    ['private@example.test', undefined, '/not-found'],
  ];
  for (const [page, parameter, expected] of cases) {
    const result = analyticsPage({ page: page!, parameter, year: 2027 }, access)!;
    assert.equal(result.path, expected);
    assert.ok(!JSON.stringify(result).includes('private@example.test'));
    assert.ok(safeEventParameters('navigation', { ...analyticsContext(result), destination: analyticsContext(result).section })?.section);
  }
});

test('company hub identity changes count views but filter changes and aliases do not', () => {
  const route = { page: 'procedures', parameter: 'company', year: 2027 };
  const page = analyticsPage(route, access)!;
  const first = analyticsNavigationKey(route, page, '#procedures/company?company=first&search=private');
  assert.equal(first, analyticsNavigationKey(route, page, '#procedures/company?search=different&company=first&page=2'));
  assert.notEqual(first, analyticsNavigationKey(route, page, '#procedures/company?company=second'));
  const landing = analyticsPage(route, { ...access, allowed: false })!;
  assert.equal(analyticsNavigationKey(route, landing, '#procedures/company?company=private'), '/landing');
  assert.equal(analyticsNavigationKey({page:'candidates',year:2027}, analyticsPage({page:'candidates',year:2027},access), ''), '/2027/explore/candidates');
});

test('event boundary rejects arbitrary names, raw searches, sensitive URLs and forged parameter values', () => {
  assert.equal(safeEventParameters('private@example.test', {}), null);
  assert.equal(safeEventParameters('__proto__', {}), null);
  assert.deepEqual(safeEventParameters('search', {
    search_surface: 'companies', result_bucket: '6_20', search_term: 'private@example.test', email: 'private@example.test',
    section: 'companies', academic_year: 2027, user_id: 'secret', page_location: 'https://example.com/private',
  }), { section: 'companies', academic_year: '2027', search_surface: 'companies', result_bucket: '6_20' });
  assert.deepEqual(safeEventParameters('view_company', { company_group: 'private@example.test', company_category: 'private', section: 'private', academic_year: 2001 }), {});
  assert.deepEqual(safeEventParameters('alumni_contact', { action_type:'linkedin', url:'https://linkedin.com/in/private-person', name:'Student' }), { action_type:'linkedin' });
  assert.deepEqual(safeEventParameters('login', { method:'Google', company_group:'jpmc', role:'admin' }), { method:'Google' });
});

test('company context uses only reviewed identities and broad categories', () => {
  assert.deepEqual(companyAnalytics('jp-morgan-chase-co', 'BFSI'), { company_group: 'jpmc', company_category: 'bfsi' });
  assert.deepEqual(companyAnalytics('private@example.test', 'Private Category'), { company_group: 'other_company', company_category: 'unknown' });
  assert.deepEqual([0,1,5,6,20,21,50,51].map(resultBucket), ['none','1_5','1_5','6_20','6_20','21_50','21_50','51_plus']);
});

test('acquisition accepts reviewed campaign labels while dropping identifiers and arbitrary campaigns', () => {
  assert.deepEqual(analyticsCampaign('?utm_source=linkedin&utm_medium=social&utm_campaign=public_launch&gclid=secret&email=private'), { campaign_source:'linkedin', campaign_medium:'social', campaign_name:'public_launch' });
  assert.deepEqual(analyticsCampaign('?utm_source=private@example.test&utm_campaign=Student%20Name'), {});
  assert.deepEqual(analyticsCampaign('', '#landing?utm_source=whatsapp&utm_medium=social&utm_campaign=alumni_invite&draft=secret'), { campaign_source:'whatsapp', campaign_medium:'social', campaign_name:'alumni_invite' });
});

test('product events inherit current page context, deduplicate content and bound repeated interactions', () => {
  const commands: unknown[][] = [];
  const tracker = createAnalyticsTracker((...args) => commands.push(args), '');
  tracker.event('login', { method:'Google' });
  assert.equal(commands.length, 0);
  tracker.view({path:'/2027/company',title:'Company'}, 'private-company');
  tracker.event('view_company', { ...companyAnalytics('jpmc', 'BFSI'), content_type:'company' }, 'private-company');
  tracker.event('view_company', { ...companyAnalytics('jpmc', 'BFSI'), content_type:'company' }, 'private-company');
  tracker.event('search', { search_surface:'companies', result_bucket:'1_5' });
  tracker.event('search', { search_surface:'companies', result_bucket:'1_5' });
  assert.equal(commands.filter(command => command[1] === 'view_company').length, 1);
  assert.equal(commands.filter(command => command[1] === 'search').length, 1);
  assert.ok(!JSON.stringify(commands).includes('private-company'));
  tracker.view({path:'/home',title:'Home'});
  tracker.event('logout');
  const last = commands.at(-1)![2] as Record<string, unknown>;
  assert.equal(last.section, 'home');
  assert.ok(!('academic_year' in last));
  assert.equal((commands.filter(command=>command[0]==='set').at(-1)![1] as Record<string, unknown>).academic_year, null);
});

test('excessive product events are capped without suppressing real page views', () => {
  const commands: unknown[][] = [];
  const tracker = createAnalyticsTracker((...args) => commands.push(args), '');
  tracker.view({path:'/2027/company',title:'Company'});
  for(let index=0;index<75;index++) tracker.event('view_company', {company_group:'jpmc'}, `private-${index}`);
  assert.equal(commands.filter(command=>command[1]==='view_company').length, 60);
  tracker.view({path:'/about',title:'About'});
  assert.equal(commands.filter(command=>command[1]==='page_view').length, 2);
  assert.ok(!JSON.stringify(commands).includes('private-'));
});
test('referrers discard paths, credentials, queries, fragments and authentication redirects', () => {
  assert.equal(analyticsReferrer('https://name:password@example.org/private/person?email=a#secret'), 'https://example.org/');
  for (const value of ['', 'invalid', 'javascript:alert(1)', analyticsOrigin + '/#account', 'https://accounts.google.com/login', 'https://placement-stats-kjsce.firebaseapp.com/__/auth/handler']) assert.equal(analyticsReferrer(value), '');
});

test('different company or article identities count views without sending the identifiers', () => {
  const commands: unknown[][] = [];
  const tracker = createAnalyticsTracker((...args) => commands.push(args), '');
  const page = { path: '/experiences/read', title: 'Read an experience' };
  tracker.view(page, 'private-article-one');
  tracker.view(page, 'private-article-one');
  tracker.view(page, 'private-article-two');
  assert.equal(commands.filter(command => command[1] === 'page_view').length, 2);
  assert.ok(!JSON.stringify(commands).includes('private-article'));
});
