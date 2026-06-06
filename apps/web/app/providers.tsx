"use client";

import { PrivyProvider } from "@privy-io/react-auth";

type AuthConfig = {
  privyAppId: string;
  walletConnectId: string;
};

export function AppProviders({
  authConfig,
  children,
}: Readonly<{ authConfig: AuthConfig; children: React.ReactNode }>) {
  if (!authConfig.privyAppId) return children;

  return (
    <PrivyProvider
      appId={authConfig.privyAppId}
      config={{
        loginMethods: ["email", "wallet", "farcaster", "github", "passkey"],
        walletConnectCloudProjectId: authConfig.walletConnectId || undefined,
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: {
          theme: "light",
          accentColor: "#2563eb",
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
