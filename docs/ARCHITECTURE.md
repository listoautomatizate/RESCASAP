# Architecture and trust boundaries

## System view

```mermaid
flowchart LR
  P[Person] -->|natural-language intent| A[ChatGPT in-app browser agent]
  A -->|typed WebMCP call| W[RESCASAP site tools]
  W -->|validate and query current UI data| R[React product state]
  R -->|shortlist / comparison / checkout| V[Visible RESCASAP interface]
  V -->|review and final click| P
  P -->|authenticated production confirmation| API[Server API]
  API --> D1[(Cloudflare D1)]
  API --> MP[Mercado Pago checkout]

  DEMO[/demo in-memory data] --> R
  DEMO -. never calls .-> API
```

## WebMCP layer

`app/webmcp.ts` is intentionally framework-light. It contains deterministic filter and comparison functions plus one registration function that receives the current pack inventory and three UI callbacks.

The React component registers the tools only after consumer pack data exists. Registration uses `document.modelContext.registerTool()` and a shared `AbortController`; the controller aborts when the component or inventory lifecycle changes, preventing stale tools.

### Tool boundaries

1. `find_rescue_packs`
   - accepts bounded optional filters;
   - reads only currently published packs with positive stock;
   - returns at most five compact records;
   - applies the same selection visibly to the product grid.
2. `compare_rescue_packs`
   - accepts two or three unique IDs from search results;
   - re-checks current availability;
   - returns and displays price, savings, weight, pickup time and neighborhood.
3. `prepare_pack_reservation`
   - accepts one currently available pack ID;
   - opens checkout with pay-at-pickup selected;
   - returns `requires_human_confirmation: true`;
   - never calls a reservation or payment API.

Descriptions and parameter schemas are narrow, output is concise, read-only annotations match behavior and merchant-authored content is marked with `untrustedContentHint`.

## Production and demo separation

| Concern | Production `/` | Challenge `/demo` |
| --- | --- | --- |
| Identity | Supabase email magic link | Fixed non-personal demo identity |
| Inventory | D1 through authenticated bootstrap API | Four in-memory example packs |
| Reservation | Server validation and stock transaction | Browser-memory simulation |
| Payment | Pay at pickup or merchant Mercado Pago | Disabled |
| Persistence | D1 | None; refresh resets state |
| WebMCP tools | Same implementation after login | Same implementation immediately |

The demo exists to remove judging friction, not to bypass production authorization. No production endpoint trusts demo state, and the challenge route contains no real customer or merchant information.

## Production safety controls

- APIs validate the authenticated user server-side.
- Pack reservation re-checks published status and stock in the database.
- Payment orders use idempotency and are reconciled server-side.
- Mercado Pago tokens are encrypted before storage.
- Webhook signatures are checked before order reconciliation.
- The final reservation action remains a visible human click even when an agent prepared checkout.

## Main source map

| File | Responsibility |
| --- | --- |
| `app/webmcp.ts` | Tool schemas, pure domain functions and imperative registration |
| `app/rescata-app.tsx` | Shared UI, registration lifecycle and visible agent effects |
| `app/demo/page.tsx` | Public evaluator entry point |
| `app/demo-data.ts` | Isolated in-memory packs and profile |
| `app/api/reservations/route.ts` | Authenticated production reservation boundary |
| `tests/webmcp.test.ts` | Deterministic search/comparison tests |
