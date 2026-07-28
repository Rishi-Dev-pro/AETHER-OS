/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 12: Request Scheduler (`request-scheduler.ts`)
 *
 * @file request-scheduler.ts
 * @description Pure orchestration scheduler responsible for generating a deterministic,
 * immutable execution plan (`SchedulerPlan`) for AI requests. Coordinates request validation,
 * strategy routing, circuit breaker snapshot checks, and retry state initialization without
 * performing network transport, timers, async promises, or runtime execution.
 *
 * @module @aether/ai-runtime/request-scheduler
 * @version 1.0.0
 * @status MILESTONE 2 — PROVIDER INFRASTRUCTURE
 */

import type { AIRequest } from "./ai-request";
import type { AIRuntimeConfig } from "./config";
import {
  type CircuitBreakerSnapshot,
  shouldAllowRequest,
  createInitialSnapshot,
} from "./circuit-breaker";
import {
  type RetryState,
  createInitialRetryState,
} from "./retry-engine";
import {
  type RoutingTable,
  type ProviderCandidate,
  createRoutingContext,
  resolveProvider,
} from "./strategy-router";
import type { ProviderCapabilities } from "./provider-plugin";
import { ConfigurationError, AIRuntimeError } from "./errors";
import { deepFreeze } from "./internal/deep-freeze";


// ============================================================================
// 1. SCHEDULER ENUMS & STAGE MODELS
// ============================================================================

/**
 * Formal stages of the pure scheduling pipeline.
 */
export enum SchedulerStage {
  /** Request envelope validation against bounds and invariants */
  REQUEST_VALIDATION = "REQUEST_VALIDATION",
  /** Abstract ModelTier mapping to concrete provider and candidate model */
  ROUTE_PROVIDER = "ROUTE_PROVIDER",
  /** Circuit breaker gate check against target provider health snapshot */
  VERIFY_CIRCUIT = "VERIFY_CIRCUIT",
  /** Exponential backoff retry policy state initialization */
  PREPARE_RETRY = "PREPARE_RETRY",
  /** Terminal stage: Execution plan constructed and ready for dispatch */
  READY_FOR_EXECUTION = "READY_FOR_EXECUTION",
}

/**
 * Immutable stage audit step tracking pipeline progression.
 */
