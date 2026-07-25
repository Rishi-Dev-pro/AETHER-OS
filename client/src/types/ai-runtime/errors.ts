/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 2: Runtime Error Taxonomy (`errors.ts`)
 *
 * @file errors.ts
 * @description Root exception hierarchy, error taxonomies, sanitized serialization,
 * and classification utilities for Phase 9.4 runtime failures.
 *
 * @module @aether/ai-runtime/errors
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT
 */

import { ErrorCategoryCode, type CorrelationContext } from "./types";

// ============================================================================
// 1. BASE ERROR CONTRACT & ROOT CLASS
// ============================================================================

/**
 * Interface defining the immutable public properties of an AIRuntimeError.
 */
export interface AIRuntimeErrorContract {
  readonly code: ErrorCategoryCode;
  readonly subCode: string;
  readonly message: string;
  readonly publicMessage: string;
  readonly isRetryable: boolean;
  readonly timestamp: number;
  readonly correlationContext?: CorrelationContext;
  readonly details: Readonly<Record<string, unknown>>;
  readonly cause?: Error;
}

/**
 * Abstract Base Class for all Phase 9.4 AI Runtime errors.
 * Guarantees typed classification, sanitized public messaging, and immutable diagnostics.
 */
export abstract class AIRuntimeError extends Error implements AIRuntimeErrorContract {
  public readonly code: ErrorCategoryCode;
  public readonly subCode: string;
  public readonly publicMessage: string;
  public readonly isRetryable: boolean;
  public readonly timestamp: number;
  public readonly correlationContext?: CorrelationContext;
  public readonly details: Readonly<Record<string, unknown>>;
  public override readonly cause?: Error;

  constructor(params: {
    code: ErrorCategoryCode;
    subCode: string;
    message: string;
    publicMessage?: string;
    isRetryable: boolean;
    correlationContext?: CorrelationContext;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    // Invariant check on mandatory parameters
    if (!params.message || params.message.trim() === "") {
      throw new Error("AIRuntimeError requires a non-empty internal message.");
    }
    if (!params.subCode || params.subCode.trim() === "") {
      throw new Error("AIRuntimeError requires a non-empty subCode.");
    }

    super(params.message);

    // Explicit prototype restoration for custom Error extending in ES6/TS
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = params.code;
    this.subCode = params.subCode;
    this.publicMessage = params.publicMessage ?? "An AI Runtime operation failed. Please try again.";
    this.isRetryable = params.isRetryable;
    this.timestamp = Date.now();
    this.correlationContext = params.correlationContext;
    this.cause = params.cause;

    // Enforce runtime immutability on details object
    const rawDetails = params.details ?? {};
    this.details = Object.freeze({ ...rawDetails });

    // Capture clean V8 stack trace if supported
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a complete internal diagnostic object suitable for structured JSON logging.
   * Includes internal stack trace, detailed metadata, and underlying cause error.
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
      correlationContext: this.correlationContext,
      details: this.details,
      cause: this.cause ? { name: this.cause.name, message: this.cause.message } : undefined,
      stack: this.stack,
    });
  }

  /**
   * Returns a sanitized public JSON payload safe for client emission or user display.
   * Strips internal stack traces, raw vault credentials, and private internal paths.
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
// 2. TYPED ERROR CATEGORY SUBCLASSES
// ============================================================================

/**
 * Transient Infrastructure Errors (Retryable).
 * Caused by temporary rate limits (429), gateway overloads (502/503/504), or network socket drops.
 */
export class TransientError extends AIRuntimeError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    correlationContext?: CorrelationContext;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: ErrorCategoryCode.TRANSIENT_ERROR,
      isRetryable: true,
      publicMessage: params.publicMessage ?? "The AI service is temporarily busy or unreachable. Retrying...",
    });
  }
}

/**
 * Configuration Errors (Fatal / Non-Retryable).
 * Caused by invalid API credentials, malformed model parameters, or unsupported feature flags.
 */
export class ConfigurationError extends AIRuntimeError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    correlationContext?: CorrelationContext;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: ErrorCategoryCode.CONFIGURATION_ERROR,
      isRetryable: false,
      publicMessage: params.publicMessage ?? "AI service configuration is invalid.",
    });
  }
}

/**
 * Context Boundary Errors (Non-Retryable at Layer 9.4).
 * Caused by context window overflow or token limit violations.
 */
export class ContextBoundaryError extends AIRuntimeError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    correlationContext?: CorrelationContext;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: ErrorCategoryCode.CONTEXT_BOUNDARY_ERROR,
      isRetryable: false,
      publicMessage: params.publicMessage ?? "The prompt context exceeds model limit bounds.",
    });
  }
}

/**
 * Content Safety Errors (Non-Retryable).
 * Caused by provider safety filter triggers, prompt injection flags, or policy redactions.
 */
export class SafetyError extends AIRuntimeError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    correlationContext?: CorrelationContext;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: ErrorCategoryCode.SAFETY_ERROR,
      isRetryable: false,
      publicMessage: params.publicMessage ?? "The request was flagged by content safety policy.",
    });
  }
}

/**
 * System Runtime Errors (Non-Retryable).
 * Caused by internal state machine invariant violations or unhandled exceptions.
 */
export class SystemError extends AIRuntimeError {
  constructor(params: {
    subCode: string;
    message: string;
    publicMessage?: string;
    correlationContext?: CorrelationContext;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      ...params,
      code: ErrorCategoryCode.SYSTEM_ERROR,
      isRetryable: false,
      publicMessage: params.publicMessage ?? "An internal AI runtime system error occurred.",
    });
  }
}


// ============================================================================
// 3. RUNTIME UTILITIES & TYPE GUARDS
// ============================================================================

/**
 * Type guard verifying if an unknown value is an instance of AIRuntimeError.
 */
export function isAIRuntimeError(error: unknown): error is AIRuntimeError {
  return error instanceof AIRuntimeError;
}

/**
 * Utility determining if an unknown error represents a retryable transient failure.
 */
export function isRetryableError(error: unknown): boolean {
  if (isAIRuntimeError(error)) {
    return error.isRetryable;
  }
  return false;
}
