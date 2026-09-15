import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EncryptedTokenStore } from '../server/token-store.js';

test('linked OAuth tokens are encrypted on disk and can be recovered server-side', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mogbuy-')); const file = join(directory, 'tokens.json');
  try { const store = new EncryptedTokenStore({ key: Buffer.alloc(32, 7).toString('base64'), path: file }); await store.save('user-1', { access_token: 'secret-token' }); assert.doesNotMatch(await readFile(file, 'utf8'), /secret-token/); assert.deepEqual(await store.get('user-1'), { access_token: 'secret-token' }); } finally { await rm(directory, { recursive: true, force: true }); }
});