export interface SchedulerStageStep {
  /** Pipeline stage classification */
  readonly stage: SchedulerStage;
  /** Detailed description of stage evaluation outcome */
  readonly description: string;
  /** Stage step timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 2. DATA CONTRACT INTERFACES
// ============================================================================

/**
 * Immutable input context provided to the Request Scheduler.
 */
export interface SchedulerContext {
  /** Canonical AI request envelope */
  readonly request: AIRequest;
  /** Immutable strategy routing table mapping tiers to candidate providers */
  readonly routingTable: RoutingTable;
  /** Map of provider identifiers to their current CircuitBreakerSnapshot */
  readonly circuitSnapshots: Readonly<Record<string, CircuitBreakerSnapshot>>;
  /** Runtime configuration contracts (timeouts, retries, limits, security) */
  readonly runtimeConfig: AIRuntimeConfig;
  /** Optional map of providerId to static ProviderCapabilities */
  readonly providerCapabilitiesMap?: Readonly<Record<string, ProviderCapabilities>>;
}

/**
 * Immutable, fully resolved execution plan produced by the Request Scheduler.
 * Consumed by the Runtime Orchestrator to execute transport safely.
 */
export interface SchedulerPlan {
  /** Request execution identifier matching request.metadata.requestId */
  readonly requestId: string;
  /** Selected target provider identifier (e.g. "gemini", "openai", "claude") */
  readonly selectedProviderId: string;
  /** Concrete vendor model handle string (e.g. "gpt-4o", "gemini-2.5-flash") */
  readonly concreteModel: string;
  /** Ordered array of fallback candidates if primary execution fails */
  readonly fallbackChain: readonly ProviderCandidate[];
  /** Initialized retry state for exponential backoff management */
  readonly retryState: RetryState;
  /** Circuit breaker snapshot of the selected provider at plan creation */
  readonly circuitSnapshot: CircuitBreakerSnapshot;
  /** Sequential audit trail of completed scheduling stages */
  readonly stages: readonly SchedulerStageStep[];
  /** Informational selection reason from strategy router */
  readonly routingReason: string;
  /** Boolean flag confirming plan is complete and ready for dispatch */
  readonly isReady: boolean;
  /** Plan creation timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Immutable result envelope returned by buildExecutionPlan().
 * Indicates overall scheduling success or failure with detail diagnostic error.
 */
export interface SchedulerResult {
  /** True if scheduling succeeded and a valid SchedulerPlan was constructed */
  readonly success: boolean;
  /** The generated SchedulerPlan on success, or undefined on failure */
  readonly plan?: SchedulerPlan;
  /** The error encountered if scheduling failed, or undefined on success */
  readonly error?: AIRuntimeError;
  /** Complete stage audit trail up to the point of success or failure */
  readonly stages: readonly SchedulerStageStep[];
  /** Scheduling evaluation timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 3. FACTORY FUNCTIONS & INVARIANT VALIDATORS
// ============================================================================

/**
 * Parameters passed to createSchedulerContext factory function.
 */
export interface CreateSchedulerContextParams {
  readonly request: AIRequest;
  readonly routingTable: RoutingTable;
  readonly circuitSnapshots?: Record<string, CircuitBreakerSnapshot>;
  readonly runtimeConfig: AIRuntimeConfig;
  readonly providerCapabilitiesMap?: Record<string, ProviderCapabilities>;
}

/**
 * Factory function creating an immutable SchedulerContext object.
 * Validates invariants and applies deep freeze.
 *
 * @throws {ConfigurationError} If any mandatory context property is missing or null.
 */
export function createSchedulerContext(
  params: CreateSchedulerContextParams
): Readonly<SchedulerContext> {
  if (!params) {
    throw new ConfigurationError({
      subCode: "NullSchedulerContextParams",
      message: "createSchedulerContext requires a valid parameters object.",
    });
  }

  if (!params.request) {
    throw new ConfigurationError({
      subCode: "MissingSchedulerRequest",
      message: "SchedulerContext requires a valid AIRequest instance.",
    });
  }

  if (!params.routingTable) {
    throw new ConfigurationError({
      subCode: "MissingRoutingTable",
      message: "SchedulerContext requires a valid RoutingTable instance.",
    });
  }

  if (!params.runtimeConfig) {
    throw new ConfigurationError({
      subCode: "MissingRuntimeConfig",
      message: "SchedulerContext requires a valid AIRuntimeConfig instance.",
    });
  }

  const rawContext: SchedulerContext = {
    request: params.request,
    routingTable: params.routingTable,
    circuitSnapshots: { ...(params.circuitSnapshots ?? {}) },
    runtimeConfig: params.runtimeConfig,
    providerCapabilitiesMap: params.providerCapabilitiesMap
      ? { ...params.providerCapabilitiesMap }
      : undefined,
  };

  return deepFreeze(rawContext);
}

/**
 * Validates a SchedulerPlan object against complete structural invariants.
 *
 * @throws {ConfigurationError} If validation fails.
 */
export function validateSchedulerPlan(plan: SchedulerPlan): void {
  if (!plan) {
    throw new ConfigurationError({
      subCode: "NullSchedulerPlan",
      message: "SchedulerPlan object cannot be null or undefined.",
    });
  }

  if (!plan.requestId || plan.requestId.trim() === "") {
    throw new ConfigurationError({
      subCode: "InvalidSchedulerPlanRequestId",
      message: "SchedulerPlan requires a non-empty requestId string.",
    });
  }

  if (!plan.selectedProviderId || plan.selectedProviderId.trim() === "") {
    throw new ConfigurationError({
      subCode: "InvalidSelectedProviderId",
      message: "SchedulerPlan requires a non-empty selectedProviderId string.",
    });
  }

  if (!plan.concreteModel || plan.concreteModel.trim() === "") {
    throw new ConfigurationError({
      subCode: "InvalidConcreteModel",
      message: "SchedulerPlan requires a non-empty concreteModel string.",
    });
  }

  if (!plan.retryState) {
    throw new ConfigurationError({
      subCode: "MissingRetryState",
      message: "SchedulerPlan requires a valid RetryState instance.",
    });
  }

  if (!plan.circuitSnapshot) {
    throw new ConfigurationError({
      subCode: "MissingCircuitSnapshot",
      message: "SchedulerPlan requires a valid CircuitBreakerSnapshot instance.",
    });
  }

  if (!plan.isReady) {
    throw new ConfigurationError({
      subCode: "PlanNotReady",
      message: "SchedulerPlan must have isReady flag set to true.",
    });
  }
}


// ============================================================================
// 4. PURE SCHEDULING PIPELINE LOGIC
// ============================================================================

/**
 * Pure orchestration function building a deterministic execution plan (`SchedulerPlan`).
 *
 * Deterministic Pipeline Flow:
 * 1. Stage 1 (REQUEST_VALIDATION): Validate input request envelope metadata and options.
 * 2. Stage 2 (ROUTE_PROVIDER): Invoke Strategy Router (`resolveProvider`) to determine primary candidate, fallback chain, and routing reason.
 * 3. Stage 3 (VERIFY_CIRCUIT): Verify circuit snapshot of the target provider using `shouldAllowRequest`.
 * 4. Stage 4 (PREPARE_RETRY): Initialize exponential backoff retry state using `createInitialRetryState(runtimeConfig.retries)`.
 * 5. Stage 5 (READY_FOR_EXECUTION): Assemble and deep-freeze immutable `SchedulerPlan`.
 *
 * @param context - Immutable scheduling context.
 * @returns Immutable SchedulerResult containing the SchedulerPlan on success or an error diagnostic on failure.
 */
export function buildExecutionPlan(
  context: SchedulerContext
): Readonly<SchedulerResult> {
  const stageSteps: SchedulerStageStep[] = [];
  const now = Date.now();

  try {
    // ------------------------------------------------------------------------
    // STAGE 1: REQUEST VALIDATION
    // ------------------------------------------------------------------------
    if (!context || !context.request || !context.request.metadata) {
      throw new ConfigurationError({
        subCode: "InvalidRequestEnvelope",
        message: "Scheduler context contains a missing or malformed AIRequest envelope.",
      });
    }

    const request = context.request;
    stageSteps.push({
      stage: SchedulerStage.REQUEST_VALIDATION,
      description: `Validated AIRequest '${request.metadata.requestId}' (ModelTier: ${request.metadata.modelTier}, Priority: ${request.metadata.priorityTier})`,
      timestamp: Date.now(),
    });

    // ------------------------------------------------------------------------
    // STAGE 2: ROUTE PROVIDER
    // ------------------------------------------------------------------------
    // Map context circuitSnapshots to simple CircuitState map for strategy router
    const circuitStates: Record<string, import("./types").CircuitState> = {};
    Object.keys(context.circuitSnapshots).forEach((providerId) => {
      circuitStates[providerId] = context.circuitSnapshots[providerId].state;
    });

    const routingContext = createRoutingContext({
      modelTier: request.metadata.modelTier,
      privacyMode: request.metadata.privacyMode,
      circuitStates,
    });

    const routingDecision = resolveProvider(
      routingContext,
      context.routingTable,
      context.providerCapabilitiesMap
    );

    stageSteps.push({
      stage: SchedulerStage.ROUTE_PROVIDER,
      description: `Resolved primary provider '${routingDecision.providerId}' with model '${routingDecision.concreteModel}' (Reason: ${routingDecision.reason})`,
      timestamp: Date.now(),
    });

    // ------------------------------------------------------------------------
    // STAGE 3: VERIFY CIRCUIT
    // ------------------------------------------------------------------------
    const selectedProviderId = routingDecision.providerId;
    const targetSnapshot =
      context.circuitSnapshots[selectedProviderId] ?? createInitialSnapshot();

    const isCircuitAllowed = shouldAllowRequest(
      targetSnapshot,
      {
        failureThreshold: 5,
        recoveryTimeoutMs: 30000,
        halfOpenMaxProbes: 1,
        monitoringWindowMs: 60000,
      },
      now
    );

    if (!isCircuitAllowed) {
      throw new ConfigurationError({
        subCode: "CircuitBreakerOpen",
        message: `Provider '${selectedProviderId}' circuit breaker is OPEN. Cannot schedule execution.`,
      });
    }

    stageSteps.push({
      stage: SchedulerStage.VERIFY_CIRCUIT,
      description: `Circuit breaker verification passed for provider '${selectedProviderId}' (State: ${targetSnapshot.state})`,
      timestamp: Date.now(),
    });

    // ------------------------------------------------------------------------
    // STAGE 4: PREPARE RETRY
    // ------------------------------------------------------------------------
    const initialRetryState = createInitialRetryState(context.runtimeConfig.retries);

    stageSteps.push({
      stage: SchedulerStage.PREPARE_RETRY,
      description: `Initialized retry state (Max Attempts: ${initialRetryState.maxAttempts}, Initial Backoff: ${context.runtimeConfig.retries.initialBackoffMs}ms)`,
      timestamp: Date.now(),
    });

    // ------------------------------------------------------------------------
    // STAGE 5: READY FOR EXECUTION
    // ------------------------------------------------------------------------
    stageSteps.push({
      stage: SchedulerStage.READY_FOR_EXECUTION,
      description: `SchedulerPlan constructed successfully for requestId '${request.metadata.requestId}'`,
      timestamp: Date.now(),
    });

    const rawPlan: SchedulerPlan = {
      requestId: request.metadata.requestId,
      selectedProviderId,
      concreteModel: routingDecision.concreteModel,
      fallbackChain: routingDecision.fallbackChain,
      retryState: initialRetryState,
      circuitSnapshot: targetSnapshot,
      stages: stageSteps,
      routingReason: routingDecision.reason,
      isReady: true,
      timestamp: Date.now(),
    };

    validateSchedulerPlan(rawPlan);
    const frozenPlan = deepFreeze(rawPlan);

    const rawResult: SchedulerResult = {
      success: true,
      plan: frozenPlan,
      stages: deepFreeze([...stageSteps]),
      timestamp: Date.now(),
    };

    return deepFreeze(rawResult);

  } catch (err) {
    const errorInstance = err instanceof AIRuntimeError
      ? err
      : new ConfigurationError({
          subCode: "SchedulingFailed",
          message: err instanceof Error ? err.message : String(err),
        });

    const rawFailureResult: SchedulerResult = {
      success: false,
      error: errorInstance,
      stages: deepFreeze([...stageSteps]),
      timestamp: Date.now(),
    };

    return deepFreeze(rawFailureResult);
  }
}
