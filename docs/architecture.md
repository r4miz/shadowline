# Architecture

## Surfaces

| Surface | Who uses it | Auth |
|---|---|---|
| `/app/*` (the workshop) | The operator running audits | Auth.js session (password or magic link) |
| `/survey/[token]` | Employees of the client company | Signed `respondent` token, optional access code, no login |
| `/connect/[token]` | The client's Google or Microsoft admin | Signed `connect` token, then provider OAuth |
| `/sign/[token]` | Employees signing the policy | Signed `sign` token; personal links pin the signer's email |
| `/api/cron/monitor` | Scheduler (Vercel Cron or any cron) | `Authorization: Bearer $CRON_SECRET` |
| `/api/stripe/webhook` | Stripe | Signature verification |
| `landing/` | Public marketing site | None; contact form with honeypot and rate limit |

Clients and their staff never get accounts. Everything they touch is a signed, expiring link minted by the operator.

## Token lifetimes (`src/lib/tokens.ts`)

| Purpose | Lifetime | Single use |
|---|---|---|
| respondent (survey) | 14 days | no (one random respondent id per submission) |
| magic-link | 15 minutes | yes |
| connect | 7 days | no |
| oauth-state | 10 minutes | yes, and bound to a browser nonce cookie |
| sign | 30 days | no, but a signed record is never overwritten |

## Evidence pipeline

```
survey answers ─┐
workspace scan ─┼─> src/lib/inventory/sync.ts ─> AITool rows (source tracked)
expense CSV ────┘                                   │
                                                    v
                       src/lib/scoring.ts  (likelihood x impact, RAG bands)
                                                    │
                                                    v
                    RiskFinding rows (auto vs manual; manual survives re-scoring)
                                                    │
                                                    v
                         src/lib/documents/*  ->  Markdown -> escaped HTML
```

- **Survey** (`src/lib/employee-survey.ts`): 13 questions. A legacy 50-question IT deep-dive (`src/lib/question-bank.ts`) is optional and filled in by the operator.
- **Workspace scan** (`src/lib/connectors/`): `google.ts` reads users and OAuth token grants through the Admin SDK; `microsoft.ts` reads service principals and grants through Microsoft Graph with app-only permissions; `demo.ts` returns a fictional tenant. `classify.ts` plus `src/lib/ai-catalog.ts` decide which apps are AI tools and how risky their scopes are.
- **Expenses** (`src/lib/expenses/`): RFC 4180 CSV parser with hard limits, vendor matching, aggregates only.

## Scoring rules (`src/lib/scoring.ts`)

- Risk = likelihood (1 to 5) x impact (1 to 5). Green up to 6, amber 7 to 14, red 15 and up. Boundaries are unit tested.
- Survey answers: options are stored highest-risk first, so the answer's position maps to likelihood. For multi-select, the "none" option is a safe sentinel excluded from the fraction.
- Tools: impact from the data exposure level, likelihood raised for unsanctioned tools and for personal-account, browser-extension and MCP access. OWASP and NIST mappings are attached per tool.
- Findings are ranked by impact (descending), then effort (ascending). The RAG rating is always computed server-side; the client cannot set it.
- Regenerating findings replaces only `auto` findings. Editing one flips it to `manual` and its source question or tool is skipped on the next run, so there are no duplicates.

## Data model notes (`prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `Consultant` | The operator account (name kept from the first version of the app) |
| `OperatorSettings` | Per-operator pricing defaults, integer cents |
| `Organization` | A client company, owned by one `Consultant` |
| `CompanyProfile` | The owner questionnaire, 1:1 with `Organization` |
| `Engagement` | One audit, or a quarterly re-survey |
| `Question` / `Response` | Question bank and encrypted survey answers |
| `AITool` | Inventory row, unique per engagement and catalog key |
| `RiskFinding` | Scored finding, optional link to its source question or tool |
| `PolicyDocument` | Versioned generated document (Markdown) |
| `ScanConnection` | Encrypted Google refresh token or Microsoft tenant id |
| `Scan` / `DiscoveredApp` | Scan runs and the third-party apps found; user lists encrypted |
| `Alert` | Monitoring alerts (new AI app, new user, overdue sign-off) |
| `ExpenseMatch` | Aggregated AI vendor spend |
| `PolicyAcknowledgement` | Who signed which policy version, and when |
| `Quote` | Per-employee quote and payment state |
| `ConsumedToken` | `jti` of used single-use tokens, for replay protection |

All child rows cascade from `Organization` or `Engagement`, so deleting a client removes its data.

## Design decisions

- **Deterministic first.** Scoring, recommendation and documents are pure functions with unit tests. The optional AI drafting button only suggests recommendation wording, is labeled in the UI, and returns 404 before revealing whether it is configured.
- **One mode.** The first version supported multiple consultants with client logins. It was narrowed to a single operator with link-only access for clients, which removed a whole class of client-side auth.
- **Graceful degradation.** Every integration (email, Google, Microsoft, Stripe, cron, AI) is optional. The Settings page shows what is configured and the app works end to end without any of them.
