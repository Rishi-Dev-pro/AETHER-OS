/**
 * AETHER OS — Phase 9.5 Conversation Core
 * Component 6: Session Manager (`session-manager.ts`)
 *
 * @file session-manager.ts
 * @description Immutable session management component responsible for creating, retrieving,
 * updating, archiving, and closing multi-conversation sessions. Enforces max concurrent active
 * conversations, session expiration windows, and fail-fast invariants without mutating state.
 *
 * @module @aether/conversation-core/session-manager
 * @version 1.0.0
 * @status EDD COMPLIANT — MILESTONE 3
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import {
  type ConversationSession,
  createConversationSession,
} from "./types";
import { SessionError, ConversationValidationError } from "./errors";


// ============================================================================
// 1. IN-MEMORY IMMUTABLE SESSION STORE
// ============================================================================

/** In-memory store map of sessionId -> Readonly<ConversationSession> */
const sessionStore = new Map<string, Readonly<ConversationSession>>();


// ============================================================================
// 2. PUBLIC SESSION MANAGER APIS
// ============================================================================

/**
 * Parameters passed to createSession function.
 */
export interface CreateSessionParams {
  readonly sessionId: string;
  readonly tenantId?: string;
  readonly activeConversationId: string;
  readonly conversationIds?: readonly string[];
  readonly maxConcurrentConversations?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Creates and registers a new immutable ConversationSession.
 *
 * @param params - Session initialization parameters.
 * @returns Deep-frozen Readonly<ConversationSession> contract.
 *
 * @throws {SessionError} If sessionId already exists or bounds check fails.
 * @throws {ConversationValidationError} If mandatory parameters are invalid.
 */
export function createSession(params: CreateSessionParams): Readonly<ConversationSession> {
  if (!params || !params.sessionId || params.sessionId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidSessionId",
      message: "createSession requires a non-empty sessionId string.",
    });
  }

  const cleanSessionId = params.sessionId.trim();
  if (sessionStore.has(cleanSessionId)) {
    throw new SessionError({
      subCode: "DuplicateSession",
      message: `Session with id '${cleanSessionId}' already exists in store.`,
    });
  }

  const session = createConversationSession(params);
  sessionStore.set(cleanSessionId, session);
  return session;
}

/**
 * Retrieves a deep-frozen ConversationSession from the store by sessionId.
 *
 * @param sessionId - Unique session identifier.
 * @returns Readonly<ConversationSession> if found.
 *
 * @throws {SessionError} If session does not exist or has expired.
 */
export function getSession(sessionId: string): Readonly<ConversationSession> {
  if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidSessionId",
      message: "getSession requires a non-empty sessionId string.",
    });
  }

  const cleanSessionId = sessionId.trim();
  const session = sessionStore.get(cleanSessionId);

  if (!session) {
    throw new SessionError({
      subCode: "SessionNotFound",
      message: `Session with id '${cleanSessionId}' was not found.`,
    });
  }

  // Session expiration check
  if (Date.now() > session.expiresAt) {
    throw new SessionError({
      subCode: "SessionExpired",
      message: `Session '${cleanSessionId}' has expired at ${new Date(session.expiresAt).toISOString()}.`,
    });
  }

  return session;
}

/**
 * Validates a session against existence, bounds checks, and active timestamp.
 *
 * @param sessionId - Session identifier to validate.
 * @throws {SessionError} If validation fails.
 */
export function validateSession(sessionId: string): void {
  const session = getSession(sessionId);

  if (session.conversationIds.length > session.maxConcurrentConversations) {
    throw new SessionError({
      subCode: "MaxConcurrentConversationsExceeded",
      message: `Session '${session.sessionId}' has ${session.conversationIds.length} conversations, exceeding maximum concurrent limit of ${session.maxConcurrentConversations}.`,
    });
  }
}

/**
 * Updates session active conversation, conversation IDs, or metadata cleanly.
 * Returns a new deep-frozen session object and replaces the store entry without mutation.
 *
 * @param sessionId - Target session identifier.
 * @param updates - Partial session properties to update.
 * @returns Updated Readonly<ConversationSession>.
 *
 * @throws {SessionError} If session is not found or validation fails.
 */
export function updateSession(
  sessionId: string,
  updates: {
    readonly activeConversationId?: string;
    readonly conversationIds?: readonly string[];
    readonly metadata?: Record<string, unknown>;
  }
): Readonly<ConversationSession> {
  const existing = getSession(sessionId);

  const newActiveId = updates.activeConversationId?.trim() ?? existing.activeConversationId;
  const newConversationIds = updates.conversationIds
    ? [...updates.conversationIds]
    : [...existing.conversationIds];

  if (!newConversationIds.includes(newActiveId)) {
    newConversationIds.push(newActiveId);
  }

  if (newConversationIds.length > existing.maxConcurrentConversations) {
    throw new SessionError({
      subCode: "MaxConcurrentConversationsExceeded",
      message: `Updating session '${existing.sessionId}' with ${newConversationIds.length} conversations exceeds limit of ${existing.maxConcurrentConversations}.`,
    });
  }

  const now = Date.now();
  const rawUpdated: ConversationSession = {
    sessionId: existing.sessionId,
    tenantId: existing.tenantId,
    activeConversationId: newActiveId,
    conversationIds: deepFreeze(newConversationIds),
    maxConcurrentConversations: existing.maxConcurrentConversations,
    createdAt: existing.createdAt,
    lastAccessedAt: now,
    expiresAt: existing.expiresAt,
    metadata: deepFreeze({ ...existing.metadata, ...(updates.metadata ?? {}) }),
  };

  const frozenUpdated = deepFreeze(rawUpdated);
  sessionStore.set(existing.sessionId, frozenUpdated);
  return frozenUpdated;
}

/**
 * Archives a session by setting a flag in metadata and resetting active timestamp.
 * Returns a new deep-frozen archived session.
 *
 * @param sessionId - Session identifier to archive.
 * @returns Archived Readonly<ConversationSession>.
 */
export function archiveSession(sessionId: string): Readonly<ConversationSession> {
  return updateSession(sessionId, {
    metadata: { isArchived: true, archivedAt: Date.now() },
  });
}

/**
 * Closes a session permanently by removing it from active store.
 * Returns the final closed session state contract.
 *
 * @param sessionId - Session identifier to close.
 * @returns Final closed Readonly<ConversationSession>.
 */
export function closeSession(sessionId: string): Readonly<ConversationSession> {
  const existing = getSession(sessionId);
  const rawClosed: ConversationSession = {
    ...existing,
    lastAccessedAt: Date.now(),
    metadata: deepFreeze({ ...existing.metadata, isClosed: true, closedAt: Date.now() }),
  };

  const frozenClosed = deepFreeze(rawClosed);
  sessionStore.delete(existing.sessionId);
  return frozenClosed;
}

/**
 * Resets the in-memory session store (primarily for test suite isolation).
 */
export function resetSessionStore(): void {
  sessionStore.clear();
}
