/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Component: Provider Session Types (`session-types.ts`)
 *
 * @file session-types.ts
 * @description Strongly-typed domain interfaces for runtime session context handles,
 * session states, and snapshot exports.
 *
 * @module @aether/provider-runtime/session-types
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { SessionType } from "./enums";

/**
 * Operational lifecycle states for a runtime driver session.
 */
export type ProviderSessionState = "ACTIVE" | "IDLE" | "RELEASED" | "EXPIRED" | "DESTROYED";

/**
 * Ephemeral runtime session handle container.
 */
export interface ProviderSessionHandle {
  readonly sessionId: string;
  readonly providerId: string;
  readonly sessionType: SessionType | string;
  readonly state: ProviderSessionState;
  readonly createdAtMs: number;
  readonly lastAccessedAtMs: number;
  readonly expiresAtMs?: number;
  readonly sessionConfig?: Readonly<Record<string, unknown>>;
}

/**
 * Immutable snapshot export of ProviderSessionManager state.
 */
export interface ProviderSessionSnapshot {
  readonly snapshotId: string;
  readonly createdAtMs: number;
  readonly activeSessionsCount: number;
  readonly totalSessionsCount: number;
  readonly sessions: readonly Readonly<ProviderSessionHandle>[];
}
