import { describe, it, expect } from "vitest";
import { ModelTier, CircuitState, ExecutionResult } from "../types";
import { ConfigurationError } from "../errors";
import {
  createProviderCapabilities,
  createProviderRegistryEntry,
  createProviderHealthStatus,
  type ProviderPlugin,
  type ProviderWireRequest,
  type ProviderWireResponse,
  type ProviderHealthStatus,
} from "../provider-plugin";
import { createAIRequest } from "../ai-request";
import { createAIResponse } from "../ai-response";

describe("Phase 9.4 Component 8: Provider Plugin Contracts (provider-plugin.ts)", () => {
  describe("ProviderCapabilities Factory & Validation", () => {
    it("should create valid ProviderCapabilities with standard defaults", () => {
      const caps = createProviderCapabilities();

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsToolCalls).toBe(false);
      expect(caps.supportsVision).toBe(false);
      expect(caps.supportsJsonMode).toBe(false);
      expect(caps.supportsThoughtStreaming).toBe(false);
      expect(caps.supportedModelTiers).toEqual([ModelTier.STANDARD]);
      expect(caps.maxContextWindowTokens).toBe(128000);
      expect(Object.isFrozen(caps)).toBe(true);
    });

    it("should accept explicit custom capability configurations", () => {
      const caps = createProviderCapabilities({
        supportsStreaming: true,
        supportsToolCalls: true,
        supportsVision: true,
        supportsJsonMode: true,
        supportsThoughtStreaming: true,
        supportedModelTiers: [ModelTier.REASONING, ModelTier.VISION],
        maxContextWindowTokens: 200000,
      });

      expect(caps.supportsToolCalls).toBe(true);
      expect(caps.supportsVision).toBe(true);
      expect(caps.supportedModelTiers).toContain(ModelTier.REASONING);
      expect(caps.maxContextWindowTokens).toBe(200000);
      expect(Object.isFrozen(caps.supportedModelTiers)).toBe(true);
    });

    it("should throw ConfigurationError if supportedModelTiers is empty", () => {
      expect(() => {
        createProviderCapabilities({ supportedModelTiers: [] });
      }).toThrow(ConfigurationError);

      try {
        createProviderCapabilities({ supportedModelTiers: [] });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("EmptySupportedModelTiers");
      }
    });

    it("should throw ConfigurationError if any ModelTier is invalid", () => {
      expect(() => {
        createProviderCapabilities({
          supportedModelTiers: ["INVALID_TIER" as ModelTier],
        });
      }).toThrow("Invalid ModelTier in supportedModelTiers");
    });

    it("should throw ConfigurationError if maxContextWindowTokens is non-positive or non-integer", () => {
      expect(() => {
        createProviderCapabilities({ maxContextWindowTokens: 0 });
      }).toThrow(ConfigurationError);

      expect(() => {
        createProviderCapabilities({ maxContextWindowTokens: -100 });
      }).toThrow(ConfigurationError);

      expect(() => {
        createProviderCapabilities({ maxContextWindowTokens: 12.5 });
      }).toThrow(ConfigurationError);
    });
  });

  describe("ProviderRegistryEntry Factory & Refinement Checks", () => {
    // Dummy plugin implementation for testing
    const mockPlugin: ProviderPlugin = {
      providerId: "mock_provider",
      capabilities: createProviderCapabilities(),
      translateRequest: (req) => ({
        providerId: "mock_provider",
        concreteModel: "mock-model-v1",
        payload: { text: req.promptPackage.userRequest },
        timestamp: Date.now(),
      }),
      executeTransport: async (wireReq) => ({
        providerId: wireReq.providerId,
        statusCode: 200,
        payload: { output: "mock output" },
        headers: { "content-type": "application/json" },
        timestamp: Date.now(),
      }),
      normalizeResponse: (wireResp, requestId) =>
        createAIResponse({
          requestId,
          text: "mock output",
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          latency: { queueDurationMs: 1, connectionDurationMs: 2, timeToFirstTokenMs: 5, totalExecutionDurationMs: 10 },
          diagnostics: { providerId: "mock_provider", concreteModel: "mock-model-v1", attemptCount: 1, circuitState: CircuitState.CLOSED, executionResult: import("../types").ExecutionResult.SUCCESS },
        }),
      healthCheck: async () => createProviderHealthStatus({ providerId: "mock_provider", isHealthy: true, latencyMs: 15 }),
    };

    it("should create a valid ProviderRegistryEntry with defaults and enabled: true", () => {
      const entry = createProviderRegistryEntry({ plugin: mockPlugin });

      expect(entry.plugin.providerId).toBe("mock_provider");
      expect(entry.circuitState).toBe(CircuitState.CLOSED);
      expect(entry.modelTierMap).toEqual({});
      expect(entry.enabled).toBe(true);
      expect(entry.registeredAt).toBeGreaterThan(0);
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it("should support explicit enabled: false flag (Refinement 2)", () => {
      const entry = createProviderRegistryEntry({
        plugin: mockPlugin,
        circuitState: CircuitState.OPEN,
        modelTierMap: { STANDARD: "mock-model-v1" },
        enabled: false,
      });

      expect(entry.enabled).toBe(false);
      expect(entry.circuitState).toBe(CircuitState.OPEN);
      expect(entry.modelTierMap.STANDARD).toBe("mock-model-v1");
      expect(Object.isFrozen(entry.modelTierMap)).toBe(true);
    });

    it("should throw ConfigurationError if plugin is null or undefined", () => {
      expect(() => {
        createProviderRegistryEntry({ plugin: null as unknown as ProviderPlugin });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError if plugin.providerId is empty", () => {
      const invalidPlugin = { ...mockPlugin, providerId: "   " };
      expect(() => {
        createProviderRegistryEntry({ plugin: invalidPlugin });
      }).toThrow("ProviderPlugin must have a non-empty providerId string.");
    });
  });

  describe("ProviderHealthStatus Factory & Invariants", () => {
    it("should create a valid healthy ProviderHealthStatus", () => {
      const status = createProviderHealthStatus({
        providerId: "openai",
        isHealthy: true,
        latencyMs: 42.5,
      });

      expect(status.providerId).toBe("openai");
      expect(status.isHealthy).toBe(true);
      expect(status.latencyMs).toBe(42.5);
      expect(status.errorMessage).toBeUndefined();
      expect(status.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(status)).toBe(true);
    });

    it("should create an unhealthy status with error message", () => {
      const status = createProviderHealthStatus({
        providerId: "gemini",
        isHealthy: false,
        latencyMs: 500,
        errorMessage: "HTTP 503 Service Unavailable",
      });

      expect(status.isHealthy).toBe(false);
      expect(status.errorMessage).toBe("HTTP 503 Service Unavailable");
    });

    it("should throw ConfigurationError if providerId is empty or latencyMs is negative", () => {
      expect(() => {
        createProviderHealthStatus({ providerId: "", isHealthy: true, latencyMs: 10 });
      }).toThrow(ConfigurationError);

      expect(() => {
        createProviderHealthStatus({ providerId: "claude", isHealthy: true, latencyMs: -5 });
      }).toThrow("ProviderHealthStatus latencyMs must be a non-negative number.");
    });
  });

  describe("ProviderPlugin Transport & Translation End-to-End Interface Contract", () => {
    it("should correctly translate AIRequest to ProviderWireRequest and normalize to AIResponse", async () => {
      const plugin: ProviderPlugin = {
        providerId: "test_vendor",
        capabilities: createProviderCapabilities(),
        translateRequest: (req) => ({
          providerId: "test_vendor",
          concreteModel: "test-model-v2",
          payload: { prompt: req.promptPackage.userRequest },
          timestamp: Date.now(),
        }),
        executeTransport: async (wireReq) => ({
          providerId: wireReq.providerId,
          statusCode: 200,
          payload: { response_text: "Hello from test vendor" },
          headers: {},
          timestamp: Date.now(),
        }),
        normalizeResponse: (wireResp, requestId) =>
          createAIResponse({
            requestId,
            text: wireResp.payload.response_text as string,
            usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
            latency: { queueDurationMs: 0, connectionDurationMs: 5, timeToFirstTokenMs: 20, totalExecutionDurationMs: 40 },
            diagnostics: { providerId: "test_vendor", concreteModel: "test-model-v2", attemptCount: 1, circuitState: CircuitState.CLOSED, executionResult: ExecutionResult.SUCCESS },
          }),
        healthCheck: async () => createProviderHealthStatus({ providerId: "test_vendor", isHealthy: true, latencyMs: 10 }),
      };

      const aiReq = createAIRequest({
        requestId: "req_plugin_001",
        promptPackage: {
          systemInstructions: "You are a test helper",
          activeContext: "",
          userRequest: "Say hello",
          metadata: { snapshotId: "snap_1", intentId: "intent_1" },
        },
      });

      const wireReq = plugin.translateRequest(aiReq);
      expect(wireReq.providerId).toBe("test_vendor");
      expect(wireReq.concreteModel).toBe("test-model-v2");

      const wireResp = await plugin.executeTransport(wireReq);
      expect(wireResp.statusCode).toBe(200);

      const aiResp = plugin.normalizeResponse(wireResp, aiReq.metadata.requestId);
      expect(aiResp.metadata.requestId).toBe("req_plugin_001");
      expect(aiResp.text).toBe("Hello from test vendor");

      const health = await plugin.healthCheck();
      expect(health.isHealthy).toBe(true);
    });
  });
});
