/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 4 Component: Translation Exception Hierarchy (`translation-errors.ts`)
 *
 * @file translation-errors.ts
 * @description Strongly-typed exception classes for the AI request and response translation engine.
 * All errors extend TranslationError (which extends ProviderAdapterError from Milestone 1).
 *
 * @module @aether/provider-adapters/translation-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import { ProviderAdapterError } from "./errors";

/**
 * Base exception class for all Phase 9.10 translation errors.
 */
export class TranslationError extends ProviderAdapterError {
  constructor(
    message: string,
    code: string = "ERR_TRANSLATION",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an individual conversation message contains invalid parameters or roles.
 */
export class InvalidMessageError extends TranslationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_MESSAGE", metadata);
  }
}

/**
 * Thrown when conversation message ordering or sequence is malformed.
 */
export class MalformedConversationError extends TranslationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_MALFORMED_CONVERSATION", metadata);
  }
}

/**
 * Thrown when request or response translation payload structures are invalid.
 */
export class InvalidPayloadError extends TranslationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_PAYLOAD", metadata);
  }
}

/**
 * Thrown when converting internal conversation contexts into TranslationRequest payloads fails.
 */
export class RequestTranslationError extends TranslationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_REQUEST_TRANSLATION", metadata);
  }
}

/**
 * Thrown when converting raw model outputs into canonical TranslationResponse objects fails.
 */
export class ResponseTranslationError extends TranslationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RESPONSE_TRANSLATION", metadata);
  }
}

/**
 * Thrown when token usage statistics aggregation or calculation fails.
 */
export class UsageCalculationError extends TranslationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_USAGE_CALCULATION", metadata);
  }
}

/**
 * Thrown when encountering unsupported message content types or modalities.
 */
export class UnsupportedContentError extends TranslationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_UNSUPPORTED_CONTENT", metadata);
  }
}
