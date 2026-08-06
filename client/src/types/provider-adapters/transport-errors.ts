/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 2 Component: Transport Exception Hierarchy (`transport-errors.ts`)
 *
 * @file transport-errors.ts
 * @description Strongly-typed exception classes for the HTTP transport layer.
 * All errors extend TransportError (which extends ProviderAdapterError from Milestone 1).
 *
 * @module @aether/provider-adapters/transport-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import { ProviderAdapterError } from "./errors";

/**
 * Base exception class for all Phase 9.10 HTTP transport errors.
 * Extends Milestone 1 ProviderAdapterError for runtime error hierarchy compliance.
 */
export class TransportError extends ProviderAdapterError {
  constructor(
    message: string,
    code: string = "ERR_TRANSPORT",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when constructing or serializing an HTTP request fails.
 */
export class RequestBuildError extends TransportError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_REQUEST_BUILD", metadata);
  }
}

/**
 * Thrown when parsing or validating an HTTP response body fails.
 */
export class ResponseParseError extends TransportError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RESPONSE_PARSE", metadata);
  }
}

/**
 * Thrown when retry policy calculations or limits are violated.
 */
export class RetryPolicyError extends TransportError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RETRY_POLICY", metadata);
  }
}

/**
 * Thrown when timeout controller initialization, aborting, or timer management fails.
 */
export class TimeoutControllerError extends TransportError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_TIMEOUT_CONTROLLER", metadata);
  }
}

/**
 * Thrown when transport layer configuration parameters are invalid.
 */
export class InvalidTransportConfigurationError extends TransportError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_TRANSPORT_CONFIG", metadata);
  }
}

/**
 * Thrown when an outgoing HTTP request fails execution at the transport level.
 */
export class HttpRequestError extends TransportError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_HTTP_REQUEST", metadata);
  }
}

/**
 * Thrown when an HTTP response contains an error status code or violates response constraints.
 */
export class HttpResponseError extends TransportError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_HTTP_RESPONSE", metadata);
  }
}
