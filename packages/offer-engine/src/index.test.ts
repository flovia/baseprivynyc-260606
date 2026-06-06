import { describe, expect, test } from "bun:test";
import type { BuyerSignals, OfferQuoteRequest } from "@flovia-baseprivynyc/shared";
import { computeOffer } from "./index";

const input: OfferQuoteRequest = {
  merchant_id: "merch_test",
  endpoint: "/api/premium-signal",
  method: "GET",
  wallet: "0xAgent",
  network: "base-sepolia",
  base_price: "0.05",
  currency: "USDC",
  request_id: "req_test",
};

function signals(overrides: Partial<BuyerSignals>): BuyerSignals {
  return {
    isFloviaPrivyUser: false,
    hasActiveAgentAuthorization: false,
    identityConfidence: "anonymous",
    linkedAccountTypes: [],
    isNewUser: true,
    pastPaidCalls: 0,
    merchantPaidCalls: 0,
    paymentSuccessRate: 1,
    budgetRemainingUsdc: "0.25",
    ...overrides,
  };
}

describe("computeOffer", () => {
  test("anonymous gets base price", () => {
    const quote = computeOffer(input, signals({}));
    expect(quote.offer.type).toBe("base_price");
    expect(quote.offer.final_price).toBe("0.05");
  });

  test("wallet-only authorized user gets unlockable discount", () => {
    const quote = computeOffer(input, signals({ isFloviaPrivyUser: true, hasActiveAgentAuthorization: true, identityConfidence: "wallet_only" }));
    expect(quote.offer.type).toBe("unlockable_discount");
    expect(quote.offer.final_price).toBe("0.05");
    expect(quote.offer.unlock?.target_final_price).toBe("0.025");
  });

  test("verified contact and strong auth get verified discount", () => {
    const verified = computeOffer(input, signals({ isFloviaPrivyUser: true, hasActiveAgentAuthorization: true, identityConfidence: "verified_contact" }));
    const strong = computeOffer(input, signals({ isFloviaPrivyUser: true, hasActiveAgentAuthorization: true, identityConfidence: "strong_auth" }));
    expect(verified.offer.final_price).toBe("0.025");
    expect(strong.reason_codes).toContain("strong_auth_privy_user");
  });

  test("unauthorized Privy user falls back to base price", () => {
    const quote = computeOffer(input, signals({ isFloviaPrivyUser: true, identityConfidence: "verified_social" }));
    expect(quote.offer.type).toBe("base_price");
    expect(quote.reason_codes).toContain("anonymous_wallet");
  });
});
