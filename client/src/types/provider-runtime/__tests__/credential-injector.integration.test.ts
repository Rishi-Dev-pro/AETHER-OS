/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Integration Test: CredentialInjector Integration Suite (`credential-injector.integration.test.ts`)
 *
 * @file credential-injector.integration.test.ts
 * @description Integration verification suite validating end-to-end credential registration,
 * reference injection, vault freezing, and ephemeral boundary secret resolution.
 */

import { describe, it, expect } from "vitest";
import { CredentialType, ProviderType, ProviderSelectionPolicy } from "../enums";
import { CredentialVault } from "../credential-vault";
import { CredentialInjector } from "../credential-injector";
import { createProviderExecutionContext } from "../factories";

describe("Phase 9.9 — Milestone 3: CredentialInjector Integration Suite", () => {
  it("should perform end-to-end credential injection and ephemeral resolution", () => {
    const vault = new CredentialVault();

    // 1. Register credential in vault
    const ref = vault.registerCredential(
      "cred_e2e_groq",
      "groq-cloud",
      CredentialType.API_KEY,
      { apiKey: "gsk_prod_secret_key_999" }
    );

    // 2. Build execution context
    const ctx = createProviderExecutionContext({
      requestId: "req_e2e_101",
      providerId: "groq-cloud",
      providerType: ProviderType.AI_CLOUD,
      selectionPolicy: ProviderSelectionPolicy.LOWEST_LATENCY,
      executionPriority: 1,
      timeoutMs: 15000,
      providerConfigurationReference: "cfg_groq",
    });

    // 3. Inject secret-free reference handle into context
    const injectedCtx = CredentialInjector.injectCredentialReference(ctx, ref);
    expect(injectedCtx.credentialReference).toBe(ref.referenceId);

    // 4. Freeze vault (simulating frozen runtime state)
    vault.freezeVault();
    expect(vault.isFrozen()).toBe(true);

    // 5. Resolve secrets at ephemeral driver dispatch boundary
    const secrets = CredentialInjector.resolveCredentialReference(vault, ref);
    expect(secrets.apiKey).toBe("gsk_prod_secret_key_999");
    expect(Object.isFrozen(secrets)).toBe(true);
  });

  it("should ensure deterministic replay of reference lookup and injection", () => {
    const vault = new CredentialVault();

    const ref = vault.registerCredential(
      "cred_replay",
      "p_replay",
      CredentialType.BEARER_TOKEN,
      { bearerToken: "token_123" }
    );

    const ctx = createProviderExecutionContext({
      requestId: "req_replay",
      providerId: "p_replay",
    });

    const run1 = CredentialInjector.injectCredentialReference(ctx, ref);
    const run2 = CredentialInjector.injectCredentialReference(ctx, ref);

    expect(run1.credentialReference).toBe(run2.credentialReference);
    expect(run1.providerId).toBe(run2.providerId);
  });
});
