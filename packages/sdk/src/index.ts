import { defaultConfig, usdcAssetAddresses } from "@flovia-baseprivynyc/config";
import {
  OfferQuoteResponseSchema,
  PaymentEventResponseSchema,
  toAtomic,
  type Currency,
  type FloviaNextOffer,
  type OfferQuoteResponse,
  type Network,
} from "@flovia-baseprivynyc/shared";
import type { MiddlewareHandler } from "hono";

export type PaymentMode = "simulation" | "x402";

export type FloviaAdaptive402Options = {
  merchantId: string;
  apiKey: string;
  payTo: string;
  network: Network;
  basePrice: string;
  currency: Currency;
  category: string;
  floviaApiUrl?: string;
  x402FacilitatorUrl?: string;
  paymentMode?: PaymentMode;
  enableNextOffer?: boolean;
};

type PaymentHeader = {
  request_id?: string;
  quote_id?: string;
  tx_hash?: string;
  amount?: string;
  wallet?: string;
  offer_selected?: string;
  simulation?: boolean;
  x402Version?: number;
  scheme?: string;
  network?: string;
  payload?: unknown;
  raw?: string;
};

type StoredQuote = {
  quote: OfferQuoteResponse;
  requestId: string;
  wallet: string;
  endpoint: string;
  method: string;
  expiresAt: number;
};

type PaymentRequirement = {
  scheme: "exact";
  network: Network;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  asset: string;
  payTo: string;
  extra: Record<string, unknown>;
};

const QUOTE_TTL_MS = 5 * 60 * 1000;
const sdkQuotes = new Map<string, StoredQuote>();

function rememberQuote(record: Omit<StoredQuote, "expiresAt">) {
  sdkQuotes.set(record.quote.quote_id, { ...record, expiresAt: Date.now() + QUOTE_TTL_MS });
}

function readQuote(quoteId: string | undefined): StoredQuote | undefined {
  if (!quoteId) return undefined;
  const record = sdkQuotes.get(quoteId);
  if (!record) return undefined;
  if (Date.now() > record.expiresAt) {
    sdkQuotes.delete(quoteId);
    return undefined;
  }
  return record;
}

function decodeBase64Json(value: string): unknown | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function parsePaymentHeader(value: string | null | undefined): PaymentHeader | null {
  if (!value) return null;
  try {
    return { ...(JSON.parse(value) as PaymentHeader), raw: value };
  } catch {
    const decoded = decodeBase64Json(value);
    if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
      return { ...(decoded as PaymentHeader), raw: value };
    }
    return { tx_hash: value, raw: value };
  }
}

function buildRequirement(input: {
  quote: OfferQuoteResponse;
  requestId: string;
  endpoint: string;
  options: FloviaAdaptive402Options;
  paymentMode: PaymentMode;
}): PaymentRequirement {
  return {
    scheme: "exact",
    network: input.options.network,
    maxAmountRequired: toAtomic(input.quote.offer.final_price),
    resource: input.endpoint,
    description: `${input.options.category} access for ${input.endpoint}`,
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    asset: usdcAssetAddresses[input.options.network],
    payTo: input.options.payTo,
    extra: {
      quote_id: input.quote.quote_id,
      request_id: input.requestId,
      display_price: input.quote.offer.final_price,
      currency: input.options.currency,
      ...(input.paymentMode === "simulation"
        ? { simulation: true }
        : { payment_mode: "x402", facilitator: "x402_exact" }),
    },
  };
}

function paymentPayload(payment: PaymentHeader): unknown {
  if (payment.payload !== undefined || payment.x402Version !== undefined || payment.scheme !== undefined) {
    const { raw: _raw, quote_id: _quoteId, request_id: _requestId, tx_hash: _txHash, amount: _amount, wallet: _wallet, offer_selected: _offerSelected, simulation: _simulation, ...payload } = payment;
    return payload;
  }
  return payment.raw ?? payment.tx_hash;
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function objectValue(input: unknown, key: string): unknown {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>)[key] : undefined;
}

