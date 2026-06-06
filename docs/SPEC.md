# Flovia Agent Offers Spec

## Overview

Flovia Agent Offers is middleware and an offer engine for x402-enabled API merchants.

It lets merchants return personalized HTTP 402 responses for Privy-authorized agents instead of showing the same fixed price to every caller.

One-liner:

```txt
Flovia Agent Offers turns every x402 payment-required response into a personalized checkout for AI agents.
```

Core concept:

```txt
Flovia personalizes the HTTP 402 response for Privy-authorized agents.
```

## Product Scope

Flovia owns:

```txt
- Privy login UI
- Embedded wallet experience
- Agent authorization UI
- Agent budget / policy settings
- Offer API
- Offer engine
- Merchant dashboard
```

Merchants own:

```txt
- x402-gated API endpoints
- Merchant wallet address
- Flovia SDK / middleware integration
- Pricing policy config
```

Merchants do not own:

```txt
- Privy app secret
- Flovia user onboarding
- Privy agent authorization UI
- User PII
```

## Monorepo Decision

Use a Bun workspace monorepo.

Root package name:

```json
{
  "name": "flovia-baseprivynyc",
  "private": true
}
```

Workspace config:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

Why Bun workspace:

```txt
- Fast installs
- Simple TypeScript execution for Hono services and CLI agent
- Good fit for MVP backend services
- Less setup than pnpm + Turborepo
```

Important caveat:

```txt
Next.js can use Bun as package manager, but deployment should still assume the normal Node/Vercel runtime path unless proven otherwise.
```

## Repository Layout

```txt
flovia-baseprivynyc/
  apps/
    web/
    api/
    merchant-api/
    demo-agent/

  packages/
    shared/
    offer-engine/
    db/
    sdk/
    config/
    ui/

  docs/
    SPEC.md

  package.json
  bun.lock
  tsconfig.json
  README.md
  .env.example
```

## Package Names

Root package:

```txt
flovia-baseprivynyc
```

Workspace package names:

```txt
apps/web              web
apps/api              api
apps/merchant-api     merchant-api
apps/demo-agent       demo-agent

packages/shared       @flovia-baseprivynyc/shared
packages/offer-engine @flovia-baseprivynyc/offer-engine
packages/db           @flovia-baseprivynyc/db
packages/sdk          @flovia-baseprivynyc/sdk
packages/config       @flovia-baseprivynyc/config
packages/ui           @flovia-baseprivynyc/ui
```

SDK import during MVP:

```ts
import { floviaAdaptive402 } from "@flovia-baseprivynyc/sdk";
```

If a public production SDK is split out later, it can be renamed to:

```ts
import { floviaAdaptive402 } from "@flovia/sdk";
```

## Apps

### apps/web

Flovia frontend.

Responsibilities:

```txt
- Landing / demo entry
- Privy login
- Show embedded wallet address
- Agent authorization page
- Budget / policy setup
- Demo agent control panel
- Merchant dashboard
```

Routes:

```txt
/
/login
/agent
/authorize
/dashboard
/dashboard/requests
```

Recommended stack:

```txt
- Next.js App Router
- Privy React SDK
- Tailwind CSS
- Reusable UI from packages/ui when useful
```

### apps/api

Flovia backend API.

Responsibilities:

```txt
- Verify Flovia user session
- Store user / wallet / agent state
- Compute Offer Context
- Receive request and payment events
- Aggregate merchant dashboard metrics
- Optionally resolve wallets inside Flovia's own Privy app
```

Routes:

```txt
POST /v1/offers/quote
POST /v1/events/request
POST /v1/events/payment
GET  /v1/merchants/:merchantId/dashboard
```

Recommended stack:

```txt
- Hono
- Bun for local/dev runtime
- Zod schemas from packages/shared
- Drizzle repositories from packages/db
```

### apps/merchant-api

Demo merchant API.

Responsibilities:

```txt
- Expose demo x402-gated endpoints
- Use @flovia-baseprivynyc/sdk middleware
- Return personalized HTTP 402 responses
- Return paid API response after successful x402 payment or MVP simulation
```

Endpoints:

```txt
GET /api/premium-signal
GET /api/basic-signal
GET /api/premium-signal-plus
```

### apps/demo-agent

