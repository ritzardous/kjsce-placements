import assert from 'node:assert/strict';
import test from 'node:test';
import { isDatabaseQuotaError } from '../../functions/src/service-errors.js';

test('Firestore gRPC quota exhaustion is distinguished from setup, auth and index failures', () => {
  for (const code of [8, '8', 'resource-exhausted', 'firestore/resource-exhausted']) assert.equal(isDatabaseQuotaError({ code }), true);
  for (const error of [null, undefined, 'quota', { code: 9 }, { code: 7 }, { code: 'unavailable' }, new Error('private backend details')]) assert.equal(isDatabaseQuotaError(error), false);
});
