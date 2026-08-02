/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Integration Test: ProviderSelector Integration Suite (`provider-selector.integration.test.ts`)
 *
 * @file provider-selector.integration.test.ts
 * @description Integration verification suite validating ProviderSelector pipeline integration with
 * ProviderRegistry, CapabilityNegotiator, ProviderHealthManager, and CircuitBreakerEngine across 100 replay runs.
 */

import { describe, it, expect } from "vitest";
import { ProviderSelectionPolicy, ProviderType, ProviderCapability } from "../enums";
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

describe("Phase 9.9 — Milestone 5: ProviderSelector Integration Suite", () => {
  it("should integrate Registry, Capability Negotiator, Health Manager, and Circuit Breaker", () => {
    const registry = new ProviderRegistry();
    const health = new ProviderHealthManager();
    const circuit = new CircuitBreakerEngine();
    const lifecycle = new ProviderLifecycleManager();

    const groq = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "groq-cloud",
        vendor: "Groq",
        version: "1.0.0",
        providerType: ProviderType.AI_CLOUD,
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

    const anthropic = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "anthropic-claude",
        vendor: "Anthropic",
        version: "1.0.0",
        providerType: ProviderType.AI_CLOUD,
        defaultTimeoutMs: 20000,
        capabilities: [
          {
            capability: ProviderCapability.STREAMING,
            metadata: { capabilityId: "c1", supportsStreaming: true, supportsVision: false, supportsImageGeneration: false, supportsFunctionCalling: false, supportsVideo: false, supportsBatching: false },
          },
          {
            capability: ProviderCapability.VISION,
            metadata: { capabilityId: "c2", supportsStreaming: false, supportsVision: true, supportsImageGeneration: false, supportsFunctionCalling: false, supportsVideo: false, supportsBatching: false },
          },
        ],
      }),
      configuration: createProviderConfiguration({ providerId: "anthropic-claude", model: "claude-3-5-sonnet" }),
    });

    registry.registerProvider(groq);
    registry.registerProvider(anthropic);

    lifecycle.registerProvider("groq-cloud");
    lifecycle.initializeProvider("groq-cloud");
    lifecycle.markReady("groq-cloud");

    lifecycle.registerProvider("anthropic-claude");
    lifecycle.initializeProvider("anthropic-claude");
    lifecycle.markReady("anthropic-claude");

    health.recordSuccess("groq-cloud", 20);
    health.recordSuccess("anthropic-claude", 100);

    const selector = new ProviderSelector(registry, health, circuit, lifecycle);

    // Request requires VISION capability -> groq-cloud rejected, anthropic-claude selected
    const result = selector.selectProvider(ProviderSelectionPolicy.WEIGHTED_SCORE, {
      requiredCapabilities: [ProviderCapability.VISION],
    });

    expect(result.selectedProvider.providerId).toBe("anthropic-claude");
    expect(result.rejectedProviders.length).toBe(1);
    expect(result.rejectedProviders[0].providerId).toBe("groq-cloud");
  });

  it("should produce bit-for-bit identical selection results across 100 replay runs", () => {
    const runSelection = () => {
      const registry = new ProviderRegistry();
      const health = new ProviderHealthManager();
      const circuit = new CircuitBreakerEngine();
      const lifecycle = new ProviderLifecycleManager();

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

      lifecycle.registerProvider("p1");
      lifecycle.initializeProvider("p1");
      lifecycle.markReady("p1");

      lifecycle.registerProvider("p2");
      lifecycle.initializeProvider("p2");
      lifecycle.markReady("p2");

      health.recordSuccess("p1", 80);
      health.recordSuccess("p2", 120);

      const selector = new ProviderSelector(registry, health, circuit, lifecycle);
      return selector.selectProvider(ProviderSelectionPolicy.WEIGHTED_SCORE).selectedProvider.providerId;
    };

    const firstResult = runSelection();
    for (let i = 0; i < 100; i++) {
      expect(runSelection()).toBe(firstResult);
    }
  });
});
