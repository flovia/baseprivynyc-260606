import { describe, expect, spyOn, test } from "bun:test";
import { Hono } from "hono";
import { floviaAdaptive402 } from "./index";

describe("floviaAdaptive402", () => {
  const options = {
    merchantId: "merch_sdk_test",
    apiKey: "test-key",
    payTo: "0xMerchant",
    network: "base-sepolia" as const,
    basePrice: "0.05",
    currency: "USDC" as const,
    category: "market_signal",
    floviaApiUrl: "http://flovia.test",
  };

  test("returns flat flovia and accepts.extra in simulation 402", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (url: RequestInfo | URL) => {
      if (String(url).endsWith("/v1/offers/quote")) {
        return Response.json({
          quote_id: "quote_sdk",
          buyer: { wallet: "0xAgent", source: "flovia_privy_authorized_agent", segment: "verified_privy_user" },
          offer: { type: "verified_user_discount", base_price: "0.05", final_price: "0.025", currency: "USDC", policy: "verified_user_discount" },
          reason_codes: ["privy_agent_authorized", "verified_privy_user"],
        });
      }
      return Response.json({ ok: true });
    }) as unknown as typeof fetch);

    const app = new Hono().get("/paid", floviaAdaptive402(options), (c) => c.json({ ok: true }));
    const response = await app.request("/paid", { headers: { "x-agent-wallet": "0xAgent" } });
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.flovia.final_price).toBe("0.025");
    expect(body.flovia.offer).toBeUndefined();
    expect(body.accepts[0].maxAmountRequired).toBe("25000");
    expect(body.accepts[0].extra.simulation).toBe(true);
    fetchSpy.mockRestore();
  });

  test("x402 mode removes simulation marker", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (url: RequestInfo | URL) => {
      if (String(url).endsWith("/v1/offers/quote")) {
        return Response.json({
          quote_id: "quote_sdk_x402",
          buyer: { wallet: "0xAgent", source: "anonymous_wallet", segment: "anonymous_wallet" },
          offer: { type: "base_price", base_price: "0.05", final_price: "0.05", currency: "USDC", policy: "base_price" },
          reason_codes: ["anonymous_wallet"],
        });
      }
      return Response.json({ ok: true });
    }) as unknown as typeof fetch);

    const app = new Hono().get("/paid", floviaAdaptive402({ ...options, paymentMode: "x402" }), (c) => c.json({ ok: true }));
    const body = await (await app.request("/paid")).json();
    expect(body.accepts[0].extra.simulation).toBeUndefined();
    expect(body.accepts[0].extra.payment_mode).toBe("x402");
    fetchSpy.mockRestore();
  });

  test("injects flovia_next_offer into paid JSON response", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async () => Response.json({
      event: {
        request_id: "req_sdk",
        quote_id: "quote_sdk",
        merchant_id: "merch_sdk_test",
        endpoint: "/paid",
        wallet: "0xAgent",
        amount: "0.025",
        currency: "USDC",
        network: "base-sepolia",
        tx_hash: "tx_sdk",
        offer_selected: "verified_user_discount",
        timestamp: new Date().toISOString(),
      },
      merchant_paid_calls: 1,
      flovia_next_offer: {
        type: "starter_upsell",
        title: "Try plus",
        description: "Follow-up",
        endpoint: "/api/premium-signal-plus",
        price: "0.08",
        currency: "USDC",
        reason_codes: ["first_successful_payment"],
      },
    })) as unknown as typeof fetch);

    const app = new Hono().get("/paid", floviaAdaptive402({ ...options, enableNextOffer: true }), (c) => c.json({ signal: "ok" }));
    const response = await app.request("/paid", { headers: { "x-payment": JSON.stringify({ request_id: "req_sdk", quote_id: "quote_sdk", wallet: "0xAgent", amount: "0.025", simulation: true }) } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.signal).toBe("ok");
    expect(body.flovia_next_offer.type).toBe("starter_upsell");
    fetchSpy.mockRestore();
  });
});
