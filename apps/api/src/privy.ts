import { serverAuthConfig } from "@flovia-baseprivynyc/config";
import type { IdentityConfidence, LinkedAccountType } from "@flovia-baseprivynyc/shared";
import { PrivyClient, type User } from "@privy-io/server-auth";

type NormalizedPrivyIdentity = {
  privyDid: string;
  wallet: string;
  identityConfidence: IdentityConfidence;
  linkedAccountTypes: LinkedAccountType[];
};

let client: PrivyClient | null = null;

function getPrivyClient() {
  if (!serverAuthConfig.privyAppId || !serverAuthConfig.privyAppSecret) {
    throw new Error("privy_not_configured");
  }
  client ??= new PrivyClient(serverAuthConfig.privyAppId, serverAuthConfig.privyAppSecret);
  return client;
}

function linkedWallets(user: User): string[] {
  return user.linkedAccounts
    .filter((account) => account.type === "wallet" || account.type === "smart_wallet")
    .map((account) => "address" in account ? account.address : undefined)
    .filter((address): address is string => Boolean(address));
}

function normalizeLinkedAccountTypes(user: User): LinkedAccountType[] {
  const linked = new Set<LinkedAccountType>();
  for (const account of user.linkedAccounts) {
    if (account.type === "email") linked.add("email");
    if (account.type === "farcaster") linked.add("farcaster");
    if (account.type === "github_oauth") linked.add("github");
    if (account.type === "passkey") linked.add("passkey");
  }
  return [...linked];
}

function confidenceFor(linkedAccountTypes: LinkedAccountType[]): IdentityConfidence {
  if (linkedAccountTypes.includes("mfa") || linkedAccountTypes.includes("passkey")) return "strong_auth";
  if (linkedAccountTypes.includes("farcaster") || linkedAccountTypes.includes("github")) return "verified_social";
  if (linkedAccountTypes.includes("email")) return "verified_contact";
  return "wallet_only";
}

export async function normalizePrivyUserForFlovia(input: {
  user: User;
  requestedWallet?: string;
}): Promise<NormalizedPrivyIdentity> {
  const user = input.user;
  const wallets = linkedWallets(user);
  const requestedWallet = input.requestedWallet?.toLowerCase();

  const wallet = requestedWallet
    ? (wallets.find((address) => address.toLowerCase() === requestedWallet) ?? wallets[0])
    : (user.wallet?.address ?? wallets[0]);

  if (!wallet) throw new Error("privy_wallet_not_found");
  if (requestedWallet && wallet.toLowerCase() !== requestedWallet) throw new Error("privy_wallet_mismatch");

  const linkedAccountTypes = normalizeLinkedAccountTypes(user);
  return {
    privyDid: user.id,
    wallet,
    linkedAccountTypes,
    identityConfidence: confidenceFor(linkedAccountTypes),
  };
}

export async function resolvePrivyIdentity(input: {
  identityToken: string;
  requestedWallet?: string;
}): Promise<NormalizedPrivyIdentity> {
  const user = await getPrivyClient().getUser({ idToken: input.identityToken });
  return normalizePrivyUserForFlovia({ user, requestedWallet: input.requestedWallet });
}
