/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Result Validator (`result-validator.ts`)
 *
 * @file result-validator.ts
 * @description Validates structural integrity, schema rules, and invariant properties
 * of step results, stage summaries, cleanup reports, and final ExecutionResultEnvelopes.
 *
 * @module @aether/action-execution/result-validator
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import type { ExecutionResultEnvelope } from "./result-types";
import { ResultValidationError } from "./result-errors";

export class ResultValidator {
  /**
   * Validates structural invariants of a StepExecutionResult.
   */
  public static validateStepExecutionResult(result: unknown): boolean {
    if (!result || typeof result !== "object") return false;
    const r = result as Record<string, unknown>;

    if (typeof r.stepId !== "string" || r.stepId.trim() === "") return false;
    if (typeof r.sequenceIndex !== "number" || r.sequenceIndex < 0) return false;
    if (typeof r.targetTool !== "string" || !r.targetTool) return false;
    if (typeof r.unitId !== "string" || !r.unitId) return false;
    if (!r.status || typeof r.status !== "string") return false;
    if (typeof r.success !== "boolean") return false;
    if (typeof r.startTimestampMs !== "number" || r.startTimestampMs < 0) return false;
    if (typeof r.endTimestampMs !== "number" || r.endTimestampMs < r.startTimestampMs) return false;
    if (typeof r.durationMs !== "number" || r.durationMs < 0) return false;

    return true;
  }

  /**
   * Validates structural invariants of a StageExecutionResult.
   */
  public static validateStageExecutionResult(result: unknown): boolean {
    if (!result || typeof result !== "object") return false;
    const r = result as Record<string, unknown>;

    if (typeof r.stageIndex !== "number" || r.stageIndex < 0) return false;
    if (!Array.isArray(r.stepIds)) return false;
    if (!Array.isArray(r.stepResults)) return false;
    if (typeof r.success !== "boolean") return false;
    if (typeof r.startTimestampMs !== "number") return false;
    if (typeof r.endTimestampMs !== "number") return false;
    if (typeof r.totalDurationMs !== "number" || r.totalDurationMs < 0) return false;

    for (const sr of r.stepResults) {
      if (!this.validateStepExecutionResult(sr)) return false;
    }

    return true;
  }

  /**
   * Validates structural invariants of an ExecutionSummary.
   */
  public static validateExecutionSummary(summary: unknown): boolean {
    if (!summary || typeof summary !== "object") return false;
    const s = summary as Record<string, unknown>;

    if (typeof s.planId !== "string" || s.planId.trim() === "") return false;
    if (typeof s.totalSteps !== "number" || s.totalSteps < 0) return false;
    if (typeof s.completedSteps !== "number" || s.completedSteps < 0) return false;
    if (typeof s.failedSteps !== "number" || s.failedSteps < 0) return false;
    if (typeof s.totalStages !== "number" || s.totalStages < 0) return false;
    if (!s.status || typeof s.status !== "string") return false;
    if (typeof s.success !== "boolean") return false;
    if (typeof s.startTimestampMs !== "number") return false;
    if (typeof s.endTimestampMs !== "number") return false;

    return true;
  }

  /**
   * Validates structural invariants of a CleanupReport.
   */
  public static validateCleanupReport(report: unknown): boolean {
    if (!report || typeof report !== "object") return false;
    const c = report as Record<string, unknown>;

    if (typeof c.cleanupId !== "string" || c.cleanupId.trim() === "") return false;
    if (typeof c.planId !== "string" || c.planId.trim() === "") return false;
    if (typeof c.timestampMs !== "number") return false;
    if (typeof c.workersCleanedCount !== "number" || c.workersCleanedCount < 0) return false;
    if (typeof c.timeoutsCleanedCount !== "number" || c.timeoutsCleanedCount < 0) return false;
    if (typeof c.resourcesDisposedCount !== "number" || c.resourcesDisposedCount < 0) return false;
    if (typeof c.success !== "boolean") return false;
    if (!Array.isArray(c.details)) return false;

    return true;
  }

  /**
   * Validates structural invariants of a ResultAggregationReport.
   */
  public static validateResultAggregationReport(report: unknown): boolean {
    if (!report || typeof report !== "object") return false;
    const a = report as Record<string, unknown>;

    if (typeof a.aggregationId !== "string" || a.aggregationId.trim() === "") return false;
    if (typeof a.planId !== "string" || a.planId.trim() === "") return false;
    if (typeof a.aggregatedAtMs !== "number") return false;
    if (typeof a.totalStepResultsCount !== "number" || a.totalStepResultsCount < 0) return false;
    if (typeof a.totalStageResultsCount !== "number" || a.totalStageResultsCount < 0) return false;
    if (typeof a.isComplete !== "boolean") return false;

    return true;
  }

  /**
   * Validates an entire ExecutionResultEnvelope.
   */
  public static validateExecutionResultEnvelope(envelope: unknown): boolean {
    if (!envelope || typeof envelope !== "object") return false;
    const e = envelope as Record<string, unknown>;

    if (typeof e.envelopeId !== "string" || e.envelopeId.trim() === "") return false;
    if (typeof e.planId !== "string" || e.planId.trim() === "") return false;
    if (!this.validateExecutionSummary(e.summary)) return false;
    if (!Array.isArray(e.stageResults)) return false;
    if (!Array.isArray(e.stepResults)) return false;
    if (!this.validateCleanupReport(e.cleanupReport)) return false;
    if (!this.validateResultAggregationReport(e.aggregationReport)) return false;
    if (typeof e.createdTimestampMs !== "number") return false;

    for (const st of e.stageResults) {
      if (!this.validateStageExecutionResult(st)) return false;
    }
    for (const sp of e.stepResults) {
      if (!this.validateStepExecutionResult(sp)) return false;
    }

    return true;
  }

  /**
   * Asserts validity of an ExecutionResultEnvelope, throwing ResultValidationError if invalid.
   */
  public static assertExecutionResultEnvelope(envelope: unknown): Readonly<ExecutionResultEnvelope> {
    const errors: string[] = [];

    if (!envelope || typeof envelope !== "object") {
      errors.push("Envelope is null or not an object.");
    } else {
      const e = envelope as Record<string, unknown>;
      if (!e.envelopeId) errors.push("Missing envelopeId.");
      if (!e.planId) errors.push("Missing planId.");
      if (!this.validateExecutionSummary(e.summary)) errors.push("Invalid summary structure.");
      if (!this.validateCleanupReport(e.cleanupReport)) errors.push("Invalid cleanupReport structure.");
      if (!this.validateResultAggregationReport(e.aggregationReport)) errors.push("Invalid aggregationReport structure.");
    }

    if (errors.length > 0 || !this.validateExecutionResultEnvelope(envelope)) {
      throw new ResultValidationError(
        (envelope as Record<string, unknown>)?.planId as string ?? "unknown",
        errors.length > 0 ? errors : ["ExecutionResultEnvelope failed structural validation."]
      );
    }

    return envelope as Readonly<ExecutionResultEnvelope>;
  }
}
