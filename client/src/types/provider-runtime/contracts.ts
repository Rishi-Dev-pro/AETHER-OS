/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Foundation Component: Runtime Contracts (`contracts.ts`)
 *
 * @file contracts.ts
 * @description Strongly-typed, immutable runtime contract interfaces governing registrations,
 * validation results, initialization outputs, execution context payloads, statistics, and environment constraints.
 *
 * @module @aether/provider-runtime/contracts
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import {
  ProviderType,
  ProviderLifecycleState,
  ProviderCapability,
  ProviderSelectionPolicy,
  ConfigurationSource,
} from "./enums";
import type { ProviderMetadata, ProviderIdentity } from "./provider-types";
import type { ProviderConfiguration } from "./provider-configuration";

export type { ProviderIdentity };

/**
 * Reference contract pointing to a specific ProviderConfiguration.
 */
export interface ProviderConfigurationReference {
  readonly configurationId: string;
  readonly providerId: string;
  readonly source: ConfigurationSource;
}

/**
 * Declaration of required capability demands for provider evaluation.
 */
export interface ProviderCapabilityDeclaration {
  readonly capability: ProviderCapability | string;
  readonly isMandatory: boolean;
  readonly minVersion?: string;
}

/**
 * Host operating environment descriptor.
 */
export interface ProviderEnvironment {
  readonly os: string;
  readonly runtimeVersion: string;
  readonly environmentVariables?: Readonly<Record<string, string>>;
}

/**
 * Constraints imposed on provider execution contexts.
 */
export interface ProviderConstraints {
  readonly maxTimeoutMs: number;
  readonly allowedCapabilities: readonly string[];
  readonly isSandboxed: boolean;
}

/**
 * Operational metric statistics snapshot.
 */
export interface ProviderStatistics {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly averageLatencyMs: number;
  readonly activeSessionsCount: number;
}

/**
 * Validation result output envelope.
 */
export interface ProviderValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly validatedAtMs: number;
}

/**
 * Initialization execution result snapshot.
 */
export interface ProviderInitializationResult {
  readonly providerId: string;
  readonly isInitialized: boolean;
  readonly state: ProviderLifecycleState;
  readonly initializedAtMs: number;
  readonly details?: string;
}

/**
 * Provider catalog registration entry contract.
 */
export interface ProviderRegistration {
  readonly registrationId: string;
  readonly providerId: string;
  readonly registeredAtMs: number;
  readonly metadata: Readonly<ProviderMetadata>;
}

/**
 * Deeply immutable provider execution context injected into every adapter call.
 */
export interface ProviderExecutionContext {
  readonly requestId: string;
  readonly executionId: string;
  readonly executionUnitId: string;
  readonly sessionId?: string;
  readonly providerId: string;
  readonly providerType: ProviderType;
  readonly selectionPolicy: ProviderSelectionPolicy;
  readonly executionPriority: number;
  readonly sandbox: Readonly<{
    readonly sandboxId: string;
    readonly allowedPermissions: readonly string[];
    readonly allowedCapabilities: readonly string[];
  }>;
  readonly permissions: readonly string[];
  readonly timeoutMs: number;
  readonly abortSignal?: AbortSignal;
  readonly credentialReference?: string;
  readonly retryCount: number;
  readonly providerConfigurationReference: string;
}

/**
 * Combined runtime execution payload incorporating context, configuration, and optional session handle.
 */
export interface ProviderRuntimeContext {
  readonly executionContext: Readonly<ProviderExecutionContext>;
  readonly configuration: Readonly<ProviderConfiguration>;
  readonly sessionHandle?: unknown;
}

/**
 * Fundamental provider adapter runtime interface contract.
 */
export interface ProviderContract {
  readonly metadata: Readonly<ProviderMetadata>;
  readonly configuration: Readonly<ProviderConfiguration>;
  readonly lifecycleState: ProviderLifecycleState;
  readonly isAvailable: boolean;
}
