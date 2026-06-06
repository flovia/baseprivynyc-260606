import {
  getDashboard,
  getMerchantPaidCalls,
  getQuote,
  getUserByWallet,
  linkAccount,
  recordPaymentEvent,
  recordRequestEvent,
  saveQuote,
  upsertUser,
} from "@flovia-baseprivynyc/db";
import { computeOffer, deriveSignals } from "@flovia-baseprivynyc/offer-engine";
import {
  DevUserSchema,
  type FloviaNextOffer,
  LinkAccountSchema,
  OfferQuoteRequestSchema,
  PaymentEventSchema,
  PrivySyncRequestSchema,
  RequestEventSchema,
} from "@flovia-baseprivynyc/shared";
import { Hono } from "hono";
import { resolvePrivyIdentity } from "./privy";

export const app = new Hono();

function computeNextOffer(paidCalls: number): FloviaNextOffer {
  if (paidCalls <= 1) {
    return {
      type: "starter_upsell",
      title: "Try the plus signal next",
      description: "First payment settled. Offer the agent a richer follow-up signal without changing this response.",
      endpoint: "/api/premium-signal-plus",
      price: "0.08",
      currency: "USDC",
      reason_codes: ["first_successful_payment"],
    };
  }

  return {
    type: "loyalty_bundle",
    title: "Loyalty bundle available",
    description: "Returning paid buyer. Suggest a bundled continuation path after the settled request.",
    endpoint: "/api/premium-signal-plus",
    price: "0.08",
    currency: "USDC",
    reason_codes: ["repeat_successful_payment"],
  };
}

app.get("/health", (c) => c.json({ ok: true, service: "flovia-api" }));

app.post("/v1/offers/quote", async (c) => {
  const input = OfferQuoteRequestSchema.parse(await c.req.json());
  const user = getUserByWallet(input.wallet);
  const merchantPaidCalls = getMerchantPaidCalls(input.merchant_id, input.wallet);
  const quote = computeOffer(input, deriveSignals(input, user, merchantPaidCalls));
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
  // Security: paid wallet must match the quoted wallet when the quote is known.
  const quote = getQuote(event.quote_id);
  if (quote && quote.buyer.wallet.toLowerCase() !== event.wallet.toLowerCase()) {
    return c.json(
      { error: "wallet_mismatch", reason: "paid wallet does not match quoted wallet" },
      409,
    );
  }
  const recorded = recordPaymentEvent(event);
  const merchantPaidCalls = getMerchantPaidCalls(event.merchant_id, event.wallet);
  return c.json({
    event: recorded,
    merchant_paid_calls: merchantPaidCalls,
    flovia_next_offer: computeNextOffer(merchantPaidCalls),
  });
});

app.get("/v1/merchants/:merchantId/dashboard", (c) => {
  return c.json(getDashboard(c.req.param("merchantId")));
});

app.post("/v1/auth/privy/sync", async (c) => {
  const body = PrivySyncRequestSchema.parse(await c.req.json());
  try {
    const identity = await resolvePrivyIdentity({
      identityToken: body.identity_token,
      requestedWallet: body.wallet,
    });
    const user = upsertUser({
      wallet: identity.wallet,
      privyDid: identity.privyDid,
      identityConfidence: identity.identityConfidence,
      linkedAccountTypes: identity.linkedAccountTypes,
      hasActiveAgentAuthorization: body.authorized,
      authoritativeIdentity: true,
    });
    return c.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "privy_sync_failed";
    if (message === "privy_not_configured") return c.json({ error: message }, 503);
    if (message === "privy_wallet_not_found") return c.json({ error: message }, 400);
    if (message === "privy_wallet_mismatch") return c.json({ error: message }, 409);
    return c.json({ error: "privy_sync_failed" }, 401);
  }
});

// --- Simulation/dev only ---------------------------------------------------
// Stand-ins for Privy login + agent authorization, and for account linking in
// the Privy UI. Not part of the merchant-facing API surface.

if (process.env.FLOVIA_ENABLE_DEV_ENDPOINTS === "true" || process.env.NODE_ENV === "test") {
  app.post("/v1/dev/users", async (c) => {
    const body = DevUserSchema.parse(await c.req.json());
    const user = upsertUser({
      wallet: body.wallet,
      privyDid: body.privy_did,
      identityConfidence: body.identity_confidence ?? "wallet_only",
      hasActiveAgentAuthorization: body.authorized ?? true,
    });
    return c.json(user);
  });

  app.post("/v1/dev/users/:wallet/link", async (c) => {
    const body = LinkAccountSchema.parse(await c.req.json());
    const user = linkAccount(c.req.param("wallet"), body.type);
    if (!user) return c.json({ error: "user_not_found" }, 404);
    return c.json(user);
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8791);
  Bun.serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Flovia API listening on http://localhost:${port}`);
}
