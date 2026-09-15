# MogBuy

MogBuy is a storefront and checkout layer for an **authorized CatBuy account integration**. A shopper links their own CatBuy account by redirecting to CatBuy's authorization page; the browser never receives CatBuy passwords, access tokens, or session cookies.

## Important integration and payments notes

CatBuy's public API documentation could not be verified while building this project. Therefore MogBuy does **not** guess CatBuy endpoints or automate the website. Configure only endpoint paths supplied by CatBuy or by an approved integration in `.env`; the server refuses to connect without them. Before accepting customer funds, obtain CatBuy's written authorization and obtain appropriate legal, payments, tax, and consumer-protection advice for your jurisdiction.

A service fee cannot remain in the merchant's CatBuy balance when the shopper's linked CatBuy account is topped up: it would remain with that shopper. A production marketplace should collect the MogBuy fee through its own authorized payment provider, top up only the verified CatBuy purchase amount, and provide refunds/receipts. This scaffold calculates and displays both amounts but deliberately does not process card data.

## Run locally

1. Register an OAuth authorization-code integration with CatBuy and obtain the documented endpoint paths.
2. Copy `.env.example` to `.env`, fill in the authorized values, and generate the encryption key as shown there. Do not commit `.env`.
3. Run `npm test && npm start`, then visit `http://localhost:3000`.

The development UI sets a demo application session only so the flow is navigable locally. Replace it with your authenticated session middleware before deployment. Replace `MemoryOrderRepository` with a transactional database that has a unique `(user_id, idempotency_key)` constraint.

## API

- `GET /api/catbuy/connect` and `GET /api/catbuy/callback`: server-side OAuth authorization-code + PKCE linking.
- `GET /api/products?q=` and `GET /api/products/:id`: authorized product lookups.
- `POST /api/quote`: server-calculated price breakdown.
- `POST /api/checkout`: idempotent top-up then purchase flow. Send `Idempotency-Key`.
- `GET /api/orders/:id`: returns only the authenticated user's record.
