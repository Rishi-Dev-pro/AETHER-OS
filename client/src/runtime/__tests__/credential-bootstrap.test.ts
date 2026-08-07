/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Credential Bootstrap (`credential-bootstrap.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { bootstrapCredentials } from "../credential-bootstrap";
import { CredentialVault } from "../../types/provider-runtime";
import { DuplicateCredentialBootstrapError } from "../bootstrap-errors";

describe("Phase 9.10 Milestone 7 Credential Bootstrap Unit Tests", () => {
  it("should securely load Groq and NVIDIA credentials from environment into CredentialVault", () => {
    const vault = new CredentialVault();
    const env = {
      GROQ_API_KEY: "gsk_unit_test_groq_key_999",
      NVIDIA_API_KEY: "nvapi_unit_test_nvidia_key_888",
    };

    const report = bootstrapCredentials(vault, env);

    expect(report.status).toBe("SUCCESS");
    expect(report.configuredProviders).toContain("groq-provider");
    expect(report.configuredProviders).toContain("nvidia-provider");
    expect(report.configuredProviders).toContain("ollama-provider");
    expect(report.configuredProviders).not.toContain("openai-provider");

    expect(vault.hasCredential("groq-credential-id")).toBe(true);
    expect(vault.hasCredential("nvidia-credential-id")).toBe(true);
    expect(vault.hasCredential("openai-credential-id")).toBe(false);

    expect(Object.isFrozen(report)).toBe(true);
  });

  it("should throw DuplicateCredentialBootstrapError on duplicate registration attempt", () => {
    const vault = new CredentialVault();
    vault.registerCredential("groq-credential-id", "groq-provider", "API_KEY" as any, { apiKey: "existing" });

    const env = {
      GROQ_API_KEY: "gsk_duplicate_test_key",
    };

    expect(() => bootstrapCredentials(vault, env)).toThrow(DuplicateCredentialBootstrapError);
  });
});
