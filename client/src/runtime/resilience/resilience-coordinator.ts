/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 6 Component: Resilience Coordinator (`resilience-coordinator.ts`)
 *
 * @file resilience-coordinator.ts
 * @description Master resilience orchestrator integrating Circuit Breaker FSM, deterministic
 * retries with linear backoff, timeout enforcement, provider failover cascades, and offline fast-fail.
 *
 * @module @aether/runtime/resilience/resilience-coordinator
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 6
 */

import { CircuitBreakerEngine } from "../../types/provider-runtime/circuit-breaker-engine";
import { evaluateRetryDecision } from "../../types/provider-adapters/retry-policy";
import { offlineDetector, OfflineDetector } from "./offline-detector";
import { withTimeout } from "./timeout-controller";
import {
  DEFAULT_RESILIENCE_CONFIG,
  type ResilienceConfig,
  type ResilienceExecutionResult,
  type ResilienceMetricsSnapshot,
} from "./resilience-types";
import {
  OfflineError,
  CircuitBreakerOpenError,
  RetryExhaustedError,
  ProviderFailoverExhaustedError,
  ExecutionTimeoutError,
} from "./resilience-errors";

export interface ExecuteWithResilienceParams<T> {
  readonly adapterId: string;
  readonly modelId: string;
  readonly executeFn: (currentAdapter: string, currentModel: string, signal: AbortSignal) => Promise<T>;
  readonly isStreaming?: boolean;
  readonly parentSignal?: AbortSignal;
  readonly onRetry?: (attempt: number, delayMs: number, reason: string) => void;
  readonly onFailover?: (fromAdapter: string, toAdapter: string, error: string) => void;
  readonly onCircuitChange?: (adapterId: string, state: string) => void;
}

export class ResilienceCoordinator {
  private readonly circuitBreaker: CircuitBreakerEngine;
  private readonly offline: OfflineDetector;
  private readonly config: ResilienceConfig;

  // Diagnostics Counters
  private totalRetries = 0;
  private successfulRetries = 0;
  private failedRetries = 0;
  private totalTimeouts = 0;
  private totalFailovers = 0;
  private circuitBreakerTrips = 0;
  private offlineRejections = 0;
  private lastFailoverTimestamp?: number;
  private lastRecoveryTimestamp?: number;

  constructor(
    config: Partial<ResilienceConfig> = {},
    circuitBreakerInstance?: CircuitBreakerEngine,
    offlineDetectorInstance?: OfflineDetector
  ) {
    this.config = { ...DEFAULT_RESILIENCE_CONFIG, ...config };
    this.circuitBreaker = circuitBreakerInstance ?? new CircuitBreakerEngine();
    this.offline = offlineDetectorInstance ?? offlineDetector;
  }

  public getCircuitBreakerEngine(): CircuitBreakerEngine {
    return this.circuitBreaker;
  }

  public getMetrics(): ResilienceMetricsSnapshot {
    return Object.freeze({
      totalRetries: this.totalRetries,
      successfulRetries: this.successfulRetries,
      failedRetries: this.failedRetries,
      totalTimeouts: this.totalTimeouts,
      totalFailovers: this.totalFailovers,
      circuitBreakerTrips: this.circuitBreakerTrips,
      offlineRejections: this.offlineRejections,
      lastFailoverTimestamp: this.lastFailoverTimestamp,
      lastRecoveryTimestamp: this.lastRecoveryTimestamp,
    });
  }

  /**
   * Resolves default model ID for fallback provider.
   */
  private resolveFallbackModel(adapterId: string): string {
    if (adapterId.includes("nvidia")) return "nvidia/nvidia-nemotron-nano-9b-v2";
    if (adapterId.includes("openai")) return "gpt-4o";
    if (adapterId.includes("ollama")) return "llama3";
    return "llama-3.3-70b-versatile";
  }

