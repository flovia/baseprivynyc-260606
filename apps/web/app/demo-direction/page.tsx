import { ArrowRight, BarChart3, CheckCircle2, Code2, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const storySteps = [
  "Merchant integrates Flovia SDK",
  "End user calls merchant API with a Privy wallet",
  "Wallet-only user receives normal x402 price",
  "User links X or GitHub through Privy",
  "Same API call returns a better price and recommendation",
  "Merchant dashboard shows conversion and lift",
];

const sdkSnippet = `app.get("/api/premium-signal", floviaAdaptive402(handler, {
  endpoint: "/api/premium-signal",
  basePrice: "0.05",
  category: "premium_signal",
  paymentMode: "x402",
  nextOffer: {
    endpoint: "/api/premium-signal-plus",
    type: "starter_upsell"
  }
}));`;

const personas = [
  {
    title: "Wallet-only API call",
    label: "Before linking",
    segment: "wallet_only_privy_user",
    basePrice: "0.05 USDC",
    finalPrice: "0.05 USDC",
    policy: "base_price_until_verified",
    reasonCodes: "low_identity_confidence",
    note: "Unlock: link X or GitHub to unlock verified_user_discount",
  },
  {
    title: "Verified API call",
    label: "After linking",
    segment: "verified_privy_user",
    basePrice: "0.05 USDC",
    finalPrice: "0.025 USDC",
    policy: "verified_user_discount",
    reasonCodes: "verified_privy_user",
    note: "Recommendation: /api/premium-signal-plus as starter_upsell",
  },
];

const responseCards = [
  {
    title: "402 offer response",
    icon: CreditCard,
    items: ["base_price", "final_price", "policy", "reason_codes", "discount unlock condition"],
  },
  {
    title: "Paid response recommendation",
    icon: CheckCircle2,
    items: ["recommended_next_api", "recommendation_type", "next price", "reason codes"],
  },
  {
    title: "Dashboard summary expansion",
    icon: BarChart3,
    items: ["Requests", "Offers Returned", "Paid Conv.", "Revenue", "Revenue Lift", "Discount Conv.", "Bundle Conv.", "Premium Upsells"],
  },
];

export default function DemoDirectionPage() {
  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="grid gap-5 rounded-xl border bg-surface-card p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <Badge className="mb-3 w-fit">Priority 1 direction</Badge>
            <h1 className="display text-3xl font-semibold text-text-1 sm:text-5xl">Frontend demo story for Base / Privy</h1>
            <p className="mt-4 max-w-3xl text-sm text-text-2 sm:text-base">
              This page explains the first-pass UI direction without changing the live request console. The goal is to make one product story legible before adding richer analytics.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-lg border bg-surface-subtle p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-mute">Demo target</p>
              <p className="mt-1 mono text-sm font-medium text-text-1">GET /api/premium-signal</p>
              <p className="mt-2 text-sm text-text-3">Same endpoint, different Privy identity confidence, better x402 offer.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm"><a href="/">Live demo</a></Button>
              <Button asChild size="sm" variant="outline"><a href="/dashboard">Dashboard</a></Button>
            </div>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Demo script</CardTitle>
            <CardDescription>The UI should read as a sequence, not as a list of implemented features.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {storySteps.map((step, index) => (
              <div key={step} className="rounded-lg border bg-surface-subtle p-3">
                <p className="mb-2 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</p>
                <p className="text-sm text-text-2">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code2 className="size-5 text-primary" /> Merchant SDK integration</CardTitle>
              <CardDescription>The first merchant-facing screen should show that integration is a wrapper around an existing endpoint.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="overflow-x-auto rounded-lg border bg-surface-subtle p-4 text-xs text-text-2"><code>{sdkSnippet}</code></pre>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-surface-subtle p-3">
                  <p className="text-xs uppercase tracking-wide text-text-mute">Merchant-visible</p>
                  <p className="mt-2 text-sm text-text-2">price, category, payment mode, next offer, policy, normalized segment</p>
                </div>
                <div className="rounded-lg border bg-surface-subtle p-3">
                  <p className="text-xs uppercase tracking-wide text-text-mute">Flovia-internal</p>
                  <p className="mt-2 text-sm text-text-2">Privy linked account values, trust scoring, identity signals, offer engine decision</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Privacy boundary</CardTitle>
              <CardDescription>The merchant should understand the value without seeing raw X or GitHub account handles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-2">
              <p className="rounded-lg border bg-surface-subtle p-3">Merchant gets normalized commercial fields: segment, final price, policy, reason codes, and recommendation metadata.</p>
              <p className="rounded-lg border bg-surface-subtle p-3">Flovia keeps identity details internal: linked account type, confidence, and decisioning signals.</p>
              <p className="rounded-lg border border-primary/20 bg-mesh-blue-dim p-3 text-primary">This keeps the demo aligned with Privy: identity improves the offer, but raw identity does not leak into the merchant dashboard.</p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary" /> Wallet-only vs verified</CardTitle>
            <CardDescription>The before / after comparison is the main end-user story.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {personas.map((persona, index) => (
              <div key={persona.segment} className={index === 1 ? "rounded-lg border border-primary/30 bg-mesh-blue-dim p-4" : "rounded-lg border bg-surface-subtle p-4"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-mute">{persona.label}</p>
                    <h2 className="mt-1 font-semibold text-text-1">{persona.title}</h2>
                    <p className="mono mt-1 text-xs text-text-3">{persona.segment}</p>
                  </div>
                  <Badge>{index === 1 ? "Discounted" : "Base price"}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-surface-card p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Base price</p>
                    <p className="mt-1 text-lg font-semibold text-text-1">{persona.basePrice}</p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-surface-card p-3">
                    <p className="text-xs uppercase tracking-wide text-primary">Final price</p>
                    <p className="display mt-1 text-3xl font-semibold text-primary">{persona.finalPrice}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-text-2"><span className="text-text-mute">Policy:</span> {persona.policy}</p>
                <p className="text-sm text-text-2"><span className="text-text-mute">Reason codes:</span> [{persona.reasonCodes}]</p>
                <p className="mt-2 text-sm text-text-3">{persona.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-5 lg:grid-cols-3">
          {responseCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" /> {card.title}</CardTitle>
                  <CardDescription>Priority 1 display fields.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {card.items.map((item) => (
                    <div key={item} className="flex items-center justify-between gap-3 rounded-lg border bg-surface-subtle px-3 py-2 text-sm">
                      <span className="text-text-2">{item}</span>
                      <ArrowRight className="size-4 text-text-mute" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </section>
    </main>
  );
}
