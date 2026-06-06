import { BarChart3, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoMerchantId, fetchDashboard, floviaApiUrl, textValue } from "@/lib/flovia";

export default async function DashboardPage() {
  const { data, error } = await fetchDashboard();
  const summary = data?.summary;

  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-xl border bg-surface-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="mb-2 w-fit">Merchant dashboard</Badge>
            <h1 className="display text-3xl font-semibold">{demoMerchantId}</h1>
            <p className="text-sm text-text-3">Live data from the Flovia dashboard API when available.</p>
          </div>
          <Button asChild variant="outline">
            <a href={`${floviaApiUrl}/v1/merchants/${demoMerchantId}/dashboard`}>
              API JSON <ExternalLink className="size-4" />
            </a>
          </Button>
        </header>

        {error ? <Card className="border-danger bg-danger-soft"><CardContent className="p-4 text-sm text-danger">{error}</CardContent></Card> : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Requests", summary?.requests ?? 0, "offers returned " + (summary?.offers_returned ?? 0)],
            ["Paid conversions", summary?.paid_conversions ?? 0, "discounts " + (summary?.discount_conversions ?? 0)],
            ["Revenue", `$${summary?.revenue_usdc ?? "0.00"}`, "settled payments only"],
            ["Revenue lift", summary?.estimated_revenue_lift ?? "0%", "demo estimate"],
          ].map(([label, value, detail]) => (
            <Card key={label}>
              <CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="display text-3xl">{value}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-text-3">{detail}</p></CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4" /> Recent requests</CardTitle>
              <CardDescription>API-backed request/event rows.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Wallet</TableHead><TableHead>Endpoint</TableHead><TableHead>Price</TableHead><TableHead>Offer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(data?.recent_requests ?? []).map((row, index) => (
                    <TableRow key={`${textValue(row.request_id, String(index))}-${index}`}>
                      <TableCell className="whitespace-nowrap">{textValue(row.time)}</TableCell>
                      <TableCell className="whitespace-nowrap">{textValue(row.wallet)}</TableCell>
                      <TableCell>{textValue(row.endpoint)}</TableCell>
                      <TableCell>${textValue(row.final_price, "0.00")}</TableCell>
                      <TableCell>{textValue(row.offer_type)}</TableCell>
                      <TableCell>{textValue(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Segments</CardTitle><CardDescription>Conversion and ARPU by buyer segment.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {(data?.segments ?? []).map((segment) => (
                <div key={segment.segment} className="rounded-lg border bg-surface-subtle p-3">
                  <p className="font-medium">{segment.segment}</p>
                  <p className="text-sm text-text-3">{segment.requests} requests, {(segment.conversion_rate * 100).toFixed(0)}% conversion, ARPU ${segment.arpu}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}
