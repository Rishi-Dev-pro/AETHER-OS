/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Authentication & Vault (`authentication.integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { AuthenticationType } from "../enums";
import { generateAuthHeaders } from "../authentication-manager";
import { CredentialVault } from "../../provider-runtime";

describe("Phase 9.10 Authentication & CredentialVault Integration", () => {
  it("should resolve secret credentials from CredentialVault using CredentialReference", async () => {
    const vault = new CredentialVault();
    const credRef = vault.registerCredential(
      "openai-api-key",
      "openai",
      "API_KEY",
      { apiKey: "sk-proj-vault-secret-9999" }
    );

    const payload = await generateAuthHeaders({
      authConfig: {
        authType: AuthenticationType.BEARER_TOKEN,
        credentialId: "openai-api-key",
      },
      vault,
      credentialRef: credRef,
    });

    expect(payload.headers["authorization"]).toBe("Bearer sk-proj-vault-secret-9999");
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.headers)).toBe(true);
  });

  it("should lookup credential by credentialId from vault when reference is omitted", async () => {
    const vault = new CredentialVault();
    vault.registerCredential(
      "anthropic-key",
      "anthropic",
      "API_KEY",
      { apiKey: "sk-ant-vault-secret-1111" }
    );

    const payload = await generateAuthHeaders({
      authConfig: {
        authType: AuthenticationType.API_KEY,
        credentialId: "anthropic-key",
        headerName: "x-api-key",
      },
      vault,
    });

    expect(payload.headers["x-api-key"]).toBe("sk-ant-vault-secret-1111");
  });
});
