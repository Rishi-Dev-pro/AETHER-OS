/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component: Action Planner Manager & Pipeline Orchestrator (`action-planner-manager.ts`)
 *
 * @file action-planner-manager.ts
 * @description Master facade orchestrating all frozen planning modules in deterministic order:
 * Context Normalizer -> Candidate Resolver -> Plan Construction Engine -> Plan Safety Layer.
 * Emits a deeply frozen, fully validated `PlanningPipelineResult`.
 *
 * @module @aether/action-planner/action-planner-manager
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 6
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import type { PlanningContext, CandidatePlan, ExecutionPlan } from "./contracts";
import { normalizePlanningContext, type RawPlanningContextInput } from "./context-normalizer";
import { resolveCandidatePlan } from "./plan-resolver";
import { constructExecutionPlan } from "./plan-graph";
import { createPlanMetadata } from "./factories";
import { evaluatePlanSafety } from "./plan-risk-engine";

/**
 * Diagnostic checkpoint recorded during pipeline orchestration.
 */
export interface PipelineCheckpoint {
  readonly moduleName: string;
  readonly status: "SUCCESS" | "FAILED";
  readonly detail?: string;
}

/**
 * Deterministic diagnostics report attached to every pipeline result.
 */
export interface PipelineDiagnostics {
  readonly pipelineId: string;
  readonly moduleSequence: readonly string[];
  readonly checkpoints: readonly PipelineCheckpoint[];
  readonly success: boolean;
}

/**
 * Master immutable result envelope produced by the Action Planning Layer.
 */
export interface PlanningPipelineResult {
  readonly normalizedContext: Readonly<PlanningContext>;
  readonly candidatePlan: Readonly<CandidatePlan>;
  readonly structuralPlan: Readonly<ExecutionPlan>;
  readonly securedPlan: Readonly<ExecutionPlan>;
  readonly diagnostics: Readonly<PipelineDiagnostics>;
}

// Fixed deterministic module sequence
const PIPELINE_MODULE_SEQUENCE: readonly string[] = Object.freeze([
  "ContextNormalizer",
  "CandidateResolver",
  "PlanConstructionEngine",
  "PlanSafetyLayer",
]);

// ============================================================================
// ACTION PLANNER MANAGER FACADE
// ============================================================================

export class ActionPlannerManager {
  /**
   * Orchestrates the complete end-to-end planning pipeline in strict deterministic order.
   *
   * @param input Raw input payload or pre-built PlanningContext.
   * @returns Deeply frozen Readonly<PlanningPipelineResult>.
   * @throws InvalidPlanningContextError | InvalidCandidatePlanError | PlanDependencyError | PlanningPolicyError on fail-fast error.
   */
  public executePipeline(input?: RawPlanningContextInput | PlanningContext): Readonly<PlanningPipelineResult> {
    const checkpoints: PipelineCheckpoint[] = [];

    // Step 1: Context Normalizer
    const normalizedContext = normalizePlanningContext(input as RawPlanningContextInput);
    checkpoints.push({ moduleName: "ContextNormalizer", status: "SUCCESS" });

    // Step 2: Candidate Resolver
    const candidatePlan = resolveCandidatePlan(normalizedContext);
    checkpoints.push({ moduleName: "CandidateResolver", status: "SUCCESS" });

    // Step 3: Plan Construction Engine (DAG & Topological Stages)
    const planMetadata = createPlanMetadata({
      planId: `plan_${candidatePlan.candidateId}`,
      sessionId: `sess_${candidatePlan.candidateId}`,
      turnId: `turn_${candidatePlan.candidateId}`,
      createdAtMs: normalizedContext.timestampMs,
      expiresAtMs: normalizedContext.timestampMs + 300000,
    });
    const structuralPlan = constructExecutionPlan(candidatePlan, planMetadata);
    checkpoints.push({ moduleName: "PlanConstructionEngine", status: "SUCCESS" });

    // Step 4: Plan Safety Layer (Capability Analysis, Risk Scoring, Policy Check, Approval Prompt)
    const securedPlan = evaluatePlanSafety(structuralPlan, normalizedContext.policy);
    checkpoints.push({ moduleName: "PlanSafetyLayer", status: "SUCCESS" });

    // Step 5: Assemble Pipeline Diagnostics
    const diagnostics: PipelineDiagnostics = {
      pipelineId: `pipe_${normalizedContext.contextId}`,
      moduleSequence: PIPELINE_MODULE_SEQUENCE,
      checkpoints: Object.freeze(checkpoints),
      success: true,
    };

    // Step 6: Assemble Master Immutable Result
    const result: PlanningPipelineResult = {
      normalizedContext,
      candidatePlan,
      structuralPlan,
      securedPlan,
      diagnostics: deepFreeze(diagnostics),
    };

    return deepFreeze(result);
  }
}

/**
 * Singleton factory helper function to run the Action Planning Layer pipeline.
 */
export function planAction(input?: RawPlanningContextInput | PlanningContext): Readonly<PlanningPipelineResult> {
  const manager = new ActionPlannerManager();
  return manager.executePipeline(input);
}
