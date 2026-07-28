/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 3: Canonical AIRequest Envelope (`ai-request.ts`)
 *
 * @file ai-request.ts
 * @description Immutable canonical request envelope, creation factory, and invariant validation
 * for Phase 9.4 AI Runtime execution requests.
 *
 * @module @aether/ai-runtime/ai-request
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT
 */

import type { PromptPackage } from "../prompt";
import {
  PriorityTier,
  ModelTier,
  PrivacyMode,
  type CorrelationContext,
  type ToolCallDescriptor,
} from "./types";
import { ConfigurationError } from "./errors";

// ============================================================================
// 1. DATA CONTRACT INTERFACES
// ============================================================================

/**
 * Execution generation parameters and optional tool/schema directives.
 */
export interface AIRequestOptions {
  /** Sampling temperature (Range: 0.0 to 2.0) */
  readonly temperature?: number;
  /** Maximum generation output tokens bounds */
  readonly maxTokens?: number;
  /** Nucleus sampling parameter (Range: 0.0 to 1.0) */
  readonly topP?: number;
  /** Stop sequences triggering generation end */
  readonly stopSequences?: readonly string[];
  /** Flag determining real-time token streaming vs unary execution */
  readonly stream?: boolean;
  /** Optional JSON schema specification for structured output validation */
  readonly jsonSchema?: Readonly<Record<string, unknown>>;
  /** Optional available tool call descriptors passed to the provider */
  readonly tools?: readonly ToolCallDescriptor[];
}

/**
 * Immutable metadata envelope attached to every runtime request.
 */
export interface AIRequestMetadata {
  /** Unique request instance identifier (e.g. "req_9f8b2a1c") */
  readonly requestId: string;
  /** Request creation timestamp (epoch ms) */
  readonly timestamp: number;
  /** Scheduler priority tier (P0 - P3) */
  readonly priorityTier: PriorityTier;
  /** Abstract model capability tier requested by upstream systems */
  readonly modelTier: ModelTier;
  /** System privacy isolation mode */
  readonly privacyMode: PrivacyMode;
  /** End-to-end correlation context (sessionId, snapshotId, intentId) */
  readonly correlationContext: CorrelationContext;
}

/**
 * Canonical AIRequest Interface.
 * Consumed by Scheduler, Strategy Router, Provider Plugins, and Runtime Orchestrator.
 */
export interface AIRequest {
  /** Request metadata and correlation tracing */
  readonly metadata: AIRequestMetadata;
  /** Immutable prompt package ingested from Phase 9.3 */
  readonly promptPackage: Readonly<PromptPackage>;
  /** Generation options and execution directives */
  readonly options: AIRequestOptions;
}


// ============================================================================
// 2. RUNTIME DEEP FREEZE HELPER (SHARED INTERNAL UTILITY)
// ============================================================================

import { deepFreeze } from "./internal/deep-freeze";
export { deepFreeze };


// ============================================================================
// 3. FACTORY & INVARIANT VALIDATOR
// ============================================================================

/**
 * Parameters passed to the createAIRequest factory function.
 */
export interface CreateAIRequestParams {
  readonly requestId: string;
  readonly promptPackage: PromptPackage;
  readonly priorityTier?: PriorityTier;
  readonly modelTier?: ModelTier;
  readonly privacyMode?: PrivacyMode;
  readonly correlationContext?: CorrelationContext;
  readonly options?: AIRequestOptions;
}

/**
 * Factory function creating a canonical, recursively frozen AIRequest instance.
 * Validates constructor invariants and throws ConfigurationError on fail-fast violation.
 *
 * @throws {ConfigurationError} If any invariant or bounds check fails.
 */
