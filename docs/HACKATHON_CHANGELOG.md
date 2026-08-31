# Hackathon extension record

This record separates the pre-existing RESCASAP pilot from work created for the WebMCP Challenge.

## Immutable baseline

The challenge submission period began on **August 25, 2026 at 11:00 AM Pacific Time**. The latest pre-existing commit is:

```text
fbb97d9  2026-08-24T18:48:09-03:00  Integrate Mercado Pago marketplace payments
```

Earlier baseline commits are:

```text
1fbba43  2026-08-24T17:40:03-03:00  Replace provider login with RESCASAP email auth
29d1202  2026-08-24T16:36:24-03:00  Add legal launch and merchant verification
3b65125  2026-08-24T15:32:13-03:00  Prepare RESCASAP public pilot
1fbb7ae  2026-08-22T23:55:12-03:00  Build RESCATA Uruguay MVP
```

These commits establish that the following features predated the challenge:

- responsive consumer and merchant interfaces;
- D1 schema and seeded demo inventory;
- Supabase passwordless authentication;
- search, category filters, map and geolocation;
- reservations, stock updates, pickup codes, cancellations, history and impact;
- merchant verification, publishing, templates and collection workflow;
- legal documents and acceptance gates;
- merchant-owned Mercado Pago OAuth, checkout and webhook reconciliation;
- the `rescasap.uy` deployment and visual identity.

## Work added for the WebMCP Challenge

Challenge work began on **August 31, 2026** on branch `webmcp-challenge`.

| Addition | Files | Why it is meaningful |
| --- | --- | --- |
| Three real imperative WebMCP tools | `app/webmcp.ts` | Agents gain typed access to live, time-sensitive inventory rather than scraping UI text. |
| Visible agent collaboration | `app/rescata-app.tsx`, `app/globals.css` | Search changes the grid, comparison opens a verifiable sheet and preparation opens human review. |
| Judge-ready no-login demo | `app/demo/page.tsx`, `app/demo-data.ts` | The full agent flow is testable without credentials, payment or a real pickup. |
| Human-control boundary | `app/webmcp.ts`, checkout UI | The agent cannot reserve or pay; it can only prepare a choice for confirmation. |
| Automated verification | `tests/webmcp.test.ts` | Availability, filtering, accent normalization, sorting and comparison are deterministic. |
| Open-source evaluator package | `LICENSE`, `README.md`, `docs/` | Meets repository, prior-work, architecture and testing requirements without publishing internal submission materials. |

## Reproduce the evidence

```bash
git log --date=iso-strict --format='%h %ad %s' --reverse
git diff fbb97d9..HEAD --stat
git diff fbb97d9..HEAD -- app/webmcp.ts app/demo app/rescata-app.tsx tests docs README.md LICENSE
```

The final challenge commit must retain an August 31–September 3 timestamp and must be pushed to the public repository before submission.
