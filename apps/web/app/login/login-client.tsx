"use client";

import { useMemo } from "react";
import { Link2, LogOut, Mail, SquareCode, X } from "lucide-react";
import { useLinkAccount, useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LinkedAccountLike = {
  type?: string;
  address?: string;
  email?: string;
  username?: string;
  name?: string;
};

function accountLabel(account: LinkedAccountLike) {
  return account.email ?? account.username ?? account.name ?? account.address ?? account.type ?? "linked";
}

export function LoginClient() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { linkGithub, linkTwitter } = useLinkAccount();

  const linkedAccounts = useMemo(
    () => (user?.linkedAccounts ?? []) as LinkedAccountLike[],
    [user?.linkedAccounts],
  );

  return (
    <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <Badge className="w-fit">Privy</Badge>
          <CardTitle className="display text-3xl">Login</CardTitle>
          <CardDescription>Sign in with email, X, or GitHub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!ready ? (
            <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-3">
              Initializing Privy.
            </div>
          ) : null}

          {authenticated ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-surface-subtle p-3">
                <p className="text-xs font-medium uppercase text-text-mute">Signed in</p>
                <p className="mt-1 break-all text-sm text-text-2">
                  {user?.email?.address ?? user?.id ?? "Privy user"}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={logout} className="w-full">
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                type="button"
                className="w-full"
                onClick={() => login({ loginMethods: ["email", "twitter", "github"] })}
                disabled={!ready}
              >
                <Mail className="size-4" />
                Open Privy Login
              </Button>
              <div className="flex flex-wrap gap-2">
                <Badge>Email</Badge>
                <Badge>
                  <X className="mr-1 size-3" />
                  X
                </Badge>
                <Badge>
                  <SquareCode className="mr-1 size-3" />
                  GitHub
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge className="w-fit">
            <Link2 className="mr-1 size-3" />
            Link account
          </Badge>
          <CardTitle className="display text-3xl">Accounts</CardTitle>
          <CardDescription>Link GitHub or X to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={linkGithub} disabled={!ready || !authenticated}>
              <SquareCode className="size-4" />
              Link GitHub
            </Button>
            <Button type="button" onClick={linkTwitter} disabled={!ready || !authenticated}>
              <X className="size-4" />
              Link X
            </Button>
          </div>

          <div className="rounded-lg border bg-surface-subtle p-3">
            <p className="text-xs font-medium uppercase text-text-mute">Linked accounts</p>
            {linkedAccounts.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {linkedAccounts.map((account, index) => (
                  <Badge key={`${account.type ?? "account"}-${accountLabel(account)}-${index}`}>
                    {account.type}: {accountLabel(account)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-3">No linked accounts</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
