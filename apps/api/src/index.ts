import { getDashboard, getMerchantPaidCalls, recordPaymentEvent, recordRequestEvent, saveQuote } from "@flovia-baseprivynyc/db";
import { computeOffer, deriveSignals } from "@flovia-baseprivynyc/offer-engine";
import { OfferQuoteRequestSchema, PaymentEventSchema, RequestEventSchema } from "@flovia-baseprivynyc/shared";
import { Hono } from "hono";

export const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "flovia-api" }));

app.post("/v1/offers/quote", async (c) => {
  const input = OfferQuoteRequestSchema.parse(await c.req.json());
  const merchantPaidCalls = getMerchantPaidCalls(input.merchant_id, input.wallet);
  const quote = computeOffer(input, deriveSignals(input, merchantPaidCalls));
  saveQuote({
    ...quote,
    request_id: input.request_id,
    merchant_id: input.merchant_id,
    endpoint: input.endpoint,
  });
  return c.json(quote);
});

app.post("/v1/events/request", async (c) => {
  const event = RequestEventSchema.parse(await c.req.json());
  return c.json(recordRequestEvent(event));
});

app.post("/v1/events/payment", async (c) => {
  const event = PaymentEventSchema.parse(await c.req.json());
  return c.json(recordPaymentEvent(event));
});

app.get("/v1/merchants/:merchantId/dashboard", (c) => {
  return c.json(getDashboard(c.req.param("merchantId")));
});

if (import.meta.main) {
  Bun.serve({
    port: Number(process.env.PORT ?? 8787),
    fetch: app.fetch,
  });
  console.log("Flovia API listening on http://localhost:8787");
}
