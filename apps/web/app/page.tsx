import { ArrowRight, BadgeCheck, Bot, CreditCard, Gauge, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const metrics = [
  { label: "Requests", value: "42", detail: "demo seed" },
  { label: "402 offers", value: "38", detail: "personalized" },
  { label: "Paid conversions", value: "21", detail: "55%" },
  { label: "Revenue lift", value: "+31%", detail: "vs fixed price" },
];

const flow = [
  { icon: Wallet, title: "Privy user", body: "Login and expose only normalized identity signals." },
  { icon: Bot, title: "Authorized agent", body: "Set category and budget before calling merchant APIs." },
  { icon: CreditCard, title: "Adaptive 402", body: "Merchant returns x402 accepts plus Flovia offer context." },
  { icon: Gauge, title: "Dashboard", body: "Track conversion, revenue, segments, and reason codes." },
];

const requests = [
  ["12:00:15", "0xabc...", "verified_privy_user", "/api/premium-signal", "$0.025", "verified_user_discount"],
  ["11:58:41", "0xdef...", "low_assurance_privy_user", "/api/premium-signal", "$0.05", "unlockable_discount"],
  ["11:54:03", "0x987...", "anonymous_wallet", "/api/basic-signal", "$0.01", "base_price"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-surface-page text-foreground">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-xl border bg-surface-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="mono text-xs uppercase tracking-[0.18em] text-text-mute">Flovia Agent Offers</p>
              <h1 className="display text-2xl font-semibold text-text-1">Personalized x402 checkout</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/login">Privy login</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/dashboard">Merchant dashboard</a>
            </Button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-[linear-gradient(135deg,var(--mesh-blue-dim),var(--teal-dim),var(--purple-dim))] p-6 sm:p-8">
              <Badge className="w-fit border-mesh-blue-soft bg-mesh-blue-soft text-mesh-blue">
                Privy-authorized agents + merchant x402 APIs
              </Badge>
              <div className="max-w-3xl space-y-3 pt-3">
                <CardTitle className="display text-4xl font-semibold leading-tight sm:text-5xl">
                  Turn every payment-required response into an agent-aware offer.
                </CardTitle>
                <CardDescription className="max-w-2xl text-base text-text-2">
                  Flovia lets merchants keep standard x402 payment requirements while returning normalized, privacy-safe offer context for Flovia-aware agents.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
              <div className="rounded-lg border bg-surface-subtle p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-mute">Anonymous</p>
                <p className="mt-2 text-2xl font-semibold">$0.05</p>
                <p className="text-sm text-text-3">base price</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-mesh-blue-dim p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Verified Privy</p>
                <p className="mt-2 text-2xl font-semibold">$0.025</p>
                <p className="text-sm text-text-3">discounted current request</p>
              </div>
              <div className="rounded-lg border bg-surface-subtle p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-mute">Next offer</p>
                <p className="mt-2 text-2xl font-semibold">Bundle</p>
                <p className="text-sm text-text-3">post-payment upsell</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-success" />
                Demo checklist
              </CardTitle>
              <CardDescription>Use these local commands after starting the API services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-lg border bg-surface-subtle p-3 text-xs text-text-2">
                <code>{"bun run dev:api\nbun run dev:merchant\nbun run dev:agent -- --budget 0.25 --privy-authorized"}</code>
              </pre>
              <Button asChild variant="secondary" className="w-full justify-between">
                <a href="http://localhost:8791/v1/merchants/merch_demo/dashboard">
                  Open dashboard JSON
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="display text-3xl">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-3">{metric.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Offer flow</CardTitle>
              <CardDescription>The MVP path follows the SPEC privacy boundary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {flow.map((item) => (
                <div key={item.title} className="flex gap-3 rounded-lg border bg-surface-subtle p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <item.icon className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-text-1">{item.title}</p>
                    <p className="text-sm text-text-3">{item.body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent requests</CardTitle>
              <CardDescription>Representative merchant dashboard rows.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Policy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((row) => (
                      <TableRow key={`${row[0]}-${row[1]}`}>
                        {row.map((cell) => (
                          <TableCell key={cell} className="whitespace-nowrap text-text-2">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}