export function createAIRequest(params: CreateAIRequestParams): Readonly<AIRequest> {
  // Invariant 1: Mandatory parameters check
  if (!params) {
    throw new ConfigurationError({
      subCode: "NullRequestParams",
      message: "createAIRequest parameters object cannot be null or undefined.",
    });
  }

  // Invariant 2: Request ID validation
  if (!params.requestId || typeof params.requestId !== "string" || params.requestId.trim() === "") {
    throw new ConfigurationError({
      subCode: "InvalidRequestId",
      message: "AIRequest requires a non-empty requestId string.",
    });
  }

  // Invariant 3: PromptPackage validation
  if (!params.promptPackage) {
    throw new ConfigurationError({
      subCode: "MissingPromptPackage",
      message: "AIRequest requires a valid upstream PromptPackage instance.",
    });
  }
  if (
    typeof params.promptPackage.systemInstructions !== "string" ||
    typeof params.promptPackage.userRequest !== "string"
  ) {
    throw new ConfigurationError({
      subCode: "MalformedPromptPackage",
      message: "PromptPackage must contain valid systemInstructions and userRequest strings.",
    });
  }

  // Invariant 4: Priority, Model, and Privacy Tier defaults & validation
  const priorityTier = params.priorityTier ?? PriorityTier.USER_INTERACTIVE;
  if (!Object.values(PriorityTier).includes(priorityTier)) {
    throw new ConfigurationError({
      subCode: "InvalidPriorityTier",
      message: `Invalid priorityTier provided: ${String(priorityTier)}`,
    });
  }

  const modelTier = params.modelTier ?? ModelTier.STANDARD;
  if (!Object.values(ModelTier).includes(modelTier)) {
    throw new ConfigurationError({
      subCode: "InvalidModelTier",
      message: `Invalid modelTier provided: ${String(modelTier)}`,
    });
  }

  const privacyMode = params.privacyMode ?? PrivacyMode.STANDARD;
  if (!Object.values(PrivacyMode).includes(privacyMode)) {
    throw new ConfigurationError({
      subCode: "InvalidPrivacyMode",
      message: `Invalid privacyMode provided: ${String(privacyMode)}`,
    });
  }

  // Invariant 5: Options bounds checks
  const options = params.options ?? {};

  if (options.temperature !== undefined) {
    if (typeof options.temperature !== "number" || options.temperature < 0.0 || options.temperature > 2.0) {
      throw new ConfigurationError({
        subCode: "InvalidTemperature",
        message: `Temperature option must be a number between 0.0 and 2.0. Received: ${options.temperature}`,
      });
    }
  }

  if (options.maxTokens !== undefined) {
    if (typeof options.maxTokens !== "number" || options.maxTokens <= 0 || !Number.isInteger(options.maxTokens)) {
      throw new ConfigurationError({
        subCode: "InvalidMaxTokens",
        message: `MaxTokens option must be a positive integer. Received: ${options.maxTokens}`,
      });
    }
  }

  if (options.topP !== undefined) {
    if (typeof options.topP !== "number" || options.topP < 0.0 || options.topP > 1.0) {
      throw new ConfigurationError({
        subCode: "InvalidTopP",
        message: `TopP option must be a number between 0.0 and 1.0. Received: ${options.topP}`,
      });
    }
  }

  // Construct CorrelationContext (defaults from promptPackage metadata if omitted)
  const correlationContext: CorrelationContext = {
    sessionId: params.correlationContext?.sessionId ?? "default_session",
    snapshotId: params.correlationContext?.snapshotId ?? params.promptPackage.metadata?.snapshotId ?? "unknown_snapshot",
    intentId: params.correlationContext?.intentId ?? params.promptPackage.metadata?.intentId ?? "unknown_intent",
    tenantId: params.correlationContext?.tenantId,
    traceId: params.correlationContext?.traceId,
  };

  // Construct un-frozen internal raw AIRequest object
  const rawRequest: AIRequest = {
    metadata: {
      requestId: params.requestId,
      timestamp: Date.now(),
      priorityTier,
      modelTier,
      privacyMode,
      correlationContext,
    },
    promptPackage: {
      systemInstructions: params.promptPackage.systemInstructions,
      activeContext: params.promptPackage.activeContext ?? "",
      userRequest: params.promptPackage.userRequest,
      metadata: { ...params.promptPackage.metadata },
    },
    options: {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      stopSequences: options.stopSequences ? [...options.stopSequences] : undefined,
      stream: options.stream ?? false,
      jsonSchema: options.jsonSchema ? { ...options.jsonSchema } : undefined,
      tools: options.tools ? [...options.tools] : undefined,
    },
  };

  // Enforce runtime deep immutability
  return deepFreeze(rawRequest);
}
