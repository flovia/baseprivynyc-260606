import type { DashboardResponse, OfferQuoteResponse, PaymentEvent, RequestEvent } from "@flovia-baseprivynyc/shared";

type QuoteRecord = OfferQuoteResponse & {
  request_id: string;
  merchant_id: string;
  endpoint: string;
};

const quotes = new Map<string, QuoteRecord>();
const requestEvents: RequestEvent[] = [];
const paymentEvents: PaymentEvent[] = [];

export function saveQuote(record: QuoteRecord): QuoteRecord {
  quotes.set(record.quote_id, record);
  return record;
}

export function getQuote(quoteId: string): QuoteRecord | undefined {
  return quotes.get(quoteId);
}

export function recordRequestEvent(event: RequestEvent): RequestEvent {
  requestEvents.push(event);
  return event;
}

export function recordPaymentEvent(event: PaymentEvent): PaymentEvent {
  paymentEvents.push(event);
  return event;
}

export function getMerchantPaidCalls(merchantId: string, wallet: string): number {
  return paymentEvents.filter((event) => event.merchant_id === merchantId && event.wallet === wallet).length;
}

export function getDashboard(merchantId: string): DashboardResponse {
  const merchantRequests = requestEvents.filter((event) => event.merchant_id === merchantId);
  const merchantPayments = paymentEvents.filter((event) => event.merchant_id === merchantId);

  if (merchantRequests.length === 0 && merchantPayments.length === 0) {
    return seededDashboard(merchantId);
  }

  const revenue = merchantPayments.reduce((total, event) => total + Number(event.amount), 0);
  const discountConversions = merchantPayments.filter((event) => event.offer_selected === "first_call_discount").length;
  const premiumUpsells = merchantPayments.filter((event) => event.endpoint.includes("premium-signal-plus")).length;

  const reasonCount = new Map<string, number>();
  for (const request of merchantRequests) {
    const quote = quotes.get(request.quote_id);
    for (const code of quote?.reason_codes ?? []) {
      reasonCount.set(code, (reasonCount.get(code) ?? 0) + 1);
    }
  }

  return {
    merchant_id: merchantId,
    summary: {
      requests: merchantRequests.length,
      offers_returned: merchantRequests.length,
      paid_conversions: merchantPayments.length,
      revenue_usdc: revenue.toFixed(2),
      estimated_revenue_lift: merchantPayments.length > 0 ? "+18%" : "0%",
      discount_conversions: discountConversions,
      bundle_conversions: merchantPayments.filter((event) => event.offer_selected === "signal_5_pack").length,
      premium_upsells: premiumUpsells,
    },
    recent_requests: merchantRequests.slice(-10).reverse().map((event) => ({
      time: event.timestamp,
      wallet: event.wallet,
      endpoint: event.endpoint,
      final_price: event.final_price,
      policy: event.policy,
      status: event.status,
      tx_hash: merchantPayments.find((payment) => payment.request_id === event.request_id)?.tx_hash ?? null,
    })),
    segments: [
      {
        segment: "new_authorized_agent",
        requests: merchantRequests.length,
        conversion_rate: merchantRequests.length === 0 ? 0 : merchantPayments.length / merchantRequests.length,
        revenue: revenue.toFixed(2),
        arpu: merchantPayments.length === 0 ? "0.00" : (revenue / merchantPayments.length).toFixed(2),
        best_offer: discountConversions > 0 ? "first_call_discount" : "base_price",
      },
    ],
    reason_codes: [...reasonCount.entries()].map(([code, count]) => ({ code, count })),
  };
}

export function seededDashboard(merchantId: string): DashboardResponse {
  return {
    merchant_id: merchantId,
    summary: {
      requests: 42,
      offers_returned: 38,
      paid_conversions: 21,
      revenue_usdc: "0.84",
      estimated_revenue_lift: "+31%",
      discount_conversions: 9,
      bundle_conversions: 4,
      premium_upsells: 2,
    },
    recent_requests: [
      {
        time: "2026-06-06T12:00:15Z",
        wallet: "0xabc...",
        segment: "new_authorized_agent",
        endpoint: "/api/premium-signal",
        base_price: "0.05",
        final_price: "0.03",
        policy: "first_call_discount",
        status: "paid",
        tx_hash: "0xdemo",
      },
    ],
    segments: [
      {
        segment: "new_authorized_agent",
        requests: 38,
        conversion_rate: 0.52,
        revenue: "0.84",
        arpu: "0.03",
        best_offer: "first_call_discount",
      },
    ],
    reason_codes: [{ code: "privy_agent_authorized", count: 14 }],
  };
}

if (import.meta.main) {
  const command = process.argv[2];
  console.log(command === "seed" ? seededDashboard("merch_demo") : "Drizzle migrations are deferred for the MVP simulation.");
}
