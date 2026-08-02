/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Unit Test: ProviderSelector Suite (`provider-selector.test.ts`)
 *
 * @file provider-selector.test.ts
 * @description Validates weighted provider scoring, policy application, eligibility filtering,
 * deterministic tie-breaking, and immutable selection reports.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProviderSelectionPolicy, ProviderType, ProviderCapability } from "../enums";
import { NoEligibleProviderError } from "../errors";
import { ProviderRegistry } from "../provider-registry";
import { ProviderHealthManager } from "../provider-health-manager";
import { CircuitBreakerEngine } from "../circuit-breaker-engine";
import { ProviderLifecycleManager } from "../provider-lifecycle-manager";
import { ProviderSelector } from "../provider-selector";
import {
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
} from "../factories";

describe("Phase 9.9 — Milestone 5: ProviderSelector Unit Test Suite", () => {
  let registry: ProviderRegistry;
  let healthManager: ProviderHealthManager;
  let circuitBreaker: CircuitBreakerEngine;
  let lifecycleManager: ProviderLifecycleManager;
  let selector: ProviderSelector;

  beforeEach(() => {
    registry = new ProviderRegistry();
    healthManager = new ProviderHealthManager();
    circuitBreaker = new CircuitBreakerEngine();
    lifecycleManager = new ProviderLifecycleManager();

    selector = new ProviderSelector(registry, healthManager, circuitBreaker, lifecycleManager);
  });

  it("should filter eligible providers and select provider with highest weighted score", () => {
    const groq = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "groq-cloud",
        vendor: "Groq",
        version: "1.0.0",
        defaultTimeoutMs: 10000,
      }),
      configuration: createProviderConfiguration({ providerId: "groq-cloud", model: "llama" }),
    });

    const openai = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "openai-cloud",
        vendor: "OpenAI",
        version: "1.0.0",
        defaultTimeoutMs: 30000,
      }),
      configuration: createProviderConfiguration({ providerId: "openai-cloud", model: "gpt-4o" }),
    });

    registry.registerProvider(groq);
    registry.registerProvider(openai);

    lifecycleManager.registerProvider("groq-cloud");
    lifecycleManager.initializeProvider("groq-cloud");
    lifecycleManager.markReady("groq-cloud");

    lifecycleManager.registerProvider("openai-cloud");
    lifecycleManager.initializeProvider("openai-cloud");
    lifecycleManager.markReady("openai-cloud");

    healthManager.recordSuccess("groq-cloud", 50); // fast latency
    healthManager.recordSuccess("openai-cloud", 500); // slower latency

    const result = selector.selectProvider(ProviderSelectionPolicy.WEIGHTED_SCORE);

    expect(result.selectedProvider.providerId).toBe("groq-cloud");
    expect(result.appliedPolicy).toBe(ProviderSelectionPolicy.WEIGHTED_SCORE);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.selectionReport)).toBe(true);
  });

  it("should apply LOWEST_LATENCY policy correctly", () => {
    const p1 = createProviderContract({
      metadata: createProviderMetadata({ providerId: "p1", vendor: "v1", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "p1", model: "m1" }),
    });
    const p2 = createProviderContract({
      metadata: createProviderMetadata({ providerId: "p2", vendor: "v2", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "p2", model: "m2" }),
    });

    registry.registerProvider(p1);
    registry.registerProvider(p2);

    lifecycleManager.registerProvider("p1");
    lifecycleManager.initializeProvider("p1");
    lifecycleManager.markReady("p1");

    lifecycleManager.registerProvider("p2");
    lifecycleManager.initializeProvider("p2");
    lifecycleManager.markReady("p2");

    healthManager.recordSuccess("p1", 500);
    healthManager.recordSuccess("p2", 50);

    const result = selector.selectProvider(ProviderSelectionPolicy.LOWEST_LATENCY);
    expect(result.selectedProvider.providerId).toBe("p2");
  });

  it("should filter out providers with OPEN circuit breakers or UNHEALTHY lifecycle state", () => {
    const p1 = createProviderContract({
      metadata: createProviderMetadata({ providerId: "failing-p", vendor: "v1", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "failing-p", model: "m1" }),
    });

    registry.registerProvider(p1);
    lifecycleManager.registerProvider("failing-p");
    lifecycleManager.initializeProvider("failing-p");
    lifecycleManager.markReady("failing-p");

    // Trip circuit breaker to OPEN
    circuitBreaker.openCircuit("failing-p");

    expect(() => selector.selectProvider()).toThrow(NoEligibleProviderError);
  });

  it("should enforce deterministic tie-breaking by providerId when scores are identical", () => {
    const pZ = createProviderContract({
      metadata: createProviderMetadata({ providerId: "z-provider", vendor: "v1", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "z-provider", model: "m1" }),
    });
    const pA = createProviderContract({
      metadata: createProviderMetadata({ providerId: "a-provider", vendor: "v2", version: "1.0.0", defaultTimeoutMs: 1000 }),
      configuration: createProviderConfiguration({ providerId: "a-provider", model: "m2" }),
    });

    registry.registerProvider(pZ);
    registry.registerProvider(pA);

    lifecycleManager.registerProvider("z-provider");
    lifecycleManager.initializeProvider("z-provider");
    lifecycleManager.markReady("z-provider");

    lifecycleManager.registerProvider("a-provider");
    lifecycleManager.initializeProvider("a-provider");
    lifecycleManager.markReady("a-provider");

    // Equal health and latency scores
    healthManager.recordSuccess("z-provider", 100);
    healthManager.recordSuccess("a-provider", 100);

    const result = selector.selectProvider(ProviderSelectionPolicy.WEIGHTED_SCORE);
    expect(result.selectedProvider.providerId).toBe("a-provider");
  });
});
