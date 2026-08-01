/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component 5: Execution Boundary Validator (`boundary-validator.ts`)
 *
 * @file boundary-validator.ts
 * @description Validates structural integrity, schema compatibility, expiration,
 * permission scopes, capabilities, user approval flags, and lifecycle state transitions
 * for ExecutionPlan blueprints prior to pipeline entry.
 *
 * @module @aether/action-execution/boundary-validator
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { BoundaryValidationStatus, PermissionScope, ExecutionLifecycleState } from "./enums";
import {
  BoundaryValidationError,
  PermissionDeniedError,
  PlanExpiredError,
  SchemaValidationError,
  ExecutionStateError,
} from "./errors";
import type {
  SecuredExecutionPlan,
  ExecutionBoundary,
  ExecutionBoundaryResult,
} from "./contracts";
import {
  createExecutionBoundary,
  createExecutionValidationReport,
  createExecutionBoundaryResult,
} from "./factories";

/**
 * Options configuring boundary validation behavior.
 */
export interface BoundaryValidatorOptions {
  /** If true, throws fail-fast domain errors on validation failure instead of returning a failed result payload */
  readonly strict?: boolean;
  /** Current Unix timestamp override in milliseconds for deterministic time testing */
  readonly currentTimestampMs?: number;
}

/**
 * Main validator service class for Execution Boundary verification.
 */
export class ExecutionBoundaryValidator {
  /**
   * Validates a SecuredExecutionPlan against boundary restrictions, permission scopes,
   * expiration limits, structural rules, and user approval policies.
   *
   * @param plan - The incoming execution plan blueprint to validate.
   * @param boundary - Optional custom boundary limits (defaults to standard system boundary).
   * @param options - Validation behavior options.
   * @returns Readonly ExecutionBoundaryResult envelope.
   */
  public static validateExecutionPlan(
    plan: Readonly<SecuredExecutionPlan>,
    boundary?: Readonly<ExecutionBoundary>,
    options: BoundaryValidatorOptions = {}
  ): Readonly<ExecutionBoundaryResult> {
    const activeBoundary = boundary ?? createExecutionBoundary();
    const nowMs = options.currentTimestampMs ?? Date.now();

    const errors: string[] = [];
    const warnings: string[] = [];
    let status: BoundaryValidationStatus = BoundaryValidationStatus.VALID;

    // 1. Structural Integrity Check
    if (!plan || typeof plan !== "object") {
      errors.push("Execution plan is null, undefined, or not an object.");
      status = BoundaryValidationStatus.INVALID_STRUCTURE;
    } else if (!plan.metadata || !plan.metadata.planId || !plan.metadata.sessionId) {
      errors.push("Execution plan metadata is missing required planId or sessionId.");
      status = BoundaryValidationStatus.INVALID_STRUCTURE;
    } else if (!Array.isArray(plan.steps)) {
      errors.push("Execution plan steps must be an array.");
      status = BoundaryValidationStatus.INVALID_STRUCTURE;
    } else if (!Array.isArray(plan.executionStages)) {
      errors.push("Execution plan executionStages must be an array.");
      status = BoundaryValidationStatus.INVALID_STRUCTURE;
    }

    if (errors.length > 0) {
      return this.finalizeReport(plan?.metadata?.planId ?? "unknown", status, errors, warnings, options);
    }

    // 2. Schema Compatibility Check
    if (!this.validateExecutionSchema(plan)) {
      errors.push("Execution plan schema validation failed. Step indices or stage references are invalid.");
      status = BoundaryValidationStatus.INVALID_SCHEMA;
      return this.finalizeReport(plan.metadata.planId, status, errors, warnings, options);
    }

    // 3. Step Count Boundary Check
    if (plan.steps.length > activeBoundary.maxSteps) {
      errors.push(
        `Execution plan exceeds maximum step limit. Found ${plan.steps.length} steps, maximum allowed is ${activeBoundary.maxSteps}.`
      );
      status = BoundaryValidationStatus.INVALID_STRUCTURE;
      return this.finalizeReport(plan.metadata.planId, status, errors, warnings, options);
    }

    // 4. Expiration Check
    if (plan.metadata.expiresAtMs && plan.metadata.expiresAtMs <= nowMs) {
      errors.push(
        `Execution plan has expired. Expired at timestamp ${plan.metadata.expiresAtMs} ms, current time is ${nowMs} ms.`
      );
      status = BoundaryValidationStatus.EXPIRED;
      if (options.strict) {
        throw new PlanExpiredError(errors[0], { planId: plan.metadata.planId, expiresAtMs: plan.metadata.expiresAtMs, nowMs });
      }
      return this.finalizeReport(plan.metadata.planId, status, errors, warnings, options);
    }

    // 5. User Approval Requirement Check
    if (plan.requiresUserApproval && !plan.isApproved && !activeBoundary.allowUnapprovedPlans) {
      errors.push(`Execution plan requires explicit user approval but is not marked as approved.`);
      status = BoundaryValidationStatus.UNAPPROVED;
      if (options.strict) {
        throw new BoundaryValidationError(errors[0], { planId: plan.metadata.planId, requiresUserApproval: true });
      }
      return this.finalizeReport(plan.metadata.planId, status, errors, warnings, options);
    }

    // 6. Permission Scope Check
    const requestedPermissions = plan.approvedPermissions ?? [];
    if (!this.validatePermissionScope(requestedPermissions, activeBoundary.allowedPermissions)) {
      errors.push(`Execution plan requests permissions outside the allowed boundary permissions.`);
      status = BoundaryValidationStatus.PERMISSION_DENIED;
      if (options.strict) {
        throw new PermissionDeniedError(errors[0], { planId: plan.metadata.planId, requestedPermissions });
      }
      return this.finalizeReport(plan.metadata.planId, status, errors, warnings, options);
    }

    // 7. Success Report Generation
    return this.finalizeReport(
      plan.metadata.planId,
      BoundaryValidationStatus.VALID,
      errors,
      warnings,
      options,
      requestedPermissions
    );
  }

