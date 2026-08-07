/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Runtime Bootstrap (`runtime-bootstrap.test.ts`)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { bootstrapRuntime, resetRuntime, getStatus, RuntimeStatus } from "../index";

describe("Phase 9.11 Milestone 1 Runtime Bootstrap Unit Tests", () => {
  beforeEach(() => {
    resetRuntime();
  });

  it("should execute successful runtime initialization and register all adapters", async () => {
    const customEnv = {
      GROQ_API_KEY: "gsk_test_groq_key_999",
      NVIDIA_API_KEY: "nvapi-test_nvidia_key_888",
    };

    const instance = await bootstrapRuntime({ autoRegisterDefaultAdapters: true }, customEnv);

    expect(getStatus()).toBe(RuntimeStatus.READY);
    expect(instance.adapterManager.listAdapters().length).toBe(4);
    expect(instance.vault.hasCredential("groq-credential-id")).toBe(true);
    expect(instance.vault.hasCredential("nvidia-credential-id")).toBe(true);
    expect(Object.isFrozen(instance)).toBe(true);

    // Critical Identity Assertions: Verify single CredentialVault instance identity
    expect(instance.vault === instance.providerManager.credentialVault).toBe(true);
    expect(instance.runtime.getProviderManager().credentialVault === instance.vault).toBe(true);
    expect(instance.providerManager.credentialVault.hasCredential("groq-credential-id")).toBe(true);
  });

  it("should preserve strict bootstrap ordering and produce READY status", async () => {
    expect(getStatus()).toBe(RuntimeStatus.UNINITIALIZED);
    const instance = await bootstrapRuntime({}, {});

    expect(getStatus()).toBe(RuntimeStatus.READY);
    expect(instance.environmentReport.isEnvironmentValid).toBe(true);
    expect(instance.diagnosticsReport.summary.status).toBe(RuntimeStatus.READY);

    // Verify shared vault identity on default bootstrap
    expect(instance.vault === instance.providerManager.credentialVault).toBe(true);
  });
});
