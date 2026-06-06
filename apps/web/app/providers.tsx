"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  if (!privyAppId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={privyAppId}
      {...(privyClientId ? { clientId: privyClientId } : {})}
      config={{
        loginMethods: ["email", "twitter", "github"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
