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
        loginMethods: ["email", "twitter", "github"],
        walletConnectCloudProjectId: authConfig.walletConnectId || undefined,
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: {
          theme: "light",
          // Keep in sync with --mesh-blue in globals.css; Privy's JS config can't read CSS vars.
          accentColor: "#2f5a82",
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
