import { describe, it, expect } from "vitest";
import { ModelTier, PrivacyMode, CircuitState } from "../types";
import { ConfigurationError } from "../errors";
import { createProviderCapabilities } from "../provider-plugin";
import {
  createDefaultRoutingTable,
  createModelTierMapping,
  createRoutingTable,
  validateRoutingTable,
  createRoutingContext,
  resolveProvider,
  type RoutingTable,
  type ModelTierMapping,
} from "../strategy-router";

describe("Phase 9.4 Component 11: Strategy Router (strategy-router.ts)", () => {
  describe("Default Routing Table & Factory Invariants", () => {
    it("createDefaultRoutingTable should produce a valid table covering all 5 ModelTiers", () => {
      const table = createDefaultRoutingTable();

      expect(table.mappings[ModelTier.REASONING]).toBeDefined();
      expect(table.mappings[ModelTier.STANDARD]).toBeDefined();
      expect(table.mappings[ModelTier.FAST]).toBeDefined();
      expect(table.mappings[ModelTier.VISION]).toBeDefined();
      expect(table.mappings[ModelTier.LOCAL]).toBeDefined();
      expect(table.mappings[ModelTier.STANDARD].candidates[0].providerId).toBe("gemini");
      expect(table.mappings[ModelTier.LOCAL].candidates[0].providerId).toBe("ollama");
      expect(Object.isFrozen(table)).toBe(true);
    });

    it("createModelTierMapping should throw ConfigurationError if candidates array is empty or contains empty strings", () => {
      expect(() => {
        createModelTierMapping({ modelTier: ModelTier.STANDARD, candidates: [] });
      }).toThrow(ConfigurationError);

      expect(() => {
        createModelTierMapping({
          modelTier: ModelTier.STANDARD,
          candidates: [{ providerId: "", concreteModel: "gpt-4o" }],
        });
      }).toThrow("candidate at index 0 requires non-empty providerId and concreteModel strings.");
    });

    it("createRoutingTable should throw ConfigurationError if any ModelTier is missing", () => {
      const incompleteMappings: Record<string, ModelTierMapping> = {
        [ModelTier.STANDARD]: createModelTierMapping({
          modelTier: ModelTier.STANDARD,
          candidates: [{ providerId: "openai", concreteModel: "gpt-4o" }],
        }),
      };

      expect(() => {
        createRoutingTable({ mappings: incompleteMappings });
      }).toThrow("RoutingTable is missing required mapping for ModelTier");
    });

    it("validateRoutingTable should validate non-null table and throws on null or empty mapping", () => {
      const table = createDefaultRoutingTable();
      expect(() => validateRoutingTable(table)).not.toThrow();

      expect(() => {
        validateRoutingTable(null as unknown as RoutingTable);
      }).toThrow(ConfigurationError);
    });
  });

  describe("RoutingContext Factory & Validation", () => {
    it("should create valid RoutingContext with defaults", () => {
      const ctx = createRoutingContext();

      expect(ctx.modelTier).toBe(ModelTier.STANDARD);
      expect(ctx.privacyMode).toBe(PrivacyMode.STANDARD);
      expect(ctx.circuitStates).toEqual({});
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it("should throw ConfigurationError if modelTier or privacyMode is invalid", () => {
      expect(() => {
        createRoutingContext({ modelTier: "INVALID_TIER" as ModelTier });
      }).toThrow(ConfigurationError);

      expect(() => {
        createRoutingContext({ privacyMode: "INVALID_PRIVACY" as PrivacyMode });
      }).toThrow(ConfigurationError);
    });
  });

  describe("Provider Resolution Logic (resolveProvider)", () => {
    const defaultTable = createDefaultRoutingTable();

    it("should resolve primary candidate deterministically for STANDARD tier", () => {
      const ctx = createRoutingContext({ modelTier: ModelTier.STANDARD });
      const decision = resolveProvider(ctx, defaultTable);

      expect(decision.providerId).toBe("gemini");
      expect(decision.concreteModel).toBe("gemini-2.5-flash");
      expect(decision.fallbackChain.length).toBe(2);
      expect(decision.fallbackChain[0].providerId).toBe("openai");
      expect(decision.reason).toBe("default_primary");
      expect(Object.isFrozen(decision)).toBe(true);
    });

    it("should strictly enforce LOCAL_ONLY privacy mode by overriding tier to LOCAL", () => {
      const ctx = createRoutingContext({
        modelTier: ModelTier.REASONING, // Requested reasoning, but privacy is LOCAL_ONLY
        privacyMode: PrivacyMode.LOCAL_ONLY,
      });

      const decision = resolveProvider(ctx, defaultTable);

      expect(decision.providerId).toBe("ollama");
      expect(decision.concreteModel).toBe("llama3.2:latest");
      expect(decision.reason).toBe("privacy_local_only");
    });

    it("should skip OPEN circuit providers and fallback to next healthy candidate", () => {
      const ctx = createRoutingContext({
        modelTier: ModelTier.STANDARD,
        circuitStates: {
          gemini: CircuitState.OPEN, // Primary candidate gemini is OPEN
        },
      });

      const decision = resolveProvider(ctx, defaultTable);

      expect(decision.providerId).toBe("openai"); // Skipped gemini -> openai
      expect(decision.concreteModel).toBe("gpt-4o");
      expect(decision.fallbackChain[0].providerId).toBe("claude");
      expect(decision.reason).toContain("circuit_breaker_fallback (skipped gemini)");
    });

    it("should skip explicitly disabled providers", () => {
      const ctx = createRoutingContext({
        modelTier: ModelTier.STANDARD,
        disabledProviders: ["gemini", "openai"], // Both disabled
      });

      const decision = resolveProvider(ctx, defaultTable);

      expect(decision.providerId).toBe("claude");
      expect(decision.concreteModel).toBe("claude-3-5-sonnet");
      expect(decision.fallbackChain.length).toBe(0);
      expect(decision.reason).toContain("skipped gemini");
    });

    it("should verify vision capability if providerCapabilitiesMap is supplied", () => {
      const capabilitiesMap = {
        gemini: createProviderCapabilities({ supportsVision: false }), // Gemini vision false
        openai: createProviderCapabilities({ supportsVision: true }),  // OpenAI vision true
        claude: createProviderCapabilities({ supportsVision: true }),
      };

      const ctx = createRoutingContext({ modelTier: ModelTier.VISION });
      const decision = resolveProvider(ctx, defaultTable, capabilitiesMap);

      expect(decision.providerId).toBe("openai"); // Skipped gemini because supportsVision is false
      expect(decision.concreteModel).toBe("gpt-4o");
    });

    it("should throw ConfigurationError if zero eligible providers are available", () => {
      const ctx = createRoutingContext({
        modelTier: ModelTier.STANDARD,
        circuitStates: {
          gemini: CircuitState.OPEN,
          openai: CircuitState.OPEN,
          claude: CircuitState.OPEN,
        },
      });

      expect(() => {
        resolveProvider(ctx, defaultTable);
      }).toThrow("No healthy eligible provider available.");
    });
  });
});
