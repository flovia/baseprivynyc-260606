import { z } from "zod";

export const NetworkSchema = z.enum(["base", "base-sepolia"]);
export const CurrencySchema = z.enum(["USDC"]);
export const SegmentSchema = z.enum([
  "anonymous_wallet",
  "new_authorized_agent",
  "repeat_agent",
]);
export const PolicySchema = z.enum([
  "base_price",
  "first_call_discount",
  "repeat_agent_loyalty",
  "risk_adjusted_base_price",
]);

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
      privy_authorized: z.boolean().optional(),
      linked_account: z.boolean().optional(),
    })
    .optional(),
});

export const BuyerSchema = z.object({
  wallet: z.string(),
  source: z.enum(["anonymous_wallet", "flovia_privy_authorized_agent"]),
  segment: SegmentSchema,
  agent_score: z.number().int().min(0).max(100),
});

export const OfferSchema = z.object({
  base_price: z.string(),
  final_price: z.string(),
  currency: CurrencySchema,
  policy: PolicySchema,
  bundle: z
    .object({
      id: z.string(),
      calls: z.number().int().positive(),
      price: z.string(),
    })
    .optional(),
  alternative_endpoint: z
    .object({
      path: z.string(),
      price: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
  premium_upsell: z
    .object({
      path: z.string(),
      price: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
});

export const OfferQuoteResponseSchema = z.object({
  quote_id: z.string(),
  buyer: BuyerSchema,
  offer: OfferSchema,
  reason_codes: z.array(z.string()),
});

export const RequestEventSchema = z.object({
  request_id: z.string(),
  quote_id: z.string(),
  merchant_id: z.string(),
  endpoint: z.string(),
  wallet: z.string(),
  status: z.enum(["offer_returned"]),
  final_price: z.string(),
  policy: PolicySchema,
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
  reason_codes: z.array(z.object({ code: z.string(), count: z.number() })),
});

export type OfferQuoteRequest = z.infer<typeof OfferQuoteRequestSchema>;
export type OfferQuoteResponse = z.infer<typeof OfferQuoteResponseSchema>;
export type RequestEvent = z.infer<typeof RequestEventSchema>;
export type PaymentEvent = z.infer<typeof PaymentEventSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type Network = z.infer<typeof NetworkSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Policy = z.infer<typeof PolicySchema>;

export type BuyerSignals = {
  isFloviaPrivyUser: boolean;
  hasActiveAgentAuthorization: boolean;
  isNewUser: boolean;
  pastPaidCalls: number;
  merchantPaidCalls: number;
  paymentSuccessRate: number;
  budgetRemainingUsdc: string;
  onchainRiskScore: number;
};
