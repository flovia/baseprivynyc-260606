export const floviaApiUrl = process.env.FLOVIA_API_URL ?? "http://localhost:8791";
export const demoMerchantId = process.env.FLOVIA_MERCHANT_ID ?? "merch_demo";

export type DashboardData = {
  merchant_id: string;
  summary: {
    requests: number;
    offers_returned: number;
    paid_conversions: number;
    revenue_usdc: string;
    estimated_revenue_lift: string;
    discount_conversions: number;
    bundle_conversions: number;
    premium_upsells: number;
  };
  recent_requests: Array<Record<string, unknown>>;
  segments: Array<{
    segment: string;
    requests: number;
    conversion_rate: number;
    revenue: string;
    arpu: string;
    best_offer: string;
  }>;
  channels: Array<{
    channel: string;
    requests: number;
    offers_returned: number;
    paid_conversions: number;
    conversion_rate: number;
    revenue: string;
    best_segment: string;
  }>;
  bundle_insights: Array<{
    from_endpoint: string;
    to_endpoint: string;
    offer_type: string;
    selected: number;
    revenue: string;
  }>;
  offer_performance: Array<{
    offer: string;
    shown: number;
    selected: number;
    conversion_rate: number;
    revenue: string;
  }>;
  executive_takeaways: string[];
  reason_codes: Array<{ code: string; count: number }>;
};

export async function fetchDashboard(): Promise<{ data: DashboardData | null; error?: string }> {
  try {
    const response = await fetch(`${floviaApiUrl}/v1/merchants/${demoMerchantId}/dashboard`, {
      cache: "no-store",
    });
    if (!response.ok) return { data: null, error: `Flovia API returned ${response.status}` };
    return { data: (await response.json()) as DashboardData };
  } catch {
    return { data: null, error: "Flovia API is not running; start bun run dev:api." };
  }
}

export function textValue(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}