  /**
   * Executes an operation with full resilience protection:
   * 1. Offline detection (fast-fail)
   * 2. Circuit Breaker check
   * 3. Timeout bounds
   * 4. Deterministic retries
   * 5. Fallback provider failover
   */
  public async executeWithResilience<T>(
    params: ExecuteWithResilienceParams<T>
  ): Promise<ResilienceExecutionResult<T>> {
    // 1. Offline Fast-Fail Check
    if (!this.offline.isOnline()) {
      this.offlineRejections++;
      throw new OfflineError();
    }

    const initialAdapter = params.adapterId;
    const initialModel = params.modelId;
    const timeoutMs = params.isStreaming ? this.config.streamingTimeoutMs : this.config.requestTimeoutMs;

    // Build failover candidate list starting with primary provider
    const candidateAdapters: string[] = [initialAdapter];
    for (const fallback of this.config.fallbackProviders) {
      if (!candidateAdapters.includes(fallback)) {
        candidateAdapters.push(fallback);
      }
    }

    let currentAdapterIndex = 0;
    let totalAttempts = 0;
    let didFailover = false;
    const failoverHistory: Array<{
      fromProvider: string;
      toProvider: string;
      error: string;
      timestamp: number;
    }> = [];

    while (currentAdapterIndex < candidateAdapters.length) {
      const activeAdapter = candidateAdapters[currentAdapterIndex];
      const activeModel =
        activeAdapter === initialAdapter ? initialModel : this.resolveFallbackModel(activeAdapter);

      // Check Circuit Breaker for active adapter
      if (this.config.enableCircuitBreaker && !this.circuitBreaker.canExecute(activeAdapter)) {
        this.circuitBreakerTrips++;
        params.onCircuitChange?.(activeAdapter, "OPEN");

        // Failover immediately to next candidate
        const nextIndex = currentAdapterIndex + 1;
        if (nextIndex < candidateAdapters.length) {
          const nextAdapter = candidateAdapters[nextIndex];
          const errorMsg = `Circuit breaker OPEN for ${activeAdapter}`;
          failoverHistory.push({
            fromProvider: activeAdapter,
            toProvider: nextAdapter,
            error: errorMsg,
            timestamp: Date.now(),
          });
          didFailover = true;
          this.totalFailovers++;
          this.lastFailoverTimestamp = Date.now();
          params.onFailover?.(activeAdapter, nextAdapter, errorMsg);
          currentAdapterIndex = nextIndex;
          continue;
        } else {
          throw new CircuitBreakerOpenError(activeAdapter);
        }
      }

      // Attempt execution on active adapter with retry loop
      let adapterAttempt = 0;
      while (adapterAttempt <= this.config.maxRetries) {
        if (params.parentSignal?.aborted) {
          throw new Error(params.parentSignal.reason || "Execution cancelled by parent signal");
        }

        totalAttempts++;
        adapterAttempt++;

        try {
          const result = await withTimeout(
            (signal) => params.executeFn(activeAdapter, activeModel, signal),
            timeoutMs,
            params.parentSignal
          );

          // Record success in Circuit Breaker
          if (this.config.enableCircuitBreaker) {
            this.circuitBreaker.recordSuccess(activeAdapter);
          }

          if (adapterAttempt > 1) {
            this.successfulRetries++;
          }
          this.lastRecoveryTimestamp = Date.now();

          return {
            result,
            attempts: totalAttempts,
            resolvedProvider: activeAdapter,
            resolvedModel: activeModel,
            didFailover,
            failoverHistory: Object.freeze(failoverHistory),
          };
        } catch (err: any) {
          // Check if parent signal was aborted (user cancelled or switched session)
          if (params.parentSignal?.aborted) {
            throw err;
          }

          // Track timeout metrics
          if (err instanceof ExecutionTimeoutError || err.name === "ExecutionTimeoutError") {
            this.totalTimeouts++;
          }

          // Evaluate HTTP status code and error retryability
          const isRetryEligible = this.isEligibleForRetry(err);
          const statusCode = err.statusCode || err.status || (err instanceof ExecutionTimeoutError ? 408 : null);
          const decision = isRetryEligible
            ? evaluateRetryDecision(adapterAttempt, statusCode, {
                maxRetries: this.config.maxRetries,
                initialDelayMs: this.config.initialDelayMs,
                retryableStatusCodes: this.config.retryableStatusCodes as number[],
              })
            : { shouldRetry: false, attemptNumber: adapterAttempt, delayMs: 0, reason: err.message || "Not retryable" };

          if (decision.shouldRetry && adapterAttempt < this.config.maxRetries) {
            this.totalRetries++;
            params.onRetry?.(adapterAttempt, decision.delayMs, decision.reason);

            // Wait for deterministic delay while honoring parent signal
            if (decision.delayMs > 0) {
              await this.sleep(decision.delayMs, params.parentSignal);
            }
            continue;
          } else {
            if (adapterAttempt > 1) {
              this.failedRetries++;
            }
            // Record failure in Circuit Breaker if retryable provider failure
            if (this.config.enableCircuitBreaker && isRetryEligible) {
              const newState = this.circuitBreaker.recordFailure(activeAdapter);
              if (newState === "OPEN") {
                this.circuitBreakerTrips++;
                params.onCircuitChange?.(activeAdapter, "OPEN");
              }
            }

            // Attempt failover to next provider if available and eligible
            const nextIndex = currentAdapterIndex + 1;
            if (nextIndex < candidateAdapters.length && this.isEligibleForFailover(err)) {
              const nextAdapter = candidateAdapters[nextIndex];
              const errorMsg = err.message || "Provider error";
              failoverHistory.push({
                fromProvider: activeAdapter,
                toProvider: nextAdapter,
                error: errorMsg,
                timestamp: Date.now(),
              });
              didFailover = true;
              this.totalFailovers++;
              this.lastFailoverTimestamp = Date.now();
              params.onFailover?.(activeAdapter, nextAdapter, errorMsg);
              currentAdapterIndex = nextIndex;
              break; // Break retry loop to start on next adapter
            } else {
              if (err instanceof ExecutionTimeoutError) {
                throw err;
              }
              if (didFailover) {
                throw new ProviderFailoverExhaustedError(
                  `All fallback providers exhausted. Last error from ${activeAdapter}: ${err.message}`,
                  { failoverHistory }
                );
              }
              if (adapterAttempt >= this.config.maxRetries && isRetryEligible) {
                throw new RetryExhaustedError(
                  `Exhausted ${this.config.maxRetries} retry attempts for ${activeAdapter}: ${err.message}`,
                  { lastError: err.message, attempts: totalAttempts }
                );
              }
              throw err;
            }
          }
        }
      }
    }

    throw new ProviderFailoverExhaustedError("All providers exhausted without success.");
  }

