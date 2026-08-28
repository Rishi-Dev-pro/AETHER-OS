/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 5 Component: Session Domain Types & Contracts (`session-types.ts`)
 *
 * @file session-types.ts
 * @description Canonical strongly-typed contracts and DTOs for multi-session conversation management,
 * session metadata, persistence envelopes, memory snapshots, and summarization structures.
 *
 * @module @aether/runtime/conversation/session-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 5
 */

import type {
  ConversationTurn,
  ConversationStateSnapshot,
} from "./conversation-types";

/**
 * Token and cost metrics aggregated per session.
 */
export interface SessionTokenMetrics {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUSD: number;
}

/**
 * High-level serializable session metadata.
 * Kept lightweight for fast list queries and UI drawer rendering.
 */
export interface SessionMetadata {
  readonly sessionId: string;
  readonly title: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly activeProvider: string;
  readonly activeModel: string;
  readonly messageCount: number;
  readonly tokenUsage: SessionTokenMetrics;
  readonly isArchived: boolean;
  readonly summary?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Complete in-memory session domain object pairing metadata, linear state snapshot, and turn history.
 */
export interface SessionData {
  readonly metadata: SessionMetadata;
  readonly state: ConversationStateSnapshot;
  readonly turns: ReadonlyArray<ConversationTurn>;
}

/**
 * Schema-versioned envelope for persistent session storage (IndexedDB / localStorage).
 */
export interface PersistedSessionEnvelope {
  readonly schemaVersion: "1.0.0";
  readonly session: SessionData;
  readonly savedAt: number;
}

/**
 * Named memory snapshot capturing complete session state at a specific point in time.
 */
export interface SessionSnapshot {
  readonly snapshotId: string;
  readonly sessionId: string;
  readonly label: string;
  readonly data: SessionData;
  readonly createdAt: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Parameters for creating a new session.
 */
export interface CreateSessionOptions {
  readonly sessionId?: string;
  readonly title?: string;
  readonly systemPrompt?: string;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Parameters for updating existing session metadata.
 */
export interface UpdateSessionOptions {
  readonly title?: string;
  readonly isArchived?: boolean;
  readonly summary?: string;
  readonly activeProvider?: string;
  readonly activeModel?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Configuration options for the session persistence engine.
 */
export interface PersistenceConfiguration {
  readonly dbName?: string;
  readonly storeName?: string;
  readonly fallbackToLocalStorage?: boolean;
  readonly maxPersistedSessions?: number;
}
