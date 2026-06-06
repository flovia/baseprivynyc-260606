"use client";

import { useActionState, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowRight, BadgeCheck, Bot, CreditCard, LinkIcon, Play, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentDemoAction, AgentDemoState, JsonObject } from "./demo-types";

const steps = [
  ["1", "Privy user", "Login here. No page jump."],
  ["2", "Agent policy", "Authorize budget and scope."],
  ["3", "Merchant 402", "See the personalized offer."],
  ["4", "Dashboard", "Confirm conversion impact."],
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

function floviaOffer(state: AgentDemoState): JsonObject | null {
  const offer = objectValue(state.offerResponse, "flovia");
  return offer && typeof offer === "object" && !Array.isArray(offer) ? offer as JsonObject : null;
}

function paymentRequirement(state: AgentDemoState): JsonObject | null {
  const first = arrayValue(state.offerResponse, "accepts")[0];
  return first && typeof first === "object" && !Array.isArray(first) ? first as JsonObject : null;
}

function walletAddress(user: ReturnType<typeof usePrivy>["user"]): string {
  if (user?.wallet?.address) return user.wallet.address;
  const wallet = user?.linkedAccounts?.find((account) => account.type === "wallet" || account.type === "smart_wallet");
  return wallet && "address" in wallet && typeof wallet.address === "string" ? wallet.address : "";
}

function linkedAccountTypes(user: ReturnType<typeof usePrivy>["user"]): string[] {
  return user?.linkedAccounts?.map((account) => account.type) ?? [];
}

function activeStep(state: AgentDemoState): string {
  if (state.status === "paid") return "4";
  if (state.status === "offer") return "3";
  if (state.authorized) return "2";
  return "1";
}

function DemoActionButton({ intent, children, variant, disabled }: Readonly<{
  intent: string;
  children: ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
}>) {
  return (
    <Button type="submit" name="intent" value={intent} variant={variant} disabled={disabled}>
      {children}
    </Button>
  );
}

export function AgentDemoClient({ action, initialState }: Readonly<{
  action: AgentDemoAction;
  initialState: AgentDemoState;
}>) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const privy = usePrivy();
  const privyWallet = walletAddress(privy.user);
  const privyLinked = linkedAccountTypes(privy.user);
  const [walletInput, setWalletInput] = useState(state.wallet);
  const [budgetInput, setBudgetInput] = useState(state.budget);
  const [endpointInput, setEndpointInput] = useState(state.endpoint);
  const offer = floviaOffer(state);
  const requirement = paymentRequirement(state);
  const nextOffer = objectValue(state.paidResponse, "flovia_next_offer");
  const currentStep = activeStep(state);

  useEffect(() => {
    setWalletInput(state.wallet);
    setBudgetInput(state.budget);
    setEndpointInput(state.endpoint);
  }, [state.wallet, state.budget, state.endpoint]);

  useEffect(() => {
    if (privyWallet) setWalletInput(privyWallet);
  }, [privyWallet]);

  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <form action={formAction} className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <a href="/dashboard" className="self-end text-sm font-medium text-primary hover:underline">
            {"->"} merchant dashboard
          </a>
          <header className="rounded-xl border bg-surface-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-3 w-fit border-primary/20 bg-mesh-blue-soft text-primary">
                <Bot className="mr-1 size-3" /> Guided demo
              </Badge>
              <h1 className="display text-3xl font-semibold sm:text-4xl">Watch one agent checkout become personalized.</h1>
              <p className="mt-2 text-sm text-text-3">
                This is the main product story: a wallet-only buyer sees full price, then a verified Privy buyer gets the discounted 402 offer.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!privy.authenticated ? (
                <Button type="button" variant="outline" disabled={!privy.ready} onClick={() => privy.login()}>
                  Open Privy login
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => void privy.logout()}>
                  Logout Privy
                </Button>
              )}
            </div>
          </div>
          </header>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          {steps.map(([number, title, body]) => (
            <Card key={number} className={number === currentStep ? "border-primary/30 bg-mesh-blue-dim" : "bg-surface-card"}>
              <CardContent className="flex gap-3 p-4">
                <div className={number === currentStep ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" : "flex size-7 shrink-0 items-center justify-center rounded-full border bg-surface-card text-xs font-semibold text-text-3"}>
                  {number}
                </div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-text-3">{body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-mute">Before verification</p>
              <p className="display mt-1 text-3xl font-semibold">0.05 USDC</p>
              <p className="text-sm text-text-3">wallet-only Privy user, unlock prompt shown</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-mesh-blue-dim">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-primary">After verification</p>
              <p className="display mt-1 text-3xl font-semibold">0.025 USDC</p>
              <p className="text-sm text-text-3">email or Farcaster linked, verified_user_discount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-mute">Merchant sees</p>
              <p className="mt-1 font-medium">segment, policy, reason codes</p>
              <p className="text-sm text-text-3">no raw email, Farcaster handle, or Privy token</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-5">
            <Card className={state.status === "error" ? "border-danger bg-danger-soft" : "border-primary/20 bg-mesh-blue-dim"}>
              <CardContent className={state.status === "error" ? "p-4 text-sm text-danger" : "p-4 text-sm text-text-2"}>
                {pending ? "Working..." : state.message}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" /> 1. Privy user and agent policy</CardTitle>
                <CardDescription>Privy opens as a modal on this page. The demo wallet below is what the merchant sees.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-text-1">Privy session</p>
                      <p className="text-text-3">{privy.authenticated ? "Authenticated in this page" : "Not logged in"}</p>
                    </div>
                    {!privy.authenticated ? (
                      <Button type="button" size="sm" disabled={!privy.ready} onClick={() => privy.login()}>
                        Login with Privy
                      </Button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => privy.linkEmail()}>Privy link email</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => privy.linkFarcaster()}>Privy link Farcaster</Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p><span className="text-text-mute">Privy DID:</span> {privy.user?.id ?? "-"}</p>
                    <p><span className="text-text-mute">Privy wallet:</span> {privyWallet || "-"}</p>
                    <p className="sm:col-span-2"><span className="text-text-mute">Privy linked:</span> {privyLinked.length ? privyLinked.join(", ") : "-"}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-text-3">Demo agent wallet</span>
                    <input name="wallet" value={walletInput} onChange={(event) => setWalletInput(event.target.value)} className="w-full rounded-md border bg-surface-card px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-text-3">Budget</span>
                    <input name="budget" value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} className="w-full rounded-md border bg-surface-card px-3 py-2 text-sm" />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Authorization</p>
                    <p className="mt-1 font-medium">{state.authorized ? "authorized" : "not authorized"}</p>
                  </div>
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Identity</p>
                    <p className="mt-1 font-medium">{state.identityConfidence}</p>
                  </div>
                  <div className="rounded-lg border bg-surface-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-mute">Linked</p>
                    <p className="mt-1 font-medium">{state.linkedAccounts.length ? state.linkedAccounts.join(", ") : "wallet only"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DemoActionButton intent="authorize" disabled={pending}>
                    <BadgeCheck className="size-4" /> Authorize agent
                  </DemoActionButton>
                  <DemoActionButton intent="link-email" variant="outline" disabled={pending || !state.authorized}>
                    <LinkIcon className="size-4" /> Link email
                  </DemoActionButton>
                  <DemoActionButton intent="link-farcaster" variant="outline" disabled={pending || !state.authorized}>
                    <LinkIcon className="size-4" /> Link Farcaster
                  </DemoActionButton>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Play className="size-4 text-primary" /> 2. Merchant request and retry</CardTitle>
                <CardDescription>Call once as wallet-only, link an account, then call again to show the price change.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="space-y-1 text-sm">
                  <span className="text-text-3">Endpoint</span>
                  <select name="endpoint" value={endpointInput} onChange={(event) => setEndpointInput(event.target.value)} className="w-full rounded-md border bg-surface-card px-3 py-2 text-sm">
                    <option value="/api/premium-signal">GET /api/premium-signal</option>
                    <option value="/api/basic-signal">GET /api/basic-signal</option>
                    <option value="/api/premium-signal-plus">GET /api/premium-signal-plus</option>
                  </select>
                </label>

                <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
                  <p><span className="text-text-mute">Header:</span> x-agent-wallet = {walletInput}</p>
                  <p><span className="text-text-mute">Header:</span> x-agent-budget = {budgetInput}</p>
                  <p><span className="text-text-mute">Category:</span> {state.category}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DemoActionButton intent="call-merchant" disabled={pending || !state.authorized}>
                    Call merchant API <ArrowRight className="size-4" />
                  </DemoActionButton>
                  <DemoActionButton intent="simulate-payment" variant="secondary" disabled={pending || !offer}>
                    <CreditCard className="size-4" /> Simulate payment
                  </DemoActionButton>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="sticky top-5 space-y-4 rounded-xl border bg-surface-card p-4 shadow-2">
            <div>
              <Badge className="mb-2 w-fit border-primary/20 bg-mesh-blue-soft text-primary">Offer inspector</Badge>
              <h2 className="display text-2xl font-semibold">Current checkout state</h2>
              <p className="mt-1 text-sm text-text-3">You are on step {currentStep}. This rail keeps context visible while actions happen on the left.</p>
            </div>

            <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
              <p className="font-medium text-text-1">Relationship map</p>
              <p className="mt-1">Privy user {"->"} authorized agent {"->"} merchant 402 {"->"} dashboard event</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-surface-subtle p-3">
                <p className="text-xs uppercase tracking-wide text-text-mute">Base</p>
                <p className="display mt-1 text-2xl font-semibold">{offer ? stringValue(offer, "base_price") : "0.05"}</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-mesh-blue-dim p-3">
                <p className="text-xs uppercase tracking-wide text-primary">Final</p>
                <p className="display mt-1 text-2xl font-semibold">{offer ? stringValue(offer, "final_price") : "-"}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
              <p><span className="text-text-mute">Policy:</span> {offer ? stringValue(offer, "policy") : "waiting_for_402"}</p>
              <p><span className="text-text-mute">Type:</span> {offer ? stringValue(offer, "type") : "-"}</p>
              <p><span className="text-text-mute">Reasons:</span> {offer ? arrayValue(offer, "reason_codes").join(", ") || "-" : "-"}</p>
            </div>

            {offer && objectValue(offer, "unlock") ? (
              <div className="rounded-lg border border-warn/20 bg-warn-soft p-3 text-sm text-text-2">
                Link email or Farcaster to unlock {stringValue(objectValue(offer, "unlock"), "target_final_price")} USDC.
              </div>
            ) : null}

            <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
              <p className="mb-1 font-medium text-text-1">x402 accepts[0]</p>
              {requirement ? (
                <>
                  <p><span className="text-text-mute">Scheme:</span> {stringValue(requirement, "scheme")}</p>
                  <p><span className="text-text-mute">Network:</span> {stringValue(requirement, "network")}</p>
                  <p><span className="text-text-mute">Atomic:</span> {stringValue(requirement, "maxAmountRequired")}</p>
                  <p><span className="text-text-mute">Pay to:</span> {stringValue(requirement, "payTo")}</p>
                </>
              ) : <p className="text-text-3">No payment requirement yet.</p>}
            </div>

            <div className="rounded-lg border bg-surface-subtle p-3 text-sm text-text-2">
              <p className="mb-1 font-medium text-text-1">Paid response</p>
              {state.paidResponse ? (
                <>
                  <p><span className="text-text-mute">Signal:</span> {stringValue(state.paidResponse, "signal")}</p>
                  <p><span className="text-text-mute">Confidence:</span> {String(objectValue(state.paidResponse, "confidence") ?? "-")}</p>
                  {nextOffer && typeof nextOffer === "object" && !Array.isArray(nextOffer) ? (
                    <p className="mt-2 text-text-3">Next: {stringValue(nextOffer, "title")}</p>
                  ) : null}
                </>
              ) : <p className="text-text-3">No paid response yet.</p>}
            </div>
          </aside>
        </section>
      </form>
    </main>
  );
}
