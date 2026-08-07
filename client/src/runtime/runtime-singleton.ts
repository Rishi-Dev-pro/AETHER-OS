/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 1 Component: Runtime Singleton Container (`runtime-singleton.ts`)
 *
 * @file runtime-singleton.ts
 * @description Thread-safe, deterministic runtime singleton container enforcing exactly one active runtime instance.
 *
 * @module @aether/runtime/runtime-singleton
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 1
 */

import type { UnifiedAdapterRuntime } from "../types/provider-adapters/unified-adapter-runtime";
import type { AdapterManager } from "../types/provider-adapters/adapter-manager";
import type { ProviderManager, CredentialVault } from "../types/provider-runtime";
import type { EnvironmentValidationReport } from "./runtime-environment";
import type { RuntimeDiagnosticsReport } from "./runtime-diagnostics";
import { RuntimeSingletonError } from "./runtime-errors";
import { resetStatus, setStatus, RuntimeStatus } from "./runtime-status";

/**
 * Container holding initialized AI runtime instance and core subsystem references.
 */
export interface RuntimeInstance {
  readonly runtime: UnifiedAdapterRuntime;
  readonly vault: CredentialVault;
  readonly providerManager: ProviderManager;
  readonly adapterManager: AdapterManager;
  readonly environmentReport: EnvironmentValidationReport;
  readonly diagnosticsReport: RuntimeDiagnosticsReport;
}

let activeInstance: Readonly<RuntimeInstance> | null = null;

/**
 * Helper to deeply freeze objects recursively.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Returns true if an active runtime singleton instance exists.
 */
export function hasRuntime(): boolean {
  return activeInstance !== null;
}

/**
 * Retrieves active runtime singleton instance.
 *
 * @returns Deeply frozen RuntimeInstance container.
 * @throws RuntimeSingletonError if runtime has not been initialized.
 */
export function getRuntime(): Readonly<RuntimeInstance> {
  if (!activeInstance) {
    throw new RuntimeSingletonError(
      "Runtime singleton has not been initialized. Call bootstrapRuntime() first."
    );
  }
  return activeInstance;
}

/**
 * Sets the active runtime singleton container fail-fast.
 *
 * @param instance Configured RuntimeInstance.
 * @throws RuntimeSingletonError if an active runtime instance already exists.
 */
export function setRuntimeInstance(instance: RuntimeInstance): void {
  if (activeInstance !== null) {
    throw new RuntimeSingletonError(
      "Runtime singleton instance already exists. Call destroyRuntime() before re-initializing."
    );
  }
  activeInstance = deepFreeze({ ...instance });
}

/**
 * Resets/destroys the active runtime singleton and resets state machine status.
 */
export function resetRuntime(): void {
  if (activeInstance) {
    try {
      setStatus(RuntimeStatus.SHUTTING_DOWN);
      setStatus(RuntimeStatus.STOPPED);
    } catch {
      // Ignore transition errors during forceful cleanup
    }
  }
  activeInstance = null;
  resetStatus();
}

/**
 * Destroys active runtime singleton instance (alias for resetRuntime).
 */
export function destroyRuntime(): void {
  resetRuntime();
}