Simple demo agent runner.

Responsibilities:

```txt
- Call merchant API
- Receive HTTP 402
- Parse the flovia extension field
- Choose the best offer within budget
- Pay through x402 or simulate payment in MVP mode
- Retry request with X-PAYMENT
```

MVP should be a CLI first:

```bash
bun run --filter='demo-agent' dev --budget 0.25
```

## Packages

### packages/shared

Shared types and schemas.

Contents:

```txt
- OfferQuoteRequestSchema
- OfferQuoteResponseSchema
- RequestEventSchema
- PaymentEventSchema
- DashboardResponseSchema
- Network / Currency / Segment / Policy types
```

Use Zod as the source of truth for API request/response validation.

### packages/offer-engine

Rule-based pricing and segmentation logic.

Responsibilities:

```txt
- Compute agent score
- Segment buyer
- Apply pricing rules
- Generate reason codes
- Return Offer Context
```

Primary API:

```ts
computeOffer(input, signals)
```

### packages/db

Database schema and repositories.

Recommended stack:

```txt
- Drizzle
- Postgres
```

Why Drizzle over Prisma for this MVP:

```txt
- Lightweight
- TypeScript-native schema
- Good fit with Bun and Hono
- Easy deploy to Neon or Railway Postgres
```

Models:

```txt
- User
- AgentSession
- Merchant
- Endpoint
- OfferQuote
- RequestEvent
- PaymentEvent
```

### packages/sdk

Merchant-side SDK / middleware.

Responsibilities:

```txt
- Extract wallet / endpoint / metadata from incoming merchant request
- Call Flovia Offer API
- Construct personalized HTTP 402 response
- Verify successful x402 payment or delegate to x402 middleware/facilitator
- Emit events back to Flovia
```

MVP target framework:

```txt
- Hono first
- Express later only if needed
```

Example usage:

```ts
import { floviaAdaptive402 } from "@flovia-baseprivynyc/sdk";

app.get(
  "/api/premium-signal",
  floviaAdaptive402({
    merchantId: process.env.FLOVIA_MERCHANT_ID!,
    apiKey: process.env.FLOVIA_API_KEY!,
    payTo: process.env.MERCHANT_WALLET!,
    network: "base-sepolia",
    basePrice: "0.05",
    currency: "USDC",
    category: "market_signal",
    alternativeEndpoints: [
      {
        path: "/api/basic-signal",
        price: "0.01",
      },
    ],
    premiumUpsell: {
      path: "/api/premium-signal-plus",
      price: "0.08",
    },
  }),
  async (c) => {
    return c.json({
      signal: "Agentic payments are trending upward.",
      confidence: 0.87,
    });
  }
);
```

### packages/config

Shared configuration.

Contents:

```txt
- Supported networks
- Currency constants
- Flovia API URL
- Default demo merchant id
- Default endpoint prices
- Environment variable parsing
```

### packages/ui

Shared UI components for the web app.

Contents:

```txt
- Button
- Card
- Badge
- Table
- MetricCard
```

Keep this small. Do not over-abstract UI during MVP.

## Dependency Direction

Avoid circular dependencies.

```txt
apps/web
  -> packages/shared
  -> packages/config
  -> packages/ui

apps/api
  -> packages/shared
  -> packages/db
  -> packages/offer-engine
  -> packages/config

apps/merchant-api
  -> packages/sdk
  -> packages/shared
  -> packages/config

apps/demo-agent
  -> packages/shared
  -> packages/config

packages/sdk
  -> packages/shared
  -> packages/config

packages/offer-engine
  -> packages/shared

packages/db
  -> packages/shared

packages/ui
  -> packages/shared when needed only
```

## Offer Context

Offer Context is the pricing decision returned by Flovia to the merchant.

Example:

```json
{
  "buyer": {
    "wallet": "0xabc...",
    "source": "flovia_privy_authorized_agent",
    "segment": "new_authorized_agent",
    "agent_score": 72
  },
  "offer": {
    "base_price": "0.05",
    "final_price": "0.03",
    "currency": "USDC",
    "policy": "first_call_discount",
    "bundle": {
      "id": "signal_5_pack",
      "calls": 5,
      "price": "0.12"
    },
    "alternative_endpoint": {
      "path": "/api/basic-signal",
      "price": "0.01"
    },
    "premium_upsell": {
      "path": "/api/premium-signal-plus",
      "price": "0.08"
    }
  },
  "reason_codes": [
    "privy_agent_authorized",
    "new_user",
    "low_risk_wallet"
  ]
}
```

