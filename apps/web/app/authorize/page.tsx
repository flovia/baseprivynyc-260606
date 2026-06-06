import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { floviaApiUrl } from "@/lib/flovia";

async function setAuthorization(formData: FormData) {
  "use server";
  const wallet = String(formData.get("wallet") ?? "");
  const authorized = String(formData.get("authorized") ?? "true") === "true";
  await fetch(`${floviaApiUrl}/v1/dev/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, identity_confidence: "wallet_only", authorized }),
  });
}

export default function AuthorizePage() {
  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <Badge className="w-fit">Agent authorization</Badge>
          <CardTitle className="display text-3xl">Authorize demo agent</CardTitle>
          <CardDescription>Stores local simulation authorization used by the quote API.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setAuthorization} className="space-y-3">
            <input name="wallet" defaultValue="0xAgentWallet" className="w-full rounded-md border bg-surface-card px-3 py-2 text-sm" />
            <select name="authorized" defaultValue="true" className="w-full rounded-md border bg-surface-card px-3 py-2 text-sm">
              <option value="true">authorized</option>
              <option value="false">not authorized</option>
            </select>
            <Button type="submit" className="w-full">Save authorization</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
