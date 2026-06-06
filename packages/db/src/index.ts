import type {
  DashboardResponse,
  FloviaUser,
  IdentityConfidence,
  LinkedAccountType,
  OfferQuoteResponse,
  PaymentEvent,
  RequestEvent,
} from "@flovia-baseprivynyc/shared";

// In-memory stores for the MVP simulation. Real Drizzle/Postgres is deferred.
const QUOTE_TTL_MS = 5 * 60 * 1000;

type QuoteRecord = OfferQuoteResponse & {
  request_id: string;
  merchant_id: string;
  endpoint: string;
  expires_at: number;
};

const users = new Map<string, FloviaUser>();
const quotes = new Map<string, QuoteRecord>();
const requestEvents: RequestEvent[] = [];
const paymentEvents: PaymentEvent[] = [];

const confidenceRank: Record<IdentityConfidence, number> = {
  anonymous: 0,
  wallet_only: 1,
  verified_contact: 2,
  verified_social: 3,
  strong_auth: 4,
};

const linkConfidence: Record<LinkedAccountType, IdentityConfidence> = {
  email: "verified_contact",
  farcaster: "verified_social",
  github: "verified_social",
  passkey: "strong_auth",
  mfa: "strong_auth",
};

// --- Flovia users (wallet -> identity context) ----------------------------

export function getUserByWallet(wallet: string): FloviaUser | null {
  return users.get(wallet.toLowerCase()) ?? null;
}

