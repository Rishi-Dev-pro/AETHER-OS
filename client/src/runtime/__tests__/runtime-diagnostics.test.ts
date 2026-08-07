/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Runtime Diagnostics (`runtime-diagnostics.test.ts`)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  bootstrapRuntime,
  createDiagnostics,
  resetRuntime,
  runtimeHealth,
  providerStatus,
  runtimeSummary,
} from "../index";

describe("Phase 9.11 Milestone 1 Runtime Diagnostics Unit Tests", () => {
  beforeEach(() => {
    resetRuntime();
  });

  it("should generate comprehensive, secret-free diagnostic reports and health summaries", async () => {
    const customEnv = {
      GROQ_API_KEY: "gsk_diag_groq_key",
      NVIDIA_API_KEY: "nvapi-diag_nvidia_key",
    };

    const instance = await bootstrapRuntime({ autoRegisterDefaultAdapters: true }, customEnv);

    const diagReport = createDiagnostics(instance.runtime, instance.environmentReport);
    expect(diagReport.summary.isInitialized).toBe(true);
    expect(diagReport.summary.adaptersRegistered).toBe(4);
    expect(diagReport.health.isRuntimeHealthy).toBe(true);
    expect(diagReport.providerStatuses.length).toBe(4);

    const health = runtimeHealth(instance.runtime);
    expect(health.totalRegisteredAdapters).toBe(4);
    expect(health.readyAdaptersCount).toBe(3); // Groq, NVIDIA, Ollama

    const summary = runtimeSummary(instance.runtime, instance.environmentReport);
    expect(summary.providersConfigured).toBe(3); // Ollama + Groq + NVIDIA

    const pStatus = providerStatus(instance.runtime);
    const groq = pStatus.find((p) => p.adapterId === "groq-adapter");
    expect(groq?.hasCredentialRegistered).toBe(true);
    expect(groq?.isRuntimeReady).toBe(true);

    expect(Object.isFrozen(diagReport)).toBe(true);
  });
});
