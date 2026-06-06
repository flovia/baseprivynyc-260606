# Flovia Agent Offers

Middleware and an offer engine for x402-enabled API merchants.

Flovia turns every x402 payment-required response into a personalized checkout for AI agents.

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

`simulation` is the current local demo mode and labels `accepts[0].extra.simulation = true`. `x402` emits a facilitator-facing x402-shaped requirement without the simulation marker, but real facilitator verification is still a placeholder for a later phase.

## MVP Notes

This implementation intentionally uses in-memory storage and simulated payment headers. Real Privy login, embedded wallets, Drizzle/Postgres persistence, and x402 facilitator verification are later phases described in `docs/worklogs/001-xxx.md` and `docs/worklogs/002-xxx.md`.

## License

MIT