function stringValue(input: unknown, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = objectValue(input, key);
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function validFacilitatorResponse(input: unknown): boolean {
  return objectValue(input, "isValid") === true || objectValue(input, "valid") === true || objectValue(input, "success") === true;
}

async function postFacilitator(url: string, path: "verify" | "settle", body: unknown) {
  return fetch(`${url.replace(/\/$/, "")}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function verifyX402Payment(input: {
  facilitatorUrl: string;
  payment: PaymentHeader;
  requirement: PaymentRequirement;
  quote: StoredQuote;
}) {
  const body = {
    x402Version: input.payment.x402Version ?? 1,
    paymentPayload: paymentPayload(input.payment),
    paymentRequirements: input.requirement,
  };

  const verifyResponse = await postFacilitator(input.facilitatorUrl, "verify", body);
  const verifyBody = await verifyResponse.json().catch(() => null);
  if (!verifyResponse.ok || !validFacilitatorResponse(verifyBody)) {
    return { ok: false as const, status: 402, body: { error: "x402_payment_invalid", details: verifyBody } };
  }

  const payer = stringValue(verifyBody, ["payer", "from", "wallet"]);
  if (payer && payer.toLowerCase() !== input.quote.wallet.toLowerCase()) {
    return { ok: false as const, status: 409, body: { error: "wallet_mismatch", reason: "verified payer does not match quoted wallet" } };
  }

  const settleResponse = await postFacilitator(input.facilitatorUrl, "settle", body);
  const settleBody = await settleResponse.json().catch(() => null);
  if (!settleResponse.ok || !validFacilitatorResponse(settleBody)) {
    return { ok: false as const, status: 402, body: { error: "x402_settlement_failed", details: settleBody } };
  }

  const settledAmount = stringValue(settleBody, ["amount", "amountSettled", "settledAmount", "maxAmountRequired"]);
  if (settledAmount && settledAmount !== input.requirement.maxAmountRequired) {
    return { ok: false as const, status: 409, body: { error: "amount_mismatch", expected: input.requirement.maxAmountRequired, actual: settledAmount } };
  }

  const txHash = stringValue(settleBody, ["txHash", "tx_hash", "transactionHash", "transaction"])
    ?? input.payment.tx_hash
    ?? `x402_${await sha256(JSON.stringify(paymentPayload(input.payment)))}`;

  return { ok: true as const, txHash };
}

async function injectNextOffer(response: Response, floviaNextOffer: FloviaNextOffer): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(JSON.stringify({ ...body, flovia_next_offer: floviaNextOffer }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function floviaAdaptive402(options: FloviaAdaptive402Options): MiddlewareHandler {
  const apiBase = () => options.floviaApiUrl ?? defaultConfig.floviaApiUrl;
  const facilitatorBase = () => options.x402FacilitatorUrl ?? defaultConfig.x402FacilitatorUrl;
  const paymentMode = options.paymentMode ?? "simulation";

  return async (c, next) => {
    const wallet = c.req.header("x-agent-wallet") ?? "anonymous_wallet";
    const declaredBudget = c.req.header("x-agent-budget") ?? defaultConfig.defaultBudgetUsdc;
    const endpoint = new URL(c.req.url).pathname;
    const payment = parsePaymentHeader(c.req.header("x-payment"));

    // Paid retry: emit the payment event then serve the protected handler.
    if (payment) {
      if (paymentMode === "x402" && payment.simulation) {
        return c.json({ error: "simulation_payment_not_allowed" }, 400);
      }

      const quoteId = payment.quote_id ?? c.req.header("x-flovia-quote-id") ?? undefined;
      const storedQuote = readQuote(quoteId);

      if (paymentMode === "x402") {
        if (!storedQuote) return c.json({ error: "x402_quote_required" }, 400);
        const requirement = buildRequirement({
          quote: storedQuote.quote,
          requestId: storedQuote.requestId,
          endpoint: storedQuote.endpoint,
          options,
          paymentMode,
        });
        const verified = await verifyX402Payment({
          facilitatorUrl: facilitatorBase(),
          payment,
          requirement,
          quote: storedQuote,
        });
        if (!verified.ok) return c.json(verified.body, verified.status as 400 | 402 | 409);
        payment.tx_hash = verified.txHash;
        payment.amount = storedQuote.quote.offer.final_price;
        payment.wallet = storedQuote.wallet;
        payment.offer_selected = storedQuote.quote.offer.policy;
        payment.request_id = storedQuote.requestId;
        payment.quote_id = storedQuote.quote.quote_id;
      }

      let floviaNextOffer: FloviaNextOffer | undefined;
      const paymentEventResponse = await fetch(`${apiBase()}/v1/events/payment`, {
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

      if (paymentEventResponse?.ok) {
        const parsed = PaymentEventResponseSchema.safeParse(await paymentEventResponse.json());
        floviaNextOffer = parsed.success ? parsed.data.flovia_next_offer : undefined;
      }

      await next();
      if (options.enableNextOffer && floviaNextOffer) {
        c.res = await injectNextOffer(c.res, floviaNextOffer);
      }
      return;
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
    rememberQuote({ quote, requestId, wallet, endpoint, method: c.req.method });

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

    // x402-shaped payment requirement (atomic units + asset address). In
    // simulation mode, extra.simulation labels MVP-only local settlement. In
    // x402 mode, the accepts entry is facilitator-facing and carries no
    // simulation marker. The `flovia` extension never includes buyer identity.
    return c.json(
      {
        error: "Payment Required",
        accepts: [
          buildRequirement({ quote, requestId, endpoint, options, paymentMode }),
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
