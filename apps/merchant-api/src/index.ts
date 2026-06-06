import { defaultConfig } from "@flovia-baseprivynyc/config";
import { floviaAdaptive402, type PaymentMode } from "@flovia-baseprivynyc/sdk";
import { Hono } from "hono";

export const app = new Hono();
const paymentMode: PaymentMode = process.env.FLOVIA_PAYMENT_MODE === "x402" ? "x402" : "simulation";

const merchantOptions = {
  merchantId: defaultConfig.demoMerchantId,
  apiKey: defaultConfig.demoApiKey,
  payTo: defaultConfig.merchantWallet,
  network: defaultConfig.network,
  currency: defaultConfig.currency,
  category: "market_signal",
  paymentMode,
  enableNextOffer: true,
};

app.get("/health", (c) => c.json({ ok: true, service: "merchant-api" }));

app.get(
  "/api/basic-signal",
  floviaAdaptive402({ ...merchantOptions, basePrice: defaultConfig.endpointPrices.basicSignal }),
  (c) => c.json({ signal: "Basic agentic payments signal.", confidence: 0.61 }),
);

app.get(
  "/api/premium-signal",
  floviaAdaptive402({ ...merchantOptions, basePrice: defaultConfig.endpointPrices.premiumSignal }),
  (c) => c.json({ signal: "Agentic payments are trending upward.", confidence: 0.87 }),
);

app.get(
  "/api/premium-signal-plus",
  floviaAdaptive402({ ...merchantOptions, basePrice: defaultConfig.endpointPrices.premiumSignalPlus }),
  (c) => c.json({ signal: "Premium continuation signal: x402 demand is accelerating.", confidence: 0.93 }),
);

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8790);
  Bun.serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Merchant API listening on http://localhost:${port}`);
}
