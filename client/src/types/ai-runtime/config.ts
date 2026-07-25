/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 6: Runtime Configuration Contracts (`config.ts`)
 *
 * @file config.ts
 * @description Immutable runtime configuration model, default settings, timeout/retry contracts,
 * execution limit envelopes, and fail-fast validation logic for Phase 9.4 AI Runtime.
 *
 * @module @aether/ai-runtime/config
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT
 */

import { ModelTier } from "./types";
import { ConfigurationError } from "./errors";
import { type SecurityPolicy, createSecurityPolicy } from "./security";
import { deepFreeze } from "./ai-request";

// ============================================================================
// 1. CONFIGURATION CONTRACT INTERFACES
// ============================================================================

/**
 * Immutable multi-tier timeout thresholds for request execution.
 */
export interface TimeoutConfig {
  /** Time-To-First-Token timeout limit in milliseconds */
  readonly ttftTimeoutMs: number;
  /** Maximum inter-token latency window during streaming in milliseconds */
  readonly interTokenTimeoutMs: number;
  /** Hard upper bound for total request execution lifecycle in milliseconds */
  readonly totalExecutionTimeoutMs: number;
}

/**
 * Immutable exponential backoff and retry policy settings.
 */
export interface RetryConfig {
  /** Maximum total execution attempts (1 + retries) */
  readonly maxAttempts: number;
  /** Initial backoff delay in milliseconds */
  readonly initialBackoffMs: number;
  /** Maximum upper bound for backoff delay in milliseconds */
  readonly maxBackoffMs: number;
  /** Exponential multiplier factor applied per retry attempt */
  readonly backoffFactor: number;
  /** Flag enabling randomized full jitter to prevent stampeding herd issues */
  readonly enableJitter: boolean;
}

/**
 * Immutable subsystem concurrency and capacity limits.
 */
export interface ExecutionLimitsConfig {
  /** Maximum allowed concurrent network transport requests */
  readonly maxConcurrentRequests: number;
  /** Maximum capacity limit for Request Scheduler priority queues */
  readonly maxQueueDepth: number;
  /** Maximum allowable completion output tokens ceiling */
  readonly maxOutputTokensCeiling: number;
}

/**
 * Immutable feature flag toggles for runtime capabilities.
 */
export interface FeatureFlagsConfig {
  /** Master toggle for incremental token delta streaming */
  readonly enableStreaming: boolean;
  /** Master toggle for provider circuit breaker monitoring */
  readonly enableCircuitBreaker: boolean;
  /** Master toggle for automatic local model fallback on cloud failure */
  readonly enableLocalFallback: boolean;
  /** Master toggle for structured tool call descriptor normalization */
  readonly enableToolCalling: boolean;
  /** Master toggle for intermediate reasoning/thought token streaming */
  readonly enableThoughtStreaming: boolean;
}

/**
 * Canonical AI Runtime Configuration Contract.
 * Consumed by Provider Registry, Scheduler, Strategy Router, Orchestrator, and Resilience Engine.
 */
export interface AIRuntimeConfig {
  /** Timeout threshold settings */
  readonly timeouts: TimeoutConfig;
  /** Retry and backoff policy settings */
  readonly retries: RetryConfig;
  /** Concurrency and capacity limit settings */
  readonly limits: ExecutionLimitsConfig;
  /** Runtime feature flag settings */
  readonly featureFlags: FeatureFlagsConfig;
  /** Security and privacy policy settings */
  readonly securityPolicy: SecurityPolicy;
  /** Default abstract model tier for un-specified requests */
  readonly defaultModelTier: ModelTier;
}


// ============================================================================
// 2. DEFAULT SYSTEM CONFIGURATION CONSTANTS
// ============================================================================

/** Default system timeout configuration values */
export const DEFAULT_TIMEOUT_CONFIG: Readonly<TimeoutConfig> = Object.freeze({
  ttftTimeoutMs: 3000,
  interTokenTimeoutMs: 5000,
  totalExecutionTimeoutMs: 30000,
});

/** Default system retry configuration values */
export const DEFAULT_RETRY_CONFIG: Readonly<RetryConfig> = Object.freeze({
  maxAttempts: 3,
  initialBackoffMs: 500,
  maxBackoffMs: 10000,
  backoffFactor: 2.0,
  enableJitter: true,
});

/** Default system execution limit values */
export const DEFAULT_EXECUTION_LIMITS: Readonly<ExecutionLimitsConfig> = Object.freeze({
  maxConcurrentRequests: 10,
  maxQueueDepth: 100,
  maxOutputTokensCeiling: 16384,
});

/** Default system feature flag settings */
export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlagsConfig> = Object.freeze({
  enableStreaming: true,
  enableCircuitBreaker: true,
  enableLocalFallback: true,
  enableToolCalling: true,
  enableThoughtStreaming: true,
});


// ============================================================================
// 3. FACTORIES & VALIDATOR UTILITIES
// ============================================================================

/**
 * Validates an AIRuntimeConfig instance against mandatory invariants.
 * Throws ConfigurationError immediately upon any invariant violation.
 *
 * @throws {ConfigurationError} If any validation rule fails.
 */
