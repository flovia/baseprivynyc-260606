import type { BuyerSignals, OfferQuoteRequest, OfferQuoteResponse, Policy, Segment } from "@flovia-baseprivynyc/shared";

function money(value: number): string {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, ".00");
}

function asNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeAgentScore(signals: BuyerSignals): number {
  let score = 50;
  if (signals.isFloviaPrivyUser) score += 10;
  if (signals.hasActiveAgentAuthorization) score += 15;
  if (signals.paymentSuccessRate >= 0.9) score += 10;
  if (signals.pastPaidCalls >= 5) score += 10;
  if (signals.merchantPaidCalls >= 2) score += 5;
  if (signals.onchainRiskScore < 40) score -= 20;
  return Math.max(0, Math.min(100, score));
}

export function deriveSignals(input: OfferQuoteRequest, merchantPaidCalls: number): BuyerSignals {
  const authorized = input.metadata?.privy_authorized === true;
  return {
    isFloviaPrivyUser: authorized,
    hasActiveAgentAuthorization: authorized,
    isNewUser: merchantPaidCalls === 0,
    pastPaidCalls: merchantPaidCalls,
    merchantPaidCalls,
    paymentSuccessRate: merchantPaidCalls > 0 ? 0.95 : 1,
    budgetRemainingUsdc: input.metadata?.agent_declared_budget ?? "0.25",
    onchainRiskScore: 80,
  };
}

export function computeOffer(input: OfferQuoteRequest, signals: BuyerSignals): OfferQuoteResponse {
  const basePrice = asNumber(input.base_price);
  const score = computeAgentScore(signals);
  const reasonCodes: string[] = [];
  let segment: Segment = "anonymous_wallet";
  let policy: Policy = "base_price";
  let finalPrice = basePrice;

  if (!signals.isFloviaPrivyUser || !signals.hasActiveAgentAuthorization) {
    reasonCodes.push("anonymous_wallet");
  } else if (signals.onchainRiskScore < 40) {
    segment = "new_authorized_agent";
    policy = "risk_adjusted_base_price";
    reasonCodes.push("privy_agent_authorized", "risk_review_required");
  } else if (signals.isNewUser) {
    segment = "new_authorized_agent";
    policy = "first_call_discount";
    finalPrice = basePrice * 0.6;
    reasonCodes.push("privy_agent_authorized", "new_user", "low_risk_wallet");
  } else if (signals.paymentSuccessRate >= 0.9) {
    segment = "repeat_agent";
    policy = "repeat_agent_loyalty";
    finalPrice = basePrice * 0.8;
    reasonCodes.push("privy_agent_authorized", "repeat_buyer", "high_payment_success_rate");
  }

  const declaredBudget = asNumber(signals.budgetRemainingUsdc);
  const offer: OfferQuoteResponse["offer"] = {
    base_price: input.base_price,
    final_price: money(finalPrice),
    currency: input.currency,
    policy,
  };

  if (declaredBudget < finalPrice || declaredBudget <= 0.05) {
    offer.alternative_endpoint = {
      path: "/api/basic-signal",
      price: "0.01",
      reason: "budget_friendly_option",
    };
    reasonCodes.push("low_declared_budget");
  }

  if (segment === "repeat_agent") {
    offer.bundle = {
      id: "signal_5_pack",
      calls: 5,
      price: money(basePrice * 2.4),
    };
  }

  if (score >= 70 && input.metadata?.task_category === "market_signal") {
    offer.premium_upsell = {
      path: "/api/premium-signal-plus",
      price: "0.08",
      reason: "high_intent_agent",
    };
  }

  return {
    quote_id: `quote_${crypto.randomUUID()}`,
    buyer: {
      wallet: input.wallet,
      source: signals.isFloviaPrivyUser ? "flovia_privy_authorized_agent" : "anonymous_wallet",
      segment,
      agent_score: score,
    },
    offer,
    reason_codes: [...new Set(reasonCodes)],
  };
}