## Personalized HTTP 402 Response

Merchant returns a normal x402-compatible payment requirement plus a `flovia` extension field.

```json
{
  "error": "Payment Required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "asset": "USDC",
      "amount": "0.03",
      "payTo": "0xMerchantWallet"
    }
  ],
  "flovia": {
    "basePrice": "0.05",
    "finalPrice": "0.03",
    "policy": "first_call_discount",
    "reasonCodes": [
      "privy_agent_authorized",
      "new_user",
      "low_risk_wallet"
    ],
    "bundleOffers": [
      {
        "id": "signal_5_pack",
        "calls": 5,
        "price": "0.12"
      }
    ],
    "alternativeEndpoints": [
      {
        "path": "/api/basic-signal",
        "price": "0.01",
        "reason": "budget_friendly_option"
      }
    ],
    "premiumUpsell": {
      "path": "/api/premium-signal-plus",
      "price": "0.08",
      "reason": "high_intent_agent"
    }
  }
}
```

Rules:

```txt
- Standard x402 clients can ignore flovia and pay accepts[0].
- Flovia-aware agents should parse flovia and choose the best offer.
- Merchant must ensure the final payable amount matches the chosen offer.
```

## Flovia API

### POST /v1/offers/quote

Called by merchant SDK before returning HTTP 402.

Request:

```json
{
  "merchant_id": "merch_123",
  "endpoint": "/api/premium-signal",
  "method": "GET",
  "wallet": "0xabc...",
  "network": "base-sepolia",
  "base_price": "0.05",
  "currency": "USDC",
  "request_id": "req_123",
  "metadata": {
    "task_category": "market_signal",
    "agent_declared_budget": "0.25"
  }
}
```

Response:

```json
{
  "quote_id": "quote_123",
  "buyer": {
    "wallet": "0xabc...",
    "source": "flovia_privy_authorized_agent",
    "segment": "new_authorized_agent",
    "agent_score": 72
  },
  "offer": {
    "base_price": "0.05",
    "final_price": "0.03",
    "currency": "USDC",
    "policy": "first_call_discount",
    "bundle": {
      "id": "signal_5_pack",
      "calls": 5,
      "price": "0.12"
    },
    "alternative_endpoint": {
      "path": "/api/basic-signal",
      "price": "0.01"
    },
    "premium_upsell": {
      "path": "/api/premium-signal-plus",
      "price": "0.08"
    }
  },
  "reason_codes": [
    "privy_agent_authorized",
    "new_user",
    "low_risk_wallet"
  ]
}
```

### POST /v1/events/request

Called when merchant returns HTTP 402.

```json
{
  "request_id": "req_123",
  "quote_id": "quote_123",
  "merchant_id": "merch_123",
  "endpoint": "/api/premium-signal",
  "wallet": "0xabc...",
  "status": "offer_returned",
  "final_price": "0.03",
  "policy": "first_call_discount",
  "timestamp": "2026-06-06T12:00:00Z"
}
```

### POST /v1/events/payment

Called after successful x402 payment.

```json
{
  "request_id": "req_123",
  "quote_id": "quote_123",
  "merchant_id": "merch_123",
  "endpoint": "/api/premium-signal",
  "wallet": "0xabc...",
  "amount": "0.03",
  "currency": "USDC",
  "network": "base-sepolia",
  "tx_hash": "0x...",
  "offer_selected": "first_call_discount",
  "timestamp": "2026-06-06T12:00:15Z"
}
```

### GET /v1/merchants/:merchantId/dashboard

Returns merchant dashboard metrics.

```json
{
  "merchant_id": "merch_123",
  "summary": {
    "requests": 42,
    "offers_returned": 38,
    "paid_conversions": 21,
    "revenue_usdc": "0.84",
    "estimated_revenue_lift": "31%",
    "discount_conversions": 9,
    "bundle_conversions": 4,
    "premium_upsells": 2
  },
  "segments": [
    {
      "segment": "new_authorized_agent",
      "conversion_rate": 0.52,
      "arpu": "0.03",
      "best_offer": "first_call_discount"
    }
  ],
  "reason_codes": [
    {
      "code": "privy_agent_authorized",
      "count": 14
    }
  ]
}
```

