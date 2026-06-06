import { z } from "zod";

// --- Money handling -------------------------------------------------------
// App-level prices are decimal USDC strings ("0.025"). x402 wire amounts are
// atomic units. Never use JS float math for money: convert via integer/BigInt.

export const USDC_DECIMALS = 6;

export function toAtomic(decimal: string): string {
  const [whole, frac = ""] = decimal.trim().split(".");
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  const digits = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, "");
  return digits === "" ? "0" : digits;
}

export function fromAtomic(atomic: string): string {
  const negative = atomic.startsWith("-");
  const raw = (negative ? atomic.slice(1) : atomic).padStart(USDC_DECIMALS + 1, "0");
  const whole = raw.slice(0, raw.length - USDC_DECIMALS);
  const frac = raw.slice(raw.length - USDC_DECIMALS).replace(/0+$/, "");
  const value = frac ? `${whole}.${frac}` : whole;
  return negative ? `-${value}` : value;
}

// Apply numerator/denominator rate to a decimal price using BigInt atomic math.
export function applyRate(decimal: string, numerator: number, denominator: number): string {
  const atomic = BigInt(toAtomic(decimal));
  return fromAtomic(((atomic * BigInt(numerator)) / BigInt(denominator)).toString());
}

// --- Enums ----------------------------------------------------------------

export const NetworkSchema = z.enum(["base", "base-sepolia"]);
export const CurrencySchema = z.enum(["USDC"]);

export const SegmentSchema = z.enum([
  "anonymous_wallet",
  "wallet_only_privy_user",
  "low_assurance_privy_user",
  "verified_privy_user",
  "repeat_privy_buyer",
]);

export const PolicySchema = z.enum([
  "base_price",
  "base_price_until_verified",
  "verified_user_discount",
]);

export const OfferTypeSchema = z.enum([
  "base_price",
  "unlockable_discount",
  "verified_user_discount",
]);

export const NextOfferTypeSchema = z.enum(["starter_upsell", "loyalty_bundle"]);

export const IdentityConfidenceSchema = z.enum([
  "anonymous",
  "wallet_only",
  "verified_contact",
  "verified_social",
  "strong_auth",
]);

export const LinkedAccountTypeSchema = z.enum([
  "email",
  "farcaster",
  "github",
  "passkey",
  "mfa",
]);

// --- Flovia API request ---------------------------------------------------
// Merchant-visible request carries no identity: Flovia resolves it from the
// wallet -> Flovia user lookup. Do not require merchants to send privyDid.

export const OfferQuoteRequestSchema = z.object({
  merchant_id: z.string().min(1),
  endpoint: z.string().min(1),
  method: z.string().min(1).default("GET"),
  wallet: z.string().min(1),
  network: NetworkSchema,
  base_price: z.string().min(1),
  currency: CurrencySchema,
  request_id: z.string().min(1),
  metadata: z
    .object({
      task_category: z.string().optional(),
      agent_declared_budget: z.string().optional(),
    })
    .optional(),
});

// --- Simulation/dev only schemas (Privy login + linking stand-ins) --------

export const DevUserSchema = z.object({
  wallet: z.string().min(1),
  privy_did: z.string().optional(),
  identity_confidence: IdentityConfidenceSchema.optional(),
  authorized: z.boolean().optional(),
});

export const LinkAccountSchema = z.object({ type: LinkedAccountTypeSchema });

export const PrivySyncRequestSchema = z.object({
  identity_token: z.string().min(1),
  wallet: z.string().min(1).optional(),
  authorized: z.boolean().optional(),
});

// --- Offer / quote response ----------------------------------------------

export const UnlockSchema = z.object({
  type: z.literal("link_account"),
  condition: z.string(),
  target_final_price: z.string(),
});

export const OfferSchema = z.object({
  type: OfferTypeSchema,
  base_price: z.string(),
  final_price: z.string(),
  currency: CurrencySchema,
  policy: PolicySchema,
  unlock: UnlockSchema.optional(),
});

export const BuyerSchema = z.object({
  wallet: z.string(),
  source: z.enum(["anonymous_wallet", "flovia_privy_authorized_agent"]),
  segment: SegmentSchema,
});

export const OfferQuoteResponseSchema = z.object({
  quote_id: z.string(),
  buyer: BuyerSchema,
  offer: OfferSchema,
  reason_codes: z.array(z.string()),
});

// The `flovia` extension embedded in the HTTP 402 response: offer fields plus
// reason_codes, in snake_case. Never includes buyer identity or agent score.
export const FloviaExtensionSchema = OfferSchema.extend({
  reason_codes: z.array(z.string()),
});

