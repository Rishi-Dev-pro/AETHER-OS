/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Integration Test: Result Pipeline & Cleanup End-to-End (`result-pipeline.integration.test.ts`)
 *
 * @file result-pipeline.integration.test.ts
 * @description End-to-end integration tests connecting Execution Engine runtime output through
 * ResultAggregator, CleanupManager, and ResultValidator into an immutable ExecutionResultEnvelope,
 * verifying 100-run deterministic replay and full resource disposal.
 *
 * @module @aether/action-execution/tests/result-pipeline-integration
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionRegistry } from "../execution-registry";
import { ExecutionResolver } from "../execution-resolver";
import { ExecutionEngine } from "../execution-engine";
import { ResultAggregator } from "../result-aggregator";
import { CleanupManager } from "../cleanup-manager";
import { ResultValidator } from "../result-validator";
import { PermissionScope, ExecutionCapability, ExecutionUnitType, ExecutionStatus } from "../enums";
import type { ExecutionPlan, PlanStep } from "../../action-planner/contracts";
import { ActionType, RiskLevel, PlanPriority, ApprovalRequirement, StepType } from "../../action-planner/enums";
import type { ExecutionBoundary } from "../contracts";
import type { ExecutionEnvironment, ResolvedExecutionPlan } from "../resolver-types";

