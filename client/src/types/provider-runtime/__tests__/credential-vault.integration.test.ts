/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Integration Test: CredentialVault Integration Suite (`credential-vault.integration.test.ts`)
 *
 * @file credential-vault.integration.test.ts
 * @description Validates multi-credential management, sorted lookup queries, snapshot exports, and secret isolation.
 */

import { describe, it, expect } from "vitest";
import { CredentialType } from "../enums";
import { CredentialVault } from "../credential-vault";

describe("Phase 9.9 — Milestone 3: CredentialVault Integration Suite", () => {
  it("should perform multi-attribute credential lookups sorted alphabetically", () => {
    const vault = new CredentialVault();

    vault.registerCredential(
      "z_cred",
      "provider_z",
      CredentialType.OAUTH2,
      { token: "tok_z" }
    );
    vault.registerCredential(
      "a_cred",
      "provider_a",
      CredentialType.API_KEY,
      { key: "key_a" }
    );

    const lookups = vault.lookupCredential({});
    expect(lookups.length).toBe(2);
    expect(lookups[0].credentialId).toBe("a_cred");
    expect(lookups[1].credentialId).toBe("z_cred");

    const providerALookup = vault.lookupCredential({ providerId: "provider_a" });
    expect(providerALookup.length).toBe(1);
    expect(providerALookup[0].credentialId).toBe("a_cred");
  });

  it("should verify 100% secret-free JSON serialization of vault snapshots", () => {
    const vault = new CredentialVault();

    vault.registerCredential(
      "cred_super_secret",
      "p_secret",
      CredentialType.CLIENT_CERTIFICATE,
      { cert: "-----BEGIN CERTIFICATE-----\nSECRET_BYTES_HERE\n-----END CERTIFICATE-----" }
    );

    const snapshot = vault.createSnapshot();
    const jsonStr = JSON.stringify(snapshot);

    expect(jsonStr).not.toContain("SECRET_BYTES_HERE");
    expect(jsonStr).not.toContain("BEGIN CERTIFICATE");
    expect(snapshot.credentialsCount).toBe(1);
  });
});