export const FloviaNextOfferSchema = z.object({
  type: NextOfferTypeSchema,
  title: z.string(),
  description: z.string(),
  endpoint: z.string(),
  price: z.string(),
  currency: CurrencySchema,
  reason_codes: z.array(z.string()),
});

// --- Events ---------------------------------------------------------------

export const RequestEventSchema = z.object({
  request_id: z.string(),
  quote_id: z.string(),
  merchant_id: z.string(),
  endpoint: z.string(),
  wallet: z.string(),
  status: z.enum(["offer_returned"]),
  final_price: z.string(),
  policy: PolicySchema,
  offer_type: OfferTypeSchema,
  timestamp: z.string(),
});

export const PaymentEventSchema = z.object({
  request_id: z.string(),
  quote_id: z.string(),
  merchant_id: z.string(),
  endpoint: z.string(),
  wallet: z.string(),
  amount: z.string(),
  currency: CurrencySchema,
  network: NetworkSchema,
  tx_hash: z.string(),
  offer_selected: z.string(),
  timestamp: z.string(),
});

export const PaymentEventResponseSchema = z.object({
  event: PaymentEventSchema,
  merchant_paid_calls: z.number(),
  flovia_next_offer: FloviaNextOfferSchema.optional(),
});

// --- Dashboard ------------------------------------------------------------

export const DashboardResponseSchema = z.object({
  merchant_id: z.string(),
  summary: z.object({
    requests: z.number(),
    offers_returned: z.number(),
    paid_conversions: z.number(),
    revenue_usdc: z.string(),
    estimated_revenue_lift: z.string(),
    discount_conversions: z.number(),
    bundle_conversions: z.number(),
    premium_upsells: z.number(),
  }),
  recent_requests: z.array(z.record(z.string(), z.unknown())),
  segments: z.array(
    z.object({
      segment: SegmentSchema,
      requests: z.number(),
      conversion_rate: z.number(),
      revenue: z.string(),
      arpu: z.string(),
      best_offer: z.string(),
    }),
  ),
  channels: z.array(
    z.object({
      channel: z.string(),
      requests: z.number(),
      offers_returned: z.number(),
      paid_conversions: z.number(),
      conversion_rate: z.number(),
      revenue: z.string(),
      best_segment: SegmentSchema,
    }),
  ),
  bundle_insights: z.array(
    z.object({
      from_endpoint: z.string(),
      to_endpoint: z.string(),
      offer_type: NextOfferTypeSchema,
      selected: z.number(),
      revenue: z.string(),
    }),
  ),
  offer_performance: z.array(
    z.object({
      offer: z.string(),
      shown: z.number(),
      selected: z.number(),
      conversion_rate: z.number(),
      revenue: z.string(),
    }),
  ),
  executive_takeaways: z.array(z.string()),
  reason_codes: z.array(z.object({ code: z.string(), count: z.number() })),
});

// --- Types ----------------------------------------------------------------

export type OfferQuoteRequest = z.infer<typeof OfferQuoteRequestSchema>;
export type OfferQuoteResponse = z.infer<typeof OfferQuoteResponseSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type Buyer = z.infer<typeof BuyerSchema>;
export type Unlock = z.infer<typeof UnlockSchema>;
export type RequestEvent = z.infer<typeof RequestEventSchema>;
export type PaymentEvent = z.infer<typeof PaymentEventSchema>;
export type PaymentEventResponse = z.infer<typeof PaymentEventResponseSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type Network = z.infer<typeof NetworkSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type OfferType = z.infer<typeof OfferTypeSchema>;
export type NextOfferType = z.infer<typeof NextOfferTypeSchema>;
export type IdentityConfidence = z.infer<typeof IdentityConfidenceSchema>;
export type LinkedAccountType = z.infer<typeof LinkedAccountTypeSchema>;
export type FloviaNextOffer = z.infer<typeof FloviaNextOfferSchema>;
export type PrivySyncRequest = z.infer<typeof PrivySyncRequestSchema>;

export type BuyerSignals = {
  isFloviaPrivyUser: boolean;
  hasActiveAgentAuthorization: boolean;
  privyDid?: string;
  identityConfidence: IdentityConfidence;
  linkedAccountTypes: LinkedAccountType[];
  isNewUser: boolean;
  pastPaidCalls: number;
  merchantPaidCalls: number;
  paymentSuccessRate: number;
  budgetRemainingUsdc: string;
};

export type FloviaUser = {
  wallet: string;
  privyDid?: string;
  identityConfidence: IdentityConfidence;
  linkedAccountTypes: LinkedAccountType[];
  hasActiveAgentAuthorization: boolean;
  createdAt: string;
};