## Offer Engine Rules

MVP is rule-based. No ML is needed.

Input:

```ts
type OfferInput = {
  merchantId: string;
  endpoint: string;
  wallet: string;
  basePrice: string;
  network: "base" | "base-sepolia";
  metadata?: {
    taskCategory?: string;
    declaredBudget?: string;
  };
};
```

Signals:

```ts
type BuyerSignals = {
  isFloviaPrivyUser: boolean;
  hasActiveAgentAuthorization: boolean;
  isNewUser: boolean;
  pastPaidCalls: number;
  merchantPaidCalls: number;
  paymentSuccessRate: number;
  budgetRemainingUsdc: string;
  onchainRiskScore: number;
};
```

Rules:

```txt
1. If no Flovia/Privy context:
   segment = anonymous_wallet
   final_price = base_price
   no bundle

2. If active Privy-authorized agent and first merchant call:
   segment = new_authorized_agent
   final_price = base_price * 0.6
   policy = first_call_discount

3. If repeat agent and payment_success_rate >= 0.9:
   segment = repeat_agent
   final_price = base_price * 0.8
   bundle = 5 calls for base_price * 2.4

4. If declared budget is low:
   offer alternative endpoint at lower price

5. If high score and task category is market_signal:
   offer premium upsell

6. If risk score is poor:
   no discount
   optionally higher price or prepay only
```

Scoring:

```ts
function computeAgentScore(signals: BuyerSignals): number {
  let score = 50;

  if (signals.isFloviaPrivyUser) score += 10;
  if (signals.hasActiveAgentAuthorization) score += 15;
  if (signals.paymentSuccessRate >= 0.9) score += 10;
  if (signals.pastPaidCalls >= 5) score += 10;
  if (signals.merchantPaidCalls >= 2) score += 5;
  if (signals.onchainRiskScore < 40) score -= 20;

  return Math.max(0, Math.min(100, score));
}
```

## Dashboard Requirements

Summary cards:

```txt
- Requests
- 402 offers returned
- Paid conversions
- Revenue USDC
- Revenue lift vs fixed price
- Discount conversions
- Bundle conversions
- Premium upsells
```

Recent requests table:

```txt
- Time
- Wallet
- Segment
- Endpoint
- Base price
- Final price
- Policy
- Status
- Tx hash
```

Segment performance table:

```txt
- Segment
- Requests
- Conversion rate
- Revenue
- ARPU
- Best offer
```

Offer performance table:

```txt
- Offer type
- Shown
- Selected
- Conversion rate
- Revenue
```

Seed fake demo data so the dashboard is useful before live payment.

Recommended seed:

```txt
- 42 requests
- 38 offers returned
- 21 paid conversions
- 0.84 USDC revenue
- +31% estimated revenue lift
- 9 discount conversions
- 4 bundle conversions
- 2 premium upsells
```

## Security And Privacy Rules

```txt
- Do not send Privy access token to merchant.
- Do not send Privy refresh token to merchant.
- Do not expose email, Farcaster username, OAuth profile, or passkey details to merchant.
- Merchant sees only normalized signals: segment, score, reason codes, offer decision.
- Merchant SDK authenticates to Flovia with API key.
- Flovia should verify that paid wallet matches quoted wallet when possible.
- If wallet mismatch occurs, record a risk event and reject or fall back to base price.
```

Privy wallet lookup rule:

```txt
If wallet exists in Flovia DB:
  use local buyer context

Else if fallback enabled:
  call Privy wallet lookup using Flovia Privy app credentials

Else:
  treat as anonymous wallet
```

Do not claim:

```txt
Flovia detects any Privy wallet from wallet address.
```

Correct phrasing:

```txt
Flovia recognizes Flovia-authorized Privy agents and can optionally resolve wallets within Flovia's own Privy app.
```

## Development Scripts

Root scripts:

