/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 1 Component: Runtime Lifecycle Status & Snapshot Model (`runtime-status.ts`)
 *
 * @file runtime-status.ts
 * @description State machine and deeply frozen snapshot model managing runtime lifecycle states.
 *
 * @module @aether/runtime/runtime-status
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 1
 */

import { RuntimeStatusError } from "./runtime-errors";

/**
 * Runtime lifecycle states.
 */
export enum RuntimeStatus {
  UNINITIALIZED = "UNINITIALIZED",
  INITIALIZING = "INITIALIZING",
  READY = "READY",
  FAILED = "FAILED",
  SHUTTING_DOWN = "SHUTTING_DOWN",
  STOPPED = "STOPPED",
}

/**
 * Deeply frozen snapshot container representing active runtime status.
 */
export interface RuntimeSnapshot {
  readonly status: RuntimeStatus;
  readonly initializedAt: number | null;
  readonly lastStateTransition: number;
  readonly activeAdaptersCount: number;
  readonly timestamp: number;
}

let currentStatus: RuntimeStatus = RuntimeStatus.UNINITIALIZED;
let initializedAtTimestamp: number | null = null;
let lastTransitionTimestamp: number = Date.now();

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
 * Allowed status transitions map.
 */
const ALLOWED_TRANSITIONS: Record<RuntimeStatus, ReadonlySet<RuntimeStatus>> = {
  [RuntimeStatus.UNINITIALIZED]: new Set([RuntimeStatus.INITIALIZING]),
  [RuntimeStatus.INITIALIZING]: new Set([RuntimeStatus.READY, RuntimeStatus.FAILED]),
  [RuntimeStatus.READY]: new Set([RuntimeStatus.SHUTTING_DOWN, RuntimeStatus.FAILED]),
  [RuntimeStatus.SHUTTING_DOWN]: new Set([RuntimeStatus.STOPPED, RuntimeStatus.FAILED]),
  [RuntimeStatus.STOPPED]: new Set([RuntimeStatus.UNINITIALIZED, RuntimeStatus.INITIALIZING]),
  [RuntimeStatus.FAILED]: new Set([RuntimeStatus.UNINITIALIZED, RuntimeStatus.INITIALIZING]),
};

/**
 * Retrieves current runtime status.
 */
export function getStatus(): RuntimeStatus {
  return currentStatus;
}

/**
 * Sets runtime status enforcing legal state machine transitions.
 *
 * @param nextStatus Desired status.
 * @throws RuntimeStatusError if state transition is illegal.
 */
export function setStatus(nextStatus: RuntimeStatus): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.has(nextStatus)) {
    throw new RuntimeStatusError(
      `Illegal status transition from '${currentStatus}' to '${nextStatus}'.`
    );
  }

  currentStatus = nextStatus;
  lastTransitionTimestamp = Date.now();

  if (nextStatus === RuntimeStatus.READY && initializedAtTimestamp === null) {
    initializedAtTimestamp = lastTransitionTimestamp;
  } else if (nextStatus === RuntimeStatus.UNINITIALIZED || nextStatus === RuntimeStatus.STOPPED) {
    initializedAtTimestamp = null;
  }
}

/**
 * Resets status machine to UNINITIALIZED state (for testing & reset purposes).
 */
export function resetStatus(): void {
  currentStatus = RuntimeStatus.UNINITIALIZED;
  initializedAtTimestamp = null;
  lastTransitionTimestamp = Date.now();
}

/**
 * Creates an immutable, deeply frozen RuntimeSnapshot.
 *
 * @param activeAdaptersCount Number of registered active adapters.
 * @returns Deeply frozen RuntimeSnapshot object.
 */
export function createSnapshot(activeAdaptersCount: number = 0): Readonly<RuntimeSnapshot> {
  const snapshot: RuntimeSnapshot = {
    status: currentStatus,
    initializedAt: initializedAtTimestamp,
    lastStateTransition: lastTransitionTimestamp,
    activeAdaptersCount,
    timestamp: Date.now(),
  };

  return deepFreeze(snapshot);
}
