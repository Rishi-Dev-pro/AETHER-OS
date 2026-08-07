/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 1 Component: Barrel Export (`index.ts`)
 *
 * @file index.ts
 * @description Public API barrel export for Phase 9.11 Runtime Integration Layer.
 *
 * @module @aether/runtime
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 1
 */

// Runtime Bootstrap Engine
export { bootstrapRuntime } from "./runtime-bootstrap";

// Runtime Singleton Container
export {
  getRuntime,
  hasRuntime,
  resetRuntime,
  destroyRuntime,
  type RuntimeInstance,
} from "./runtime-singleton";

// Environment Validation Engine
export {
  validateEnvironment,
  validateProvider,
  validateCredentials,
  validateConfiguration,
  readRuntimeEnvironment,
  detectConfiguredProviders,
  type CredentialStatus,
  type RuntimeEnvironmentVariables,
  type ProviderValidationResult,
  type CredentialValidationResult,
  type EnvironmentValidationReport,
} from "./runtime-environment";

// Diagnostics Engine
export {
  createDiagnostics,
  runtimeHealth,
  providerStatus,
  runtimeSummary,
  type ProviderStatusReport,
  type RuntimeHealthSummary,
  type RuntimeSummaryReport,
  type RuntimeDiagnosticsReport,
} from "./runtime-diagnostics";

// Status Machine & Snapshot Model
export {
  getStatus,
  setStatus,
  resetStatus,
  createSnapshot,
  RuntimeStatus,
  type RuntimeSnapshot,
} from "./runtime-status";

// Credential Loader
export {
  bootstrapCredentials,
  registerEnvironmentCredentials,
  generateBootstrapReport,
  type BootstrapReport,
} from "./credential-bootstrap";

// Exception Hierarchy
export {
  RuntimeIntegrationError,
  RuntimeBootstrapError,
  RuntimeEnvironmentError,
  RuntimeInitializationError,
  RuntimeSingletonError,
  RuntimeStatusError,
  RuntimeDiagnosticsError,
} from "./runtime-errors";

export {
  BootstrapCredentialError,
  EnvironmentValidationError,
  DuplicateCredentialBootstrapError,
} from "./bootstrap-errors";
