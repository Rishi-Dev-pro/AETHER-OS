/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Foundation Component: Factory Constructors (`factories.ts`)
 *
 * @file factories.ts
 * @description Immutable factory functions for constructing metadata, configuration,
 * runtime contracts, registrations, validation results, and execution contexts.
 * Every returned object is recursively frozen via deepFreeze().
 *
 * @module @aether/provider-runtime/factories
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import {
  ProviderType,
  ProviderLifecycleState,
  ProviderSelectionPolicy,
  ConfigurationSource,
} from "./enums";
import {
  InvalidProviderMetadataError,
  InvalidProviderConfigurationError,
  ProviderContractError,
  ProviderRegistrationError,
} from "./errors";
import type { ProviderMetadata } from "./provider-types";
import {
  verifyNoSecrets,
} from "./provider-configuration";
import type { ProviderConfiguration } from "./provider-configuration";
import type {
  ProviderContract,
  ProviderRegistration,
  ProviderValidationResult,
  ProviderExecutionContext,
} from "./contracts";

/**
 * Recursively freezes an object and all nested properties to guarantee complete immutability.
 *
 * @template T
 * @param obj Target object to deeply freeze.
 * @param seen Set tracking visited objects to handle circular references safely.
 * @returns Deeply frozen object.
 */
export function deepFreeze<T>(obj: T, seen: Set<unknown> = new Set()): Readonly<T> {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj as Readonly<T>;
  }

  if (seen.has(obj)) {
    return obj as Readonly<T>;
  }
  seen.add(obj);

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreeze(item, seen);
    }
  } else {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key];
      if (val !== null && typeof val === "object") {
        deepFreeze(val, seen);
      }
    }
  }

  return obj as Readonly<T>;
}

/**
 * Constructs and validates a deeply frozen ProviderMetadata object.
 *
 * @param input Partial ProviderMetadata.
 * @returns Deeply frozen ProviderMetadata.
 * @throws InvalidProviderMetadataError if required invariants are broken.
 */
export function createProviderMetadata(
  input: Partial<ProviderMetadata>
): Readonly<ProviderMetadata> {
  if (!input.providerId || typeof input.providerId !== "string" || input.providerId.trim() === "") {
    throw new InvalidProviderMetadataError("Provider metadata requires a non-empty providerId.");
  }
  if (!input.vendor || typeof input.vendor !== "string" || input.vendor.trim() === "") {
    throw new InvalidProviderMetadataError("Provider metadata requires a non-empty vendor.");
  }
  if (!input.version || typeof input.version !== "string" || input.version.trim() === "") {
    throw new InvalidProviderMetadataError("Provider metadata requires a non-empty version.");
  }
  if (!input.defaultTimeoutMs || typeof input.defaultTimeoutMs !== "number" || input.defaultTimeoutMs <= 0) {
    throw new InvalidProviderMetadataError("Provider metadata defaultTimeoutMs must be a positive number.");
  }

  const providerType = input.providerType ?? ProviderType.AI_CLOUD;
  const minFrameworkVersion = input.minFrameworkVersion ?? "1.0.0";
  const supportsWarmup = input.supportsWarmup ?? false;

  const identity = input.identity ?? {
    providerId: input.providerId,
    vendor: input.vendor,
    name: input.providerId,
    version: input.version,
  };

  const capabilities = input.capabilities ? [...input.capabilities] : [];
  const limits = input.limits ?? { maxConcurrentExecutions: 10 };

  const metadata: ProviderMetadata = {
    identity,
    providerId: input.providerId,
    providerType,
    version: input.version,
    minFrameworkVersion,
    vendor: input.vendor,
    capabilities,
    defaultTimeoutMs: input.defaultTimeoutMs,
    supportsWarmup,
    limits,
  };

  return deepFreeze(metadata);
}

/**
 * Constructs and validates a deeply frozen ProviderConfiguration object.
 * Guarantees zero secret presence.
 *
 * @param input Partial ProviderConfiguration.
 * @returns Deeply frozen ProviderConfiguration.
 * @throws InvalidProviderConfigurationError if invariants or secret isolation rules are violated.
 */
export function createProviderConfiguration(
  input: Partial<ProviderConfiguration>
): Readonly<ProviderConfiguration> {
  if (!input.providerId || typeof input.providerId !== "string" || input.providerId.trim() === "") {
    throw new InvalidProviderConfigurationError("ProviderConfiguration requires a non-empty providerId.");
  }
  if (!input.model || typeof input.model !== "string" || input.model.trim() === "") {
    throw new InvalidProviderConfigurationError("ProviderConfiguration requires a non-empty model.");
  }

  const timeoutMs = input.timeoutMs ?? 30000;
  if (typeof timeoutMs !== "number" || timeoutMs <= 0) {
    throw new InvalidProviderConfigurationError("ProviderConfiguration timeoutMs must be a positive number.");
  }

  if (input.temperature !== undefined) {
    if (typeof input.temperature !== "number" || input.temperature < 0 || input.temperature > 2) {
      throw new InvalidProviderConfigurationError("ProviderConfiguration temperature must be between 0 and 2.");
    }
  }

  if (input.maxTokens !== undefined) {
    if (typeof input.maxTokens !== "number" || input.maxTokens <= 0) {
      throw new InvalidProviderConfigurationError("ProviderConfiguration maxTokens must be a positive number.");
    }
  }

  // Secret isolation verification
  verifyNoSecrets(input as Record<string, unknown>);

  const configurationId = input.configurationId ?? `cfg_${input.providerId}_${Date.now()}`;
  const source = input.source ?? ConfigurationSource.DEFAULT;

  const config: ProviderConfiguration = {
    configurationId,
    providerId: input.providerId,
    model: input.model,
    timeoutMs,
    source,
    ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
    ...(input.baseURL ? { baseURL: input.baseURL } : {}),
    ...(input.endpoint ? { endpoint: input.endpoint } : {}),
    ...(input.proxy ? { proxy: input.proxy } : {}),
    ...(input.region ? { region: input.region } : {}),
    ...(input.retries !== undefined ? { retries: input.retries } : {}),
    ...(input.headers ? { headers: { ...input.headers } } : {}),
    ...(input.customSettings ? { customSettings: { ...input.customSettings } } : {}),
  };

  return deepFreeze(config);
}

