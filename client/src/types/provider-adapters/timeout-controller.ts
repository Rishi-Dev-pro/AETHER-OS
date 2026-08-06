/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 2 Component: Timeout Controller (`timeout-controller.ts`)
 *
 * @file timeout-controller.ts
 * @description Deterministic timeout and AbortController lifecycle manager. Creates, monitors,
 * and cleanly disposes of request timers and abort signals.
 *
 * @module @aether/provider-adapters/timeout-controller
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import { TimeoutControllerError } from "./transport-errors";

/**
 * Handle object for managing an active request timeout and signal binding.
 */
export interface TimeoutHandle {
  readonly controller: AbortController;
  readonly signal: AbortSignal;
  readonly timeoutMs: number;
  readonly cancel: () => void;
  readonly isTimedOut: () => boolean;
}

/**
 * Creates a deterministic timeout handle bound to an AbortController.
 *
 * @param timeoutMs Duration in milliseconds before timing out and aborting.
 * @param onTimeout Optional callback invoked when the timeout triggers.
 * @returns TimeoutHandle instance.
 * @throws TimeoutControllerError if timeoutMs is invalid.
 */
export function createTimeoutHandle(
  timeoutMs: number,
  onTimeout?: () => void
): TimeoutHandle {
  if (typeof timeoutMs !== "number" || timeoutMs <= 0) {
    throw new TimeoutControllerError("Timeout duration must be a positive number.");
  }

  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    if (onTimeout) {
      try {
        onTimeout();
      } catch {
        // Suppress callback exceptions to preserve runtime stability
      }
    }
  }, timeoutMs);

  const cancel = () => {
    clearTimeout(timer);
  };

  const isTimedOut = () => timedOut;

  return {
    controller,
    signal: controller.signal,
    timeoutMs,
    cancel,
    isTimedOut,
  };
}
