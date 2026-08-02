/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Unit Test: CredentialInjector Suite (`credential-injector.test.ts`)
 *
 * @file credential-injector.test.ts
 * @description Validates secret-free reference injection into ProviderExecutionContext and ephemeral resolution.
 */

import { describe, it, expect } from "vitest";
import { CredentialType, ProviderType, ProviderSelectionPolicy } from "../enums";
import { CredentialReferenceError } from "../credential-errors";
import { CredentialVault } from "../credential-vault";
import { CredentialInjector } from "../credential-injector";
import { createProviderExecutionContext } from "../factories";

describe("Phase 9.9 — Milestone 3: CredentialInjector Test Suite", () => {
  it("should inject secret-free CredentialReference handle into ProviderExecutionContext", () => {
    const vault = new CredentialVault();
    const ref = vault.registerCredential(
      "cred_anthropic",
      "anthropic-claude",
      CredentialType.API_KEY,
      { apiKey: "sk-ant-secret-123" }
    );

    const context = createProviderExecutionContext({
      requestId: "req_inject_1",
      providerId: "anthropic-claude",
      providerType: ProviderType.AI_CLOUD,
      selectionPolicy: ProviderSelectionPolicy.FIRST_AVAILABLE,
      executionPriority: 1,
      timeoutMs: 30000,
      providerConfigurationReference: "cfg_anthropic",
    });

    const updatedContext = CredentialInjector.injectCredentialReference(context, ref);

    expect(updatedContext.credentialReference).toBe(ref.referenceId);
    expect(updatedContext.providerId).toBe("anthropic-claude");
    expect(Object.isFrozen(updatedContext)).toBe(true);
  });

  it("should resolve raw secret payload from vault using valid CredentialReference", () => {
    const vault = new CredentialVault();
    const ref = vault.registerCredential(
      "cred_nvidia",
      "nvidia-nim",
      CredentialType.BEARER_TOKEN,
      { bearerToken: "nvapi-secret-token" }
    );

    const secrets = CredentialInjector.resolveCredentialReference(vault, ref);

    expect(secrets.bearerToken).toBe("nvapi-secret-token");
    expect(Object.isFrozen(secrets)).toBe(true);
  });

  it("should validate reference handles with validateCredentialReference()", () => {
    const vault = new CredentialVault();
    const validRef = vault.registerCredential(
      "cred_valid",
      "p1",
      CredentialType.API_KEY,
      { key: "v1" }
    );

    expect(CredentialInjector.validateCredentialReference(validRef)).toBe(true);

    const expiredRef = {
      ...validRef,
      expiresAtMs: Date.now() - 1000,
    };
    expect(CredentialInjector.validateCredentialReference(expiredRef)).toBe(false);
  });

  it("should throw CredentialReferenceError on invalid injection attempts", () => {
    const vault = new CredentialVault();
    const ref = vault.registerCredential("c1", "p1", CredentialType.API_KEY, { k: "v" });

    expect(() =>
      // @ts-expect-error Invalid context testing
      CredentialInjector.injectCredentialReference({}, ref)
    ).toThrow(CredentialReferenceError);
  });
});
