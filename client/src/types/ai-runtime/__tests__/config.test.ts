import { describe, it, expect } from "vitest";
import { ModelTier } from "../types";
import { ConfigurationError } from "../errors";
import {
  DEFAULT_TIMEOUT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_EXECUTION_LIMITS,
  DEFAULT_FEATURE_FLAGS,
  createDefaultRuntimeConfig,
  createRuntimeConfig,
  validateRuntimeConfig,
} from "../config";

describe("Phase 9.4 Component 6: Runtime Configuration Contracts (config.ts)", () => {
  describe("Default Configuration Constants & Factory", () => {
    it("should export frozen default constants matching specification bounds", () => {
      expect(DEFAULT_TIMEOUT_CONFIG.ttftTimeoutMs).toBe(3000);
      expect(DEFAULT_TIMEOUT_CONFIG.interTokenTimeoutMs).toBe(5000);
      expect(DEFAULT_TIMEOUT_CONFIG.totalExecutionTimeoutMs).toBe(30000);

      expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialBackoffMs).toBe(500);

      expect(DEFAULT_EXECUTION_LIMITS.maxConcurrentRequests).toBe(10);
      expect(DEFAULT_FEATURE_FLAGS.enableStreaming).toBe(true);

      expect(Object.isFrozen(DEFAULT_TIMEOUT_CONFIG)).toBe(true);
      expect(Object.isFrozen(DEFAULT_RETRY_CONFIG)).toBe(true);
      expect(Object.isFrozen(DEFAULT_EXECUTION_LIMITS)).toBe(true);
      expect(Object.isFrozen(DEFAULT_FEATURE_FLAGS)).toBe(true);
    });

    it("createDefaultRuntimeConfig should produce a valid, recursively frozen configuration", () => {
      const config = createDefaultRuntimeConfig();

      expect(config.timeouts.ttftTimeoutMs).toBe(3000);
      expect(config.retries.maxAttempts).toBe(3);
      expect(config.limits.maxConcurrentRequests).toBe(10);
      expect(config.featureFlags.enableStreaming).toBe(true);
      expect(config.defaultModelTier).toBe(ModelTier.STANDARD);

      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.timeouts)).toBe(true);
      expect(Object.isFrozen(config.retries)).toBe(true);
      expect(Object.isFrozen(config.limits)).toBe(true);
      expect(Object.isFrozen(config.featureFlags)).toBe(true);
      expect(Object.isFrozen(config.securityPolicy)).toBe(true);
    });
  });

  describe("Custom Configuration Overrides & Merging", () => {
    it("should allow overriding specific timeout and retry parameters while retaining defaults", () => {
      const config = createRuntimeConfig({
        timeouts: { ttftTimeoutMs: 1500 },
        retries: { maxAttempts: 5 },
        defaultModelTier: ModelTier.FAST,
      });

      expect(config.timeouts.ttftTimeoutMs).toBe(1500);
      expect(config.timeouts.interTokenTimeoutMs).toBe(5000); // Retained default
      expect(config.retries.maxAttempts).toBe(5);
      expect(config.retries.initialBackoffMs).toBe(500); // Retained default
      expect(config.defaultModelTier).toBe(ModelTier.FAST);
    });

    it("should allow disabling specific feature flags", () => {
      const config = createRuntimeConfig({
        featureFlags: { enableLocalFallback: false },
      });

      expect(config.featureFlags.enableLocalFallback).toBe(false);
      expect(config.featureFlags.enableStreaming).toBe(true); // Retained default
    });
  });

  describe("Validation Invariants & Fail-Fast Error Enforcement", () => {
    it("should throw ConfigurationError if ttftTimeoutMs is invalid", () => {
      expect(() => {
        createRuntimeConfig({ timeouts: { ttftTimeoutMs: 0 } });
      }).toThrow(ConfigurationError);

      try {
        createRuntimeConfig({ timeouts: { ttftTimeoutMs: -100 } });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("InvalidTTFTTimeout");
      }
    });

    it("should throw ConfigurationError if totalExecutionTimeoutMs is less than ttftTimeoutMs", () => {
      try {
        createRuntimeConfig({
          timeouts: { ttftTimeoutMs: 5000, totalExecutionTimeoutMs: 2000 },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("InvalidTotalTimeout");
      }
    });

    it("should throw ConfigurationError if maxAttempts is less than 1", () => {
      try {
        createRuntimeConfig({ retries: { maxAttempts: 0 } });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("InvalidMaxAttempts");
      }
    });

    it("should throw ConfigurationError if maxBackoffMs is less than initialBackoffMs", () => {
      try {
        createRuntimeConfig({
          retries: { initialBackoffMs: 2000, maxBackoffMs: 1000 },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("InvalidMaxBackoff");
      }
    });

    it("should throw ConfigurationError if backoffFactor is less than 1.0", () => {
      try {
        createRuntimeConfig({ retries: { backoffFactor: 0.5 } });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("InvalidBackoffFactor");
      }
    });

    it("should throw ConfigurationError if execution limits are non-positive", () => {
      try {
        createRuntimeConfig({ limits: { maxConcurrentRequests: 0 } });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("InvalidMaxConcurrent");
      }
    });

    it("validateRuntimeConfig should throw ConfigurationError when passed null", () => {
      expect(() => {
        validateRuntimeConfig(null as never);
      }).toThrow("AIRuntimeConfig object cannot be null or undefined.");
    });
  });

  describe("Deep Freeze & Immutability Enforcement", () => {
    it("should prevent modification of configuration properties at runtime", () => {
      const config = createDefaultRuntimeConfig();

      expect(() => {
        // @ts-expect-error mutating frozen property
        (config.timeouts as { ttftTimeoutMs: number }).ttftTimeoutMs = 99999;
      }).toThrow();

      expect(() => {
        // @ts-expect-error mutating frozen property
        (config.featureFlags as { enableStreaming: boolean }).enableStreaming = false;
      }).toThrow();
    });
  });
});
