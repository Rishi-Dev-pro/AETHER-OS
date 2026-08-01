/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component 3: Domain Contracts & Readonly Interfaces (`contracts.ts`)
 *
 * @file contracts.ts
 * @description Immutable data contracts and readonly interfaces for all Action Execution
 * concepts, boundary results, sandbox contexts, execution metadata, and results.
 *
 * @module @aether/action-execution/contracts
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import type {
  ExecutionStatus,
  BoundaryValidationStatus,
  ExecutionFailureReason,
  PermissionScope,
  ExecutionCapability,
  ExecutionUnitType,
} from "./enums";

import type {
  ExecutionPlan,
  PlanStep,
  ExecutionStage,
  PlanPrecondition,
  PlanPostcondition,
  PlanDependency,
} from "../action-planner/contracts";

// Re-export Phase 9.7 plan types for downstream convenience
export type { ExecutionPlan, PlanStep, ExecutionStage, PlanPrecondition, PlanPostcondition, PlanDependency };

// ============================================================================
// 1. SECURED EXECUTION PLAN CONTRACT
// ============================================================================

/**
 * Immutable Secured Execution Plan envelope consumed by Phase 9.8.
 * Combines Phase 9.7 ExecutionPlan with execution boundary authorization metadata.
 */
export interface SecuredExecutionPlan extends ExecutionPlan {
  /** Integrity hash of the plan contents */
  readonly integrityHash?: string;
  /** Authorization token issued during approval */
  readonly authorizationToken?: string;
  /** Granted permission scopes bound to this plan */
  readonly approvedPermissions?: readonly PermissionScope[];
  /** Explicit approval flag */
  readonly isApproved?: boolean;
}

// ============================================================================
// 2. METADATA & TIMING CONTRACTS
// ============================================================================

/**
 * Administrative execution metadata envelope with timing metrics.
 */
export interface ExecutionMetadata {
  readonly executionId: string;
  readonly planId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly startTimestampMs: number;
  readonly endTimestampMs: number;
  /** Framework overhead duration in milliseconds */
  readonly engineTimeMs: number;
  /** Cumulative external driver execution duration in milliseconds */
  readonly toolTimeMs: number;
  /** Total wall-clock execution duration in milliseconds */
  readonly totalDurationMs: number;
  readonly customMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * Execution plan reference summary.
 */
export interface ExecutionPlanReference {
  readonly planId: string;
  readonly generatorVersion: string;
  readonly createdTimestampMs: number;
  readonly expiresTimestampMs: number;
  readonly requiresApproval: boolean;
  readonly isApproved: boolean;
}

// ============================================================================
// 3. STEP RESULT & EXECUTION RESULT CONTRACTS
// ============================================================================

/**
 * Execution outcome record for an individual atomic plan step.
 */
export interface ExecutionStepResult {
  readonly stepId: string;
  readonly sequenceIndex: number;
  readonly status: ExecutionStatus;
  readonly targetTool: string;
  readonly startTimestampMs: number;
  readonly endTimestampMs: number;
  /** Framework overhead duration for this step in milliseconds */
  readonly engineDurationMs: number;
  /** Tool/driver execution duration for this step in milliseconds */
  readonly toolDurationMs: number;
  readonly outputData?: unknown;
  readonly errorDetails?: {
    readonly code: string;
    readonly message: string;
    readonly failureReason: ExecutionFailureReason;
    readonly stack?: string;
  };
  readonly retryCount: number;
}

/**
 * Deep-frozen result envelope emitted by Phase 9.8 upon execution completion.
 */
export interface ExecutionResult {
  readonly metadata: Readonly<ExecutionMetadata>;
  readonly status: ExecutionStatus;
  readonly stepResults: readonly Readonly<ExecutionStepResult>[];
  readonly conditionAuditLog: readonly Readonly<{
    readonly conditionType: "PRECONDITION" | "POSTCONDITION";
    readonly key: string;
    readonly passed: boolean;
    readonly expectedValue: unknown;
    readonly actualValue: unknown;
    readonly timestampMs: number;
  }>[];
  readonly cleanupLog: readonly Readonly<{
    readonly stepId: string;
    readonly targetTool: string;
    readonly cleanedUp: boolean;
    readonly timestampMs: number;
    readonly details?: string;
  }>[];
  readonly telemetryRecord: Readonly<Record<string, unknown>>;
}

// ============================================================================
// 4. BOUNDARY & PERMISSION CONTRACTS
// ============================================================================

/**
 * Granted permission specification bound to an execution scope.
 */
export interface ExecutionPermission {
  readonly scope: PermissionScope;
  readonly isGranted: boolean;
  readonly resourceFilter?: string;
  readonly grantedAtMs: number;
}

/**
 * Static or dynamic policy boundaries governing plan execution limits.
 */
export interface ExecutionBoundary {
  readonly maxSteps: number;
  readonly allowedPermissions: readonly PermissionScope[];
  readonly allowedCapabilities: readonly ExecutionCapability[];
  readonly maxEngineTimeMs: number;
  readonly allowUnapprovedPlans: boolean;
}

/**
 * Detailed validation report generated by ExecutionBoundaryValidator.
 */
export interface ExecutionValidationReport {
  readonly planId: string;
  readonly status: BoundaryValidationStatus;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly checkedAtMs: number;
  readonly testedPermissions: readonly PermissionScope[];
  readonly evaluatedRulesCount: number;
}

/**
 * Outer execution boundary validation result payload.
 */
export interface ExecutionBoundaryResult {
  readonly status: BoundaryValidationStatus;
  readonly isValid: boolean;
  readonly validationReport: Readonly<ExecutionValidationReport>;
  readonly timestampMs: number;
}

// ============================================================================
// 5. SANDBOX & CONTEXT CONTRACTS
// ============================================================================

/**
 * Isolated execution scope provisioned per step dispatch.
 */
export interface ExecutionSandbox {
  readonly sandboxId: string;
  readonly stepId: string;
  readonly timeoutMs: number;
  readonly allowedPermissions: readonly PermissionScope[];
  readonly allowedCapabilities: readonly ExecutionCapability[];
  readonly isFrozen: boolean;
}

/**
 * Runtime execution context passed to execution units.
 */
export interface ExecutionContext {
  readonly executionId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly timestampMs: number;
  readonly activePermissions: readonly PermissionScope[];
}

// ============================================================================
// 6. EXECUTION UNIT & ADAPTER CONTRACTS
// ============================================================================

/**
 * Metadata contract describing a registered execution unit adapter.
 */
export interface ExecutionUnitMetadata {
  readonly unitId: string;
  readonly unitType: ExecutionUnitType;
  readonly version: string;
  readonly namespacedTools: readonly string[];
  readonly requiredPermissions: readonly PermissionScope[];
  readonly requiredCapabilities: readonly ExecutionCapability[];
}

/**
 * Structural contract for execution unit adapters.
 */
export interface ExecutionUnitContract {
  readonly metadata: Readonly<ExecutionUnitMetadata>;
  readonly isThreadSafe: boolean;
  readonly isReversible: boolean;
}
