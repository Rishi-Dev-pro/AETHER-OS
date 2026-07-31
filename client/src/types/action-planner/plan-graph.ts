/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component: Plan Construction Engine & Graph Builder (`plan-graph.ts`)
 *
 * @file plan-graph.ts
 * @description Transforms a `CandidatePlan` into a structurally complete `ExecutionPlan`.
 * Implements Step Builder, Dependency Builder, DAG Graph Builder, Cycle Detector,
 * and Topological Stage Scheduler using Kahn's algorithm.
 *
 * @module @aether/action-planner/plan-graph
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import { RiskLevel, PlanPriority, ApprovalRequirement } from "./enums";
import { PlanDependencyError, InvalidCandidatePlanError } from "./errors";
import type { CandidatePlan, ExecutionPlan, PlanStep, ExecutionStage, PlanMetadata } from "./contracts";
import { createExecutionPlan, createExecutionStage, createPlanMetadata } from "./factories";

/**
 * Internal graph node representation for topological sorting and cycle detection.
 */
export interface PlanGraphNode {
  readonly stepId: string;
  readonly step: PlanStep;
  readonly prerequisiteIds: readonly string[];
  readonly dependentIds: string[];
  inDegree: number;
}

// ============================================================================
// GRAPH BUILDER & TOPOLOGICAL SCHEDULER
// ============================================================================

/**
 * Constructs an internal DAG node map from a list of plan steps.
 * Validates step ID uniqueness and prerequisite reference validity.
 *
 * @throws PlanDependencyError if invalid or orphan prerequisite step IDs exist.
 */
export function buildPlanGraph(steps: readonly PlanStep[]): Map<string, PlanGraphNode> {
  const nodes = new Map<string, PlanGraphNode>();

  // 1. Initialize node entries
  for (const step of steps) {
    if (nodes.has(step.stepId)) {
      throw new PlanDependencyError(`Duplicate step ID detected in plan: '${step.stepId}'.`);
    }

    nodes.set(step.stepId, {
      stepId: step.stepId,
      step,
      prerequisiteIds: step.dependencies.map((dep) => dep.stepId),
      dependentIds: [],
      inDegree: 0,
    });
  }

  // 2. Wire dependency edges and in-degrees
  for (const [stepId, node] of nodes.entries()) {
    for (const prereqId of node.prerequisiteIds) {
      const prereqNode = nodes.get(prereqId);
      if (!prereqNode) {
        throw new PlanDependencyError(
          `Step '${stepId}' references non-existent prerequisite step '${prereqId}'.`
        );
      }
      prereqNode.dependentIds.push(stepId);
      node.inDegree += 1;
    }
  }

  return nodes;
}

/**
 * Detects cyclic dependencies within a plan graph using Kahn's topological traversal algorithm.
 *
 * @throws PlanDependencyError if a dependency cycle is detected.
 */
export function detectGraphCycles(nodes: Map<string, PlanGraphNode>): void {
  if (nodes.size === 0) return;

  const inDegrees = new Map<string, number>();
  const queue: string[] = [];

  for (const [stepId, node] of nodes.entries()) {
    inDegrees.set(stepId, node.inDegree);
    if (node.inDegree === 0) {
      queue.push(stepId);
    }
  }

  let processedCount = 0;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    processedCount += 1;

    const node = nodes.get(currentId)!;
    for (const dependentId of node.dependentIds) {
      const currentInDegree = inDegrees.get(dependentId)! - 1;
      inDegrees.set(dependentId, currentInDegree);
      if (currentInDegree === 0) {
        queue.push(dependentId);
      }
    }
  }

  if (processedCount !== nodes.size) {
    throw new PlanDependencyError(
      `Cyclic dependency detected in step graph. Processed ${processedCount} of ${nodes.size} steps.`
    );
  }
}

/**
 * Computes parallelizable topological execution stages using level-by-level BFS traversal.
 * Steps in the same stage have zero mutual dependencies and can be executed concurrently.
 *
 * @param steps Array of plan steps.
 * @returns Array of ExecutionStage tiers.
 */
export function computeTopologicalStages(steps: readonly PlanStep[]): readonly ExecutionStage[] {
  if (steps.length === 0) {
    return [];
  }

  const nodes = buildPlanGraph(steps);
  detectGraphCycles(nodes);

  const stages: ExecutionStage[] = [];
  const inDegrees = new Map<string, number>();
  let currentTier: string[] = [];

  for (const [stepId, node] of nodes.entries()) {
    inDegrees.set(stepId, node.inDegree);
    if (node.inDegree === 0) {
      currentTier.push(stepId);
    }
  }

  // Sort initial tier lexicographically for 100% deterministic stage emission
  currentTier.sort((a, b) => a.localeCompare(b));

  let stageIndex = 0;

  while (currentTier.length > 0) {
    const nextTier: string[] = [];
    stages.push(createExecutionStage({ stageIndex, stepIds: currentTier }));
    stageIndex += 1;

    for (const stepId of currentTier) {
      const node = nodes.get(stepId)!;
      for (const dependentId of node.dependentIds) {
        const currentDeg = inDegrees.get(dependentId)! - 1;
        inDegrees.set(dependentId, currentDeg);
        if (currentDeg === 0) {
          nextTier.push(dependentId);
        }
      }
    }

    nextTier.sort((a, b) => a.localeCompare(b));
    currentTier = nextTier;
  }

  return deepFreeze(stages);
}

// ============================================================================
// MAIN PLAN CONSTRUCTION ENGINE
// ============================================================================

/**
 * Transforms a `CandidatePlan` into a fully structured `ExecutionPlan`.
 *
 * @param candidatePlan Input CandidatePlan from resolution stage.
 * @param metadata Optional administrative PlanMetadata.
 * @returns Readonly<ExecutionPlan> containing ordered steps and topological stages.
 * @throws InvalidCandidatePlanError if candidate plan is null or malformed.
 * @throws PlanDependencyError if step graph contains cycles or broken links.
 */
export function constructExecutionPlan(
  candidatePlan: CandidatePlan,
  metadata?: PlanMetadata
): Readonly<ExecutionPlan> {
  if (!candidatePlan || typeof candidatePlan !== "object") {
    throw new InvalidCandidatePlanError("CandidatePlan must be a valid non-null object.");
  }

  const planMetadata =
    metadata ||
    createPlanMetadata({
      planId: `plan_${candidatePlan.candidateId}`,
      sessionId: `sess_${candidatePlan.candidateId}`,
      turnId: `turn_${candidatePlan.candidateId}`,
    });
  const steps = candidatePlan.candidateSteps ? [...candidatePlan.candidateSteps] : [];

  // Compute topological execution stages and validate DAG invariants
  const executionStages = computeTopologicalStages(steps);

  const plan = createExecutionPlan({
    metadata: planMetadata,
    primaryActionType: candidatePlan.primaryActionType,
    steps,
    executionStages,
    compositeRiskLevel: candidatePlan.rawRiskLevel || RiskLevel.LOW,
    priority: PlanPriority.NORMAL,
    requiresUserApproval: false, // Governance risk policy reserved for Milestone 5
    approvalRequirement: ApprovalRequirement.NONE,
    confidenceScore: candidatePlan.estimatedConfidence,
  });

  return plan;
}