  /**
   * Helper to construct and finalize a validation report envelope.
   */
  private static finalizeReport(
    planId: string,
    status: BoundaryValidationStatus,
    errors: readonly string[],
    warnings: readonly string[],
    options: BoundaryValidatorOptions,
    testedPermissions: readonly PermissionScope[] = []
  ): Readonly<ExecutionBoundaryResult> {
    const report = createExecutionValidationReport({
      planId,
      status,
      errors,
      warnings,
      testedPermissions,
      evaluatedRulesCount: 7,
    });

    if (options.strict && status !== BoundaryValidationStatus.VALID) {
      const mainError = errors[0] ?? `Plan boundary validation failed with status ${status}`;
      if (status === BoundaryValidationStatus.EXPIRED) {
        throw new PlanExpiredError(mainError, { planId });
      } else if (status === BoundaryValidationStatus.PERMISSION_DENIED) {
        throw new PermissionDeniedError(mainError, { planId });
      } else if (status === BoundaryValidationStatus.INVALID_SCHEMA) {
        throw new SchemaValidationError(mainError, { planId });
      } else {
        throw new BoundaryValidationError(mainError, { planId, status });
      }
    }

    return createExecutionBoundaryResult(report);
  }

  /**
   * Validates requested permission scopes against granted permission scopes.
   */
  public static validatePermissionScope(
    requestedPermissions: readonly PermissionScope[],
    grantedPermissions: readonly PermissionScope[]
  ): boolean {
    if (!requestedPermissions || requestedPermissions.length === 0) {
      return true;
    }
    const grantedSet = new Set(grantedPermissions);
    return requestedPermissions.every((perm) => grantedSet.has(perm));
  }

