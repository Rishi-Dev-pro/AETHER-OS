/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component 2: Error Hierarchy (`errors.ts`)
 *
 * @file errors.ts
 * @description Strongly typed error hierarchy for the Action Planning Layer.
 * All errors support fail-fast validation and include error codes, timestamps, and details.
 *
 * @module @aether/action-planner/errors
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

/**
 * Base abstract error class for all Action Planning Layer exceptions.
 */
export class ActionPlannerError extends Error {
  public readonly code: string;
  public readonly timestampMs: number;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, code = "ACTION_PLANNER_ERROR", details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestampMs = Date.now();
    if (details) {
      this.details = Object.freeze({ ...details });
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an input PlanningContext violates structural or semantic invariants.
 */
export class InvalidPlanningContextError extends ActionPlannerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "INVALID_PLANNING_CONTEXT", details);
  }
}

/**
 * Thrown when an ExecutionPlan violates structural, parameter, or stage invariants.
 */
export class InvalidExecutionPlanError extends ActionPlannerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "INVALID_EXECUTION_PLAN", details);
  }
}

/**
 * Thrown when a CandidatePlan is malformed or unresolvable.
 */
export class InvalidCandidatePlanError extends ActionPlannerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "INVALID_CANDIDATE_PLAN", details);
  }
}

/**
 * Thrown when a step dependency graph contains cycles, missing references, or deadlocks.
 */
export class PlanDependencyError extends ActionPlannerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PLAN_DEPENDENCY_ERROR", details);
  }
}

/**
 * Thrown when planning policy limits or safety boundaries are breached during planning.
 */
export class PlanningPolicyError extends ActionPlannerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PLANNING_POLICY_ERROR", details);
  }
}

/**
 * Thrown when factory inputs fail fail-fast construction assertions.
 */
export class PlanConstructionError extends ActionPlannerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PLAN_CONSTRUCTION_ERROR", details);
  }
}
