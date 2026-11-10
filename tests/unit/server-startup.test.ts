import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Firebase server dependencies load without require(ESM) and resolve RSA signing keys', () => {
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', `
    const assert = require('node:assert/strict');
    const { createRequire } = require('node:module');
    const crypto = require('node:crypto');
    require('firebase-admin/app');
    require('firebase-admin/auth');
    require('firebase-admin/firestore');
    require('firebase-functions/v2/https');
    const sdkRequire = createRequire(require.resolve('firebase-admin/auth'));
    const { retrieveSigningKeys } = sdkRequire('jwks-rsa/src/utils');
    (async () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'startup-test', alg: 'RS256' };
      const keys = await retrieveSigningKeys([jwk]);
      assert.equal(keys.length, 1);
      const payload = Buffer.from('Firebase server compatibility test');
      const signature = crypto.sign('RSA-SHA256', payload, privateKey);
      assert(crypto.verify('RSA-SHA256', payload, keys[0].getPublicKey(), signature));
      process.stdout.write('Server SDK and RSA verification OK');
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Server SDK and RSA verification OK');
});
