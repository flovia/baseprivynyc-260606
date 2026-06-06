import { describe, expect, test } from "bun:test";
import type { User } from "@privy-io/server-auth";
import { normalizePrivyUserForFlovia } from "./privy";

function fakeUser(linkedAccounts: Array<Record<string, unknown>>): User {
  return {
    id: "did:privy:test-user",
    createdAt: new Date("2026-06-06T00:00:00Z"),
    isGuest: false,
    customMetadata: {},
    linkedAccounts,
  } as unknown as User;
}

describe("Privy identity normalization", () => {
  test("maps wallet-only user to low assurance signals", async () => {
    const identity = await normalizePrivyUserForFlovia({
      user: fakeUser([{ type: "wallet", address: "0xAgentWallet" }]),
    });
    expect(identity.privyDid).toBe("did:privy:test-user");
    expect(identity.wallet).toBe("0xAgentWallet");
    expect(identity.identityConfidence).toBe("wallet_only");
    expect(identity.linkedAccountTypes).toEqual([]);
  });

  test("maps linked accounts to verified confidence", async () => {
    const email = await normalizePrivyUserForFlovia({
      user: fakeUser([{ type: "wallet", address: "0xAgentWallet" }, { type: "email" }]),
    });
    const social = await normalizePrivyUserForFlovia({
      user: fakeUser([{ type: "wallet", address: "0xAgentWallet" }, { type: "farcaster" }]),
    });
    const strong = await normalizePrivyUserForFlovia({
      user: fakeUser([{ type: "wallet", address: "0xAgentWallet" }, { type: "passkey" }]),
    });

    expect(email.identityConfidence).toBe("verified_contact");
    expect(social.identityConfidence).toBe("verified_social");
    expect(strong.identityConfidence).toBe("strong_auth");
  });

  test("rejects requested wallet mismatch", async () => {
    await expect(normalizePrivyUserForFlovia({
      user: fakeUser([{ type: "wallet", address: "0xAgentWallet" }]),
      requestedWallet: "0xOtherWallet",
    })).rejects.toThrow("privy_wallet_mismatch");
  });
});
