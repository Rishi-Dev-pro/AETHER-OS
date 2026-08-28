/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 6 Component: Timeout Controller (`timeout-controller.ts`)
 *
 * @file timeout-controller.ts
 * @description Manages deterministic execution deadlines, linking parent AbortSignals
 * with timer cleanup to ensure zero orphaned resources, memory leaks, or hung promises.
 *
 * @module @aether/runtime/resilience/timeout-controller
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 6
 */

import { ExecutionTimeoutError } from "./resilience-errors";

export interface TimeoutHandle {
  readonly signal: AbortSignal;
  readonly cleanup: () => void;
  readonly didTimeout: () => boolean;
}

/**
 * Creates an AbortSignal linked to a timeout deadline and optional parent AbortSignal.
 *
 * @param timeoutMs Maximum allowable duration before firing timeout abort.
 * @param parentSignal Optional parent AbortSignal (e.g. user cancellation or session switch).
 */
export function createTimeoutSignal(timeoutMs: number, parentSignal?: AbortSignal): TimeoutHandle {
  const controller = new AbortController();
  let timedOut = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const onParentAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort(parentSignal?.reason || "Parent signal aborted");
    }
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener("abort", onParentAbort, { once: true });
    }
  }

  if (timeoutMs > 0 && !controller.signal.aborted) {
    timerId = setTimeout(() => {
      timedOut = true;
      controller.abort(new ExecutionTimeoutError(`Execution exceeded timeout limit of ${timeoutMs}ms.`));
    }, timeoutMs);
  }

  const cleanup = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (parentSignal) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  };

  return {
    signal: controller.signal,
    cleanup,
    didTimeout: () => timedOut,
  };
}

/**
 * Wraps an async operation with a strict timeout deadline.
 */
export async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<T> {
  const { signal, cleanup, didTimeout } = createTimeoutSignal(timeoutMs, parentSignal);

  try {
    const result = await task(signal);
    return result;
  } catch (err: any) {
    if (didTimeout() || (signal.aborted && signal.reason instanceof ExecutionTimeoutError)) {
      throw new ExecutionTimeoutError(`Execution timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    cleanup();
  }
}
