import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DashboardData, demoMerchantId, fetchDashboard } from "@/lib/flovia";

// Identity strength, weakest -> strongest. Drives the core narrative ordering.
const SEGMENT_ORDER = [
  "anonymous_wallet",
  "wallet_only_privy_user",
  "verified_privy_user",
  "repeat_privy_buyer",
];

const HIGHLIGHT_SEGMENTS = new Set(["verified_privy_user", "repeat_privy_buyer"]);

// Display overrides so the dashboard matches the demo's "pure wallet" wording.
const LABEL_OVERRIDES: Record<string, string> = {
  wallet_only_privy_user: "Pure wallet user",
};

export default async function DashboardPage() {
  const { data, error } = await fetchDashboard();
  const summary = data?.summary;
  const segments = orderSegments(data?.segments ?? []);

  const walletSeg = segments.find((s) => s.segment === "wallet_only_privy_user");
  const verifiedSeg = segments.find((s) => s.segment === "verified_privy_user");
  const cvrMultiple = ratio(verifiedSeg?.conversion_rate, walletSeg?.conversion_rate);
  const arpuMultiple = ratio(parseNum(verifiedSeg?.arpu), parseNum(walletSeg?.arpu));

  const cvrMax = Math.max(...segments.map((s) => s.conversion_rate), 0.0001);
  const arpuMax = Math.max(...segments.map((s) => parseNum(s.arpu)), 0.0001);
  const funnelMax = Math.max(summary?.requests ?? 0, summary?.offers_returned ?? 0, summary?.paid_conversions ?? 0, 1);

  return (
    <main className="min-h-screen bg-surface-page px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {/* Hero — the one message */}
        <header className="flex flex-col gap-4">
          <a
            href="/"
            className="flex w-fit items-center gap-1.5 text-sm text-text-3 transition-colors hover:text-text-1"
          >
            <ArrowLeft className="size-4" />
            Back to demo
          </a>
          <Badge className="w-fit">Merchant dashboard · {demoMerchantId}</Badge>
          <h1 className="display max-w-3xl text-3xl font-semibold leading-tight text-text-1 sm:text-4xl">
            Privy identity is the conversion engine.
          </h1>
          <p className="max-w-2xl text-sm text-text-2 sm:text-base">
            The same merchant API call converts and earns more once a caller links their identity through Privy.
            Pure wallet callers pay base price; verified and repeat buyers convert higher and spend more — without the merchant ever seeing a raw handle.
          </p>
        </header>

        {error ? (
          <Card className="border-danger bg-danger-soft">
            <CardContent className="p-4 text-sm text-danger">{error}</CardContent>
          </Card>
        ) : null}

        {/* Headline proof — three stats, all serving the identity story */}
        <section className="grid gap-4 sm:grid-cols-3">
          <HeadlineStat
            value={cvrMultiple ? `${cvrMultiple.toFixed(1)}×` : "—"}
            label="Verified conversion uplift"
            hint="verified user vs pure wallet CVR"
          />
          <HeadlineStat
            value={summary?.estimated_revenue_lift ?? "0%"}
            label="Revenue lift"
            hint="from discounts, bundles & upsells"
          />
          <HeadlineStat
            value={arpuMultiple ? `${arpuMultiple.toFixed(1)}×` : "—"}
            label="Verified ARPU uplift"
            hint="revenue per verified user vs pure wallet"
          />
        </section>

        {/* THE STAR — identity raises both conversion and value */}
        <Card>
          <CardHeader>
            <CardTitle>Identity raises conversion and value</CardTitle>
            <CardDescription>
              As a caller&apos;s identity strengthens through Privy, both conversion rate and revenue per user climb.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="mb-3 hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 px-1 text-xs font-medium uppercase tracking-wide text-text-3 sm:grid">
              <span>Segment</span>
              <span>Conversion rate</span>
              <span>ARPU (USDC)</span>
            </div>
            {segments.length === 0 ? (
              <p className="text-sm text-text-3">No segment data yet.</p>
            ) : (
              segments.map((segment, index) => (
                <SegmentRow
                  key={segment.segment}
                  rank={index + 1}
                  label={formatLabel(segment.segment)}
                  cvr={segment.conversion_rate}
                  cvrMax={cvrMax}
                  arpu={parseNum(segment.arpu)}
                  arpuRaw={segment.arpu}
                  arpuMax={arpuMax}
                  highlight={HIGHLIGHT_SEGMENTS.has(segment.segment)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Retention — borrowed from API Growth, reframed around identity (demo data) */}
        <Card>
          <CardHeader>
            <CardTitle>Stronger identity, stronger retention</CardTitle>
            <CardDescription>
              Share of paid callers who return in each following week. Demo data — verified and repeat buyers stay far longer than pure wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="mb-2 grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-text-3">
              <span>Cohort</span>
              <span className="text-center">W1</span>
              <span className="text-center">W2</span>
              <span className="text-center">W3</span>
            </div>
            {DEMO_RETENTION.map((cohort) => (
              <div key={cohort.segment} className="grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))] items-center gap-2 px-1 py-1">
                <span className="text-sm text-text-1">{formatLabel(cohort.segment)}</span>
                {([["w1", cohort.week1], ["w2", cohort.week2], ["w3", cohort.week3]] as const).map(([key, value]) => (
                  <RetentionCell key={key} value={value} />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* How it shows up in revenue — secondary */}
        <Card>
          <CardHeader>
            <CardTitle>How it shows up in revenue</CardTitle>
            <CardDescription>Verified callers move through the funnel and trigger Flovia&apos;s monetization paths.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="flex items-stretch gap-2">
              <FunnelStep label="Requests" value={summary?.requests ?? 0} max={funnelMax} />
              <FunnelArrow />
              <FunnelStep label="Offers" value={summary?.offers_returned ?? 0} max={funnelMax} />
              <FunnelArrow />
              <FunnelStep label="Paid" value={summary?.paid_conversions ?? 0} max={funnelMax} accent />
              <FunnelArrow />
              <FunnelStep label="Revenue" value={`${summary?.revenue_usdc ?? "0.00"}`} suffix="USDC" />
            </div>
            <div className="grid grid-cols-3 gap-3 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <Driver label="Discount conv." value={summary?.discount_conversions ?? 0} />
              <Driver label="Bundle conv." value={summary?.bundle_conversions ?? 0} />
              <Driver label="Premium upsells" value={summary?.premium_upsells ?? 0} />
            </div>
          </CardContent>
        </Card>

        {/* Supporting breakdowns — tertiary, compact */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Offer performance</CardTitle>
              <CardDescription>Which incentive actually moved buyers.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer</TableHead>
                    <TableHead className="text-right">Selected / Shown</TableHead>
                    <TableHead className="text-right">CVR</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.offer_performance ?? []).map((offer) => (
                    <TableRow key={offer.offer}>
                      <TableCell className="font-medium">{formatLabel(offer.offer)}</TableCell>
                      <TableCell className="text-right tabular-nums">{offer.selected} / {offer.shown}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPct(offer.conversion_rate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{offer.revenue} USDC</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source channel performance</CardTitle>
              <CardDescription>Which ecosystem surfaces bring the best segments.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">CVR</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Best segment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.channels ?? []).map((row) => (
                    <TableRow key={row.channel}>
                      <TableCell className="font-medium">{row.channel}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPct(row.conversion_rate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.revenue} USDC</TableCell>
                      <TableCell className="text-text-2">{formatLabel(row.best_segment)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Footer — privacy boundary + operational escape hatch */}
        <footer className="flex flex-col items-start justify-between gap-3 border-t pt-5 text-sm text-text-3 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-success" />
            Merchant sees normalized segments only — never raw X / GitHub handles.
          </span>
          <Button asChild variant="outline">
            <a href="/dashboard/requests">Open full request log</a>
          </Button>
        </footer>
      </div>
    </main>
  );
}

type Segment = DashboardData["segments"][number];

// Demo retention by identity cohort (W1/W2/W3 return share). Ascending with
// identity strength — the point of the section.
const DEMO_RETENTION = [
  { segment: "wallet_only_privy_user", week1: 0.42, week2: 0.28, week3: 0.19 },
  { segment: "verified_privy_user", week1: 0.69, week2: 0.55, week3: 0.43 },
  { segment: "repeat_privy_buyer", week1: 0.81, week2: 0.7, week3: 0.62 },
];

function RetentionCell({ value }: { value: number }) {
  // Single-accent heat ramp: more retention -> more opaque primary.
  const alpha = 0.08 + value * 0.84;
  const strong = value >= 0.5;
  return (
    <span
      className="mono inline-flex min-h-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums"
      style={{ background: `rgba(47, 90, 130, ${alpha})`, color: strong ? "#ffffff" : "var(--text-2)" }}
    >
      {formatPct(value)}
    </span>
  );
}

function HeadlineStat({ value, label, hint }: { value: string; label: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="display text-4xl font-semibold text-primary">{value}</p>
        <p className="mt-2 text-sm font-medium text-text-1">{label}</p>
        <p className="mt-1 text-xs text-text-3">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SegmentRow({
  rank,
  label,
  cvr,
  cvrMax,
  arpu,
  arpuRaw,
  arpuMax,
  highlight,
}: {
  rank: number;
  label: string;
  cvr: number;
  cvrMax: number;
  arpu: number;
  arpuRaw: string;
  arpuMax: number;
  highlight: boolean;
}) {
  const bar = highlight ? "bg-primary" : "bg-text-mute/40";
  return (
    <div className="grid items-center gap-4 rounded-lg px-1 py-2.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex items-center gap-2">
        <span className="mono text-xs text-text-mute">{rank}</span>
        <span className={highlight ? "font-medium text-text-1" : "text-text-2"}>{label}</span>
      </div>
      <Meter value={formatPct(cvr)} share={cvr / cvrMax} bar={bar} />
      <Meter value={`${arpuRaw}`} share={arpu / arpuMax} bar={bar} />
    </div>
  );
}

function Meter({ value, share, bar }: { value: string; share: number; bar: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(4, Math.min(100, share * 100))}%` }} />
      </div>
      <span className="mono w-14 shrink-0 text-right text-xs text-text-1">{value}</span>
    </div>
  );
}

function FunnelStep({ label, value, max, accent, suffix }: { label: string; value: string | number; max?: number; accent?: boolean; suffix?: string }) {
  const share = typeof value === "number" && max ? Math.max(8, (value / max) * 100) : 100;
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex h-16 flex-col justify-end rounded-lg border bg-surface-subtle p-2">
        <div className={`rounded ${accent ? "bg-primary" : "bg-text-mute/30"}`} style={{ height: `${share}%`, minHeight: 6 }} />
      </div>
      <div>
        <p className="mono text-sm text-text-1">{value}{suffix ? <span className="ml-1 text-xs text-text-3">{suffix}</span> : null}</p>
        <p className="text-xs text-text-3">{label}</p>
      </div>
    </div>
  );
}

function FunnelArrow() {
  return (
    <div className="flex h-16 items-center">
      <ArrowRight className="size-4 text-text-mute" />
    </div>
  );
}

function Driver({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-surface-subtle p-3 text-center">
      <p className="display text-2xl text-text-1">{value}</p>
      <p className="mt-1 text-xs leading-tight text-text-3">{label}</p>
    </div>
  );
}

function orderSegments(segments: Segment[]): Segment[] {
  return [...segments].sort((a, b) => {
    const ai = SEGMENT_ORDER.indexOf(a.segment);
    const bi = SEGMENT_ORDER.indexOf(b.segment);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function ratio(a?: number, b?: number): number | null {
  if (a === undefined || b === undefined || !b) return null;
  return a / b;
}

function parseNum(value?: string): number {
  const n = Number.parseFloat(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatLabel(value: string) {
  return LABEL_OVERRIDES[value] ?? value.replaceAll("_", " ");
}