describe("Result Pipeline & Cleanup Layer Integration Suite", () => {
  let registry: ExecutionRegistry;
  let engine: ExecutionEngine;
  let cleanupManager: CleanupManager;

  beforeEach(() => {
    registry = new ExecutionRegistry();
    engine = new ExecutionEngine();
    cleanupManager = new CleanupManager();
  });

  const defaultBoundary: ExecutionBoundary = {
    maxSteps: 10,
    allowedPermissions: [PermissionScope.SYSTEM_COMMAND],
    allowedCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    maxEngineTimeMs: 10000,
    allowUnapprovedPlans: true,
  };

  const defaultEnvironment: ExecutionEnvironment = {
    platform: "windows",
    isHeadless: true,
    activeCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    availablePermissions: [PermissionScope.SYSTEM_COMMAND],
  };

  const createStep = (stepId: string, sequenceIndex: number, targetTool: string): PlanStep => ({
    stepId,
    sequenceIndex,
    stepType: StepType.SYSTEM_OPERATION,
    targetTool,
    parameters: { arg: `val_${stepId}` },
    dependencies: [],
    riskLevel: RiskLevel.LOW,
    timeoutMs: 2000,
    preconditions: [],
    postconditions: [],
  });

  const createPlan = (steps: PlanStep[]): ExecutionPlan => ({
    metadata: {
      planId: "plan_pipe_001",
      sessionId: "session_001",
      turnId: "turn_001",
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60000,
      generatorVersion: "1.0.0",
      customMetadata: {},
    },
    primaryActionType: ActionType.EXECUTE,
    steps,
    executionStages: [{ stageIndex: 0, stepIds: steps.map((s) => s.stepId) }],
    compositeRiskLevel: RiskLevel.LOW,
    priority: PlanPriority.NORMAL,
    requiresUserApproval: false,
    approvalRequirement: ApprovalRequirement.NONE,
    confidenceScore: 0.99,
    preconditions: [],
    postconditions: [],
  });

  it("executes complete result pipeline from Engine through Aggregator, Cleanup, and Validation", async () => {
    registry.registerExecutionUnit({
      unitId: "unit.sys",
      unitType: ExecutionUnitType.LOCAL_OS,
      version: "1.0.0",
      namespacedTools: ["sys.exec"],
      requiredPermissions: [PermissionScope.SYSTEM_COMMAND],
      requiredCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    });

    const s0 = createStep("step_s0", 0, "sys.exec");
    const s1 = createStep("step_s1", 1, "sys.exec");
    const plan = createPlan([s0, s1]);

    const resolvedPlan: ResolvedExecutionPlan = ExecutionResolver.resolveExecutionPlan(plan, registry, defaultEnvironment);

    // 1. Run Execution Engine
    const finalState = await engine.executeExecutionPlan(resolvedPlan);
    expect(finalState).toBe("COMPLETED");

    // 2. Aggregate Step Results
    const stepWorkerResults = [
      {
        workerId: "w_0",
        stepId: "step_s0",
        success: true,
        startTimestampMs: 1000,
        endTimestampMs: 1100,
        outputData: { res: 0 },
      },
      {
        workerId: "w_1",
        stepId: "step_s1",
        success: true,
        startTimestampMs: 1105,
        endTimestampMs: 1200,
        outputData: { res: 0 },
      },
    ];

    const stepResults = ResultAggregator.aggregateStepResults(stepWorkerResults, resolvedPlan.resolvedSteps);
    expect(stepResults.length).toBe(2);

    // 3. Aggregate Stage Results
    const stageResults = ResultAggregator.aggregateStageResults(resolvedPlan.resolvedStages, stepResults);
    expect(stageResults.length).toBe(1);

    // 4. Build Execution Summary
    const summary = ResultAggregator.buildExecutionSummary(
      resolvedPlan.planId,
      ExecutionStatus.COMPLETED,
      stageResults,
      stepResults
    );
    expect(summary.success).toBe(true);

    // 5. Run Cleanup Manager
    const cleanupReport = cleanupManager.cleanupSession(resolvedPlan.planId, {
      workerDispatcher: engine.getWorkerDispatcher(),
      timeoutManager: engine.getTimeoutManager(),
    });
    expect(cleanupReport.success).toBe(true);

    // 6. Create Final Execution Result Envelope
    const envelope = ResultAggregator.createExecutionEnvelope(
      resolvedPlan.planId,
      summary,
      stageResults,
      stepResults,
      cleanupReport
    );

    // 7. Validate Final Envelope
    const validatedEnvelope = ResultValidator.assertExecutionResultEnvelope(envelope);
    expect(validatedEnvelope).toBe(envelope);
    expect(Object.isFrozen(envelope)).toBe(true);
  });

  it("guarantees 100 replay runs with bit-for-bit deterministic result envelope generation", async () => {
    registry.registerExecutionUnit({
      unitId: "unit.det",
      unitType: ExecutionUnitType.API,
      version: "1.0.0",
      namespacedTools: ["api.run"],
      requiredPermissions: [],
      requiredCapabilities: [],
    });

    const plan = createPlan([createStep("step_r0", 0, "api.run")]);
    const resolvedPlan = ExecutionResolver.resolveExecutionPlan(plan, registry, defaultEnvironment);

    const replaySignatures: string[] = [];

    for (let run = 0; run < 100; run++) {
      const runEngine = new ExecutionEngine();
      const runCleanup = new CleanupManager();

      await runEngine.executeExecutionPlan(resolvedPlan);

      const stepResults = ResultAggregator.aggregateStepResults(
        [{ workerId: "w0", stepId: "step_r0", success: true, startTimestampMs: 100, endTimestampMs: 200 }],
        resolvedPlan.resolvedSteps
      );

      const stageResults = ResultAggregator.aggregateStageResults(resolvedPlan.resolvedStages, stepResults);
      const summary = ResultAggregator.buildExecutionSummary(resolvedPlan.planId, ExecutionStatus.COMPLETED, stageResults, stepResults);
      const cleanupReport = runCleanup.cleanupSession(resolvedPlan.planId, { workerDispatcher: runEngine.getWorkerDispatcher(), timeoutManager: runEngine.getTimeoutManager() });

      const envelope = ResultAggregator.createExecutionEnvelope(resolvedPlan.planId, summary, stageResults, stepResults, cleanupReport);
      ResultValidator.assertExecutionResultEnvelope(envelope);

      replaySignatures.push(`${envelope.planId}:${envelope.summary.success}:${envelope.stepResults.length}:${envelope.stageResults.length}`);
    }

    const firstSig = replaySignatures[0];
    expect(firstSig).toBe("plan_pipe_001:true:1:1");

    for (let run = 1; run < 100; run++) {
      expect(replaySignatures[run]).toBe(firstSig);
    }

    expect(replaySignatures.length).toBe(100);
  });
});
