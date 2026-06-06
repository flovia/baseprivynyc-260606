import { defaultConfig, publicAuthConfig } from "@flovia-baseprivynyc/config";
import { HomeClient } from "./home-client";
import type { HomeState, JsonObject } from "./home-types";

const initialState: HomeState = {
  wallet: "",
  budget: defaultConfig.defaultBudgetUsdc,
  endpoint: "/api/premium-signal",
  requestMode: null,
  requestWallet: "",
  message: "Login with Privy, choose an endpoint, then send a merchant request.",
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

function firstPaymentRequirement(response: JsonObject | null): JsonObject | null {
  const accepts = objectValue(response, "accepts");
  if (!Array.isArray(accepts)) return null;
  const first = accepts[0];
  return first && typeof first === "object" && !Array.isArray(first) ? first as JsonObject : null;
}

function pureWalletKey(wallet: string): string {
  return wallet ? `${wallet}:pure-wallet-demo` : "0x0000000000000000000000000000000000000420";
}

async function markPrivyWalletVerified(wallet: string): Promise<void> {
  const response = await fetch(`${defaultConfig.floviaApiUrl}/v1/dev/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, identity_confidence: "verified_social", authorized: true }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Privy demo user sync failed with ${response.status}. Restart the API with FLOVIA_ENABLE_DEV_ENDPOINTS=true.`);
  }
}

async function readJson(response: Response): Promise<JsonObject> {
  const body = await response.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body as JsonObject : {};
}

async function homeAction(state: HomeState, formData: FormData): Promise<HomeState> {
  "use server";

  const intent = formString(formData, "intent", "");
  const wallet = formString(formData, "wallet", state.wallet);
  const budget = formString(formData, "budget", state.budget);
  const endpoint = formString(formData, "endpoint", state.endpoint);
  const nextState = { ...state, wallet, budget, endpoint };

  try {
    if (intent === "call-merchant-privy" || intent === "call-merchant-pure") {
      const mode = intent === "call-merchant-privy" ? "privy" : "pure_wallet";
      if (mode === "privy" && !wallet) throw new Error("Privy wallet is not connected.");
      const requestWallet = mode === "privy" ? wallet : pureWalletKey(wallet);
      if (mode === "privy") await markPrivyWalletVerified(wallet);

      const response = await fetch(`${defaultConfig.merchantApiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          "x-agent-wallet": requestWallet,
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
        requestMode: mode,
        requestWallet,
        offerResponse: body,
        paidResponse: null,
        status: "offer",
        message: `${mode === "privy" ? "Privy" : "Pure wallet"} preview returned HTTP 402 with ${policy} at ${finalPrice} USDC.`,
      };
    }

    if (intent === "simulate-payment" || intent === "send-real-payment") {
      if (!wallet && !state.requestWallet) throw new Error("No preview wallet is available.");
      if (state.status !== "offer") throw new Error("Payment simulation is only available from an active preview.");
      const requirement = firstPaymentRequirement(state.offerResponse);
      const flovia = objectValue(state.offerResponse, "flovia");
      const extra = objectValue(requirement, "extra");
      const quoteId = stringValue(extra, "quote_id");
      const requestId = stringValue(extra, "request_id");
      if (!quoteId || !requestId) throw new Error("Missing quote metadata; send a merchant request first.");
      const paymentWallet = state.requestWallet || wallet;
      const realTxHash = formString(formData, "real_tx_hash", "");
      if (intent === "send-real-payment" && !realTxHash) throw new Error("Missing real payment transaction hash.");

      const response = await fetch(`${defaultConfig.merchantApiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          "x-agent-wallet": paymentWallet,
          "x-agent-budget": budget,
          "x-payment": JSON.stringify({
            quote_id: quoteId,
            request_id: requestId,
            tx_hash: realTxHash || `sim_ui_${crypto.randomUUID()}`,
            amount: stringValue(flovia, "final_price") ?? stringValue(extra, "display_price") ?? defaultConfig.endpointPrices.premiumSignal,
            wallet: paymentWallet,
            offer_selected: stringValue(flovia, "policy") ?? "mvp_simulation",
            simulation: intent !== "send-real-payment",
          }),
        },
        cache: "no-store",
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(stringValue(body, "error") ?? `Payment simulation failed with ${response.status}.`);
      return {
        ...nextState,
        requestMode: state.requestMode,
        requestWallet: paymentWallet,
        paidResponse: body,
        status: "paid",
        message: intent === "send-real-payment"
          ? `Real Privy wallet transaction recorded: ${realTxHash}.`
          : "Payment simulated. The merchant dashboard now shows the request and conversion.",
      };
    }

    return nextState;
  } catch (error) {
    return {
      ...nextState,
      status: "error",
      message: error instanceof Error ? error.message : "Request failed.",
    };
  }
}

export default function Home() {
  return <HomeClient action={homeAction} configured={Boolean(publicAuthConfig.privyAppId)} initialState={initialState} />;
}
