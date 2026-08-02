/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Component: Provider Lifecycle Manager (`provider-lifecycle-manager.ts`)
 *
 * @file provider-lifecycle-manager.ts
 * @description Governs formal Provider Lifecycle FSM transitions, ensuring fail-fast
 * assertion against illegal state moves and maintaining immutable transition history snapshots.
 *
 * @module @aether/provider-runtime/provider-lifecycle-manager
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import { ProviderLifecycleState } from "./enums";
import { IllegalLifecycleTransitionError } from "./lifecycle-errors";
import type { LifecycleTransition, LifecycleSnapshot } from "./lifecycle-types";
import { deepFreeze } from "./factories";

/**
 * Single authoritative manager governing Provider Lifecycle FSM states per providerId.
 */
export class ProviderLifecycleManager {
  private readonly states = new Map<string, ProviderLifecycleState>();
  private readonly histories = new Map<string, LifecycleTransition[]>();

  /**
   * Returns current lifecycle state of target provider. Defaults to UNREGISTERED.
   */
  public getLifecycleState(providerId: string): ProviderLifecycleState {
    return this.states.get(providerId) ?? ProviderLifecycleState.UNREGISTERED;
  }

  /**
   * Registers a new provider into the lifecycle state machine (UNREGISTERED -> REGISTERED).
   */
  public registerProvider(providerId: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.REGISTERED);
    return this.transitionTo(providerId, ProviderLifecycleState.REGISTERED, "Provider registered");
  }

  /**
   * Moves provider into INITIALIZING state (REGISTERED -> INITIALIZING).
   */
  public initializeProvider(providerId: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.INITIALIZING);
    return this.transitionTo(providerId, ProviderLifecycleState.INITIALIZING, "Initialization started");
  }

  /**
   * Moves provider into optional WARMING_UP state (INITIALIZING -> WARMING_UP).
   */
  public warmProvider(providerId: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.WARMING_UP);
    return this.transitionTo(providerId, ProviderLifecycleState.WARMING_UP, "Warmup started");
  }

  /**
   * Marks provider READY to receive execution requests.
   */
  public markReady(providerId: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.READY);
    return this.transitionTo(providerId, ProviderLifecycleState.READY, "Provider ready");
  }

  /**
   * Marks provider BUSY while executing a request.
   */
  public markBusy(providerId: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.BUSY);
    return this.transitionTo(providerId, ProviderLifecycleState.BUSY, "Execution in progress");
  }

  /**
   * Alias for markReady (marks provider AVAILABLE / READY).
   */
  public markAvailable(providerId: string): ProviderLifecycleState {
    return this.markReady(providerId);
  }

  /**
   * Marks provider UNAVAILABLE (DEGRADED).
   */
  public markUnavailable(providerId: string, reason?: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.DEGRADED);
    return this.transitionTo(providerId, ProviderLifecycleState.DEGRADED, reason ?? "Marked unavailable");
  }

  /**
   * Marks provider UNHEALTHY after a failure.
   */
  public failProvider(providerId: string, reason?: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.UNHEALTHY);
    return this.transitionTo(providerId, ProviderLifecycleState.UNHEALTHY, reason ?? "Provider failed");
  }

  /**
   * Moves provider to DISABLED state.
   */
  public stopProvider(providerId: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.DISABLED);
    return this.transitionTo(providerId, ProviderLifecycleState.DISABLED, "Provider stopped");
  }

  /**
   * Moves provider to terminal DISPOSED state.
   */
  public shutdownProvider(providerId: string): ProviderLifecycleState {
    this.assertTransition(providerId, ProviderLifecycleState.DISPOSED);
    return this.transitionTo(providerId, ProviderLifecycleState.DISPOSED, "Provider disposed");
  }

  /**
   * Evaluates whether a transition from current state to targetState is legal.
   */
  public validateTransition(providerId: string, targetState: ProviderLifecycleState): boolean {
    const currentState = this.getLifecycleState(providerId);

    if (currentState === ProviderLifecycleState.DISPOSED) {
      return false; // Terminal state: no further transitions permitted
    }

    switch (currentState) {
      case ProviderLifecycleState.UNREGISTERED:
        return targetState === ProviderLifecycleState.REGISTERED;

      case ProviderLifecycleState.REGISTERED:
        return (
          targetState === ProviderLifecycleState.INITIALIZING ||
          targetState === ProviderLifecycleState.DISPOSED
        );

      case ProviderLifecycleState.INITIALIZING:
        return (
          targetState === ProviderLifecycleState.WARMING_UP ||
          targetState === ProviderLifecycleState.READY ||
          targetState === ProviderLifecycleState.DEGRADED ||
          targetState === ProviderLifecycleState.UNHEALTHY ||
          targetState === ProviderLifecycleState.DISPOSED
        );

      case ProviderLifecycleState.WARMING_UP:
        return (
          targetState === ProviderLifecycleState.READY ||
          targetState === ProviderLifecycleState.DEGRADED ||
          targetState === ProviderLifecycleState.UNHEALTHY ||
          targetState === ProviderLifecycleState.DISPOSED
        );

      case ProviderLifecycleState.READY:
        return (
          targetState === ProviderLifecycleState.BUSY ||
          targetState === ProviderLifecycleState.DEGRADED ||
          targetState === ProviderLifecycleState.UNHEALTHY ||
          targetState === ProviderLifecycleState.DISABLED ||
          targetState === ProviderLifecycleState.DISPOSED
        );

      case ProviderLifecycleState.BUSY:
        return (
          targetState === ProviderLifecycleState.READY ||
          targetState === ProviderLifecycleState.DEGRADED ||
          targetState === ProviderLifecycleState.UNHEALTHY ||
          targetState === ProviderLifecycleState.DISABLED ||
          targetState === ProviderLifecycleState.DISPOSED
        );

      case ProviderLifecycleState.DEGRADED:
      case ProviderLifecycleState.UNHEALTHY:
        return (
          targetState === ProviderLifecycleState.READY ||
          targetState === ProviderLifecycleState.DISABLED ||
          targetState === ProviderLifecycleState.DISPOSED
        );

      case ProviderLifecycleState.DISABLED:
        return (
          targetState === ProviderLifecycleState.READY ||
          targetState === ProviderLifecycleState.DISPOSED
        );

      default:
        return false;
    }
  }

  /**
   * Asserts transition legality; throws IllegalLifecycleTransitionError immediately if illegal.
   */
  public assertTransition(providerId: string, targetState: ProviderLifecycleState): void {
    if (!this.validateTransition(providerId, targetState)) {
      const currentState = this.getLifecycleState(providerId);
      throw new IllegalLifecycleTransitionError(
        `Illegal lifecycle state transition for provider '${providerId}': '${currentState}' -> '${targetState}'.`,
        { providerId, currentState, targetState }
      );
    }
  }

  /**
   * Generates a deeply frozen snapshot of provider lifecycle state and transition history.
   */
  public createSnapshot(providerId: string): Readonly<LifecycleSnapshot> {
    const currentState = this.getLifecycleState(providerId);
    const history = this.histories.get(providerId) ? [...this.histories.get(providerId)!] : [];

    const snapshot: LifecycleSnapshot = {
      providerId,
      currentState,
      history,
      snapshotAtMs: Date.now(),
    };

    return deepFreeze(snapshot);
  }

  /**
   * Executes the transition and updates history.
   */
  private transitionTo(
    providerId: string,
    toState: ProviderLifecycleState,
    reason: string
  ): ProviderLifecycleState {
    const fromState = this.getLifecycleState(providerId);
    const transition: LifecycleTransition = {
      fromState,
      toState,
      timestampMs: Date.now(),
      reason,
    };

    this.states.set(providerId, toState);

    if (!this.histories.has(providerId)) {
      this.histories.set(providerId, []);
    }
    this.histories.get(providerId)!.push(transition);

    return toState;
  }

  /**
   * Resets lifecycle tracking for tests or system cleanup.
   */
  public reset(providerId?: string): void {
    if (providerId) {
      this.states.delete(providerId);
      this.histories.delete(providerId);
    } else {
      this.states.clear();
      this.histories.clear();
    }
  }
}
