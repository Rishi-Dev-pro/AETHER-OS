/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component 4: Immutable Factory Constructors (`factories.ts`)
 *
 * @file factories.ts
 * @description Invariant-validating, fail-fast factory constructors that construct and
 * deep-freeze all domain objects, boundary results, and execution payloads.
 *
 * @module @aether/action-execution/factories
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { ExecutionStatus, BoundaryValidationStatus, PermissionScope, ExecutionCapability } from "./enums";
import { ExecutionContractError } from "./errors";
import type {
  ExecutionMetadata,
  ExecutionStepResult,
  ExecutionResult,
  ExecutionBoundary,
  ExecutionPermission,
  ExecutionValidationReport,
  ExecutionBoundaryResult,
  ExecutionSandbox,
} from "./contracts";

// ============================================================================
// DEEP FREEZE HELPER
// ============================================================================

/**
 * Recursively freezes an object and all nested properties to guarantee runtime immutability.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  Object.freeze(obj);

  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function") &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  });

  return obj as Readonly<T>;
}

// ============================================================================
// FACTORY CONSTRUCTORS
// ============================================================================

/**
 * Factory constructor for ExecutionMetadata.
 */
export function createExecutionMetadata(
  params: Partial<ExecutionMetadata> & {
    readonly executionId: string;
    readonly planId: string;
    readonly sessionId: string;
    readonly turnId: string;
  }
): Readonly<ExecutionMetadata> {
  if (!params.executionId || !params.planId || !params.sessionId || !params.turnId) {
    throw new ExecutionContractError("ExecutionMetadata requires executionId, planId, sessionId, and turnId.");
  }

  const startMs = params.startTimestampMs ?? Date.now();
  const endMs = params.endTimestampMs ?? startMs;
  const engineTimeMs = params.engineTimeMs ?? 0;
  const toolTimeMs = params.toolTimeMs ?? 0;

  if (startMs < 0 || endMs < startMs || engineTimeMs < 0 || toolTimeMs < 0) {
    throw new ExecutionContractError("Invalid timing parameters in ExecutionMetadata.");
  }

  const metadata: ExecutionMetadata = {
    executionId: params.executionId,
    planId: params.planId,
    sessionId: params.sessionId,
    turnId: params.turnId,
    startTimestampMs: startMs,
    endTimestampMs: endMs,
    engineTimeMs: engineTimeMs,
    toolTimeMs: toolTimeMs,
    totalDurationMs: params.totalDurationMs ?? endMs - startMs,
    customMetadata: params.customMetadata ?? {},
  };

  return deepFreeze(metadata);
}

/**
 * Factory constructor for ExecutionStepResult.
 */
export function createExecutionStepResult(
  params: Partial<ExecutionStepResult> & {
    readonly stepId: string;
    readonly sequenceIndex: number;
    readonly targetTool: string;
  }
): Readonly<ExecutionStepResult> {
  if (!params.stepId || params.sequenceIndex < 0 || !params.targetTool) {
    throw new ExecutionContractError("ExecutionStepResult requires stepId, non-negative sequenceIndex, and targetTool.");
  }

  const startMs = params.startTimestampMs ?? Date.now();
  const endMs = params.endTimestampMs ?? startMs;

  const result: ExecutionStepResult = {
    stepId: params.stepId,
    sequenceIndex: params.sequenceIndex,
    status: params.status ?? ExecutionStatus.COMPLETED,
    targetTool: params.targetTool,
    startTimestampMs: startMs,
    endTimestampMs: endMs,
    engineDurationMs: params.engineDurationMs ?? 0,
    toolDurationMs: params.toolDurationMs ?? endMs - startMs,
    outputData: params.outputData,
    errorDetails: params.errorDetails,
    retryCount: params.retryCount ?? 0,
  };

  return deepFreeze(result);
}

/**
 * Factory constructor for ExecutionResult.
 */
export function createExecutionResult(
  params: {
    readonly metadata: Readonly<ExecutionMetadata>;
    readonly status: ExecutionStatus;
    readonly stepResults?: readonly Readonly<ExecutionStepResult>[];
    readonly conditionAuditLog?: readonly Readonly<{
      readonly conditionType: "PRECONDITION" | "POSTCONDITION";
      readonly key: string;
      readonly passed: boolean;
      readonly expectedValue: unknown;
      readonly actualValue: unknown;
      readonly timestampMs: number;
    }>[];
    readonly cleanupLog?: readonly Readonly<{
      readonly stepId: string;
      readonly targetTool: string;
      readonly cleanedUp: boolean;
      readonly timestampMs: number;
      readonly details?: string;
    }>[];
    readonly telemetryRecord?: Readonly<Record<string, unknown>>;
  }
): Readonly<ExecutionResult> {
  if (!params.metadata || !params.status) {
    throw new ExecutionContractError("ExecutionResult requires metadata and status.");
  }

  const result: ExecutionResult = {
    metadata: params.metadata,
    status: params.status,
    stepResults: params.stepResults ?? [],
    conditionAuditLog: params.conditionAuditLog ?? [],
    cleanupLog: params.cleanupLog ?? [],
    telemetryRecord: params.telemetryRecord ?? {},
  };

  return deepFreeze(result);
}

