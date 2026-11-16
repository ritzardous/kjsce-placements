import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsEnabled, analyticsOrigin, analyticsPage, analyticsReferrer, createAnalyticsTracker } from '../../src/lib/analytics';

const access = { ready: true, allowed: true, invitation: false, redirecting: false };
test('analytics routes never include personal identifiers or titles', () => {
  for (const parameter of ['person@example.com', 'private-draft-123', 'Student Full Name']) {
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
  assert.deepEqual(views[0][2], { page_location: analyticsOrigin + '/home', page_title: home.title, page_referrer: 'https://www.google.com/' });
  assert.equal((views[1][2] as Record<string, string>).page_referrer, analyticsOrigin + '/home');
  assert.ok(!JSON.stringify(commands).includes('private@example.com'));
  tracker.reset(); tracker.view(home);
  assert.equal(commands.filter(command => command[1] === 'page_view').length, 4);
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
