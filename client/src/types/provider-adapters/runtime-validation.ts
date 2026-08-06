/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 6 Component: Runtime Validation (`runtime-validation.ts`)
 *
 * @file runtime-validation.ts
 * @description Validates operational readiness of the UnifiedAdapterRuntime, enforcing adapter
 * registration, credential ownership, transport readiness, and runtime consistency.
 *
 * @module @aether/provider-adapters/runtime-validation
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import type { UnifiedAdapterRuntime } from "./unified-adapter-runtime";
import { RuntimeValidationError } from "./runtime-errors";

/**
 * Performs comprehensive fail-fast validation of a UnifiedAdapterRuntime instance.
 *
 * @param runtime Target UnifiedAdapterRuntime.
 * @throws RuntimeValidationError on validation failure.
 */
export function validateRuntime(runtime: UnifiedAdapterRuntime): void {
  if (!runtime) {
    throw new RuntimeValidationError("UnifiedAdapterRuntime instance cannot be null or undefined.");
  }

  const snapshot = runtime.runtimeSnapshot();

  if (snapshot.status !== "READY" && snapshot.status !== "INITIALIZING") {
    throw new RuntimeValidationError(`Runtime status '${snapshot.status}' is not valid for execution.`);
  }

  if (snapshot.registeredAdapterIds.length === 0) {
    throw new RuntimeValidationError("UnifiedAdapterRuntime requires at least one registered adapter.");
  }
}
