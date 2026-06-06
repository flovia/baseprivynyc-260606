"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ArrowRight, CheckCircle2, CreditCard, LogOut, PlugZap, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomeAction, HomeState, JsonObject } from "./home-types";

const endpoints = [
  { method: "GET", path: "/api/premium-signal", label: "Premium signal", detail: "Personalized 402 offer" },
  { method: "GET", path: "/api/basic-signal", label: "Basic signal", detail: "Base price response" },
  { method: "GET", path: "/api/premium-signal-plus", label: "Premium signal plus", detail: "Higher value endpoint" },
];

function objectValue(input: unknown, key: string): unknown {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as JsonObject)[key] : undefined;
}

function stringValue(input: unknown, key: string, fallback = "-"): string {
  const value = objectValue(input, key);
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function arrayValue(input: unknown, key: string): unknown[] {
  const value = objectValue(input, key);
  return Array.isArray(value) ? value : [];
}

function walletAddress(user: ReturnType<typeof usePrivy>["user"]): string {
  if (user?.wallet?.address) return user.wallet.address;
  const wallet = user?.linkedAccounts?.find((account) => account.type === "wallet" || account.type === "smart_wallet");
  return wallet && "address" in wallet && typeof wallet.address === "string" ? wallet.address : "";
}

function linkedAccountTypes(user: ReturnType<typeof usePrivy>["user"]): string[] {
  return user?.linkedAccounts?.map((account) => account.type) ?? [];
}

function shortAddress(address: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";
}

function formatEthBalance(hexBalance: string): string {
  const wei = BigInt(hexBalance);
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fraction} ETH`;
}

function StepBadge({ n }: Readonly<{ n: number }>) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

function ConfigRequired() {
  return (
    <main className="min-h-screen bg-surface-page px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <Badge className="w-fit">Configuration required</Badge>
          <CardTitle className="display text-3xl">Privy is not configured</CardTitle>
          <CardDescription>Set NEXT_PUBLIC_PRIVY_APP_ID and restart the web server.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function PrivyHomeClient({ action, initialState }: Readonly<{
  action: HomeAction;
  initialState: HomeState;
}>) {
  const privy = usePrivy();
  const { wallets } = useWallets();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [endpointInput, setEndpointInput] = useState(state.endpoint);
  const [budgetInput, setBudgetInput] = useState(state.budget);
  const [balance, setBalance] = useState("-");
  const [balanceStatus, setBalanceStatus] = useState("Not connected");
  const privyWallet = walletAddress(privy.user);
  const linked = linkedAccountTypes(privy.user);
  const activeWallet = useMemo(
    () => wallets.find((wallet) => wallet.address.toLowerCase() === privyWallet.toLowerCase()) ?? wallets[0],
    [privyWallet, wallets],
  );
  const offer = objectValue(state.offerResponse, "flovia");
  const accepts = arrayValue(state.offerResponse, "accepts");
  const requirement = accepts[0] && typeof accepts[0] === "object" && !Array.isArray(accepts[0]) ? accepts[0] as JsonObject : null;
  const selectedEndpoint = endpoints.find((endpoint) => endpoint.path === endpointInput) ?? endpoints[0];
  const canRequest = privy.ready && privy.authenticated && Boolean(privyWallet);

  useEffect(() => {
    setEndpointInput(state.endpoint);
    setBudgetInput(state.budget);
  }, [state.endpoint, state.budget]);

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      if (!activeWallet) {
        setBalance("-");
        setBalanceStatus(privy.authenticated ? "Wallet not connected" : "Not connected");
        return;
      }

      try {
        setBalanceStatus("Loading balance");
        const provider = await activeWallet.getEthereumProvider();
        const hexBalance = await provider.request({ method: "eth_getBalance", params: [activeWallet.address, "latest"] });
        if (!cancelled && typeof hexBalance === "string") {
          setBalance(formatEthBalance(hexBalance));
          setBalanceStatus("Connected");
        }
      } catch {
        if (!cancelled) {
          setBalance("-");
          setBalanceStatus("Balance unavailable");
        }
      }
    }

    void loadBalance();
    return () => {
      cancelled = true;
    };
  }, [activeWallet, privy.authenticated]);

  return (
    <main className="min-h-screen bg-surface-page px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <form action={formAction} className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3 rounded-lg border bg-surface-card p-5">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Flovia" width={40} height={40} className="rounded-md" />
            <h1 className="display text-3xl font-semibold text-text-1 sm:text-4xl">Flovia</h1>
          </div>
          <a href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Merchant dashboard
            <ArrowRight className="size-4" />
          </a>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="size-5 text-primary" />
                  Wallet
                </CardTitle>
                <CardDescription>Privy session, balance, and request context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border bg-surface-subtle p-3">
                  <Image src="/privy-square.svg" alt="Privy" width={36} height={36} className="rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-1">{privy.authenticated ? "Privy authenticated" : "Privy not logged in"}</p>
                    <p className="truncate text-sm text-text-3">{privy.user?.id ?? "Login to create or connect a wallet."}</p>
                  </div>
                </div>

                {!privy.authenticated ? (
                  <Button type="button" className="w-full" disabled={!privy.ready} onClick={() => privy.login({ loginMethods: ["email", "twitter", "github"] })}>
                    Login with Privy
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => void privy.logout()}>
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                )}

                <div className="space-y-3">
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Connection</p>
                    <p className="mt-1 flex items-center gap-2 font-medium">
                      <span className={canRequest ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-text-mute"} />
                      {privy.ready ? (privy.authenticated ? "Connected" : "Disconnected") : "Loading"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Balance</p>
                    <p className="mt-1 font-medium">{balance}</p>
                    <p className="text-xs text-text-3">{balanceStatus}</p>
                  </div>
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Account</p>
                    <p className="mt-1 break-all font-medium">{privyWallet || "-"}</p>
                    <p className="text-xs text-text-3">{linked.length ? linked.join(", ") : "No linked account yet"}</p>
                  </div>
                  <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Request context</p>
                    <p className="mt-2"><span className="text-text-mute">Endpoint:</span> {selectedEndpoint.method} {endpointInput}</p>
                    <p><span className="text-text-mute">Wallet:</span> {shortAddress(privyWallet)}</p>
                    <p><span className="text-text-mute">Budget:</span> {budgetInput}</p>
                  </div>
                </div>

                <input type="hidden" name="wallet" value={privyWallet} />
                <input type="hidden" name="endpoint" value={endpointInput} />
                <input type="hidden" name="budget" value={budgetInput} />
              </CardContent>
            </Card>
          </aside>

          <div className="flex flex-col gap-5">
            <p className={state.status === "error" ? "rounded-lg border border-danger/20 bg-danger-soft p-4 text-sm text-danger" : "rounded-lg border border-primary/20 bg-mesh-blue-dim p-4 text-sm text-text-2"}>
              {state.message}
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StepBadge n={1} />
                  <PlugZap className="size-5 text-primary" />
                  Request
                </CardTitle>
                <CardDescription>Pick an endpoint, then send the actual Privy-wallet request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {endpoints.map((endpoint) => (
                    <label key={endpoint.path} className={endpoint.path === endpointInput ? "rounded-lg border border-primary/30 bg-mesh-blue-dim p-3" : "rounded-lg border bg-surface-subtle p-3"}>
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="endpoint-choice"
                          value={endpoint.path}
                          checked={endpoint.path === endpointInput}
                          onChange={() => setEndpointInput(endpoint.path)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-text-1">{endpoint.label}</p>
                          <p className="mt-0.5 text-xs text-text-3"><span className="mono">{endpoint.method} {endpoint.path}</span></p>
                          <p className="text-xs text-text-3">{endpoint.detail}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <label className="block space-y-1 text-sm">
                  <span className="text-text-3">Budget</span>
                  <input value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} className="w-full rounded-md border bg-surface-card px-3 py-2 text-sm" />
                </label>

                <Button type="submit" name="intent" value="call-merchant" disabled={pending || !canRequest}>
                  {pending ? "Sending..." : "Send request with Privy"}
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StepBadge n={2} />
                  Offer response
                </CardTitle>
                <CardDescription>HTTP 402 offer context returned by the merchant API.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-text-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Base</p>
                    <p className="mt-1 font-medium text-text-1">{offer ? stringValue(offer, "base_price") : "-"}</p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-mesh-blue-dim p-3">
                    <p className="text-xs uppercase tracking-wide text-primary">Final</p>
                    <p className="mt-1 font-medium text-text-1">{offer ? stringValue(offer, "final_price") : "-"}</p>
                  </div>
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Policy</p>
                    <p className="mt-1 font-medium text-text-1">{offer ? stringValue(offer, "policy") : "-"}</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-surface-subtle p-3">
                  <p><span className="text-text-mute">Reason codes:</span> {offer ? arrayValue(offer, "reason_codes").join(", ") || "-" : "-"}</p>
                  <p><span className="text-text-mute">x402 amount:</span> {requirement ? stringValue(requirement, "maxAmountRequired") : "-"}</p>
                  <p><span className="text-text-mute">Network:</span> {requirement ? stringValue(requirement, "network") : "-"}</p>
                </div>
                <Button type="submit" name="intent" value="simulate-payment" variant="secondary" disabled={pending || !offer}>
                  <CreditCard className="size-4" />
                  Simulate payment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StepBadge n={3} />
                  <CheckCircle2 className="size-5 text-primary" />
                  Paid response
                </CardTitle>
                <CardDescription>Result after the simulated x402 payment flow.</CardDescription>
              </CardHeader>
              <CardContent className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
                {state.paidResponse ? (
                  <>
                    <p><span className="text-text-mute">Signal:</span> {stringValue(state.paidResponse, "signal")}</p>
                    <p><span className="text-text-mute">Confidence:</span> {String(objectValue(state.paidResponse, "confidence") ?? "-")}</p>
                  </>
                ) : (
                  <p>No paid response yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </main>
  );
}

export function HomeClient({ action, configured, initialState }: Readonly<{
  action: HomeAction;
  configured: boolean;
  initialState: HomeState;
}>) {
  if (!configured) return <ConfigRequired />;
  return <PrivyHomeClient action={action} initialState={initialState} />;
}
