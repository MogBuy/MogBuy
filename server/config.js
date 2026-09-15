const integer = (value, fallback = 0) => { const parsed = Number.parseInt(value ?? '', 10); return Number.isSafeInteger(parsed) ? parsed : fallback; };
export const config = {
  port: integer(process.env.PORT, 3000),
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
  catbuy: { authorizeUrl: process.env.CATBUY_OAUTH_AUTHORIZE_URL, tokenUrl: process.env.CATBUY_OAUTH_TOKEN_URL, apiBaseUrl: process.env.CATBUY_API_BASE_URL, clientId: process.env.CATBUY_CLIENT_ID, clientSecret: process.env.CATBUY_CLIENT_SECRET, redirectUri: process.env.CATBUY_REDIRECT_URI, scopes: process.env.CATBUY_SCOPES, paths: { search: process.env.CATBUY_SEARCH_PATH, product: process.env.CATBUY_PRODUCT_PATH, topUp: process.env.CATBUY_TOP_UP_PATH, purchase: process.env.CATBUY_PURCHASE_PATH } },
  fees: { serviceFeeBps: integer(process.env.MOGBUY_SERVICE_FEE_BPS, 500), serviceFeeFlatCents: integer(process.env.MOGBUY_SERVICE_FEE_FLAT_CENTS, 0) }
};
