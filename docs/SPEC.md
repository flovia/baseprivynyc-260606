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

Optional stretch endpoints:
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
- UserIdentitySignal
- AgentSession
- Merchant
- Endpoint
- OfferQuote
- RequestEvent
- PaymentEvent
```

Identity/history requirements:

```txt
- User stores privyDid, walletAddress, and createdAt.
- UserIdentitySignal stores normalized identity confidence and linked account type flags.
- PaymentEvent is linked to privyDid internally when Flovia can resolve the wallet/session to a Flovia user.
- Do not store raw linked account profile data unless it is needed for the demo and explicitly excluded from merchant responses.
- Do not require merchants to send privyDid. Merchant-visible flows should use wallet, request_id, quote_id, or an opaque Flovia-scoped buyer reference when needed.
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

## MVP Offer Patterns

MVP offer logic is intentionally narrow. Build these patterns in priority order:

```txt
1. Verified Privy User Discount / Trial Unlock
3. Returning Privy Buyer Upsell / Loyalty Price
2. Persona-based API Bundle, only if time allows
```

Pattern 1 is the primary demo path. Pattern 3 is the stretch demo path. Pattern 2 should be treated as a contextual variant of the offer engine, not the core product.

## JSON Naming Convention

Use `snake_case` for Flovia API payloads and Flovia extension fields in this MVP.

```txt
- Use reason_codes for arrays.
- Use base_price and final_price for the current payable offer.
- Use currency for the display/config currency.
- Use unlock.target_final_price for unlockable discounts.
- Do not use current_price, unlocked_price, original_price, or price in MVP current-request flovia schemas.
```

Canonical current-offer shape:

```json
{
  "type": "verified_user_discount",
  "base_price": "0.05",
  "final_price": "0.025",
  "currency": "USDC",
  "policy": "verified_user_discount",
  "reason_codes": ["verified_privy_user"]
}
```

Unlockable discounts use the same current-offer fields and add `unlock`:

```json
{
  "type": "unlockable_discount",
  "base_price": "0.05",
  "final_price": "0.05",
  "currency": "USDC",
  "policy": "base_price_until_verified",
  "reason_codes": ["low_identity_confidence"],
  "unlock": {
    "type": "link_account",
    "condition": "link_email_or_farcaster",
    "target_final_price": "0.025"
  }
}
```

## Authorization Model

Privy identity context and Flovia agent authorization are separate.

```txt
Privy:
  - Authenticates the user.
  - Provides wallet and linked-account signals inside Flovia's own Privy app.

Flovia:
  - Stores agent authorization.
  - Enforces budget, category, merchant, and expiration policy.
  - Computes the offer returned to the merchant.
```

For MVP discount eligibility, require both Flovia-recognized Privy identity context and active Flovia agent authorization.

## Money Handling

Use different money representations for app-level prices and x402 wire payloads.

```txt
- Flovia API, config, dashboard, and flovia extension prices use decimal USDC strings, such as "0.025".
- Real x402 payment requirements use the atomic-unit amount and asset identifier required by the x402 protocol.
- Do not use JavaScript number arithmetic for money. Use integer atomic units or a decimal library.
```

### Pattern 1: Verified Privy User Discount / Trial Unlock

Flovia changes the current request's price based on normalized Privy identity confidence.

```txt
wallet-only Privy user
  -> full price
  -> unlockable discount prompt

email / Farcaster linked Privy user
  -> verified user discount
  -> lower x402 payable amount

passkey / MFA user
  -> strong auth signal
  -> eligible for verified user pricing or future trial rules
```

Demo path:

```txt
Before:
wallet-only user -> $0.05

After:
same user links email or Farcaster with Privy -> $0.025
```

Account linking re-quote flow:

```txt
1. User links email or Farcaster in the Flovia Privy UI.
2. Flovia backend refreshes normalized linked-account state for the logged-in Privy user.
3. Flovia stores the updated UserIdentitySignal.
4. Agent retries the merchant request.
5. Merchant SDK requests a fresh quote from Flovia.
6. Offer engine returns verified_user_discount with final_price = "0.025".
```

For demos, seed or create the Flovia user record before the merchant quote flow so the wallet can be resolved to local Flovia identity context without relying on fallback Privy wallet lookup.

Merchant-facing rule:

```txt
Do not expose raw email, Farcaster username, GitHub username, OAuth profile, passkey details, or MFA details to merchants.

Expose only normalized fields such as:
- segment
- policy
- reason code
- offer type
```

### Pattern 3: Returning Privy Buyer Upsell / Loyalty Price

Flovia uses Privy DID as the stable user identifier inside Flovia's own app and combines it with Flovia-observed request/payment events.

This pattern is used after a successful paid response. It should not change the current request's settled payment amount.

