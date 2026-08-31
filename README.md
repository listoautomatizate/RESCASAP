# RESCASAP — WebMCP Challenge

RESCASAP helps people in Uruguay rescue same-day surplus food from local businesses at a reduced price. Its WebMCP extension lets an AI agent search and compare live rescue packs, then prepare one for review while the person keeps control of the final reservation.

> **Submission status:** the [public source repository](https://github.com/listoautomatizate/RESCASAP) is ready. The WebMCP route at `https://rescasap.uy/demo` is implemented and locally validated; production deployment remains pending entrant approval.

## Why WebMCP belongs here

Food-rescue inventory is time-sensitive, inconsistent and full of tradeoffs: price, pickup time, neighborhood, estimated food weight and dietary intent. Conventional browsing makes a person repeatedly search, open cards and compare details. WebMCP gives the agent a small, typed interface to do that mechanical work while RESCASAP keeps the page visible and the consequential action human-controlled.

### Site tools

| Tool | What it does | Side effect |
| --- | --- | --- |
| `find_rescue_packs` | Filters and ranks up to five available packs by text, category, UYU price, estimated weight or urgency. It visibly shortlists the matches. | Read-only |
| `compare_rescue_packs` | Compares two or three current packs by price, savings, weight, pickup window and neighborhood. It opens a visible comparison sheet. | Read-only |
| `prepare_pack_reservation` | Opens one available pack in checkout with pay-at-pickup selected. | UI preparation only; no reservation or payment |

All three are registered through the imperative WebMCP API in [`app/webmcp.ts`](app/webmcp.ts). Inputs use bounded JSON schemas; outputs are concise; unavailable stock is rejected; merchant-authored text is marked as untrusted content; and an `AbortController` unregisters the tools with the React lifecycle.

## 90-second judge path

1. Open `https://rescasap.uy/demo` in ChatGPT's in-app browser or a WebMCP-enabled version of Chrome.
2. Ask: **“Find rescue packs under UYU 300 with at least 1 kg of food. Rank them by most food.”**
3. Ask: **“Compare the top two.”**
4. Ask: **“Prepare the fruit and vegetable pack for reservation.”**
5. Verify that checkout is open but nothing has been reserved or charged.
6. Click **Probar reserva** to complete the client-only demo and see its explicit no-payment/no-pickup receipt.

The `/demo` route needs no account, secrets, database or payment method. Its reservations stay in browser memory and disappear on refresh.

## Human–agent contract

```text
person states intent
        ↓
agent calls typed search and comparison tools
        ↓
RESCASAP updates the visible page with verifiable results
        ↓
agent may open checkout for review
        ↓
person alone confirms the demo or real reservation
```

The agent never clicks the final confirmation, reserves stock or starts Mercado Pago. The production API still validates authentication, availability and payment state on the server.

## What existed before the challenge

RESCASAP was a working pilot before the August 25, 2026 submission period. Commit `fbb97d9` (August 24, 2026) is the immutable baseline. It already included the responsive consumer and merchant product, D1 data model, magic-link authentication, pack inventory, reservations, pickup codes, legal gates, verified-merchant controls and Mercado Pago marketplace payments.

The challenge work began after that baseline and adds:

- the three imperative WebMCP tools and their lifecycle;
- agent-driven shortlist, comparison and checkout-preparation UI;
- an account-free, payment-free `/demo` evaluation path;
- explicit human-confirmation boundaries and demo receipts;
- unit tests, browser-level WebMCP verification and technical evaluator documentation.

See [`docs/HACKATHON_CHANGELOG.md`](docs/HACKATHON_CHANGELOG.md) for the dated evidence and exact file map.

## Architecture

- **Vinext, React 19 and TypeScript:** responsive UI and server routes on Cloudflare Workers.
- **WebMCP imperative API:** same-origin site tools registered from the active React document.
- **Cloudflare D1 / SQLite:** production profiles, businesses, packs, templates, reservations and payments.
- **Supabase Auth:** passwordless email authentication for the production product.
- **Mercado Pago:** merchant-owned OAuth connection and external checkout; RESCASAP never receives card details.
- **ChatGPT Sites:** current hosting for `rescasap.uy`.

The challenge demo uses the same product component and tool implementation, but injects a fixed in-memory dataset and never calls production write APIs. The full trust-boundary diagram is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Run locally

Requirements: Node.js 22.13+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000/demo`. No environment variables are required for the WebMCP demo.

To run the authenticated production flow locally, copy `.env.example` to `.env` and provide Supabase credentials. ChatGPT Sites provides the local D1 binding.

```bash
pnpm test:webmcp
pnpm lint
pnpm build
```

## Production configuration

The production product can use the following server-side values. Never commit real credentials.

```text
SUPABASE_URL
SUPABASE_ANON_KEY
PUBLIC_SITE_URL
MP_CLIENT_ID
MP_CLIENT_SECRET
MP_WEBHOOK_SECRET
MP_TOKEN_ENCRYPTION_KEY
MP_OAUTH_REDIRECT_URI
MP_MARKETPLACE_FEE_PERCENT
```

Payment tokens are encrypted before persistence, orders use idempotency keys, webhook signatures are validated and sessions use secure `HttpOnly` cookies in production. The demo route contains no real customer, merchant or payment data.

## Repository map

```text
app/
  demo/page.tsx          no-login challenge entry point
  demo-data.ts           isolated in-memory challenge dataset
  webmcp.ts              schemas, filtering logic and tool registration
  rescata-app.tsx        shared consumer/merchant UI and human review flow
  api/                   authenticated production routes
db/                      D1 schema and bootstrap data
tests/webmcp.test.ts      deterministic tool-domain tests
docs/                    architecture, evals and challenge evidence
```

## License

Copyright © 2026 Lia Hannay Dietrich. Released under the [MIT License](LICENSE).
