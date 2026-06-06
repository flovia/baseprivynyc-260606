# Flovia

Commercial Analytics + Adaptive monetization tool for API merchants on x402/MPP

merchant's dashboard: https://demo.flovia402.com/

user side (privy):  https://baseprivynyc-260606-web.vercel.app/

pitch: https://canva.link/9xhz3z5z4hnhpo5

**API analytics turned into adaptive x402 monetization.**

Flovia helps API merchants understand and monetize agent-driven API traffic.

Originally, Flovia was built as commercial analytics for API merchants on machine payments: understanding which agent channels drive paid usage, which APIs are used together, and which buyer segments retain.

For the Base × Privy hackathon, we extended Flovia into an adaptive x402 offer engine.

Instead of returning the same `HTTP 402 Payment Required` response to every wallet, merchants can now return personalized prices, discounts, bundles, and next-offer recommendations based on:

- Privy wallet / identity context
- Agent authorization and budget
- Source channel attribution
- Cross-API usage patterns
- Prior payment behavior

> Same API. Smarter 402. Better conversion.

---

## What Flovia Does

Flovia gives x402 API merchants two layers:

### 1. Commercial Analytics for Machine-Paid APIs

API merchants can understand:

- Which agent channels drive paid usage
- Which source channels convert best
- Which APIs are used together
- Which buyer segments have higher ARPU
- Which offers, discounts, or bundles perform best
- Which agent-facing descriptions drive higher-retention usage

Example channels:

- `agentic.market`
- `Hermes`
- `Privy Wallet Apps`
- `pay.sh`
- `Direct Docs`

### 2. Adaptive x402 Offers

Flovia turns analytics into real-time offer decisions.

When an agent calls an x402-gated merchant API, the merchant SDK asks Flovia:

> “What offer should I return for this buyer?”

Flovia returns an offer context, and the merchant returns a personalized x402-compatible `402 Payment Required` response.

Examples:

- Wallet-only Privy user → full price + account-linking discount condition
- Verified Privy user → discounted price
- Buyer from high-performing source channel → bundle recommendation
- Repeat buyer → loyalty offer or premium upsell

---

## Demo Flow

The demo shows one merchant API returning different x402 responses based on buyer context.

### 1. Merchant integrates Flovia SDK

The merchant keeps their existing API and x402 flow.

```ts
app.get(
  "/api/premium-signal",
  floviaAdaptive402({
    merchantId: "merch_123",
    network: "base-sepolia",
    basePrice: "0.05",
    currency: "USDC",
    category: "market_signal",
  }),
  handler
);

## Structure

```
.
├── apps/
│   ├── api/            # Flovia Hono API
│   ├── web/            # Flovia frontend
│   ├── merchant-api/   # Demo merchant API
│   └── demo-agent/     # Demo CLI agent
├── packages/
│   ├── shared/         # Zod schemas and shared types
│   ├── offer-engine/   # Rule-based pricing logic
│   ├── db/             # MVP in-memory repositories
│   ├── sdk/            # Merchant Hono middleware
│   ├── config/         # Shared constants/env config
│   └── ui/             # Small shared UI helpers
├── docs/SPEC.md
├── package.json
└── tsconfig.json
```

## Requirements

- [Bun](https://bun.sh) v1.0+

## Getting Started

```bash
# Install dependencies
bun install

# Start Flovia API
bun run dev:api

# Start demo merchant API in another terminal
bun run dev:merchant

# Start the frontend on 0.0.0.0:3000
bun run dev:web

# Run the demo agent
bun run dev:agent -- --budget 0.25 --privy-authorized

# Or run the local payment simulation end-to-end
bun run e2e

# Build all workspaces
bun run build

# Type-check all workspaces
bun run typecheck

# Run regression tests
bun run test
```

## Frontend Check

`bun run dev:web` starts the Next.js app on `0.0.0.0:3000` so it is reachable from localhost and from other hosts that can access this machine.

Use these URLs:

- Local browser: `http://localhost:3000`
- Explicit loopback: `http://127.0.0.1:3000`
- LAN / container / forwarded environment: `http://<machine-ip>:3000`

