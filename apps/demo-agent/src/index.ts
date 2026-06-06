import { defaultConfig } from "@flovia-baseprivynyc/config";

type AgentOptions = {
  budget: string;
  wallet: string;
  privyAuthorized: boolean;
  endpoint: string;
};

function readFlag(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function readBooleanFlag(name: string): boolean {
  return process.argv.includes(name);
}

function readOptions(): AgentOptions {
  return {
    budget: readFlag("--budget", defaultConfig.defaultBudgetUsdc) ?? defaultConfig.defaultBudgetUsdc,
    wallet: readFlag("--wallet", "0xAgentWallet") ?? "0xAgentWallet",
    privyAuthorized: readBooleanFlag("--privy-authorized"),
    endpoint: readFlag("--endpoint", "/api/premium-signal") ?? "/api/premium-signal",
  };
}

async function runAgent(options: AgentOptions) {
  const url = `${defaultConfig.merchantApiUrl}${options.endpoint}`;
  const firstResponse = await fetch(url, {
    headers: {
      "x-agent-wallet": options.wallet,
      "x-agent-budget": options.budget,
      "x-flovia-privy-authorized": String(options.privyAuthorized),
    },
  });

  if (firstResponse.status !== 402) {
    console.log(await firstResponse.json());
    return;
  }

  const paymentRequired = await firstResponse.json() as {
    accepts: Array<{ amount: string }>;
    flovia: { requestId: string; quoteId: string; finalPrice: string; policy: string; alternativeEndpoints: Array<{ path: string; price: string }> };
  };
  const finalPrice = Number(paymentRequired.flovia.finalPrice);
  const budget = Number(options.budget);
  const selectedPath = finalPrice <= budget ? options.endpoint : paymentRequired.flovia.alternativeEndpoints[0]?.path;

  if (!selectedPath) {
    console.log({ decision: "skip", reason: "no_offer_within_budget", paymentRequired });
    return;
  }

  const payment = {
    request_id: paymentRequired.flovia.requestId,
    quote_id: paymentRequired.flovia.quoteId,
    tx_hash: `sim_${crypto.randomUUID()}`,
    amount: selectedPath === options.endpoint ? paymentRequired.flovia.finalPrice : paymentRequired.flovia.alternativeEndpoints[0]?.price,
    wallet: options.wallet,
    offer_selected: paymentRequired.flovia.policy,
    simulation: true,
  };

  const paidResponse = await fetch(`${defaultConfig.merchantApiUrl}${selectedPath}`, {
    headers: {
      "x-agent-wallet": options.wallet,
      "x-agent-budget": options.budget,
      "x-flovia-privy-authorized": String(options.privyAuthorized),
      "x-payment": JSON.stringify(payment),
    },
  });

  console.log({
    decision: "paid_with_mvp_simulation",
    selectedPath,
    offer: paymentRequired.flovia,
    acceptsAmount: paymentRequired.accepts[0]?.amount,
    response: await paidResponse.json(),
  });
}

if (import.meta.main) {
  runAgent(readOptions()).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
