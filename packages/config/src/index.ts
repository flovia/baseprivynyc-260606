export const supportedNetworks = ["base", "base-sepolia"] as const;
export const supportedCurrencies = ["USDC"] as const;

export const usdcDecimals = 6;

// USDC asset identifiers required by x402 real mode (not the display symbol "USDC").
export const usdcAssetAddresses = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
} as const;

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

export const publicAuthConfig = {
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? process.env.PRIVY_APP_ID ?? "",
  walletConnectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? process.env.WALLET_CONNECT_ID ?? "",
};

export const serverAuthConfig = {
  privyAppId: process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  privyAppSecret: process.env.PRIVY_APP_SECRET ?? "",
  walletConnectId: process.env.WALLET_CONNECT_ID ?? process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? "",
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
