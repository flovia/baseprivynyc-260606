import { describe, expect, test } from "bun:test";
import {
  FloviaExtensionSchema,
  FloviaNextOfferSchema,
  OfferQuoteResponseSchema,
  applyRate,
  fromAtomic,
  toAtomic,
} from "./index";

describe("money helpers", () => {
  test.each(["0.01", "0.025", "0.05", "0.08"])("roundtrips %s", (price) => {
    expect(fromAtomic(toAtomic(price))).toBe(price);
  });

  test("applies rates using atomic math", () => {
    expect(applyRate("0.05", 1, 2)).toBe("0.025");
    expect(applyRate("0.07", 1, 2)).toBe("0.035");
  });
});

describe("canonical schemas", () => {
  test("parses flat flovia extension", () => {
    expect(() =>
      FloviaExtensionSchema.parse({
        type: "verified_user_discount",
        base_price: "0.05",
        final_price: "0.025",
        currency: "USDC",
        policy: "verified_user_discount",
        reason_codes: ["privy_agent_authorized", "verified_privy_user"],
      }),
    ).not.toThrow();
  });

  test("parses quote and next offer", () => {
    expect(OfferQuoteResponseSchema.parse({
      quote_id: "quote_test",
      buyer: { wallet: "0x1", source: "anonymous_wallet", segment: "anonymous_wallet" },
      offer: { type: "base_price", base_price: "0.05", final_price: "0.05", currency: "USDC", policy: "base_price" },
      reason_codes: ["anonymous_wallet"],
    }).offer.final_price).toBe("0.05");

    expect(FloviaNextOfferSchema.parse({
      type: "starter_upsell",
      title: "Try plus",
      description: "Follow-up offer",
      endpoint: "/api/premium-signal-plus",
      price: "0.08",
      currency: "USDC",
      reason_codes: ["first_successful_payment"],
    }).type).toBe("starter_upsell");
  });
});