/**
 * Constructs and validates a deeply frozen ProviderContract object.
 *
 * @param input Partial ProviderContract.
 * @returns Deeply frozen ProviderContract.
 * @throws ProviderContractError if invariants are violated.
 */
export function createProviderContract(
  input: Partial<ProviderContract>
): Readonly<ProviderContract> {
  if (!input.metadata) {
    throw new ProviderContractError("ProviderContract requires metadata.");
  }
  if (!input.configuration) {
    throw new ProviderContractError("ProviderContract requires configuration.");
  }

  const lifecycleState = input.lifecycleState ?? ProviderLifecycleState.READY;
  const isAvailable = input.isAvailable ?? true;

  const contract: ProviderContract = {
    metadata: input.metadata,
    configuration: input.configuration,
    lifecycleState,
    isAvailable,
  };

  return deepFreeze(contract);
}

/**
 * Constructs and validates a deeply frozen ProviderRegistration object.
 *
 * @param input Partial ProviderRegistration.
 * @returns Deeply frozen ProviderRegistration.
 * @throws ProviderRegistrationError if invariants are violated.
 */
export function createProviderRegistration(
  input: Partial<ProviderRegistration>
): Readonly<ProviderRegistration> {
  if (!input.providerId || typeof input.providerId !== "string" || input.providerId.trim() === "") {
    throw new ProviderRegistrationError("ProviderRegistration requires a non-empty providerId.");
  }
  if (!input.metadata) {
    throw new ProviderRegistrationError("ProviderRegistration requires metadata.");
  }

  const registrationId = input.registrationId ?? `reg_${input.providerId}_${Date.now()}`;
  const registeredAtMs = input.registeredAtMs ?? Date.now();

  const registration: ProviderRegistration = {
    registrationId,
    providerId: input.providerId,
    registeredAtMs,
    metadata: input.metadata,
  };

  return deepFreeze(registration);
}

/**
 * Constructs and validates a deeply frozen ProviderValidationResult object.
 *
 * @param input Partial ProviderValidationResult.
 * @returns Deeply frozen ProviderValidationResult.
 */
export function createProviderValidationResult(
  input: Partial<ProviderValidationResult> = {}
): Readonly<ProviderValidationResult> {
  const result: ProviderValidationResult = {
    isValid: input.isValid ?? true,
    errors: input.errors ? [...input.errors] : [],
    warnings: input.warnings ? [...input.warnings] : [],
    validatedAtMs: input.validatedAtMs ?? Date.now(),
  };

  return deepFreeze(result);
}

/**
 * Constructs and validates a deeply frozen ProviderExecutionContext object.
 *
 * @param input Partial ProviderExecutionContext.
 * @returns Deeply frozen ProviderExecutionContext.
 */
export function createProviderExecutionContext(
  input: Partial<ProviderExecutionContext>
): Readonly<ProviderExecutionContext> {
  if (!input.requestId || typeof input.requestId !== "string") {
    throw new InvalidProviderConfigurationError("ProviderExecutionContext requires requestId.");
  }
  if (!input.providerId || typeof input.providerId !== "string") {
    throw new InvalidProviderConfigurationError("ProviderExecutionContext requires providerId.");
  }

  const context: ProviderExecutionContext = {
    requestId: input.requestId,
    executionId: input.executionId ?? `exec_${Date.now()}`,
    executionUnitId: input.executionUnitId ?? `unit_${Date.now()}`,
    sessionId: input.sessionId,
    providerId: input.providerId,
    providerType: input.providerType ?? ProviderType.AI_CLOUD,
    selectionPolicy: input.selectionPolicy ?? ProviderSelectionPolicy.FIRST_AVAILABLE,
    executionPriority: input.executionPriority ?? 1,
    sandbox: input.sandbox ?? {
      sandboxId: "sbx_default",
      allowedPermissions: [],
      allowedCapabilities: [],
    },
    permissions: input.permissions ? [...input.permissions] : [],
    timeoutMs: input.timeoutMs ?? 30000,
    abortSignal: input.abortSignal,
    credentialReference: input.credentialReference,
    retryCount: input.retryCount ?? 0,
    providerConfigurationReference: input.providerConfigurationReference ?? `cfg_ref_${input.providerId}`,
  };

  return deepFreeze(context);
}