export function upsertUser(input: {
  wallet: string;
  privyDid?: string;
  identityConfidence?: IdentityConfidence;
  linkedAccountTypes?: LinkedAccountType[];
  hasActiveAgentAuthorization?: boolean;
  authoritativeIdentity?: boolean;
}): FloviaUser {
  const key = input.wallet.toLowerCase();
  const existing = users.get(key);
  // Dev auth updates should not wipe out linked-account confidence. Real Privy
  // sync is authoritative and may downgrade after accounts are unlinked.
  const requested = input.identityConfidence;
  const identityConfidence =
    input.authoritativeIdentity && requested
      ? requested
      : requested && (!existing || confidenceRank[requested] > confidenceRank[existing.identityConfidence])
        ? requested
        : (existing?.identityConfidence ?? "wallet_only");
  const user: FloviaUser = {
    wallet: input.wallet,
    privyDid: input.privyDid ?? existing?.privyDid,
    identityConfidence,
    linkedAccountTypes: input.linkedAccountTypes ?? existing?.linkedAccountTypes ?? [],
    hasActiveAgentAuthorization:
      input.hasActiveAgentAuthorization ?? existing?.hasActiveAgentAuthorization ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  users.set(key, user);
  return user;
}

// Simulates the user linking an account in the Flovia Privy UI: refresh the
// normalized identity confidence and linked-account flags.
export function linkAccount(wallet: string, type: LinkedAccountType): FloviaUser | null {
  const key = wallet.toLowerCase();
  const user = users.get(key);
  if (!user) return null;
  const linked = new Set(user.linkedAccountTypes);
  linked.add(type);
  const candidate = linkConfidence[type];
  const identityConfidence =
    confidenceRank[candidate] > confidenceRank[user.identityConfidence]
      ? candidate
      : user.identityConfidence;
  const updated: FloviaUser = {
    ...user,
    linkedAccountTypes: [...linked],
    identityConfidence,
  };
  users.set(key, updated);
  return updated;
}

// --- Quotes (5 min TTL) ---------------------------------------------------

export function saveQuote(record: Omit<QuoteRecord, "expires_at">): QuoteRecord {
  const stored: QuoteRecord = { ...record, expires_at: Date.now() + QUOTE_TTL_MS };
  quotes.set(record.quote_id, stored);
  return stored;
}

export function getQuote(quoteId: string): QuoteRecord | undefined {
  const record = quotes.get(quoteId);
  if (!record) return undefined;
  if (Date.now() > record.expires_at) {
    quotes.delete(quoteId);
    return undefined;
  }
  return record;
}

// --- Events (idempotent) --------------------------------------------------

export function recordRequestEvent(event: RequestEvent): RequestEvent {
  const duplicate = requestEvents.find(
    (e) => e.request_id === event.request_id && e.status === event.status,
  );
  if (duplicate) return duplicate;
  requestEvents.push(event);
  return event;
}

function paymentKey(event: PaymentEvent): string {
  return event.tx_hash && !event.tx_hash.startsWith("sim_")
    ? `${event.quote_id}:${event.tx_hash}`
    : `${event.quote_id}:${event.offer_selected}`;
}

export function recordPaymentEvent(event: PaymentEvent): PaymentEvent {
  const key = paymentKey(event);
  const duplicate = paymentEvents.find((e) => paymentKey(e) === key);
  if (duplicate) return duplicate;
  paymentEvents.push(event);
  return event;
}

export function getMerchantPaidCalls(merchantId: string, wallet: string): number {
  return paymentEvents.filter(
    (e) => e.merchant_id === merchantId && e.wallet.toLowerCase() === wallet.toLowerCase(),
  ).length;
}

// --- Dashboard ------------------------------------------------------------

export function getDashboard(merchantId: string): DashboardResponse {
  const merchantRequests = requestEvents.filter((e) => e.merchant_id === merchantId);
  const merchantPayments = paymentEvents.filter((e) => e.merchant_id === merchantId);

  if (merchantRequests.length === 0 && merchantPayments.length === 0) {
    return seededDashboard(merchantId);
  }

  const revenue = merchantPayments.reduce((total, e) => total + Number(e.amount), 0);
  const discountConversions = merchantPayments.filter(
    (e) => e.offer_selected === "verified_user_discount",
  ).length;

  const reasonCount = new Map<string, number>();
  for (const request of merchantRequests) {
    for (const code of quotes.get(request.quote_id)?.reason_codes ?? []) {
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
      bundle_conversions: 0,
      premium_upsells: 0,
    },
    recent_requests: merchantRequests
      .slice(-10)
      .reverse()
      .map((event) => ({
        time: event.timestamp,
        wallet: event.wallet,
        endpoint: event.endpoint,
        base_price: quotes.get(event.quote_id)?.offer.base_price ?? null,
        final_price: event.final_price,
        policy: event.policy,
        offer_type: event.offer_type,
        status: event.status,
        tx_hash:
          merchantPayments.find((p) => p.request_id === event.request_id)?.tx_hash ?? null,
      })),
    segments: [
      {
        segment: "verified_privy_user",
        requests: merchantRequests.length,
        conversion_rate:
          merchantRequests.length === 0 ? 0 : merchantPayments.length / merchantRequests.length,
        revenue: revenue.toFixed(2),
        arpu: merchantPayments.length === 0 ? "0.00" : (revenue / merchantPayments.length).toFixed(3),
        best_offer: discountConversions > 0 ? "verified_user_discount" : "base_price",
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
        segment: "verified_privy_user",
        endpoint: "/api/premium-signal",
        base_price: "0.05",
        final_price: "0.025",
        policy: "verified_user_discount",
        offer_type: "verified_user_discount",
        status: "paid",
        tx_hash: "0xdemo",
      },
      {
        time: "2026-06-06T11:58:41Z",
        wallet: "0xdef...",
        segment: "low_assurance_privy_user",
        endpoint: "/api/premium-signal",
        base_price: "0.05",
        final_price: "0.05",
        policy: "base_price_until_verified",
        offer_type: "unlockable_discount",
        status: "offer_returned",
        tx_hash: null,
      },
    ],
    segments: [
      {
        segment: "verified_privy_user",
        requests: 24,
        conversion_rate: 0.62,
        revenue: "0.60",
        arpu: "0.025",
        best_offer: "verified_user_discount",
      },
      {
        segment: "low_assurance_privy_user",
        requests: 14,
        conversion_rate: 0.3,
        revenue: "0.24",
        arpu: "0.05",
        best_offer: "unlockable_discount",
      },
    ],
    reason_codes: [
      { code: "privy_agent_authorized", count: 14 },
      { code: "verified_privy_user", count: 9 },
      { code: "low_identity_confidence", count: 5 },
    ],
  };
}

if (import.meta.main) {
  const command = process.argv[2];
  console.log(
    command === "seed"
      ? seededDashboard("merch_demo")
      : "Drizzle migrations are deferred for the MVP simulation.",
  );
}
