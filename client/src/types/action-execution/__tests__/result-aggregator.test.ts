/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Result Aggregator (`result-aggregator.test.ts`)
 *
 * @file result-aggregator.test.ts
 * @description Unit tests for ResultAggregator step result aggregation, stage result aggregation,
 * execution summary building, result envelope construction, deterministic ordering, and immutability.
 *
 * @module @aether/action-execution/tests/result-aggregator
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import { describe, it, expect } from "vitest";
import { ResultAggregator } from "../result-aggregator";
import { ExecutionStatus } from "../enums";
import type { ExecutionWorkerResult } from "../engine-types";
import type { ResolvedExecutionStep } from "../resolver-types";
import { RiskLevel } from "../../action-planner/enums";
import type { CleanupReport } from "../result-types";

describe("ResultAggregator", () => {
  const workerResults: ExecutionWorkerResult[] = [
    {
      workerId: "w_step_1",
      stepId: "step_1",
      success: true,
      startTimestampMs: 1000,
      endTimestampMs: 1200,
      outputData: { result: "ok" },
    },
    {
      workerId: "w_step_0",
      stepId: "step_0",
      success: true,
      startTimestampMs: 800,
      endTimestampMs: 950,
      outputData: { nav: true },
    },
  ];

  const resolvedSteps: ResolvedExecutionStep[] = [
    {
      stepId: "step_0",
      sequenceIndex: 0,
      targetTool: "browser.navigate",
      unitEntry: {
        metadata: {
          unitId: "unit.browser",
          unitType: "BROWSER" as any,
          version: "1.0.0",
          namespacedTools: ["browser.navigate"],
          requiredPermissions: [],
          requiredCapabilities: [],
        },
        registeredAtMs: Date.now(),
        status: "ACTIVE" as any,
      },
      descriptor: {
        descriptorId: "desc_0",
        stepId: "step_0",
        sequenceIndex: 0,
        targetTool: "browser.navigate",
        unitId: "unit.browser",
        parameters: {},
        bindings: [],
        timeoutMs: 1000,
        sandbox: {
          sandboxId: "sb_0",
          stepId: "step_0",
          timeoutMs: 1000,
          allowedPermissions: [],
          allowedCapabilities: [],
          isFrozen: true,
        },
      },
      dependencies: [],
      riskLevel: RiskLevel.LOW,
    },
    {
      stepId: "step_1",
      sequenceIndex: 1,
      targetTool: "fs.read_file",
      unitEntry: {
        metadata: {
          unitId: "unit.fs",
          unitType: "LOCAL_OS" as any,
          version: "1.0.0",
          namespacedTools: ["fs.read_file"],
          requiredPermissions: [],
          requiredCapabilities: [],
        },
        registeredAtMs: Date.now(),
        status: "ACTIVE" as any,
      },
      descriptor: {
        descriptorId: "desc_1",
        stepId: "step_1",
        sequenceIndex: 1,
        targetTool: "fs.read_file",
        unitId: "unit.fs",
        parameters: {},
        bindings: [],
        timeoutMs: 1000,
        sandbox: {
          sandboxId: "sb_1",
          stepId: "step_1",
          timeoutMs: 1000,
          allowedPermissions: [],
          allowedCapabilities: [],
          isFrozen: true,
        },
      },
      dependencies: [],
      riskLevel: RiskLevel.LOW,
    },
  ];

  it("aggregates worker results with deterministic sequence index sorting", () => {
    const aggregated = ResultAggregator.aggregateStepResults(workerResults, resolvedSteps);

    expect(aggregated.length).toBe(2);
    expect(aggregated[0].stepId).toBe("step_0");
    expect(aggregated[0].sequenceIndex).toBe(0);
    expect(aggregated[1].stepId).toBe("step_1");
    expect(aggregated[1].sequenceIndex).toBe(1);
    expect(Object.isFrozen(aggregated)).toBe(true);
  });

  it("aggregates stage results from resolved stages topology", () => {
    const aggregatedStepResults = ResultAggregator.aggregateStepResults(workerResults, resolvedSteps);
    const resolvedStages = [
      { stageIndex: 0, stepIds: ["step_0"] },
      { stageIndex: 1, stepIds: ["step_1"] },
    ];

    const stageResults = ResultAggregator.aggregateStageResults(resolvedStages, aggregatedStepResults);

    expect(stageResults.length).toBe(2);
    expect(stageResults[0].stageIndex).toBe(0);
    expect(stageResults[0].success).toBe(true);
    expect(stageResults[1].stageIndex).toBe(1);
    expect(stageResults[1].success).toBe(true);
    expect(Object.isFrozen(stageResults)).toBe(true);
  });

  it("builds an ExecutionSummary metric report", () => {
    const aggregatedStepResults = ResultAggregator.aggregateStepResults(workerResults, resolvedSteps);
    const stageResults = ResultAggregator.aggregateStageResults(
      [{ stageIndex: 0, stepIds: ["step_0", "step_1"] }],
      aggregatedStepResults
    );

    const summary = ResultAggregator.buildExecutionSummary(
      "plan_test_001",
      ExecutionStatus.COMPLETED,
      stageResults,
      aggregatedStepResults
    );

    expect(summary.planId).toBe("plan_test_001");
    expect(summary.totalSteps).toBe(2);
    expect(summary.completedSteps).toBe(2);
    expect(summary.failedSteps).toBe(0);
    expect(summary.success).toBe(true);
    expect(Object.isFrozen(summary)).toBe(true);
  });

  it("creates a master ExecutionResultEnvelope bundling all results", () => {
    const aggregatedStepResults = ResultAggregator.aggregateStepResults(workerResults, resolvedSteps);
    const stageResults = ResultAggregator.aggregateStageResults(
      [{ stageIndex: 0, stepIds: ["step_0", "step_1"] }],
      aggregatedStepResults
    );
    const summary = ResultAggregator.buildExecutionSummary(
      "plan_test_001",
      ExecutionStatus.COMPLETED,
      stageResults,
      aggregatedStepResults
    );

    const cleanupReport: CleanupReport = {
      cleanupId: "cleanup_001",
      planId: "plan_test_001",
      timestampMs: Date.now(),
      workersCleanedCount: 2,
      timeoutsCleanedCount: 1,
      resourcesDisposedCount: 0,
      success: true,
      details: ["Cleaned workers"],
    };

    const envelope = ResultAggregator.createExecutionEnvelope(
      "plan_test_001",
      summary,
      stageResults,
      aggregatedStepResults,
      cleanupReport
    );

    expect(envelope.envelopeId).toBeDefined();
    expect(envelope.planId).toBe("plan_test_001");
    expect(envelope.summary).toBe(summary);
    expect(envelope.stageResults).toEqual(stageResults);
    expect(envelope.stepResults).toEqual(aggregatedStepResults);
    expect(envelope.cleanupReport).toBe(cleanupReport);
    expect(Object.isFrozen(envelope)).toBe(true);
  });
});