  /**
   * Validates structural invariants of an ExecutionBoundary.
   */
  public static validateExecutionBoundary(boundary: Readonly<ExecutionBoundary>): boolean {
    if (!boundary || typeof boundary !== "object") {
      return false;
    }
    if (typeof boundary.maxSteps !== "number" || boundary.maxSteps <= 0) {
      return false;
    }
    if (typeof boundary.maxEngineTimeMs !== "number" || boundary.maxEngineTimeMs <= 0) {
      return false;
    }
    if (!Array.isArray(boundary.allowedPermissions) || !Array.isArray(boundary.allowedCapabilities)) {
      return false;
    }
    return true;
  }

  /**
   * Validates the schema and topological stage structural consistency of a plan.
   */
  public static validateExecutionSchema(plan: Readonly<SecuredExecutionPlan>): boolean {
    if (!plan || !Array.isArray(plan.steps) || !Array.isArray(plan.executionStages)) {
      return false;
    }

    // Map of valid step IDs
    const stepMap = new Map(plan.steps.map((step) => [step.stepId, step]));

    // Assert that every step has required fields
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!step.stepId || typeof step.sequenceIndex !== "number" || !step.targetTool) {
        return false;
      }
      if (step.sequenceIndex < 0) {
        return false;
      }
    }

    // Assert that all steps referenced in executionStages exist in steps array
    for (const stage of plan.executionStages) {
      if (typeof stage.stageIndex !== "number" || !Array.isArray(stage.stepIds)) {
        return false;
      }
      for (const stepId of stage.stepIds) {
        if (!stepMap.has(stepId)) {
          return false; // Stage references non-existent step
        }
      }
    }

    return true;
  }

  /**
   * Validates whether a lifecycle state transition is legal in the Execution Engine FSM.
   */
  public static validateExecutionLifecycle(
    currentState: ExecutionLifecycleState,
    targetState: ExecutionLifecycleState
  ): boolean {
    if (!currentState || !targetState) {
      return false;
    }

    const validTransitions: Record<ExecutionLifecycleState, readonly ExecutionLifecycleState[]> = {
      [ExecutionLifecycleState.CREATED]: [ExecutionLifecycleState.INITIALIZED, ExecutionLifecycleState.TERMINATED],
      [ExecutionLifecycleState.INITIALIZED]: [ExecutionLifecycleState.VALIDATING, ExecutionLifecycleState.TERMINATED],
      [ExecutionLifecycleState.VALIDATING]: [ExecutionLifecycleState.PRECONDITION_CHECK, ExecutionLifecycleState.TERMINATED],
      [ExecutionLifecycleState.PRECONDITION_CHECK]: [ExecutionLifecycleState.DISPATCHING, ExecutionLifecycleState.TERMINATED],
      [ExecutionLifecycleState.DISPATCHING]: [ExecutionLifecycleState.POSTCONDITION_CHECK, ExecutionLifecycleState.TERMINATED],
      [ExecutionLifecycleState.POSTCONDITION_CHECK]: [ExecutionLifecycleState.FINALIZING, ExecutionLifecycleState.TERMINATED],
      [ExecutionLifecycleState.FINALIZING]: [ExecutionLifecycleState.TERMINATED],
      [ExecutionLifecycleState.TERMINATED]: [],
    };

    const allowed = validTransitions[currentState] ?? [];
    const isLegal = allowed.includes(targetState);

    return isLegal;
  }

  /**
   * Asserts a valid lifecycle transition or throws ExecutionStateError.
   */
  public static assertLifecycleTransition(
    currentState: ExecutionLifecycleState,
    targetState: ExecutionLifecycleState
  ): void {
    if (!this.validateExecutionLifecycle(currentState, targetState)) {
      throw new ExecutionStateError(
        `Illegal lifecycle transition requested from ${currentState} to ${targetState}.`,
        { currentState, targetState }
      );
    }
  }
}