If you need loopback-only serving, run:

```bash
bun run --filter='web' dev:local
```

Do not pass `--host` to `bun run dev:web`; the script already binds to `0.0.0.0`.

If Next.js warns about an extra `apps/web/pnpm-lock.yaml`, remove it and keep only the root `bun.lock`:

```bash
rm apps/web/pnpm-lock.yaml
bun install
```

## Full Demo Check

Run all long-lived dev services in one terminal:

```bash
bun run dev
```

Or verify the agent payment simulation end-to-end with readiness checks:

```bash
bun run e2e
```

Expected result:

- The frontend loads at `http://localhost:3000`.
- The authorized agent receives a personalized HTTP 402 offer.
- `accepts[0].maxAmountRequired` matches atomic `flovia.final_price`.
- The agent retries with MVP simulation payment and receives the paid merchant response.
- The paid response may include `flovia_next_offer` without changing the settled amount.
- Dashboard JSON shows request, payment, revenue, and segment data.

## Demo Flow

1. Agent calls `GET /api/premium-signal` on the merchant API.
2. Merchant SDK calls `POST /v1/offers/quote`.
3. Merchant returns HTTP 402 with x402-compatible `accepts[0]` and a `flovia` extension.
4. Wallet-only users receive `flovia.type = "unlockable_discount"` at the base price.
5. After simulated email/Farcaster linking, verified users receive `flovia.final_price = "0.025"` for the default `"0.05"` endpoint.
6. Demo agent retries with `X-PAYMENT` in explicit MVP simulation mode.
7. Merchant returns the paid API response, optionally including `flovia_next_offer`.
8. Flovia dashboard API shows request, offer, conversion, revenue, and segment.

The merchant-visible `flovia` extension is flat snake_case:

```json
{
  "flovia": {
    "type": "verified_user_discount",
    "base_price": "0.05",
    "final_price": "0.025",
    "currency": "USDC",
    "policy": "verified_user_discount",
    "reason_codes": ["privy_agent_authorized", "verified_privy_user"]
  }
}
```

`quote_id` and `request_id` are carried in `accepts[0].extra`; buyer identity is not embedded in `flovia`.

## Dashboard

```bash
open http://localhost:8791/v1/merchants/merch_demo/dashboard
```

The frontend dashboard routes fetch this API directly:

- `http://localhost:3000/dashboard`
- `http://localhost:3000/dashboard/requests`

## Simulation Endpoints

`/v1/dev/*` endpoints are local simulation-only stand-ins for Privy login, account linking, and agent authorization. They must be gated or removed before production deployment.

Useful calls:

```bash
curl -X POST http://localhost:8791/v1/dev/users \
  -H 'content-type: application/json' \
  -d '{"wallet":"0xAgentWallet","identity_confidence":"wallet_only","authorized":true}'

curl -X POST http://localhost:8791/v1/dev/users/0xAgentWallet/link \
  -H 'content-type: application/json' \
  -d '{"type":"email"}'
```

## Payment Modes

The SDK now accepts `paymentMode: "simulation" | "x402"`.

`simulation` is the current local demo mode and labels `accepts[0].extra.simulation = true`. `x402` emits a facilitator-facing x402-shaped requirement without the simulation marker, rejects simulation payments, and verifies/settles `X-PAYMENT` through `X402_FACILITATOR_URL` before serving the protected handler. Flovia-aware clients should pass `accepts[0].extra.quote_id` back as `quote_id` in JSON `X-PAYMENT` or as `X-Flovia-Quote-Id` so the SDK can enforce quote TTL and exact amount matching.

## MVP Notes

This implementation intentionally uses in-memory storage. Real Privy login is partially integrated, x402 facilitator verification is available in SDK `paymentMode: "x402"`, and Drizzle/Postgres persistence remains a later phase described in `docs/worklogs/003-real-integration.md`.

## License

MIT