```txt
first successful payment
  -> starter upsell

2+ successful payments
  -> loyalty bundle

previous premium endpoint usage
  -> premium continuation offer
```

MVP should not implement complex churn-risk or high-intent scoring unless the simple repeat-buyer path is already complete.

### Pattern 2: Persona-based API Bundle

Persona bundles are optional for MVP.

If implemented, use linked account type only as a normalized context signal:

```txt
GitHub linked user
  -> developer research bundle

Farcaster linked user
  -> social wallet intelligence bundle
```

Merchant response should not expose raw linked account identifiers.

## Offer Field Semantics

Use separate fields for current-request pricing and post-payment next-best offers.

```txt
flovia
  Current request offer. Usually appears inside HTTP 402.
  It can change the current payable amount or describe an unlock condition.

flovia_next_offer
  Post-payment next offer. Usually appears inside HTTP 200.
  It does not change the current paid response or settled payment amount.
```

Rules:

```txt
- Use flovia for personalized x402 payment requirements.
- Use flovia_next_offer for retention, loyalty bundles, starter upsells, and premium continuation offers.
- Standard x402 clients may ignore both fields and pay accepts[0] when present.
- Flovia-aware agents should parse these fields and decide whether to link accounts, pay, or select a future offer.
```

Example:

```json
{
  "buyer": {
    "wallet": "0xabc...",
    "source": "flovia_privy_authorized_agent",
    "segment": "verified_privy_user"
  },
  "offer": {
    "base_price": "0.05",
    "final_price": "0.025",
    "currency": "USDC",
    "type": "verified_user_discount",
    "policy": "verified_user_discount"
  },
  "reason_codes": [
    "privy_agent_authorized",
    "verified_privy_user"
  ]
}
```

## Personalized HTTP 402 Response

Merchant returns a normal x402-compatible payment requirement plus a `flovia` extension field.

## MVP Payment Mode

MVP supports two payment modes:

```txt
simulation mode:
  - May use simplified accepts[] examples for local demos.
  - Must be clearly labeled as simulation-only.

real x402 mode:
  - accepts[] must use the exact x402 payment requirement schema.
  - Amounts must be atomic units, for example 0.05 USDC -> "50000" for a 6-decimal USDC asset.
  - asset must be the x402-required asset identifier, such as the USDC contract address for the selected network, not the display symbol "USDC".
```

`flovia` display prices may remain decimal USDC strings in both modes. `accepts[]` must be protocol-valid in real x402 mode.

Real x402-shaped example fields:

```json
{
  "scheme": "exact",
  "network": "base-sepolia",
  "maxAmountRequired": "25000",
  "asset": "0xUSDCAssetAddressOnBaseSepolia",
  "payTo": "0xMerchantWallet"
}
```

### Wallet-only Privy user

Wallet-only users receive the current full price plus an unlockable discount condition.

This example uses real x402-shaped payment fields with placeholder asset addresses.

```json
{
  "error": "Payment Required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "50000",
      "asset": "0xUSDCAssetAddressOnBaseSepolia",
      "payTo": "0xMerchantWallet"
    }
  ],
  "flovia": {
    "type": "unlockable_discount",
    "base_price": "0.05",
    "final_price": "0.05",
    "currency": "USDC",
    "policy": "base_price_until_verified",
    "reason_codes": ["low_identity_confidence"],
    "unlock": {
      "type": "link_account",
      "condition": "link_email_or_farcaster",
      "target_final_price": "0.025"
    }
  }
}
```

### Verified Privy user

Email-linked or Farcaster-linked users receive the discounted payable amount directly in `accepts[0]`.

This example uses real x402-shaped payment fields with placeholder asset addresses.

```json
{
  "error": "Payment Required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "25000",
      "asset": "0xUSDCAssetAddressOnBaseSepolia",
      "payTo": "0xMerchantWallet"
    }
  ],
  "flovia": {
    "type": "verified_user_discount",
    "base_price": "0.05",
    "final_price": "0.025",
    "currency": "USDC",
    "policy": "verified_user_discount",
    "reason_codes": ["verified_privy_user"]
  }
}
```

### Optional extended offer response

Bundles, alternative endpoints, and premium upsells are optional/stretch fields. Do not implement them before the verified-user discount path is working.

```json
{
  "error": "Payment Required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "25000",
      "asset": "0xUSDCAssetAddressOnBaseSepolia",
      "payTo": "0xMerchantWallet"
    }
  ],
  "flovia": {
    "base_price": "0.05",
    "final_price": "0.025",
    "type": "verified_user_discount",
    "policy": "verified_user_discount",
    "reason_codes": [
      "privy_agent_authorized",
      "verified_privy_user"
    ],
    "bundle_offers": [
      {
        "id": "signal_5_pack",
        "calls": 5,
        "price": "0.12"
      }
    ],
    "alternative_endpoints": [
      {
        "path": "/api/basic-signal",
        "price": "0.01",
        "reason": "budget_friendly_option"
      }
    ],
    "premium_upsell": {
      "path": "/api/premium-signal-plus",
      "price": "0.08",
      "reason": "repeat_privy_buyer"
    }
  }
}
```

