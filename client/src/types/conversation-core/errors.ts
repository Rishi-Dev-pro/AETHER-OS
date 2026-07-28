/**
 * AETHER OS — Phase 9.5 Conversation Core
 * Component 2: Conversation Error Taxonomy (`errors.ts`)
 *
 * @file errors.ts
 * @description Abstract base exception hierarchy, typed sub-classes, diagnostic serialization,
 * sanitized public messaging, and type guard utilities for Phase 9.5 Conversation Core failures.
 *
 * @module @aether/conversation-core/errors
 * @version 1.0.0
 * @status EDD COMPLIANT — MILESTONE 1
 */

// ============================================================================
// 1. BASE ERROR CONTRACT & ABSTRACT CLASS
// ============================================================================

/**
 * Interface defining the immutable public properties of a ConversationError.
 */
export interface ConversationErrorContract {
  readonly code: string;
  readonly subCode: string;
  readonly message: string;
  readonly publicMessage: string;
  readonly isRetryable: boolean;
  readonly timestamp: number;
  readonly details: Readonly<Record<string, unknown>>;
  readonly cause?: Error;
}

/**
 * Abstract Base Class for all Phase 9.5 Conversation Core errors.
 * Formatted cleanly to match Phase 9.4 error taxonomy.
 */
export abstract class ConversationError extends Error implements ConversationErrorContract {
  public readonly code: string;
  public readonly subCode: string;
  public readonly publicMessage: string;
  public readonly isRetryable: boolean;
  public readonly timestamp: number;
  public readonly details: Readonly<Record<string, unknown>>;
  public override readonly cause?: Error;

  constructor(params: {
    code: string;
    subCode: string;
    message: string;
    publicMessage?: string;
    isRetryable?: boolean;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    if (!params.message || params.message.trim() === "") {
      throw new Error("ConversationError requires a non-empty internal message.");
    }
    if (!params.subCode || params.subCode.trim() === "") {
      throw new Error("ConversationError requires a non-empty subCode.");
    }

    super(params.message);

    // Prototype restoration for custom ES6 Error extension
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = params.code;
    this.subCode = params.subCode;
    this.publicMessage = params.publicMessage ?? "A conversation operation failed. Please try again.";
    this.isRetryable = params.isRetryable ?? false;
    this.timestamp = Date.now();
    this.cause = params.cause;

    const rawDetails = params.details ?? {};
    this.details = Object.freeze({ ...rawDetails });

    // Safe V8 stack trace capture across browsers/node
    const errConstructor = Error as unknown as { captureStackTrace?: (target: object, constructorOpt?: Function) => void };
    if (typeof errConstructor.captureStackTrace === "function") {
      errConstructor.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a complete internal diagnostic object suitable for structured JSON logging.
   */
  public toDiagnosticJSON(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      name: this.name,
      code: this.code,
      subCode: this.subCode,
      message: this.message,
      publicMessage: this.publicMessage,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      details: this.details,
      cause: this.cause ? { name: this.cause.name, message: this.cause.message } : undefined,
      stack: this.stack,
    });
  }

  /**
   * Returns a sanitized public JSON payload safe for client emission or user display.
   */
  public toPublicJSON(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      code: this.code,
      subCode: this.subCode,
      message: this.publicMessage,
      timestamp: this.timestamp,
    });
  }
}


// ============================================================================
// 2. TYPED SUB-CLASSES
// ============================================================================

/**
 * Validation Errors (Fatal / Non-Retryable).
 * Thrown when contract Invariants, bounds checks, or message role validation fails.
 */
export class ConversationValidationError extends ConversationError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: "CONVERSATION_VALIDATION_ERROR",
      isRetryable: false,
      publicMessage: params.publicMessage ?? "Conversation validation failed due to malformed parameters.",
    });
  }
}

/**
 * State Transition Errors (Non-Retryable).
 * Thrown when attempting illegal FSM state transitions or operating on closed conversations.
 */
export class ConversationStateError extends ConversationError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: "CONVERSATION_STATE_ERROR",
      isRetryable: false,
      publicMessage: params.publicMessage ?? "Conversation is in an invalid state for this operation.",
    });
  }
}

/**
 * Session Errors (Fatal / Non-Retryable).
 * Thrown when session lookup fails, session expires, or concurrency limits are exceeded.
 */
export class SessionError extends ConversationError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: "SESSION_ERROR",
      isRetryable: false,
      publicMessage: params.publicMessage ?? "Session operation failed or session expired.",
    });
  }
}

/**
 * Context Window & Trimming Errors (Non-Retryable at Layer 9.5).
 * Thrown when context token calculations overflow bounds or trimming heuristics fail.
 */
export class ContextError extends ConversationError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: "CONTEXT_ERROR",
      isRetryable: false,
      publicMessage: params.publicMessage ?? "Context window processing failed.",
    });
  }
}


// ============================================================================
// 3. UTILITIES & TYPE GUARDS
// ============================================================================

/**
 * Type guard checking if an unknown error is an instance of ConversationError.
 */
export function isConversationError(error: unknown): error is ConversationError {
  return error instanceof ConversationError;
}
