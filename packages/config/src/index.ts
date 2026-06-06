export const supportedNetworks = ["base", "base-sepolia"] as const;
export const supportedCurrencies = ["USDC"] as const;

export const defaultConfig = {
  floviaApiUrl: process.env.FLOVIA_API_URL ?? "http://localhost:8787",
  merchantApiUrl: process.env.MERCHANT_API_URL ?? "http://localhost:8790",
  demoMerchantId: process.env.FLOVIA_MERCHANT_ID ?? "merch_demo",
  demoApiKey: process.env.FLOVIA_API_KEY ?? "demo-api-key",
  merchantWallet: process.env.MERCHANT_WALLET ?? "0xMerchantWallet",
  network: "base-sepolia" as const,
  currency: "USDC" as const,
  defaultBudgetUsdc: "0.25",
  endpointPrices: {
    basicSignal: "0.01",
    premiumSignal: "0.05",
    premiumSignalPlus: "0.08",
  },
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