export function validateRuntimeConfig(config: AIRuntimeConfig): void {
  if (!config) {
    throw new ConfigurationError({
      subCode: "NullConfig",
      message: "AIRuntimeConfig object cannot be null or undefined.",
    });
  }

  // 1. Timeouts Validation
  if (!config.timeouts) {
    throw new ConfigurationError({ subCode: "MissingTimeouts", message: "Config requires a timeouts section." });
  }
  if (config.timeouts.ttftTimeoutMs <= 0) {
    throw new ConfigurationError({ subCode: "InvalidTTFTTimeout", message: "ttftTimeoutMs must be > 0." });
  }
  if (config.timeouts.interTokenTimeoutMs <= 0) {
    throw new ConfigurationError({ subCode: "InvalidInterTokenTimeout", message: "interTokenTimeoutMs must be > 0." });
  }
  if (config.timeouts.totalExecutionTimeoutMs < config.timeouts.ttftTimeoutMs) {
    throw new ConfigurationError({
      subCode: "InvalidTotalTimeout",
      message: "totalExecutionTimeoutMs cannot be less than ttftTimeoutMs.",
    });
  }

  // 2. Retries Validation
  if (!config.retries) {
    throw new ConfigurationError({ subCode: "MissingRetries", message: "Config requires a retries section." });
  }
  if (config.retries.maxAttempts < 1 || !Number.isInteger(config.retries.maxAttempts)) {
    throw new ConfigurationError({ subCode: "InvalidMaxAttempts", message: "maxAttempts must be an integer >= 1." });
  }
  if (config.retries.initialBackoffMs <= 0) {
    throw new ConfigurationError({ subCode: "InvalidInitialBackoff", message: "initialBackoffMs must be > 0." });
  }
  if (config.retries.maxBackoffMs < config.retries.initialBackoffMs) {
    throw new ConfigurationError({
      subCode: "InvalidMaxBackoff",
      message: "maxBackoffMs cannot be less than initialBackoffMs.",
    });
  }
  if (config.retries.backoffFactor < 1.0) {
    throw new ConfigurationError({ subCode: "InvalidBackoffFactor", message: "backoffFactor must be >= 1.0." });
  }

  // 3. Limits Validation
  if (!config.limits) {
    throw new ConfigurationError({ subCode: "MissingLimits", message: "Config requires a limits section." });
  }
  if (config.limits.maxConcurrentRequests < 1 || !Number.isInteger(config.limits.maxConcurrentRequests)) {
    throw new ConfigurationError({ subCode: "InvalidMaxConcurrent", message: "maxConcurrentRequests must be an integer >= 1." });
  }
  if (config.limits.maxQueueDepth < 1 || !Number.isInteger(config.limits.maxQueueDepth)) {
    throw new ConfigurationError({ subCode: "InvalidMaxQueueDepth", message: "maxQueueDepth must be an integer >= 1." });
  }
  if (config.limits.maxOutputTokensCeiling < 1 || !Number.isInteger(config.limits.maxOutputTokensCeiling)) {
    throw new ConfigurationError({ subCode: "InvalidTokensCeiling", message: "maxOutputTokensCeiling must be an integer >= 1." });
  }

  // 4. Feature Flags & Security Policy Validation
  if (!config.featureFlags) {
    throw new ConfigurationError({ subCode: "MissingFeatureFlags", message: "Config requires a featureFlags section." });
  }
  if (!config.securityPolicy) {
    throw new ConfigurationError({ subCode: "MissingSecurityPolicy", message: "Config requires a securityPolicy section." });
  }

  // 5. Default Model Tier Validation
  if (!config.defaultModelTier || !Object.values(ModelTier).includes(config.defaultModelTier)) {
    throw new ConfigurationError({ subCode: "InvalidDefaultModelTier", message: "Config requires a valid defaultModelTier." });
  }
}

/**
 * Partial override interface for constructing customized AIRuntimeConfig instances.
 */
export interface CreateRuntimeConfigParams {
  readonly timeouts?: Partial<TimeoutConfig>;
  readonly retries?: Partial<RetryConfig>;
  readonly limits?: Partial<ExecutionLimitsConfig>;
  readonly featureFlags?: Partial<FeatureFlagsConfig>;
  readonly securityPolicy?: SecurityPolicy;
  readonly defaultModelTier?: ModelTier;
}

/**
 * Factory function creating a canonical, recursively frozen AIRuntimeConfig instance.
 * Applies standard system defaults, merges custom overrides, and executes fail-fast validation.
 *
 * @throws {ConfigurationError} If merged configuration violates any validation invariant.
 */
export function createRuntimeConfig(params: CreateRuntimeConfigParams = {}): Readonly<AIRuntimeConfig> {
  const mergedTimeouts: TimeoutConfig = {
    ...DEFAULT_TIMEOUT_CONFIG,
    ...params.timeouts,
  };

  const mergedRetries: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...params.retries,
  };

  const mergedLimits: ExecutionLimitsConfig = {
    ...DEFAULT_EXECUTION_LIMITS,
    ...params.limits,
  };

  const mergedFeatureFlags: FeatureFlagsConfig = {
    ...DEFAULT_FEATURE_FLAGS,
    ...params.featureFlags,
  };

  const securityPolicy = params.securityPolicy ?? createSecurityPolicy();
  const defaultModelTier = params.defaultModelTier ?? ModelTier.STANDARD;

  const rawConfig: AIRuntimeConfig = {
    timeouts: mergedTimeouts,
    retries: mergedRetries,
    limits: mergedLimits,
    featureFlags: mergedFeatureFlags,
    securityPolicy,
    defaultModelTier,
  };

  // Fail-fast validation check
  validateRuntimeConfig(rawConfig);

  // Enforce runtime deep immutability
  return deepFreeze(rawConfig);
}

/**
 * Returns a canonical default AIRuntimeConfig instance.
 */
export function createDefaultRuntimeConfig(): Readonly<AIRuntimeConfig> {
  return createRuntimeConfig({});
}
