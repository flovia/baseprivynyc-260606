import { describe, expect, test } from "bun:test";
import { buildSimulationPayment, shouldLinkAccount, type PaymentRequired } from "./index";

const paymentRequired: PaymentRequired = {
  accepts: [{
    maxAmountRequired: "25000",
    asset: "0xUSDC",
    extra: { quote_id: "quote_agent", request_id: "req_agent", display_price: "0.025" },
  }],
  flovia: {
    type: "verified_user_discount",
    base_price: "0.05",
    final_price: "0.025",
    currency: "USDC",
    policy: "verified_user_discount",
    reason_codes: ["privy_agent_authorized", "verified_privy_user"],
  },
};

describe("demo agent helpers", () => {
  test("builds simulation payment from flat flovia", () => {
    const payment = buildSimulationPayment(paymentRequired, "0xAgentWallet");
    expect(payment.request_id).toBe("req_agent");
    expect(payment.quote_id).toBe("quote_agent");
    expect(payment.amount).toBe("0.025");
    expect(payment.offer_selected).toBe("verified_user_discount");
    expect(payment.simulation).toBe(true);
  });

  test("links only unlockable discount when enabled", () => {
    expect(shouldLinkAccount({ ...paymentRequired.flovia, type: "unlockable_discount" }, true)).toBe(true);
    expect(shouldLinkAccount(paymentRequired.flovia, true)).toBe(false);
    expect(shouldLinkAccount({ ...paymentRequired.flovia, type: "unlockable_discount" }, false)).toBe(false);
  });
});
