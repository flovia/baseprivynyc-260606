import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentPage() {
  const command = "bun run dev:agent -- --wallet 0xAgentWallet --budget 0.25 --endpoint /api/premium-signal";
  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <Badge className="w-fit"><Bot className="mr-1 size-3" /> Demo agent</Badge>
          <CardTitle className="display text-3xl">Run the local agent flow</CardTitle>
          <CardDescription>Budget and task category are sent as headers; identity is resolved server-side from the wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-surface-subtle p-3"><p className="text-sm text-text-3">Budget</p><p className="text-xl font-semibold">0.25 USDC</p></div>
            <div className="rounded-lg border bg-surface-subtle p-3"><p className="text-sm text-text-3">Category</p><p className="text-xl font-semibold">market_signal</p></div>
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-surface-subtle p-4 text-xs text-text-2"><code>{command}</code></pre>
        </CardContent>
      </Card>
    </main>
  );
}
