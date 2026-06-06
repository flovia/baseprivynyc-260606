import {
  applyRate,
  type BuyerSignals,
  type FloviaUser,
  type OfferQuoteRequest,
  type OfferQuoteResponse,
  type OfferType,
  type Policy,
  type Segment,
} from "@flovia-baseprivynyc/shared";

// Future-only helper. NOT used in MVP pricing and never sent to merchants.
// Kept for internal dashboard / future pricing experiments per SPEC.
export function computeAgentScore(signals: BuyerSignals): number {
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

export function deriveSignals(
  input: OfferQuoteRequest,
  user: FloviaUser | null,
  merchantPaidCalls: number,
): BuyerSignals {
  return {
    isFloviaPrivyUser: user !== null,
    hasActiveAgentAuthorization: user?.hasActiveAgentAuthorization ?? false,
    privyDid: user?.privyDid,
    identityConfidence: user?.identityConfidence ?? "anonymous",
    linkedAccountTypes: user?.linkedAccountTypes ?? [],
    isNewUser: merchantPaidCalls === 0,
    pastPaidCalls: merchantPaidCalls,
    merchantPaidCalls,
    paymentSuccessRate: merchantPaidCalls > 0 ? 0.95 : 1,
    budgetRemainingUsdc: input.metadata?.agent_declared_budget ?? "0.25",
  };
}

// Rule-based MVP offer engine (SPEC "Offer Engine Rules" 1-4). No ML, no score.
export function computeOffer(
  input: OfferQuoteRequest,
  signals: BuyerSignals,
): OfferQuoteResponse {
  const basePrice = input.base_price;
  const halfPrice = applyRate(basePrice, 1, 2);

  let segment: Segment = "anonymous_wallet";
  let policy: Policy = "base_price";
  let type: OfferType = "base_price";
  let finalPrice = basePrice;
  let unlock: OfferQuoteResponse["offer"]["unlock"];
  const reasonCodes: string[] = [];

  if (!signals.isFloviaPrivyUser || !signals.hasActiveAgentAuthorization) {
    // Rule 1: no Flovia/Privy context -> base price, no discount.
    segment = "anonymous_wallet";
    reasonCodes.push("anonymous_wallet");
  } else if (signals.identityConfidence === "wallet_only") {
    // Rule 2: wallet-only Privy user -> full price + unlockable discount.
    segment = "low_assurance_privy_user";
    policy = "base_price_until_verified";
    type = "unlockable_discount";
    finalPrice = basePrice;
    unlock = {
      type: "link_account",
      condition: "link_email_or_farcaster",
      target_final_price: halfPrice,
    };
    reasonCodes.push("privy_agent_authorized", "low_identity_confidence");
  } else if (
    signals.identityConfidence === "verified_contact" ||
    signals.identityConfidence === "verified_social"
  ) {
    // Rule 3: email/Farcaster linked -> verified user discount (50%).
    segment = "verified_privy_user";
    policy = "verified_user_discount";
    type = "verified_user_discount";
    finalPrice = halfPrice;
    reasonCodes.push("privy_agent_authorized", "verified_privy_user");
  } else if (signals.identityConfidence === "strong_auth") {
    // Rule 4: passkey/MFA -> strong auth, verified user pricing (50%).
    segment = "verified_privy_user";
    policy = "verified_user_discount";
    type = "verified_user_discount";
    finalPrice = halfPrice;
    reasonCodes.push("privy_agent_authorized", "strong_auth_privy_user");
  } else {
    // Flovia user with anonymous confidence -> base price.
    segment = "anonymous_wallet";
    reasonCodes.push("anonymous_wallet");
  }

  return {
    quote_id: `quote_${crypto.randomUUID()}`,
    buyer: {
      wallet: input.wallet,
      source: signals.isFloviaPrivyUser ? "flovia_privy_authorized_agent" : "anonymous_wallet",
      segment,
    },
    offer: {
      type,
      base_price: basePrice,
      final_price: finalPrice,
      currency: input.currency,
      policy,
      ...(unlock ? { unlock } : {}),
    },
    reason_codes: [...new Set(reasonCodes)],
  };
}
