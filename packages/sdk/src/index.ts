import { defaultConfig, usdcAssetAddresses } from "@flovia-baseprivynyc/config";
import { OfferQuoteResponseSchema, toAtomic, type Currency, type Network } from "@flovia-baseprivynyc/shared";
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
  const apiBase = () => options.floviaApiUrl ?? defaultConfig.floviaApiUrl;

  return async (c, next) => {
    const wallet = c.req.header("x-agent-wallet") ?? "anonymous_wallet";
    const declaredBudget = c.req.header("x-agent-budget") ?? defaultConfig.defaultBudgetUsdc;
    const endpoint = new URL(c.req.url).pathname;
    const payment = parsePaymentHeader(c.req.header("x-payment"));

    // Paid retry: emit the payment event then serve the protected handler.
    if (payment) {
      await fetch(`${apiBase()}/v1/events/payment`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-flovia-api-key": options.apiKey },
        body: JSON.stringify({
          request_id: payment.request_id ?? c.req.header("x-request-id") ?? `req_${crypto.randomUUID()}`,
          quote_id: payment.quote_id ?? "quote_simulated",
          merchant_id: options.merchantId,
          endpoint,
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

    // No payment yet: request a personalized quote from Flovia.
    const requestId = `req_${crypto.randomUUID()}`;
    const quoteResponse = await fetch(`${apiBase()}/v1/offers/quote`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-flovia-api-key": options.apiKey },
      body: JSON.stringify({
        merchant_id: options.merchantId,
        endpoint,
        method: c.req.method,
        wallet,
        network: options.network,
        base_price: options.basePrice,
        currency: options.currency,
        request_id: requestId,
        metadata: { task_category: options.category, agent_declared_budget: declaredBudget },
      }),
    });

    if (!quoteResponse.ok) {
      return c.json({ error: "Flovia quote API unavailable" }, 502);
    }

    const quote = OfferQuoteResponseSchema.parse(await quoteResponse.json());

    await fetch(`${apiBase()}/v1/events/request`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-flovia-api-key": options.apiKey },
      body: JSON.stringify({
        request_id: requestId,
        quote_id: quote.quote_id,
        merchant_id: options.merchantId,
        endpoint,
        wallet,
        status: "offer_returned",
        final_price: quote.offer.final_price,
        policy: quote.offer.policy,
        offer_type: quote.offer.type,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => undefined);

    // x402-shaped payment requirement (atomic units + asset address). The
    // `extra.simulation` flag labels this as MVP simulation, not a settled
    // on-chain requirement. The `flovia` extension is snake_case and carries
    // only normalized offer context — never buyer identity or agent score.
    return c.json(
      {
        error: "Payment Required",
        accepts: [
          {
            scheme: "exact",
            network: options.network,
            maxAmountRequired: toAtomic(quote.offer.final_price),
            asset: usdcAssetAddresses[options.network],
            payTo: options.payTo,
            extra: {
              quote_id: quote.quote_id,
              request_id: requestId,
              display_price: quote.offer.final_price,
              currency: options.currency,
              simulation: true,
            },
          },
        ],
        flovia: {
          type: quote.offer.type,
          base_price: quote.offer.base_price,
          final_price: quote.offer.final_price,
          currency: quote.offer.currency,
          policy: quote.offer.policy,
          reason_codes: quote.reason_codes,
          ...(quote.offer.unlock ? { unlock: quote.offer.unlock } : {}),
        },
      },
      402,
    );
  };
}
