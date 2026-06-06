# Flovia Agent Offers

Middleware and an offer engine for x402-enabled API merchants.

Flovia turns every x402 payment-required response into a personalized checkout for AI agents.

## Structure

```
.
├── apps/
│   ├── api/            # Flovia Hono API
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

# Run the demo agent
bun run dev:agent -- --budget 0.25 --privy-authorized

# Build all workspaces
bun run build

# Type-check all workspaces
bun run typecheck
```

## Demo Flow

1. Agent calls `GET /api/premium-signal` on the merchant API.
2. Merchant SDK calls `POST /v1/offers/quote`.
3. Merchant returns HTTP 402 with x402-compatible `accepts[0]` and a `flovia` extension.
4. Demo agent chooses an offer within budget.
5. Demo agent retries with `X-PAYMENT` in explicit MVP simulation mode.
6. Merchant returns the paid API response.
7. Flovia dashboard API shows request, offer, conversion, revenue, and segment.

## Dashboard

```bash
open http://localhost:8787/v1/merchants/merch_demo/dashboard
```

## MVP Notes

This implementation intentionally uses in-memory storage and simulated payment headers. Real Privy login, embedded wallets, Drizzle/Postgres persistence, and x402 facilitator verification are later phases described in `docs/worklogs/001-xxx.md`.

## License

MIT
