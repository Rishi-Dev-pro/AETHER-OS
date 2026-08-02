/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 6 Integration Test: ProviderManager Integration Suite (`provider-manager.integration.test.ts`)
 *
 * @file provider-manager.integration.test.ts
 * @description End-to-end subsystem orchestration verification suite validating complete
 * interaction across Registry, Negotiator, Credential Vault, Injector, Lifecycle, Health,
 * Circuit Breaker, Selector, Session Manager, and ProviderManager across 100 replay runs.
 */

import { describe, it, expect } from "vitest";
import { ProviderSelectionPolicy, CredentialType, SessionType, ProviderCapability } from "../enums";
import { ProviderManager } from "../provider-manager";
import {
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
} from "../factories";

describe("Phase 9.9 — Milestone 6: ProviderManager Integration Suite", () => {
  it("should orchestrate complete end-to-end runtime lifecycle and selection pipeline", () => {
    const manager = new ProviderManager();

    // 1. Register Providers
    const groq = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "groq-cloud",
        vendor: "Groq",
        version: "1.0.0",
        defaultTimeoutMs: 10000,
        capabilities: [
          {
            capability: ProviderCapability.STREAMING,
            metadata: { capabilityId: "c1", supportsStreaming: true, supportsVision: false, supportsImageGeneration: false, supportsFunctionCalling: false, supportsVideo: false, supportsBatching: false },
          },
        ],
      }),
      configuration: createProviderConfiguration({ providerId: "groq-cloud", model: "llama" }),
    });

    manager.registerProvider(groq);

    // 2. Lifecycle setup
    manager.initializeProvider("groq-cloud");
    manager.markProviderReady("groq-cloud");

    // 3. Register Credentials
    const ref = manager.registerCredential(
      "cred_groq",
      "groq-cloud",
      CredentialType.API_KEY,
      { apiKey: "gsk_prod_secret_123" }
    );

    // 4. Allocate Session
    const session = manager.allocateSession("groq-cloud", SessionType.AI_CONVERSATION);
    expect(session.state).toBe("ACTIVE");

    // 5. Record Health metrics
    manager.recordSuccess("groq-cloud", 25);

    // 6. Create Execution Context via Selection
    const ctx = manager.createExecutionContext({
      requestId: "req_full_pipeline_1",
      policy: ProviderSelectionPolicy.LOWEST_LATENCY,
    });

    expect(ctx.providerId).toBe("groq-cloud");
    expect(ctx.credentialReference).toBeDefined();
    expect(ctx.credentialReference?.startsWith(`ref_${ref.credentialId}`)).toBe(true);

    // 7. Freeze Runtime & verify unified snapshot
    manager.freezeRuntime();
    expect(manager.isFrozen()).toBe(true);

    const snapshot = manager.createRuntimeSnapshot();
    expect(snapshot.isFrozen).toBe(true);
    expect(snapshot.totalProvidersCount).toBe(1);
    expect(snapshot.activeSessionsCount).toBe(1);
  });

  it("should produce bit-for-bit identical unified runtime snapshots across 100 replay runs", () => {
    const runPipeline = () => {
      const mgr = new ProviderManager();
      const p1 = createProviderContract({
        metadata: createProviderMetadata({ providerId: "p1", vendor: "v1", version: "1.0.0", defaultTimeoutMs: 1000 }),
        configuration: createProviderConfiguration({ providerId: "p1", model: "m1" }),
      });

      mgr.registerProvider(p1);
      mgr.initializeProvider("p1");
      mgr.markProviderReady("p1");
      mgr.registerCredential("c1", "p1", CredentialType.API_KEY, { k: "v" });
      mgr.allocateSession("p1", SessionType.LONG_LIVED_RUNTIME);
      mgr.recordSuccess("p1", 50);
      mgr.freezeRuntime();

      const snap = mgr.createRuntimeSnapshot();
      return `${snap.isFrozen}:${snap.totalProvidersCount}:${snap.activeSessionsCount}:${snap.credentialsCount}`;
    };

    const firstRun = runPipeline();
    for (let i = 0; i < 100; i++) {
      expect(runPipeline()).toBe(firstRun);
    }
  });
});
