import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Encrypted server-side storage for OAuth tokens. Never serialize tokens into API responses. */
export class EncryptedTokenStore {
  constructor({ key, path = 'data/catbuy-tokens.json' }) {
    if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is required for CatBuy account linking');
    this.key = Buffer.from(key, 'base64');
    if (this.key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte base64 key');
    this.path = path;
  }
  encrypt(value) { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv); const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]); return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }; }
  decrypt(value) { const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(value.iv, 'base64')); decipher.setAuthTag(Buffer.from(value.tag, 'base64')); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8')); }
  async all() { try { return JSON.parse(await readFile(this.path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return {}; throw error; } }
  async save(userId, token) { const values = await this.all(); values[userId] = this.encrypt(token); await mkdir(dirname(this.path), { recursive: true }); const temp = `${this.path}.tmp`; await writeFile(temp, JSON.stringify(values), { mode: 0o600 }); await rename(temp, this.path); }
  async get(userId) { const encrypted = (await this.all())[userId]; return encrypted ? this.decrypt(encrypted) : null; }
}
