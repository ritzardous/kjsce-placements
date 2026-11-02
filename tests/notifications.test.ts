import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNotification, notificationAction, notificationSettingsSchema } from '../shared/notifications';

test('legacy and unknown notifications remain readable and never trust supplied destinations', () => {
  const row = normalizeNotification({ id: 'old', title: 'Changes requested', submissionId: 'draft-1', message: 'Please clarify round two.', createdAt: 12, read: false, href: 'javascript:alert(1)' });
  assert.equal(row.type, 'changes_requested');
  assert.equal(row.category, 'contributions');
  assert.equal(notificationAction(row)?.href, '#procedures/contribute?draft=draft-1');
  const unknown = normalizeNotification({ id: 'future', type: 'future-event', category: 'future-category', title: 'New event', createdAt: 'invalid' });
  assert.equal(unknown.type, 'legacy'); assert.equal(unknown.createdAt, 0);
  assert.equal(notificationAction(unknown), null);
});

test('private outcomes and retired discussions have no misleading public destination', () => {
  for (const title of ['Report reviewed', 'Your question has a reply']) assert.equal(notificationAction(normalizeNotification({ id: 'event', title, submissionId: 'post-1' })), null);
  assert.equal(notificationAction(normalizeNotification({ id: 'batch', type: 'batch_update', entityId: 'https://outside.test' })), null);
  assert.equal(notificationAction(normalizeNotification({ id: 'approved', type: 'approved', entityId: 'post?unsafe=1' }))?.href, '#procedures/post%3Funsafe%3D1');
});

test('following is explicitly opt-in, bounded and rejects forged settings', () => {
  assert.equal(notificationSettingsSchema.parse({}).discovery, false);
  assert.equal(notificationSettingsSchema.safeParse({ discovery: true, email: true }).success, false);
  assert.equal(notificationSettingsSchema.safeParse({ following: Array.from({ length: 21 }, (_, index) => ({ kind: 'company', key: `company-${index}`, label: 'Company' })) }).success, false);
});