Rules:

```txt
- Standard x402 clients can ignore flovia and pay accepts[0].
- Flovia-aware agents should parse flovia and choose the best offer.
- Merchant must ensure the final payable amount matches the chosen offer.
- In real x402 mode, accepts[0] must match the chosen offer's final_price converted to atomic units.
```

## Successful Paid Response With Next Offer

After successful payment, merchant may include `flovia_next_offer` in the normal API response.

Example for first successful payment:

```json
{
  "data": {
    "result": "Agentic payments are trending upward across Base ecosystem builders."
  },
  "flovia_next_offer": {
    "type": "starter_upsell",
    "endpoint": "/api/premium-signal-plus",
    "price": "0.03",
    "reason_codes": ["first_successful_payment"]
  }
}
```

Example for repeat buyer:

```json
{
  "data": {
    "result": "Agentic payments are trending upward across Base ecosystem builders."
  },
  "flovia_next_offer": {
    "type": "loyalty_bundle",
    "bundle_id": "pro_usage_pack",
    "price": "0.15",
    "included_calls": 10,
    "savings_bps": 2000,
    "reason_codes": ["repeat_privy_buyer"]
  }
}
```

## Flovia API

### POST /v1/offers/quote

Called by merchant SDK before returning HTTP 402.

Lifecycle rules:

```txt
- Merchant SDK generates request_id once per protected request.
- Flovia generates quote_id for each quote response.
- quote_id expires after 5 minutes in MVP.
- Merchant must not accept payment for an expired quote unless it requests a fresh quote.
```

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
    "segment": "verified_privy_user"
  },
  "offer": {
    "base_price": "0.05",
    "final_price": "0.025",
    "currency": "USDC",
    "type": "verified_user_discount",
    "policy": "verified_user_discount"
  },
  "reason_codes": [
    "privy_agent_authorized",
    "verified_privy_user"
  ]
}
```

### POST /v1/events/request

Called when merchant returns HTTP 402.

Idempotency:

```txt
- Treat repeated request events with the same request_id and status as duplicates.
- Store the first event and ignore later duplicates unless the status changes.
```

```json
{
  "request_id": "req_123",
  "quote_id": "quote_123",
  "merchant_id": "merch_123",
  "endpoint": "/api/premium-signal",
  "wallet": "0xabc...",
  "status": "offer_returned",
  "final_price": "0.025",
  "policy": "verified_user_discount",
  "offer_type": "verified_user_discount",
  "timestamp": "2026-06-06T12:00:00Z"
}
```

### POST /v1/events/payment

Called after successful x402 payment.

Idempotency:

```txt
- Treat repeated payment events with the same quote_id and tx_hash as duplicates.
- If tx_hash is unavailable in simulation mode, use quote_id + offer_selected as the idempotency key.
```

```json
{
  "request_id": "req_123",
  "quote_id": "quote_123",
  "merchant_id": "merch_123",
  "endpoint": "/api/premium-signal",
  "wallet": "0xabc...",
  "amount": "0.025",
  "currency": "USDC",
  "network": "base-sepolia",
  "tx_hash": "0x...",
  "offer_selected": "verified_user_discount",
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
      "segment": "verified_privy_user",
      "conversion_rate": 0.52,
      "arpu": "0.025",
      "best_offer": "verified_user_discount"
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
  privyDid?: string;
  identityConfidence: "anonymous" | "wallet_only" | "verified_contact" | "verified_social" | "strong_auth";
  linkedAccountTypes: Array<"email" | "farcaster" | "github" | "passkey" | "mfa">;
  isNewUser: boolean;
  pastPaidCalls: number;
  merchantPaidCalls: number;
  paymentSuccessRate: number;
  budgetRemainingUsdc: string;
};
```

Rules:

```txt
1. If no Flovia/Privy context:
   segment = anonymous_wallet
   final_price = base_price
   no discount

2. If Flovia Privy user is wallet-only:
   segment = low_assurance_privy_user
   final_price = base_price
   offer.type = unlockable_discount
   unlock_condition = link_email_or_farcaster
   reason_codes = [low_identity_confidence]

3. If Flovia Privy user has email or Farcaster linked:
   segment = verified_privy_user
   final_price = base_price * 0.5
   policy = verified_user_discount
   reason_codes = [verified_privy_user]

4. If Flovia Privy user has passkey or MFA:
   identity_confidence = strong_auth
   segment = verified_privy_user
   final_price = base_price * 0.5
   policy = verified_user_discount
   reason_codes = [strong_auth_privy_user]

