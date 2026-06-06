import { describe, expect, test } from "bun:test";
import { app } from "./index";

function unique(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

describe("Flovia API", () => {
  test("quotes wallet-only and verified simulation users", async () => {
    const wallet = unique("0xwallet");
    await app.request("/v1/dev/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet, identity_confidence: "wallet_only", authorized: true }),
    });

    const walletOnly = await app.request("/v1/offers/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: "merch_api_test",
        endpoint: "/api/premium-signal",
        method: "GET",
        wallet,
        network: "base-sepolia",
        base_price: "0.05",
        currency: "USDC",
        request_id: unique("req"),
      }),
    });
    expect((await walletOnly.json()).offer.type).toBe("unlockable_discount");

    await app.request(`/v1/dev/users/${wallet}/link`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "email" }),
    });

    const verified = await app.request("/v1/offers/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: "merch_api_test",
        endpoint: "/api/premium-signal",
        method: "GET",
        wallet,
        network: "base-sepolia",
        base_price: "0.05",
        currency: "USDC",
        request_id: unique("req"),
      }),
    });
    const body = await verified.json();
    expect(body.offer.type).toBe("verified_user_discount");
    expect(body.offer.final_price).toBe("0.025");
  });

  test("rejects wallet mismatch and aggregates dashboard payments", async () => {
    const merchantId = unique("merch");
    const wallet = unique("0xwallet");
    const requestId = unique("req");

    const quoteResponse = await app.request("/v1/offers/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        endpoint: "/api/basic-signal",
        method: "GET",
        wallet,
        network: "base-sepolia",
        base_price: "0.01",
        currency: "USDC",
        request_id: requestId,
      }),
    });
    const quote = await quoteResponse.json();

    const mismatch = await app.request("/v1/events/payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        quote_id: quote.quote_id,
        merchant_id: merchantId,
        endpoint: "/api/basic-signal",
        wallet: "0xOtherWallet",
        amount: "0.01",
        currency: "USDC",
        network: "base-sepolia",
        tx_hash: unique("tx"),
        offer_selected: "base_price",
        timestamp: new Date().toISOString(),
      }),
    });
    expect(mismatch.status).toBe(409);

    await app.request("/v1/events/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        quote_id: quote.quote_id,
        merchant_id: merchantId,
        endpoint: "/api/basic-signal",
        wallet,
        status: "offer_returned",
        final_price: "0.01",
        policy: "base_price",
        offer_type: "base_price",
        timestamp: new Date().toISOString(),
      }),
    });

    const payment = await app.request("/v1/events/payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        quote_id: quote.quote_id,
        merchant_id: merchantId,
        endpoint: "/api/basic-signal",
        wallet,
        amount: "0.01",
        currency: "USDC",
        network: "base-sepolia",
        tx_hash: unique("tx"),
        offer_selected: "base_price",
        timestamp: new Date().toISOString(),
      }),
    });
    const paymentBody = await payment.json();
    expect(paymentBody.flovia_next_offer.type).toBe("starter_upsell");

    const dashboard = await app.request(`/v1/merchants/${merchantId}/dashboard`);
    const dashboardBody = await dashboard.json();
    expect(dashboardBody.summary.paid_conversions).toBe(1);
    expect(dashboardBody.summary.revenue_usdc).toBe("0.01");
  });
});
