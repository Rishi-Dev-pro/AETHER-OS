/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 6 Unit Test: ProviderManager Suite (`provider-manager.test.ts`)
 *
 * @file provider-manager.test.ts
 * @description Validates unified facade orchestration, execution context assembly,
 * credential reference injection, lifecycle/health delegation, runtime freeze enforcement,
 * and unified runtime snapshots.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProviderSelectionPolicy, CredentialType, SessionType } from "../enums";
import { RuntimeFrozenError } from "../provider-manager-errors";
import { ProviderManager } from "../provider-manager";
import {
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
} from "../factories";

describe("Phase 9.9 — Milestone 6: ProviderManager Unit Test Suite", () => {
  let manager: ProviderManager;

  beforeEach(() => {
    manager = new ProviderManager();
  });

  it("should register providers, initialize lifecycle, and resolve catalog queries", () => {
    const contract = createProviderContract({
      metadata: createProviderMetadata({ providerId: "groq-cloud", vendor: "Groq", version: "1.0.0", defaultTimeoutMs: 10000 }),
      configuration: createProviderConfiguration({ providerId: "groq-cloud", model: "llama" }),
    });

    const entry = manager.registerProvider(contract);

    expect(entry.providerId).toBe("groq-cloud");
    expect(manager.getProvider("groq-cloud").providerId).toBe("groq-cloud");
    expect(manager.lifecycleManager.getLifecycleState("groq-cloud")).toBe("REGISTERED");
  });

  it("should orchestrate ProviderExecutionContext creation pipeline with credential reference injection", () => {
    const contract = createProviderContract({
      metadata: createProviderMetadata({ providerId: "anthropic-claude", vendor: "Anthropic", version: "1.0.0", defaultTimeoutMs: 20000 }),
      configuration: createProviderConfiguration({ providerId: "anthropic-claude", model: "claude-3-5-sonnet" }),
    });

    manager.registerProvider(contract);
    manager.initializeProvider("anthropic-claude");
    manager.markProviderReady("anthropic-claude");

    // Register credential handle in vault
    const credentialRef = manager.registerCredential(
      "cred_ant_1",
      "anthropic-claude",
      CredentialType.API_KEY,
      { apiKey: "sk-ant-secret" }
    );

    // Create execution context through manager facade
    const ctx = manager.createExecutionContext({
      requestId: "req_facade_1",
      providerId: "anthropic-claude",
    });

    expect(ctx.requestId).toBe("req_facade_1");
    expect(ctx.providerId).toBe("anthropic-claude");
    expect(ctx.credentialReference).toBeDefined();
    expect(ctx.credentialReference?.startsWith(`ref_${credentialRef.credentialId}`)).toBe(true);
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it("should enforce runtime freeze locking across all mutation methods", () => {
    const contract = createProviderContract({
      metadata: createProviderMetadata({ providerId: "p1", vendor: "v1", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "p1", model: "m1" }),
    });

    manager.registerProvider(contract);
    manager.freezeRuntime();

    expect(manager.isFrozen()).toBe(true);

    const contract2 = createProviderContract({
      metadata: createProviderMetadata({ providerId: "p2", vendor: "v2", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "p2", model: "m2" }),
    });

    expect(() => manager.registerProvider(contract2)).toThrow(RuntimeFrozenError);
    expect(() => manager.registerCredential("c2", "p1", CredentialType.API_KEY, { k: "v" })).toThrow(RuntimeFrozenError);
    expect(() => manager.allocateSession("p1", SessionType.AI_CONVERSATION)).toThrow(RuntimeFrozenError);
  });

  it("should generate unified deeply frozen ProviderRuntimeSnapshot objects", () => {
    const contract = createProviderContract({
      metadata: createProviderMetadata({ providerId: "p1", vendor: "v1", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "p1", model: "m1" }),
    });

    manager.registerProvider(contract);
    manager.registerCredential("cred_1", "p1", CredentialType.API_KEY, { key: "secret" });
    manager.allocateSession("p1", SessionType.BROWSER_CONTEXT);

    const snapshot = manager.createRuntimeSnapshot();

    expect(snapshot.totalProvidersCount).toBe(1);
    expect(snapshot.credentialsCount).toBe(1);
    expect(snapshot.activeSessionsCount).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.registrySnapshot)).toBe(true);
  });
});
