import { defaultConfig } from "@flovia-baseprivynyc/config";
import { OfferQuoteResponseSchema, type Currency, type Network } from "@flovia-baseprivynyc/shared";
import type { MiddlewareHandler } from "hono";

export type FloviaAdaptive402Options = {
  merchantId: string;
  apiKey: string;
  payTo: string;
  network: Network;
  basePrice: string;
  currency: Currency;
  category: string;
  floviaApiUrl?: string;
  alternativeEndpoints?: Array<{ path: string; price: string }>;
  premiumUpsell?: { path: string; price: string };
};

type PaymentHeader = {
  request_id?: string;
  quote_id?: string;
  tx_hash?: string;
  amount?: string;
  wallet?: string;
  offer_selected?: string;
  simulation?: boolean;
};

function parsePaymentHeader(value: string | null | undefined): PaymentHeader | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as PaymentHeader;
  } catch {
    return { tx_hash: value };
  }
}

export function floviaAdaptive402(options: FloviaAdaptive402Options): MiddlewareHandler {
  return async (c, next) => {
    const wallet = c.req.header("x-agent-wallet") ?? "anonymous_wallet";
    const declaredBudget = c.req.header("x-agent-budget") ?? defaultConfig.defaultBudgetUsdc;
    const payment = parsePaymentHeader(c.req.header("x-payment"));

    if (payment) {
      await fetch(`${options.floviaApiUrl ?? defaultConfig.floviaApiUrl}/v1/events/payment`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-flovia-api-key": options.apiKey,
        },
        body: JSON.stringify({
          request_id: payment.request_id ?? c.req.header("x-request-id") ?? `req_${crypto.randomUUID()}`,
          quote_id: payment.quote_id ?? "quote_simulated",
          merchant_id: options.merchantId,
          endpoint: new URL(c.req.url).pathname,
          wallet: payment.wallet ?? wallet,
          amount: payment.amount ?? options.basePrice,
          currency: options.currency,
          network: options.network,
          tx_hash: payment.tx_hash ?? `sim_${crypto.randomUUID()}`,
          offer_selected: payment.offer_selected ?? (payment.simulation ? "mvp_simulation" : "x402_exact"),
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => undefined);
      return next();
    }

    const requestId = `req_${crypto.randomUUID()}`;
    const quoteResponse = await fetch(`${options.floviaApiUrl ?? defaultConfig.floviaApiUrl}/v1/offers/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-flovia-api-key": options.apiKey,
      },
      body: JSON.stringify({
        merchant_id: options.merchantId,
        endpoint: new URL(c.req.url).pathname,
        method: c.req.method,
        wallet,
        network: options.network,
        base_price: options.basePrice,
        currency: options.currency,
        request_id: requestId,
        metadata: {
          task_category: options.category,
          agent_declared_budget: declaredBudget,
          privy_authorized: c.req.header("x-flovia-privy-authorized") === "true",
        },
      }),
    });

    if (!quoteResponse.ok) {
      return c.json({ error: "Flovia quote API unavailable" }, 502);
    }

    const quote = OfferQuoteResponseSchema.parse(await quoteResponse.json());

    await fetch(`${options.floviaApiUrl ?? defaultConfig.floviaApiUrl}/v1/events/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-flovia-api-key": options.apiKey,
      },
      body: JSON.stringify({
        request_id: requestId,
        quote_id: quote.quote_id,
        merchant_id: options.merchantId,
        endpoint: new URL(c.req.url).pathname,
        wallet,
        status: "offer_returned",
        final_price: quote.offer.final_price,
        policy: quote.offer.policy,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => undefined);

    return c.json(
      {
        error: "Payment Required",
        accepts: [
          {
            scheme: "exact",
            network: options.network,
            asset: options.currency,
            amount: quote.offer.final_price,
            payTo: options.payTo,
          },
        ],
        flovia: {
          requestId,
          quoteId: quote.quote_id,
          basePrice: quote.offer.base_price,
          finalPrice: quote.offer.final_price,
          policy: quote.offer.policy,
          reasonCodes: quote.reason_codes,
          bundleOffers: quote.offer.bundle ? [quote.offer.bundle] : [],
          alternativeEndpoints: quote.offer.alternative_endpoint ? [quote.offer.alternative_endpoint] : [],
          premiumUpsell: quote.offer.premium_upsell,
          buyer: quote.buyer,
        },
      },
      402,
    );
  };
}
