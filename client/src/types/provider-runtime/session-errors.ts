/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Component: Provider Session Exceptions (`session-errors.ts`)
 *
 * @file session-errors.ts
 * @description Strongly-typed exception classes for ProviderSessionManager failures.
 *
 * @module @aether/provider-runtime/session-errors
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderSessionError } from "./errors";

export {
  ProviderSessionError,
  SessionNotFoundError,
  SessionTimeoutError,
} from "./errors";

/**
 * Thrown when attempting to create a session with an ID that already exists.
 */
export class SessionAlreadyExistsError extends ProviderSessionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_SESSION_ALREADY_EXISTS", metadata);
  }
}

/**
 * Thrown when an invalid session ownership boundary is accessed or violated.
 */
export class SessionOwnershipError extends ProviderSessionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_SESSION_OWNERSHIP", metadata);
  }
}

/**
 * Thrown when an illegal session state transition or operation is requested on a session.
 */
export class InvalidSessionStateError extends ProviderSessionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_SESSION_STATE", metadata);
  }
}
