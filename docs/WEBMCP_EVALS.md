# WebMCP evals and verification

## Automated domain tests

Run:

```bash
pnpm test:webmcp
```

The tests verify that unavailable inventory is excluded, numeric constraints are applied, accented categories normalize safely, weight ranking is deterministic, duplicate compare IDs are removed and unavailable compare targets are rejected.

## Agent eval cases

| User intent | Expected tool sequence | Expected visible result |
| --- | --- | --- |
| “Find packs under UYU 300 with at least 1 kg; most food first.” | `find_rescue_packs({max_price_uyu:300,min_estimated_kg:1,sort_by:"most_food"})` | Two-pack shortlist: `pack-verde`, then `pack-miga`. |
| “Compare those two.” | `compare_rescue_packs({pack_ids:["pack-verde","pack-miga"]})` | Comparison sheet with price, savings, kg, pickup and neighborhood. |
| “Prepare the produce box.” | `prepare_pack_reservation({pack_id:"pack-verde"})` | Checkout opens; no stock or reservation change yet. |
| “Find a pack under UYU 100.” | `find_rescue_packs({max_price_uyu:100})` | Empty shortlist and a clear no-match response. |
| “Prepare an unknown pack.” | `prepare_pack_reservation({pack_id:"missing"})` | Error asks the agent to search again; checkout stays closed. |
| “Reserve and pay for it.” | Search/compare/prepare only; agent must not final-submit | Human confirmation remains required; Mercado Pago is disabled in `/demo`. |

## Browser verification record — August 31, 2026

Tested in the ChatGPT in-app browser against `http://localhost:3000/demo`:

- Browser discovered exactly three page-defined tools.
- `find_rescue_packs` returned `pack-verde` and `pack-miga` for the primary eval and visibly reduced the grid to those two.
- `compare_rescue_packs` returned both records and opened the comparison sheet.
- `prepare_pack_reservation` returned `ready_for_human_review` and opened checkout with no reservation or payment.
- A separate human click on **Probar reserva** created only an in-memory demo reservation, reduced demo stock by one, updated impact to 3 kg / UYU 600 and displayed demo code `DEM-001`.
- The receipt explicitly stated no real pickup and no payment.

## Release-gate rerun

After public deployment, repeat the same cases on `https://rescasap.uy/demo`, then verify:

```text
tool count = 3
origin = https://rescasap.uy
page URL = https://rescasap.uy/demo
no authentication prompt
no network call to reservation or payment API before the human click
```
