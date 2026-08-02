/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Result Validator (`result-validator.test.ts`)
 *
 * @file result-validator.test.ts
 * @description Unit tests for ResultValidator validating step results, stage summaries,
 * cleanup reports, aggregation reports, and execution envelopes.
 *
 * @module @aether/action-execution/tests/result-validator
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import { describe, it, expect } from "vitest";
import { ResultValidator } from "../result-validator";
import { ResultValidationError } from "../result-errors";
import { ExecutionStatus } from "../enums";
import type { StepExecutionResult, StageExecutionResult, ExecutionSummary, CleanupReport, ResultAggregationReport, ExecutionResultEnvelope } from "../result-types";

describe("ResultValidator", () => {
  const validStepResult: StepExecutionResult = {
    stepId: "step_0",
    sequenceIndex: 0,
    targetTool: "browser.navigate",
    unitId: "unit.browser",
    status: ExecutionStatus.COMPLETED,
    success: true,
    startTimestampMs: 1000,
    endTimestampMs: 1200,
    durationMs: 200,
    outputData: { ok: true },
  };

  const validStageResult: StageExecutionResult = {
    stageIndex: 0,
    stepIds: ["step_0"],
    stepResults: [validStepResult],
    success: true,
    startTimestampMs: 1000,
    endTimestampMs: 1200,
    totalDurationMs: 200,
  };

  const validSummary: ExecutionSummary = {
    planId: "plan_val_001",
    totalSteps: 1,
    completedSteps: 1,
    failedSteps: 0,
    totalStages: 1,
    status: ExecutionStatus.COMPLETED,
    success: true,
    startTimestampMs: 1000,
    endTimestampMs: 1200,
    totalDurationMs: 200,
  };

  const validCleanupReport: CleanupReport = {
    cleanupId: "cleanup_val_001",
    planId: "plan_val_001",
    timestampMs: 1205,
    workersCleanedCount: 1,
    timeoutsCleanedCount: 0,
    resourcesDisposedCount: 0,
    success: true,
    details: ["Cleaned workers"],
  };

  const validAggregationReport: ResultAggregationReport = {
    aggregationId: "agg_val_001",
    planId: "plan_val_001",
    aggregatedAtMs: 1206,
    totalStepResultsCount: 1,
    totalStageResultsCount: 1,
    isComplete: true,
  };

  const validEnvelope: ExecutionResultEnvelope = {
    envelopeId: "env_val_001",
    planId: "plan_val_001",
    summary: validSummary,
    stageResults: [validStageResult],
    stepResults: [validStepResult],
    cleanupReport: validCleanupReport,
    aggregationReport: validAggregationReport,
    createdTimestampMs: 1210,
  };

  it("validates valid StepExecutionResult payloads", () => {
    expect(ResultValidator.validateStepExecutionResult(validStepResult)).toBe(true);
    expect(ResultValidator.validateStepExecutionResult({})).toBe(false);
    expect(ResultValidator.validateStepExecutionResult(null)).toBe(false);
  });

  it("validates valid StageExecutionResult payloads", () => {
    expect(ResultValidator.validateStageExecutionResult(validStageResult)).toBe(true);
    expect(ResultValidator.validateStageExecutionResult({ stepResults: ["invalid"] })).toBe(false);
  });

  it("validates valid ExecutionSummary payloads", () => {
    expect(ResultValidator.validateExecutionSummary(validSummary)).toBe(true);
    expect(ResultValidator.validateExecutionSummary({ totalSteps: -1 })).toBe(false);
  });

  it("validates valid CleanupReport payloads", () => {
    expect(ResultValidator.validateCleanupReport(validCleanupReport)).toBe(true);
  });

  it("validates valid ExecutionResultEnvelope payloads", () => {
    expect(ResultValidator.validateExecutionResultEnvelope(validEnvelope)).toBe(true);
  });

  it("asserts valid ExecutionResultEnvelope or throws ResultValidationError", () => {
    expect(ResultValidator.assertExecutionResultEnvelope(validEnvelope)).toBe(validEnvelope);
    expect(() => ResultValidator.assertExecutionResultEnvelope({})).toThrow(ResultValidationError);
  });
});
