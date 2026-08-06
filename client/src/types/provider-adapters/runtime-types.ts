/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 6 Component: Runtime Contracts (`runtime-types.ts`)
 *
 * @file runtime-types.ts
 * @description Immutable interface declarations defining runtime status, diagnostics reports,
 * configuration, and system-wide runtime snapshots for the UnifiedAdapterRuntime.
 *
 * @module @aether/provider-adapters/runtime-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import type { ProviderVendor, AdapterStatus, AuthenticationType } from "./enums";
import type { ProviderModelCapabilities } from "./adapter-types";

/**
 * Operational state of the UnifiedAdapterRuntime instance.
 */
export type RuntimeStatus =
  | "UNINITIALIZED"
  | "INITIALIZING"
  | "READY"
  | "DEGRADED"
  | "FAULTED"
  | "DISPOSED";

/**
 * Diagnostic health report for an individual AI provider adapter.
 */
export interface ProviderDiagnosticsReport {
  readonly providerId: string;
  readonly adapterId: string;
  readonly vendor: ProviderVendor;
  readonly status: AdapterStatus;
  readonly supportedModels: ReadonlyArray<string>;
  readonly capabilities: Readonly<ProviderModelCapabilities>;
  readonly authType: AuthenticationType;
  readonly hasCredentialRegistered: boolean;
  readonly isHealthy: boolean;
  readonly isRuntimeReady: boolean;
  readonly timestamp: number;
}

/**
 * Immutable system-wide runtime snapshot object combining status, registered adapters,
 * credentials, diagnostics, and timestamp.
 */
export interface RuntimeSnapshot {
  readonly status: RuntimeStatus;
  readonly registeredAdapterIds: ReadonlyArray<string>;
  readonly registeredCredentialIds: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<ProviderDiagnosticsReport>;
  readonly timestamp: number;
}

/**
 * Configuration options for initializing the UnifiedAdapterRuntime.
 */
export interface RuntimeConfiguration {
  readonly autoRegisterDefaultAdapters: boolean;
  readonly autoFreeze: boolean;
  readonly defaultTimeoutMs: number;
}
