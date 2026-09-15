import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { config } from './config.js';
import { CatBuyClient } from './catbuy.js';
import { MemoryOrderRepository } from './repository.js';
import { OrderService } from './orders.js';
import { quote } from './fees.js';
import { EncryptedTokenStore } from './token-store.js';

const unavailableTokenStore = { get: async () => { throw new Error('TOKEN_ENCRYPTION_KEY is required for CatBuy account linking'); }, save: async () => { throw new Error('TOKEN_ENCRYPTION_KEY is required for CatBuy account linking'); } };
const tokenStore = config.tokenEncryptionKey ? new EncryptedTokenStore({ key: config.tokenEncryptionKey }) : unavailableTokenStore;
const catbuy = new CatBuyClient(config.catbuy, tokenStore);
const orders = new OrderService({ repository: new MemoryOrderRepository(), catbuy, fees: config.fees });
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const user = (req) => /(?:^|;\s*)mogbuy_user=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
const body = async (req) => { let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; };
const requireUser = (req, res) => { if (!user(req)) { send(res, 401, { error: 'Authentication required' }); return false; } return true; };

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/catbuy/connect') { if (!requireUser(req, res)) return; res.writeHead(302, { location: catbuy.authorizationUrl(user(req)).toString() }); return res.end(); }
    if (req.method === 'GET' && url.pathname === '/api/catbuy/callback') { await catbuy.completeAuthorization({ state: url.searchParams.get('state'), code: url.searchParams.get('code') }); res.writeHead(302, { location: '/?linked=1' }); return res.end(); }
    if (url.pathname.startsWith('/api/')) {
      if (!requireUser(req, res)) return;
      if (req.method === 'GET' && url.pathname === '/api/products') return send(res, 200, await catbuy.search(user(req), url.searchParams.get('q') ?? ''));
      if (req.method === 'GET' && /^\/api\/products\/[^/]+$/.test(url.pathname)) return send(res, 200, await catbuy.product(user(req), url.pathname.split('/').pop()));
      if (req.method === 'POST' && url.pathname === '/api/quote') { const payload = await body(req); const product = await catbuy.product(user(req), payload.productId); return send(res, 200, quote(product.pricing, config.fees)); }
      if (req.method === 'POST' && url.pathname === '/api/checkout') { const payload = await body(req); return send(res, 200, await orders.checkout({ userId: user(req), productId: payload.productId, idempotencyKey: req.headers['idempotency-key'] })); }
      if (req.method === 'GET' && /^\/api\/orders\/[^/]+$/.test(url.pathname)) { const order = orders.getForUser(url.pathname.split('/').pop(), user(req)); return order ? send(res, 200, order) : send(res, 404, { error: 'Order not found' }); }
      return send(res, 404, { error: 'Not found' });
    }
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (file.includes('..')) return send(res, 400, { error: 'Invalid path' });
    const data = await readFile(join(process.cwd(), 'src', file)); const headers = { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream' }; if (file === 'index.html' && !user(req)) headers['set-cookie'] = 'mogbuy_user=demo-user; HttpOnly; SameSite=Lax; Path=/'; res.writeHead(200, headers); res.end(data);
  } catch (error) { send(res, error.message.includes('linked') ? 403 : 400, { error: error.message }); }
});
if (process.argv[1]?.endsWith('index.js')) server.listen(config.port, () => console.log(`MogBuy listening on :${config.port}`));
