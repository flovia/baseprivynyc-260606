import { ArrowRight, BarChart3, GitBranch, ShieldCheck, TrendingUp } from "lucide-react";
import { EndpointSankey, type EndpointSankeyFlow } from "@/components/dashboard/endpoint-sankey";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoMerchantId, fetchDashboard, textValue } from "@/lib/flovia";

export default async function DashboardPage() {
  const { data, error } = await fetchDashboard();
  const summary = data?.summary;
  const funnelMax = Math.max(summary?.requests ?? 0, summary?.offers_returned ?? 0, summary?.paid_conversions ?? 0, 1);
  const bundleFlows = buildBundleSankeyFlows(data?.bundle_insights ?? []);

  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="grid gap-5 rounded-xl border bg-surface-card p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Badge className="mb-2 w-fit">Merchant dashboard</Badge>
            <h1 className="display text-3xl font-semibold text-text-1 sm:text-5xl">{demoMerchantId}</h1>
            <p className="mt-3 max-w-3xl text-sm text-text-2 sm:text-base">
              Executive view of adaptive x402 pricing: conversion lift, channel quality, Privy segment impact, and next-offer revenue.
            </p>
          </div>
          <Card className="border-primary/20 bg-mesh-blue-dim">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary">Revenue lift</CardDescription>
              <CardTitle className="display text-5xl text-primary">{summary?.estimated_revenue_lift ?? "0%"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-2">Flovia-attributed lift from discounts, bundles, and premium upsells.</p>
            </CardContent>
          </Card>
        </header>

        {error ? <Card className="border-danger bg-danger-soft"><CardContent className="p-4 text-sm text-danger">{error}</CardContent></Card> : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Requests" value={summary?.requests ?? 0} hint="merchant API calls" />
          <MetricCard label="Offers Returned" value={summary?.offers_returned ?? 0} hint="adaptive 402 offers" />
          <MetricCard label="Paid Conv." value={summary?.paid_conversions ?? 0} hint="settled or simulated payments" />
          <MetricCard label="Revenue" value={`${summary?.revenue_usdc ?? "0.00"} USDC`} hint="paid response revenue" />
          <MetricCard label="Discount Conv." value={summary?.discount_conversions ?? 0} hint="verified user discounts" tone="primary" />
          <MetricCard label="Bundle Conv." value={summary?.bundle_conversions ?? 0} hint="recommended next APIs" tone="primary" />
          <MetricCard label="Premium Upsells" value={summary?.premium_upsells ?? 0} hint="higher-value follow-ons" tone="primary" />
          <MetricCard label="Privacy Boundary" value="Normalized" hint="no raw X/GitHub values" tone="green" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Conversion funnel</CardTitle>
              <CardDescription>POC-style owner view: requests become offers, then paid conversions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FunnelRow label="Requests" value={summary?.requests ?? 0} max={funnelMax} />
              <FunnelRow label="Offers Returned" value={summary?.offers_returned ?? 0} max={funnelMax} />
              <FunnelRow label="Paid Conv." value={summary?.paid_conversions ?? 0} max={funnelMax} />
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-mesh-blue-dim to-surface-card">
            <CardHeader>
              <CardTitle>Executive takeaways</CardTitle>
              <CardDescription>What the merchant should remember after the demo.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {(data?.executive_takeaways ?? []).map((item) => (
                <div key={item} className="rounded-lg border bg-white/70 p-3 text-sm leading-6 text-text-2">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" /> Source channel performance</CardTitle>
              <CardDescription>Which ecosystem surfaces are bringing high-intent buyers.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Offers</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>CVR</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Best Segment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.channels ?? []).map((row) => (
                    <TableRow key={row.channel}>
                      <TableCell className="font-medium">{row.channel}</TableCell>
                      <TableCell>{row.requests}</TableCell>
                      <TableCell>{row.offers_returned}</TableCell>
                      <TableCell>{row.paid_conversions}</TableCell>
                      <TableCell>{formatPct(row.conversion_rate)}</TableCell>
                      <TableCell>{row.revenue} USDC</TableCell>
                      <TableCell>{formatLabel(row.best_segment)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Privy segment impact</CardTitle>
              <CardDescription>Normalized segments only; raw linked-account values stay internal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.segments ?? []).map((segment) => (
                <BarRow
                  key={segment.segment}
                  label={formatLabel(segment.segment)}
                  value={`${formatPct(segment.conversion_rate)} CVR · ARPU ${segment.arpu} USDC`}
                  share={segment.conversion_rate}
                />
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GitBranch className="size-4 text-primary" /> Cross-API bundle insight</CardTitle>
              <CardDescription>Paid responses recommend the next API and create follow-on revenue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <EndpointSankey
                flows={bundleFlows}
                compact
                height={230}
                minWidth={520}
                margin={{ top: 8, right: 120, bottom: 8, left: 10 }}
                ariaLabel="Cross-API bundle recommendation Sankey diagram"
                emptyMessage="No bundle flow detected."
              />
              {(data?.bundle_insights ?? []).map((bundle) => (
                <div key={`${bundle.from_endpoint}-${bundle.offer_type}`} className="rounded-lg border bg-surface-subtle p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-1">
                    <span className="mono">{bundle.from_endpoint}</span>
                    <ArrowRight className="size-4 text-text-mute" />
                    <span className="mono">{bundle.to_endpoint}</span>
                  </div>
                  <p className="mt-2 text-sm text-text-3">{formatLabel(bundle.offer_type)} selected {bundle.selected}x · {bundle.revenue} USDC bundle revenue</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Offer performance</CardTitle>
              <CardDescription>Which incentives actually move buyers through shown, selected, and paid.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer</TableHead>
                    <TableHead>Shown</TableHead>
                    <TableHead>Selected</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.offer_performance ?? []).map((offer) => (
                    <TableRow key={offer.offer}>
                      <TableCell className="font-medium">{formatLabel(offer.offer)}</TableCell>
                      <TableCell>{offer.shown}</TableCell>
                      <TableCell>{offer.selected}</TableCell>
                      <TableCell>{formatPct(offer.conversion_rate)}</TableCell>
                      <TableCell>{offer.revenue} USDC</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent requests</CardTitle>
              <CardDescription>Operational log, kept secondary to business impact.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Final</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.recent_requests ?? []).map((row, index) => (
                    <TableRow key={`${textValue(row.request_id, String(index))}-${index}`}>
                      <TableCell className="whitespace-nowrap">{textValue(row.time)}</TableCell>
                      <TableCell className="whitespace-nowrap">{textValue(row.wallet)}</TableCell>
                      <TableCell>{textValue(row.endpoint)}</TableCell>
                      <TableCell>{textValue(row.final_price, "0.00")} USDC</TableCell>
                      <TableCell>{textValue(row.policy)}</TableCell>
                      <TableCell>{textValue(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reason codes</CardTitle>
              <CardDescription>Decision explanations remain normalized.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.reason_codes ?? []).map((item) => (
                <div key={item.code} className="flex items-center justify-between rounded-lg border bg-surface-subtle px-3 py-2 text-sm">
                  <span>{formatLabel(item.code)}</span>
                  <Badge>{item.count}</Badge>
                </div>
              ))}
              {(data?.reason_codes ?? []).length === 0 ? <p className="text-sm text-text-3">No reason codes yet.</p> : null}
              <Button asChild variant="outline" className="mt-3 w-full">
                <a href="/dashboard/requests">Open full request log</a>
              </Button>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone?: "primary" | "green" }) {
  return (
    <Card className={tone === "primary" ? "border-primary/20 bg-mesh-blue-dim" : tone === "green" ? "border-success/20 bg-success-soft" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="display text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent><p className="text-sm text-text-3">{hint}</p></CardContent>
    </Card>
  );
}

function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-text-2">{label}</span>
        <span className="mono text-text-1">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(5, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function BarRow({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <div className="rounded-lg border bg-surface-subtle p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-text-1">{label}</span>
        <span className="text-text-3">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(5, Math.min(100, share * 100))}%` }} />
      </div>
    </div>
  );
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function buildBundleSankeyFlows(bundles: NonNullable<Awaited<ReturnType<typeof fetchDashboard>>["data"]>["bundle_insights"]): EndpointSankeyFlow[] {
  return bundles.flatMap<EndpointSankeyFlow>((bundle) => [
    {
      from: bundle.from_endpoint,
      to: bundle.offer_type,
      fromStep: 0,
      toStep: 1,
      occurrences: bundle.selected,
      fromLabel: bundle.from_endpoint,
      toLabel: formatLabel(bundle.offer_type),
    },
    {
      from: bundle.offer_type,
      to: bundle.to_endpoint,
      fromStep: 1,
      toStep: 2,
      occurrences: bundle.selected,
      fromLabel: formatLabel(bundle.offer_type),
      toLabel: bundle.to_endpoint,
    },
  ]).filter((flow) => flow.occurrences > 0);
}
