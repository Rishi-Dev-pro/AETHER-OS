/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Production Bootstrap Pipeline (`bootstrap-integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { bootstrapRuntime } from "../../types/provider-adapters/runtime-bootstrap";

describe("Phase 9.10 Milestone 7 Bootstrap Integration Tests", () => {
  it("should bootstrap runtime cleanly with Groq and NVIDIA credentials present in custom environment", async () => {
    const customEnv = {
      GROQ_API_KEY: "gsk_bootstrap_integ_groq_key",
      NVIDIA_API_KEY: "nvapi-bootstrap_integ_nvidia_key",
    };

    const bootstrapped = bootstrapRuntime({ autoRegisterDefaultAdapters: true }, customEnv);
    await bootstrapped.runtime.initialize();

    const diagnostics = bootstrapped.runtime.diagnostics();
    const groqDiag = diagnostics.find((d) => d.adapterId === "groq-adapter");
    const nvDiag = diagnostics.find((d) => d.adapterId === "nvidia-adapter");
    const openaiDiag = diagnostics.find((d) => d.adapterId === "openai-adapter");
    const ollamaDiag = diagnostics.find((d) => d.adapterId === "ollama-adapter");

    expect(groqDiag?.hasCredentialRegistered).toBe(true);
    expect(groqDiag?.isRuntimeReady).toBe(true);

    expect(nvDiag?.hasCredentialRegistered).toBe(true);
    expect(nvDiag?.isRuntimeReady).toBe(true);

    expect(openaiDiag?.hasCredentialRegistered).toBe(false);
    expect(openaiDiag?.isRuntimeReady).toBe(false);

    expect(ollamaDiag?.hasCredentialRegistered).toBe(true);
    expect(ollamaDiag?.isRuntimeReady).toBe(true);

    const snapshot = bootstrapped.runtime.runtimeSnapshot();
    expect(snapshot.registeredCredentialIds).toContain("groq-credential-id");
    expect(snapshot.registeredCredentialIds).toContain("nvidia-credential-id");
    expect(snapshot.registeredCredentialIds).not.toContain("openai-credential-id");

    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});
