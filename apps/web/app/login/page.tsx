import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { floviaApiUrl } from "@/lib/flovia";

async function createWalletOnlyUser(formData: FormData) {
  "use server";
  const wallet = String(formData.get("wallet") ?? "");
  await fetch(`${floviaApiUrl}/v1/dev/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, identity_confidence: "wallet_only", authorized: true }),
  });
  revalidatePath("/login");
}

async function linkAccount(formData: FormData) {
  "use server";
  const wallet = String(formData.get("wallet") ?? "");
  const type = String(formData.get("type") ?? "email");
  await fetch(`${floviaApiUrl}/v1/dev/users/${wallet}/link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type }),
  });
  revalidatePath("/login");
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Simulation only</Badge>
            <CardTitle className="display text-3xl">Privy login stand-in</CardTitle>
            <CardDescription>Create a wallet-only Flovia user before real Privy SDK integration.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createWalletOnlyUser} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="wallet">Wallet</label>
              <input id="wallet" name="wallet" defaultValue="0xAgentWallet" className="w-full rounded-md border bg-surface-card px-3 py-2 text-sm" />
              <Button type="submit" className="w-full">Create wallet-only user</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link account</CardTitle>
            <CardDescription>Simulates email/Farcaster/passkey linking and upgrades identity confidence.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={linkAccount} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <input name="wallet" defaultValue="0xAgentWallet" className="rounded-md border bg-surface-card px-3 py-2 text-sm" />
              <select name="type" defaultValue="email" className="rounded-md border bg-surface-card px-3 py-2 text-sm">
                <option value="email">email</option>
                <option value="farcaster">farcaster</option>
                <option value="github">github</option>
                <option value="passkey">passkey</option>
                <option value="mfa">mfa</option>
              </select>
              <Button type="submit">Link</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
