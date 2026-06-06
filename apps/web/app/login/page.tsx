import { publicAuthConfig } from "@flovia-baseprivynyc/config";
import { floviaApiUrl } from "@/lib/flovia";
import { PrivyLoginClient } from "./privy-login-client";

async function syncPrivyUser(_state: { ok: boolean; message: string }, formData: FormData) {
  "use server";
  const identityToken = String(formData.get("identity_token") ?? "");
  const wallet = String(formData.get("wallet") ?? "");
  if (!identityToken) return { ok: false, message: "Missing Privy identity token." };
  if (!wallet) return { ok: false, message: "Connect or create a wallet before syncing." };

  const response = await fetch(`${floviaApiUrl}/v1/auth/privy/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity_token: identityToken, wallet }),
  });
  const body = await response.json().catch(() => null) as { identityConfidence?: string; error?: string } | null;
  if (!response.ok) return { ok: false, message: body?.error ?? `Sync failed with ${response.status}.` };
  return { ok: true, message: `Synced as ${body?.identityConfidence ?? "Privy user"}.` };
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <PrivyLoginClient configured={Boolean(publicAuthConfig.privyAppId)} syncAction={syncPrivyUser} />
    </main>
  );
}
