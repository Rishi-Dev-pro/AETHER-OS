/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Lifecycle Controller FSM (`lifecycle-controller.ts`)
 *
 * @file lifecycle-controller.ts
 * @description Finite State Machine enforcing deterministic, legal lifecycle state transitions
 * for execution runtime sessions.
 *
 * @module @aether/action-execution/lifecycle-controller
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import type { ExecutionRuntimeState } from "./engine-types";
import { IllegalStateTransitionError } from "./engine-errors";

/**
 * Valid state transitions mapping for ExecutionRuntimeState.
 */
const LEGAL_TRANSITIONS: Readonly<Record<ExecutionRuntimeState, readonly ExecutionRuntimeState[]>> = Object.freeze({
  CREATED: ["VALIDATED", "FAILED", "ABORTED"] as readonly ExecutionRuntimeState[],
  VALIDATED: ["READY", "FAILED", "ABORTED"] as readonly ExecutionRuntimeState[],
  READY: ["RUNNING", "FAILED", "ABORTED"] as readonly ExecutionRuntimeState[],
  RUNNING: ["WAITING", "COMPLETED", "FAILED", "ABORTED", "TIMED_OUT"] as readonly ExecutionRuntimeState[],
  WAITING: ["RUNNING", "FAILED", "ABORTED", "TIMED_OUT"] as readonly ExecutionRuntimeState[],
  COMPLETED: [] as readonly ExecutionRuntimeState[],
  FAILED: [] as readonly ExecutionRuntimeState[],
  ABORTED: [] as readonly ExecutionRuntimeState[],
  TIMED_OUT: [] as readonly ExecutionRuntimeState[],
});

/**
 * Terminal execution states where no further state transitions are permitted.
 */
const TERMINAL_STATES: ReadonlySet<ExecutionRuntimeState> = new Set<ExecutionRuntimeState>([
  "COMPLETED",
  "FAILED",
  "ABORTED",
  "TIMED_OUT",
]);

/**
 * Deterministic Finite State Machine controlling execution engine lifecycle transitions.
 */
export class LifecycleController {
  private _state: ExecutionRuntimeState;
  private readonly _history: ExecutionRuntimeState[];

  constructor(initialState: ExecutionRuntimeState = "CREATED") {
    this._state = initialState;
    this._history = [initialState];
  }

  /**
   * Resets or re-initializes the state machine.
   */
  public initialize(initialState: ExecutionRuntimeState = "CREATED"): void {
    this._state = initialState;
    this._history.length = 0;
    this._history.push(initialState);
  }

  /**
   * Returns the active current lifecycle state.
   */
  public currentState(): ExecutionRuntimeState {
    return this._state;
  }

  /**
   * Returns an immutable copy of the state transition history.
   */
  public getHistory(): readonly ExecutionRuntimeState[] {
    return Object.freeze([...this._history]);
  }

  /**
   * Checks whether a proposed state transition from `fromState` to `toState` is legal.
   */
  public assertTransition(fromState: ExecutionRuntimeState, toState: ExecutionRuntimeState): boolean {
    const allowed = LEGAL_TRANSITIONS[fromState];
    return allowed ? allowed.includes(toState) : false;
  }

  /**
   * Transitions the FSM to `newState`. Throws `IllegalStateTransitionError` if transition is illegal.
   */
  public transition(newState: ExecutionRuntimeState): ExecutionRuntimeState {
    if (!this.assertTransition(this._state, newState)) {
      throw new IllegalStateTransitionError(this._state, newState);
    }

    this._state = newState;
    this._history.push(newState);
    return this._state;
  }

  /**
   * Returns true if the current state is a terminal state.
   */
  public isTerminal(): boolean {
    return TERMINAL_STATES.has(this._state);
  }
}