```json
{
  "scripts": {
    "dev": "bun run --filter='*' dev",
    "dev:web": "bun run --filter='web' dev",
    "dev:api": "bun run --filter='api' dev",
    "dev:merchant": "bun run --filter='merchant-api' dev",
    "dev:agent": "bun run --filter='demo-agent' dev",
    "build": "bun run --filter='*' build",
    "typecheck": "bun run --filter='*' typecheck",
    "test": "bun run --filter='*' test",
    "db:migrate": "bun run --filter='@flovia-baseprivynyc/db' db:migrate",
    "db:seed": "bun run --filter='@flovia-baseprivynyc/db' db:seed"
  }
}
```

## Deploy Recommendation

MVP deploy:

```txt
Frontend: Vercel
Flovia API: Railway
Demo merchant API: Railway
DB: Neon Postgres or Railway Postgres
Demo agent: Local Bun CLI
```

Why:

```txt
- Vercel is the easiest path for Next.js.
- Railway is simple for Hono/Bun backend services.
- Neon or Railway Postgres avoids SQLite deploy friction.
- Demo agent is easiest to control locally during presentation.
```

Production-leaning deploy:

```txt
Frontend: Vercel
APIs: Fly.io or Railway
DB: Neon Postgres
Queue/Event layer: Upstash Redis if needed
Analytics: PostHog if needed
```

## MVP Build Order

Build in this order:

```txt
1. packages/shared
2. packages/offer-engine
3. packages/db
4. apps/api
5. packages/sdk
6. apps/merchant-api
7. apps/demo-agent
8. apps/web
```

Reason:

```txt
The quote API and SDK contract should be stable before investing in dashboard UI and demo polish.
```

## MVP Phases

### Phase 1: Skeleton

```txt
- Bun workspace with apps/* and packages/*
- Next.js app for Flovia UI
- Hono API for Flovia backend
- Hono merchant API
- Drizzle + Postgres package
- @flovia-baseprivynyc/sdk local package
```

### Phase 2: Privy

```txt
- Add Privy login to Flovia UI
- Show wallet address
- Add agent authorization page
- Store user and wallet in DB
- Add default budget field: 0.25 USDC
```

### Phase 3: Offer Engine

```txt
- Implement /v1/offers/quote
- Implement rule-based pricing
- Implement anonymous vs authorized vs repeat segments
- Return Offer Context
```

### Phase 4: Merchant SDK

```txt
- Add Hono SDK middleware
- Merchant API calls Flovia quote API
- Merchant returns personalized HTTP 402
- Add fake paid response after successful x402 payment or simulation
```

### Phase 5: Agent

```txt
- CLI agent calls merchant API
- Receives HTTP 402
- Parses flovia offers
- Chooses cheapest acceptable offer or bundle
- Pays via x402 or uses simulation mode
- Retries request
```

### Phase 6: Dashboard

```txt
- Show summary cards
- Show recent requests
- Show segment performance
- Show revenue lift
```

## Demo Script

1. User opens Flovia.
2. User logs in with Privy.
3. Wallet appears and budget is set to `0.25 USDC`.
4. User authorizes agent for `market_signal` category.
5. Agent runs task: `Find the strongest signal around agentic payments today.`
6. Agent calls `GET /api/premium-signal` on merchant API.
7. Merchant receives personalized HTTP 402 from Flovia SDK.
8. Agent chooses offer and pays or simulates payment.
9. Merchant returns paid API response.
10. Dashboard updates with conversion, revenue, discount, and segment.

## Acceptance Criteria

The demo is complete if:

```txt
- User can login with Privy from Flovia UI.
- User can authorize or simulate authorizing an agent.
- Agent can call merchant API.
- Merchant returns HTTP 402 with personalized Flovia offer.
- Offer differs between anonymous wallet and Privy-authorized wallet.
- Agent can pay USDC on Base/Base Sepolia via x402 or use explicit MVP simulation mode.
- Merchant returns paid API response after payment.
- Dashboard shows request, offer, conversion, revenue, and segment.
```

## Out Of Scope For Hackathon

```txt
- Production-grade agent reputation network
- Real ML pricing model
- Real fraud detection
- Multi-merchant settlement accounting
- PII sharing with merchants
- Ads / sponsored endpoint recommendation
- Full marketplace
- Cross-app Privy identity beyond Flovia's own Privy app
```