/**
 * Factory constructor for ExecutionBoundary.
 */
export function createExecutionBoundary(
  params?: Partial<ExecutionBoundary>
): Readonly<ExecutionBoundary> {
  const boundary: ExecutionBoundary = {
    maxSteps: params?.maxSteps ?? 50,
    allowedPermissions: params?.allowedPermissions ?? Object.values(PermissionScope),
    allowedCapabilities: params?.allowedCapabilities ?? Object.values(ExecutionCapability),
    maxEngineTimeMs: params?.maxEngineTimeMs ?? 30000,
    allowUnapprovedPlans: params?.allowUnapprovedPlans ?? false,
  };

  if (boundary.maxSteps <= 0 || boundary.maxEngineTimeMs <= 0) {
    throw new ExecutionContractError("ExecutionBoundary maxSteps and maxEngineTimeMs must be positive.");
  }

  return deepFreeze(boundary);
}

/**
 * Factory constructor for ExecutionPermission.
 */
export function createExecutionPermission(
  scope: PermissionScope,
  isGranted: boolean = true,
  resourceFilter?: string
): Readonly<ExecutionPermission> {
  if (!scope) {
    throw new ExecutionContractError("ExecutionPermission requires a valid PermissionScope.");
  }

  const perm: ExecutionPermission = {
    scope,
    isGranted,
    resourceFilter,
    grantedAtMs: Date.now(),
  };

  return deepFreeze(perm);
}

/**
 * Factory constructor for ExecutionValidationReport.
 */
export function createExecutionValidationReport(
  params: {
    readonly planId: string;
    readonly status: BoundaryValidationStatus;
    readonly errors?: readonly string[];
    readonly warnings?: readonly string[];
    readonly testedPermissions?: readonly PermissionScope[];
    readonly evaluatedRulesCount?: number;
  }
): Readonly<ExecutionValidationReport> {
  if (!params.planId) {
    throw new ExecutionContractError("ExecutionValidationReport requires planId.");
  }

  const report: ExecutionValidationReport = {
    planId: params.planId,
    status: params.status,
    errors: params.errors ?? [],
    warnings: params.warnings ?? [],
    checkedAtMs: Date.now(),
    testedPermissions: params.testedPermissions ?? [],
    evaluatedRulesCount: params.evaluatedRulesCount ?? (params.errors?.length ?? 0) + (params.warnings?.length ?? 0) + 1,
  };

  return deepFreeze(report);
}

/**
 * Factory constructor for ExecutionBoundaryResult.
 */
export function createExecutionBoundaryResult(
  report: Readonly<ExecutionValidationReport>
): Readonly<ExecutionBoundaryResult> {
  if (!report) {
    throw new ExecutionContractError("ExecutionBoundaryResult requires a valid ExecutionValidationReport.");
  }

  const res: ExecutionBoundaryResult = {
    status: report.status,
    isValid: report.status === BoundaryValidationStatus.VALID,
    validationReport: report,
    timestampMs: Date.now(),
  };

  return deepFreeze(res);
}

/**
 * Factory constructor for ExecutionSandbox.
 */
export function createExecutionSandbox(
  params: {
    readonly sandboxId: string;
    readonly stepId: string;
    readonly timeoutMs?: number;
    readonly allowedPermissions?: readonly PermissionScope[];
    readonly allowedCapabilities?: readonly ExecutionCapability[];
  }
): Readonly<ExecutionSandbox> {
  if (!params.sandboxId || !params.stepId) {
    throw new ExecutionContractError("ExecutionSandbox requires sandboxId and stepId.");
  }

  const timeoutMs = params.timeoutMs ?? 5000;
  if (timeoutMs <= 0) {
    throw new ExecutionContractError("ExecutionSandbox timeoutMs must be positive.");
  }

  const sandbox: ExecutionSandbox = {
    sandboxId: params.sandboxId,
    stepId: params.stepId,
    timeoutMs,
    allowedPermissions: params.allowedPermissions ?? [],
    allowedCapabilities: params.allowedCapabilities ?? [],
    isFrozen: true,
  };

  return deepFreeze(sandbox);
}
