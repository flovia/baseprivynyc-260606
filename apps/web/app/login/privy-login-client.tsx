"use client";

import { useActionState } from "react";
import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { CheckCircle2, Link2, Mail, ShieldCheck, SquareCode, Wallet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SyncState = { ok: boolean; message: string };

type SyncAction = (state: SyncState, formData: FormData) => Promise<SyncState>;

function accountTypes(user: ReturnType<typeof usePrivy>["user"]): string[] {
  return user?.linkedAccounts?.map((account) => account.type) ?? [];
}

function walletAddress(user: ReturnType<typeof usePrivy>["user"]): string {
  if (user?.wallet?.address) return user.wallet.address;
  const wallet = user?.linkedAccounts?.find((account) => account.type === "wallet" || account.type === "smart_wallet");
  return wallet && "address" in wallet ? wallet.address : "";
}

function linkedAccountDisplay(type: string): { label: string; Icon: LucideIcon } {
  if (type === "github_oauth" || type === "github") return { label: "GitHub", Icon: SquareCode };
  if (type === "twitter_oauth" || type === "twitter") return { label: "X", Icon: X };
  if (type === "wallet" || type === "smart_wallet") return { label: "Wallet", Icon: Wallet };
  if (type === "email") return { label: "Email", Icon: Mail };
  if (type === "passkey" || type === "mfa") return { label: type, Icon: ShieldCheck };
  return { label: type, Icon: CheckCircle2 };
}

function LinkedAccountBadges({ types }: Readonly<{ types: string[] }>) {
  if (!types.length) return <p>Linked: -</p>;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span>Linked:</span>
      {types.map((type) => {
        const { label, Icon } = linkedAccountDisplay(type);
        return (
          <Badge key={type} className="gap-1">
            <Icon className="size-3" />
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

export function PrivyLoginClient({
  configured,
  syncAction,
}: Readonly<{ configured: boolean; syncAction: SyncAction }>) {
  const privy = usePrivy();
  const { identityToken } = useIdentityToken();
  const [state, formAction, pending] = useActionState(syncAction, { ok: false, message: "Not synced yet." });
  const wallet = walletAddress(privy.user);
  const linked = accountTypes(privy.user);

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <Badge className="w-fit">Configuration required</Badge>
          <CardTitle className="display text-3xl">Privy is not configured</CardTitle>
          <CardDescription>Set NEXT_PUBLIC_PRIVY_APP_ID and restart the web server.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <Badge className="w-fit">Real Privy</Badge>
          <CardTitle className="display text-3xl">Privy login</CardTitle>
          <CardDescription>Sign in with email, X, or GitHub, then sync normalized identity to Flovia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {!privy.authenticated ? (
              <Button
                type="button"
                disabled={!privy.ready}
                onClick={() => privy.login({ loginMethods: ["email", "twitter", "github"] })}
              >
                <Mail className="size-4" />
                Open Privy Login
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => void privy.logout()}>Logout</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Email</Badge>
            <Badge><X className="mr-1 size-3" />X</Badge>
            <Badge><SquareCode className="mr-1 size-3" />GitHub</Badge>
          </div>
          <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
            <p>Ready: {String(privy.ready)}</p>
            <p>Authenticated: {String(privy.authenticated)}</p>
            <p>Privy DID: {privy.user?.id ?? "-"}</p>
            <p>Wallet: {wallet || "-"}</p>
            <LinkedAccountBadges types={linked} />
          </div>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="identity_token" value={identityToken ?? ""} />
            <input type="hidden" name="wallet" value={wallet} />
            <Button type="submit" className="w-full" disabled={pending || !identityToken || !wallet}>
              {pending ? "Syncing..." : "Sync identity to Flovia"}
            </Button>
            <p className={state.ok ? "text-sm text-success" : "text-sm text-text-3"}>{state.message}</p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge className="w-fit"><Link2 className="mr-1 size-3" />Link account</Badge>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Link GitHub or X to your account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" disabled={!privy.authenticated} onClick={() => privy.linkGithub()}>
            <SquareCode className="size-4" />
            Link GitHub
          </Button>
          <Button type="button" variant="outline" disabled={!privy.authenticated} onClick={() => privy.linkTwitter()}>
            <X className="size-4" />
            Link X
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
