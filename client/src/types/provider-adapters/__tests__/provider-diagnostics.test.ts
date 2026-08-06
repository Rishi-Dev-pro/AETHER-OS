/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Provider Diagnostics (`provider-diagnostics.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { diagnoseProvider } from "../provider-diagnostics";
import { OpenAIAdapter } from "../openai-adapter";
import { OllamaAdapter } from "../ollama-adapter";
import { CredentialVault } from "../../provider-runtime";

describe("Phase 9.10 Provider Diagnostics Unit Tests", () => {
  it("should generate secret-free diagnostics report for cloud adapter with vault credential", () => {
    const vault = new CredentialVault();
    vault.registerCredential("openai-credential-id", "openai-provider", "API_KEY", {
      apiKey: "sk-secret-do-not-leak",
    });

    const openai = new OpenAIAdapter("openai-credential-id");
    const diag = diagnoseProvider(openai, vault);

    expect(diag.adapterId).toBe("openai-adapter");
    expect(diag.hasCredentialRegistered).toBe(true);
    expect(diag.isHealthy).toBe(true);
    expect(diag.isRuntimeReady).toBe(true);
    expect((diag as any).apiKey).toBeUndefined(); // Zero secret leakage
    expect(Object.isFrozen(diag)).toBe(true);
  });

  it("should generate diagnostics report for local Ollama adapter without credentials", () => {
    const ollama = new OllamaAdapter();
    const diag = diagnoseProvider(ollama);

    expect(diag.adapterId).toBe("ollama-adapter");
    expect(diag.hasCredentialRegistered).toBe(true);
    expect(diag.isRuntimeReady).toBe(true);
    expect(Object.isFrozen(diag)).toBe(true);
  });
});
