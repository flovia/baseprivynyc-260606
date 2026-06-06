import { defaultConfig } from "@flovia-baseprivynyc/config";
import { AgentDemoClient } from "./demo-client";
import type { AgentDemoState, JsonObject } from "./demo-types";

const initialState: AgentDemoState = {
  wallet: "0xAgentWallet",
  budget: defaultConfig.defaultBudgetUsdc,
  category: "market_signal",
  endpoint: "/api/premium-signal",
  authorized: false,
  linkedAccounts: [],
  identityConfidence: "wallet_only",
  message: "Start by authorizing the demo agent. This uses local dev endpoints only.",
  status: "idle",
  offerResponse: null,
  paidResponse: null,
};

function formString(formData: FormData, key: string, fallback: string): string {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function objectValue(input: unknown, key: string): unknown {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as JsonObject)[key] : undefined;
}

function stringValue(input: unknown, key: string): string | undefined {
  const value = objectValue(input, key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringArrayValue(input: unknown, key: string): string[] {
  const value = objectValue(input, key);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function firstPaymentRequirement(response: JsonObject | null): JsonObject | null {
  const accepts = objectValue(response, "accepts");
  if (!Array.isArray(accepts)) return null;
  const first = accepts[0];
  return first && typeof first === "object" && !Array.isArray(first) ? first as JsonObject : null;
}

async function readJson(response: Response): Promise<JsonObject> {
  const body = await response.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body as JsonObject : {};
}

async function agentDemoAction(state: AgentDemoState, formData: FormData): Promise<AgentDemoState> {
  "use server";

  const intent = formString(formData, "intent", "");
  const wallet = formString(formData, "wallet", state.wallet);
  const budget = formString(formData, "budget", state.budget);
  const endpoint = formString(formData, "endpoint", state.endpoint);
  const nextState = { ...state, wallet, budget, endpoint };

  try {
    if (intent === "authorize") {
      const response = await fetch(`${defaultConfig.floviaApiUrl}/v1/dev/users`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, authorized: true }),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(stringValue(body, "error") ?? `Dev authorization failed with ${response.status}.`);
      return {
        ...nextState,
        authorized: true,
        linkedAccounts: stringArrayValue(body, "linkedAccountTypes"),
        identityConfidence: stringValue(body, "identityConfidence") ?? "wallet_only",
        status: "ready",
        message: "Agent authorized. Call the merchant API once as a wallet-only buyer.",
      };
    }

    if (intent === "link-email" || intent === "link-farcaster") {
      const type = intent === "link-email" ? "email" : "farcaster";
      const response = await fetch(`${defaultConfig.floviaApiUrl}/v1/dev/users/${encodeURIComponent(wallet)}/link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(stringValue(body, "error") ?? `Account link failed with ${response.status}.`);
      return {
        ...nextState,
        authorized: true,
        linkedAccounts: stringArrayValue(body, "linkedAccountTypes"),
        identityConfidence: stringValue(body, "identityConfidence") ?? nextState.identityConfidence,
        offerResponse: null,
        paidResponse: null,
        status: "ready",
        message: `${type} linked. Call the merchant API again to show the discounted verified-user offer.`,
      };
    }

    if (intent === "call-merchant") {
      const response = await fetch(`${defaultConfig.merchantApiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          "x-agent-wallet": wallet,
          "x-agent-budget": budget,
        },
        cache: "no-store",
      });
      const body = await readJson(response);
      if (response.status !== 402) throw new Error(stringValue(body, "error") ?? `Expected HTTP 402, received ${response.status}.`);
      const offer = objectValue(body, "flovia");
      const finalPrice = stringValue(offer, "final_price") ?? "unknown";
      const policy = stringValue(offer, "policy") ?? "unknown_policy";
      return {
        ...nextState,
        authorized: true,
        offerResponse: body,
        paidResponse: null,
        status: "offer",
        message: `Merchant returned HTTP 402 with ${policy} at ${finalPrice} USDC.`,
      };
    }

    if (intent === "simulate-payment") {
      const requirement = firstPaymentRequirement(state.offerResponse);
      const flovia = objectValue(state.offerResponse, "flovia");
      const extra = objectValue(requirement, "extra");
      const quoteId = stringValue(extra, "quote_id");
      const requestId = stringValue(extra, "request_id");
      if (!quoteId || !requestId) throw new Error("Missing quote metadata; call the merchant API again.");

      const response = await fetch(`${defaultConfig.merchantApiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          "x-agent-wallet": wallet,
          "x-agent-budget": budget,
          "x-payment": JSON.stringify({
            quote_id: quoteId,
            request_id: requestId,
            tx_hash: `sim_ui_${crypto.randomUUID()}`,
            amount: stringValue(flovia, "final_price") ?? stringValue(extra, "display_price") ?? defaultConfig.endpointPrices.premiumSignal,
            wallet,
            offer_selected: stringValue(flovia, "policy") ?? "mvp_simulation",
            simulation: true,
          }),
        },
        cache: "no-store",
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(stringValue(body, "error") ?? `Payment simulation failed with ${response.status}.`);
      return {
        ...nextState,
        authorized: true,
        paidResponse: body,
        status: "paid",
        message: "Payment simulated. The merchant dashboard now shows the request and conversion.",
      };
    }

    return nextState;
  } catch (error) {
    return {
      ...nextState,
      status: "error",
      message: error instanceof Error ? error.message : "Guided demo action failed.",
    };
  }
}

export default function DemoPage() {
  return <AgentDemoClient action={agentDemoAction} initialState={initialState} />;
}
