/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 2: Memory Error Hierarchy (`errors.ts`)
 *
 * @file errors.ts
 * @description Typed error hierarchy, diagnostic serialization, public-safe serialization,
 * and classification utilities for Phase 9.6 Memory System failures.
 *
 * @module @aether/memory-system/errors
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";

// ============================================================================
// 1. BASE MEMORY SYSTEM ERROR CONTRACT & ABSTRACT CLASS
// ============================================================================

/**
 * Immutable public contract for all AetherMemoryError instances.
 */
export interface AetherMemoryErrorContract {
  readonly code: string;
  readonly message: string;
  readonly publicMessage: string;
  readonly isRetryable: boolean;
  readonly timestamp: number;
  readonly details: Readonly<Record<string, unknown>>;
  readonly cause?: Error;
}

/**
 * Abstract Base Class for all Phase 9.6 Memory System errors.
 * Subclasses guarantee typed classification, diagnostic logging, and safe public serialization.
 */
export abstract class AetherMemoryError extends Error implements AetherMemoryErrorContract {
  public readonly code: string;
  public readonly publicMessage: string;
  public readonly isRetryable: boolean;
  public readonly timestamp: number;
  public readonly details: Readonly<Record<string, unknown>>;
  public override readonly cause?: Error;

  constructor(params: {
    code: string;
    message: string;
    publicMessage?: string;
    isRetryable?: boolean;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    if (!params.message || params.message.trim() === "") {
      throw new Error("AetherMemoryError requires a non-empty internal message.");
    }
    if (!params.code || params.code.trim() === "") {
      throw new Error("AetherMemoryError requires a non-empty code.");
    }

    super(params.message);

    // Prototype restoration for ES6+ extension compatibility
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = params.code;
    this.publicMessage = params.publicMessage ?? "A memory system operation encountered an error.";
    this.isRetryable = params.isRetryable ?? false;
    this.timestamp = Date.now();
    this.cause = params.cause;

    const rawDetails = params.details ?? {};
    this.details = deepFreeze({ ...rawDetails });

    const errConstructor = Error as unknown as { captureStackTrace?: (target: object, constructorOpt?: Function) => void };
    if (typeof errConstructor.captureStackTrace === "function") {
      errConstructor.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Diagnostic JSON representation suitable for internal structured logging.
   */
  public toDiagnosticJSON(): Readonly<Record<string, unknown>> {
    return deepFreeze({
      name: this.name,
      code: this.code,
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
   * Public-safe JSON serialization sanitized for UI display or external emission.
   */
  public toPublicJSON(): Readonly<Record<string, unknown>> {
    return deepFreeze({
      code: this.code,
      message: this.publicMessage,
      timestamp: this.timestamp,
    });
  }
}

// ============================================================================
// 2. DERIVED MEMORY SYSTEM ERROR SUBCLASSES
// ============================================================================

/**
 * Thrown when a requested MemoryEntry, collection, or snapshot cannot be found.
 */
export class MemoryNotFoundError extends AetherMemoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super({
      code: "MEMORY_NOT_FOUND",
      message,
      publicMessage: "The requested memory entry or collection could not be found.",
      isRetryable: false,
      details,
      cause,
    });
  }
}

/**
 * Thrown when a MemoryQuery fails validation or structure constraints.
 */
export class InvalidMemoryQueryError extends AetherMemoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super({
      code: "INVALID_MEMORY_QUERY",
      message,
      publicMessage: "The provided memory search query is invalid.",
      isRetryable: false,
      details,
      cause,
    });
  }
}

/**
 * Thrown when underlying storage IO or persistence layer operations fail.
 */
export class MemoryStorageError extends AetherMemoryError {
  constructor(message: string, isRetryable = true, details?: Record<string, unknown>, cause?: Error) {
    super({
      code: "MEMORY_STORAGE_ERROR",
      message,
      publicMessage: "A memory persistence operation failed.",
      isRetryable,
      details,
      cause,
    });
  }
}

/**
 * Thrown when vector or keyword memory indexing fails.
 */
export class MemoryIndexError extends AetherMemoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super({
      code: "MEMORY_INDEX_ERROR",
      message,
      publicMessage: "An error occurred while accessing or building memory search indexes.",
      isRetryable: false,
      details,
      cause,
    });
  }
}

/**
 * Thrown when an illegal mutation attempt is made against a frozen memory object.
 */
export class ImmutableMutationError extends AetherMemoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super({
      code: "IMMUTABLE_MUTATION_ERROR",
      message,
      publicMessage: "Attempted to modify a frozen immutable memory contract.",
      isRetryable: false,
      details,
      cause,
    });
  }
}

/**
 * Thrown when validation of memory parameters, scores, or metadata fails.
 */
export class MemoryValidationError extends AetherMemoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super({
      code: "MEMORY_VALIDATION_ERROR",
      message,
      publicMessage: "Memory validation check failed.",
      isRetryable: false,
      details,
      cause,
    });
  }
}

// ============================================================================
// 3. TYPE GUARDS & UTILITIES
// ============================================================================

/**
 * Type guard checking if an unknown error is an instance of AetherMemoryError.
 */
export function isAetherMemoryError(error: unknown): error is AetherMemoryError {
  return error instanceof AetherMemoryError;
}