5. If successful paid response is being returned and buyer has no prior paid calls:
   include flovia_next_offer.type = starter_upsell
   reason_codes = [first_successful_payment]

6. If successful paid response is being returned and buyer has 2+ successful paid calls:
   include flovia_next_offer.type = loyalty_bundle
   reason_codes = [repeat_privy_buyer]

7. If GitHub or Farcaster linked bundle variants are implemented:
   return contextual bundle only as a normalized offer type
   do not expose raw account identifiers

8. Future only: if risk scoring is implemented later:
   do not expose raw risk signals to merchants
   record risk outcome internally and fall back to base price when needed
```

Future-only scoring:

MVP pricing rules do not use agent score. Keep scoring out of the MVP offer decision unless the rule-based identity discount path is already complete.

If retained, `computeAgentScore` is an internal dashboard or future pricing helper only and must not be sent to merchants.

```ts
function computeAgentScore(signals: BuyerSignals): number {
  let score = 50;

  if (signals.isFloviaPrivyUser) score += 10;
  if (signals.hasActiveAgentAuthorization) score += 15;
  if (signals.identityConfidence === "verified_contact") score += 5;
  if (signals.identityConfidence === "verified_social") score += 10;
  if (signals.identityConfidence === "strong_auth") score += 15;
  if (signals.paymentSuccessRate >= 0.9) score += 10;
  if (signals.pastPaidCalls >= 5) score += 10;
  if (signals.merchantPaidCalls >= 2) score += 5;

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
- Optional: Bundle conversions
- Optional: Premium upsells
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
- Optional: 4 bundle conversions
- Optional: 2 premium upsells
```

## Security And Privacy Rules

```txt
- Do not send Privy access token to merchant.
- Do not send Privy refresh token to merchant.
- Do not expose email, Farcaster username, OAuth profile, or passkey details to merchant.
- Merchant sees only normalized signals: segment, policy, reason codes, and offer decision.
- Merchant SDK authenticates to Flovia with API key.
- Flovia should verify that paid wallet matches quoted wallet when possible.
- If wallet mismatch occurs, record a risk event and reject or fall back to base price.
```

Privy wallet lookup rule:

Fallback lookup should be disabled by default unless Privy's API support and Flovia app permissions are verified.

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
5. apps/web minimal Privy shell
6. packages/sdk
7. apps/merchant-api
8. apps/demo-agent
9. apps/web dashboard polish
```

Reason:

```txt
The quote API and SDK contract should be stable before investing in dashboard polish, but the Pattern 1 demo needs a minimal Privy UI before the merchant/agent flow is complete.
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
- Store Privy DID
- Read normalized linked account state for email, Farcaster, GitHub, passkey, and MFA
- Add agent authorization page
- Store user and wallet in DB
- Add default budget field: 0.25 USDC
```

### Phase 3: Offer Engine

```txt
- Implement /v1/offers/quote
- Implement rule-based pricing
- Implement anonymous vs wallet-only Privy vs verified Privy segments
- Implement unlockable discount and verified user discount
- Implement returning-buyer next offer if time allows
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
- Chooses whether to pay the current offer or trigger the unlock condition
- Optional: chooses bundle if stretch bundle fields are implemented
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
4. User starts as wallet-only Privy user.
5. User authorizes agent for `market_signal` category.
6. Agent runs task: `Find the strongest signal around agentic payments today.`
7. Agent calls `GET /api/premium-signal` on merchant API.
8. Merchant returns HTTP 402 at `$0.05` with `unlockable_discount` asking the user to link email or Farcaster.
9. User links email or Farcaster in Privy.
10. Agent retries `GET /api/premium-signal`.
11. Merchant returns HTTP 402 at `$0.025` with `verified_user_discount`.
12. Agent pays or simulates payment.
13. Merchant returns paid API response.
14. If stretch path is enabled, paid response includes `flovia_next_offer` for starter upsell or loyalty bundle.
15. Dashboard updates with request, offer, conversion, revenue, discount, and segment.

## Acceptance Criteria

The demo is complete if:

```txt
- User can login with Privy from Flovia UI.
- User can authorize or simulate authorizing an agent.
- Wallet-only Privy user receives full-price 402 plus unlockable discount condition.
- Same user receives lower-price 402 after linking email or Farcaster in Privy.
- Agent can call merchant API.
- Merchant returns HTTP 402 with personalized Flovia offer.
- Offer differs between wallet-only Privy user and verified Privy user.
- Agent can pay USDC on Base/Base Sepolia via x402 or use explicit MVP simulation mode.
- Merchant returns paid API response after payment.
- Stretch: Returning buyer response includes flovia_next_offer based on Privy DID and Flovia-observed payment history.
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
