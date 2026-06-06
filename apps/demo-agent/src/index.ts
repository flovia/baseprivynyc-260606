import { defaultConfig } from "@flovia-baseprivynyc/config";

type AgentOptions = {
  budget: string;
  wallet: string;
  endpoint: string;
  autoLink: boolean;
};

type Flovia = {
  type: string;
  base_price: string;
  final_price: string;
  currency: string;
  policy: string;
  reason_codes: string[];
  unlock?: { type: string; condition: string; target_final_price: string };
};

type PaymentRequired = {
  accepts: Array<{
    maxAmountRequired: string;
    asset: string;
    extra?: { quote_id?: string; request_id?: string; display_price?: string };
  }>;
  flovia: Flovia;
};

function readFlag(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function readOptions(): AgentOptions {
  return {
    budget: readFlag("--budget", defaultConfig.defaultBudgetUsdc) ?? defaultConfig.defaultBudgetUsdc,
    wallet: readFlag("--wallet", "0xAgentWallet") ?? "0xAgentWallet",
    endpoint: readFlag("--endpoint", "/api/premium-signal") ?? "/api/premium-signal",
    autoLink: !process.argv.includes("--no-link"),
  };
}

function callMerchant(options: AgentOptions, extraHeaders: Record<string, string> = {}) {
  return fetch(`${defaultConfig.merchantApiUrl}${options.endpoint}`, {
    headers: {
      "x-agent-wallet": options.wallet,
      "x-agent-budget": options.budget,
      ...extraHeaders,
    },
  });
}

async function runAgent(options: AgentOptions) {
  // Step 0: simulate Privy login + Flovia agent authorization (wallet-only).
  await fetch(`${defaultConfig.floviaApiUrl}/v1/dev/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet: options.wallet, identity_confidence: "wallet_only", authorized: true }),
  }).catch(() => undefined);
  console.log("[sim] Privy login + agent authorization:", options.wallet, "(wallet-only)");

  // Step 1: first quote -> expect unlockable discount at full price.
  let response = await callMerchant(options);
  if (response.status !== 402) {
    console.log({ decision: "no_payment_required", response: await response.json() });
    return;
  }
  let pr = (await response.json()) as PaymentRequired;
  console.log("[402]", pr.flovia.type, "final_price", pr.flovia.final_price, pr.flovia.reason_codes);

  // Step 2: trigger the unlock condition -> simulate linking email in Privy.
  if (pr.flovia.type === "unlockable_discount" && options.autoLink) {
    console.log("[sim] linking email in Privy ->", pr.flovia.unlock?.condition);
    await fetch(`${defaultConfig.floviaApiUrl}/v1/dev/users/${options.wallet}/link`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "email" }),
    }).catch(() => undefined);

    response = await callMerchant(options);
    pr = (await response.json()) as PaymentRequired;
    console.log("[402]", pr.flovia.type, "final_price", pr.flovia.final_price, pr.flovia.reason_codes);
  }

  // Step 3: budget check, then pay (MVP simulation) and retry with X-PAYMENT.
  const finalPrice = Number(pr.flovia.final_price);
  if (finalPrice > Number(options.budget)) {
    console.log({ decision: "skip", reason: "over_budget", final_price: pr.flovia.final_price, budget: options.budget });
    return;
  }

  const accept = pr.accepts[0];
  const payment = {
    request_id: accept?.extra?.request_id,
    quote_id: accept?.extra?.quote_id,
    tx_hash: `sim_${crypto.randomUUID()}`,
    amount: pr.flovia.final_price,
    wallet: options.wallet,
    offer_selected: pr.flovia.policy,
    simulation: true,
  };

  const paid = await callMerchant(options, { "x-payment": JSON.stringify(payment) });
  console.log({
    decision: "paid_with_mvp_simulation",
    offer_type: pr.flovia.type,
    final_price: pr.flovia.final_price,
    atomic_amount: accept?.maxAmountRequired,
    asset: accept?.asset,
    response: await paid.json(),
  });
}

if (import.meta.main) {
  runAgent(readOptions()).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