  /**
   * Determines if error is eligible for retry attempt.
   */
  private isEligibleForRetry(err: any): boolean {
    if (!err) return false;
    if (err.name === "ConversationValidationError" || err.subCode === "InvalidRequest") {
      return false;
    }
    if (err.name === "ConversationStateError" || err.name === "TypeError" || err.name === "ReferenceError") {
      return false;
    }
    if (err.message && err.message.toLowerCase().includes("cancelled")) {
      return false;
    }
    const statusCode = err.statusCode || err.status;
    if (statusCode && [400, 401, 403, 404, 422].includes(statusCode)) {
      return false;
    }
    return true;
  }

  /**
   * Determines if error is eligible for provider failover.
   * Client-side validation errors, invalid requests, and user cancellations are NOT failover-eligible.
   */
  private isEligibleForFailover(err: any): boolean {
    if (!err) return false;
    if (err.name === "ConversationValidationError" || err.subCode === "InvalidRequest") {
      return false;
    }
    if (err.name === "ConversationStateError" || err.name === "TypeError" || err.name === "ReferenceError") {
      return false;
    }
    if (err.message && err.message.toLowerCase().includes("cancelled")) {
      return false;
    }
    const statusCode = err.statusCode || err.status;
    if (statusCode && [400, 401, 403, 404, 422].includes(statusCode)) {
      return false;
    }
    return true;
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error(signal.reason || "Aborted"));
      }

      const timer = setTimeout(resolve, ms);
      if (signal) {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error(signal.reason || "Aborted"));
        };
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }

  /**
   * Resets internal metrics and circuit breaker status.
   */
  public reset(): void {
    this.totalRetries = 0;
    this.successfulRetries = 0;
    this.failedRetries = 0;
    this.totalTimeouts = 0;
    this.totalFailovers = 0;
    this.circuitBreakerTrips = 0;
    this.offlineRejections = 0;
    this.lastFailoverTimestamp = undefined;
    this.lastRecoveryTimestamp = undefined;
  }
}

export const resilienceCoordinator = new ResilienceCoordinator();
