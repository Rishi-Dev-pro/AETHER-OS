/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component: Plan Safety Layer (`plan-risk-engine.ts`)
 *
 * @file plan-risk-engine.ts
 * @description Evaluates system capabilities, intrinsic risk levels, static policy rules,
 * and user approval requirements for an ExecutionPlan. Emits a deeply frozen, secured ExecutionPlan.
 *
 * @module @aether/action-planner/plan-risk-engine
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import { RiskLevel, ApprovalRequirement } from "./enums";
import { PlanningPolicyError } from "./errors";
import type { ExecutionPlan, PlanningPolicy, PlanStep } from "./contracts";
import { createExecutionPlan, createPlanningPolicy } from "./factories";

/**
 * System capability classifications required by plan steps.
 */
export enum SystemCapability {
  DIALOGUE_ONLY = "DIALOGUE_ONLY",
  MEMORY_ACCESS = "MEMORY_ACCESS",
  FILESYSTEM_READ = "FILESYSTEM_READ",
  FILESYSTEM_WRITE = "FILESYSTEM_WRITE",
  NETWORK_ACCESS = "NETWORK_ACCESS",
  BROWSER_AUTOMATION = "BROWSER_AUTOMATION",
  DESKTOP_AUTOMATION = "DESKTOP_AUTOMATION",
}

/**
 * Policy evaluation outcome structure.
 */
export interface PolicyEvaluationResult {
  readonly isAllowed: boolean;
  readonly isBlocked: boolean;
  readonly blockedReason?: string;
  readonly violatedTools: readonly string[];
}

/**
 * Security analysis report produced by the Plan Safety Layer.
 */
export interface SecurityAnalysisReport {
  readonly requiredCapabilities: readonly SystemCapability[];
  readonly stepRiskLevels: Readonly<Record<string, RiskLevel>>;
  readonly compositeRiskLevel: RiskLevel;
  readonly policyResult: Readonly<PolicyEvaluationResult>;
  readonly requiresUserApproval: boolean;
  readonly approvalRequirement: ApprovalRequirement;
  readonly userConfirmationPrompt?: string;
}

// Map target tool names to required system capabilities
const TOOL_CAPABILITY_MAP: Record<string, SystemCapability[]> = {
  "chat.respond": [SystemCapability.DIALOGUE_ONLY],
  "system.ask_clarification": [SystemCapability.DIALOGUE_ONLY],
  "browser.openUrl": [SystemCapability.BROWSER_AUTOMATION, SystemCapability.NETWORK_ACCESS],
  "browser.search": [SystemCapability.BROWSER_AUTOMATION, SystemCapability.NETWORK_ACCESS],
  "browser.navigate": [SystemCapability.BROWSER_AUTOMATION, SystemCapability.NETWORK_ACCESS],
  "system.readFile": [SystemCapability.FILESYSTEM_READ],
  "system.writeFile": [SystemCapability.FILESYSTEM_WRITE],
  "system.deleteFile": [SystemCapability.FILESYSTEM_WRITE, SystemCapability.DESKTOP_AUTOMATION],
  "system.executeCommand": [SystemCapability.DESKTOP_AUTOMATION, SystemCapability.FILESYSTEM_WRITE],
  "system.setVolume": [SystemCapability.DESKTOP_AUTOMATION],
  "camera.toggle": [SystemCapability.DESKTOP_AUTOMATION],
};

// Map system capability to base risk rating
const CAPABILITY_RISK_MAP: Record<SystemCapability, RiskLevel> = {
  [SystemCapability.DIALOGUE_ONLY]: RiskLevel.LOW,
  [SystemCapability.MEMORY_ACCESS]: RiskLevel.LOW,
  [SystemCapability.FILESYSTEM_READ]: RiskLevel.MEDIUM,
  [SystemCapability.BROWSER_AUTOMATION]: RiskLevel.MEDIUM,
  [SystemCapability.NETWORK_ACCESS]: RiskLevel.HIGH,
  [SystemCapability.FILESYSTEM_WRITE]: RiskLevel.HIGH,
  [SystemCapability.DESKTOP_AUTOMATION]: RiskLevel.CRITICAL,
};

const RISK_WEIGHTS: Record<RiskLevel, number> = {
  [RiskLevel.LOW]: 1,
  [RiskLevel.MEDIUM]: 2,
  [RiskLevel.HIGH]: 3,
  [RiskLevel.CRITICAL]: 4,
};

// ============================================================================
// 1. CAPABILITY ANALYZER
// ============================================================================

/**
 * Classifies required system capabilities for a single plan step.
 */
export function analyzeStepCapabilities(step: PlanStep): readonly SystemCapability[] {
  const capabilities = TOOL_CAPABILITY_MAP[step.targetTool];
  if (capabilities && capabilities.length > 0) {
    return deepFreeze([...capabilities]);
  }

  // Fallback heuristic based on tool name prefix
  if (step.targetTool.startsWith("browser.")) {
    return deepFreeze([SystemCapability.BROWSER_AUTOMATION, SystemCapability.NETWORK_ACCESS]);
  }
  if (step.targetTool.startsWith("system.file") || step.targetTool.includes("write") || step.targetTool.includes("delete")) {
    return deepFreeze([SystemCapability.FILESYSTEM_WRITE]);
  }
  if (step.targetTool.startsWith("system.")) {
    return deepFreeze([SystemCapability.DESKTOP_AUTOMATION]);
  }

  return deepFreeze([SystemCapability.DIALOGUE_ONLY]);
}

/**
 * Classifies all unique required system capabilities across an entire plan.
 */
export function analyzePlanCapabilities(steps: readonly PlanStep[]): readonly SystemCapability[] {
  if (steps.length === 0) {
    return deepFreeze([SystemCapability.DIALOGUE_ONLY]);
  }

  const set = new Set<SystemCapability>();
  for (const step of steps) {
    const caps = analyzeStepCapabilities(step);
    caps.forEach((c) => set.add(c));
  }

  const sortedCaps = Array.from(set).sort((a, b) => a.localeCompare(b));
  return deepFreeze(sortedCaps);
}

// ============================================================================
// 2. RISK ESTIMATOR
// ============================================================================

/**
 * Calculates intrinsic risk for a single plan step based on required capabilities.
 */
export function estimateStepRisk(step: PlanStep): RiskLevel {
  const capabilities = analyzeStepCapabilities(step);
  let maxRisk = RiskLevel.LOW;

  for (const cap of capabilities) {
    const risk = CAPABILITY_RISK_MAP[cap] || RiskLevel.LOW;
    if (RISK_WEIGHTS[risk] > RISK_WEIGHTS[maxRisk]) {
      maxRisk = risk;
    }
  }

  return maxRisk;
}

/**
 * Computes composited intrinsic risk for an entire ExecutionPlan.
 */
export function estimateCompositeRisk(steps: readonly PlanStep[]): RiskLevel {
  if (steps.length === 0) {
    return RiskLevel.LOW;
  }

  let highestRisk = RiskLevel.LOW;

  for (const step of steps) {
    const stepRisk = estimateStepRisk(step);
    if (RISK_WEIGHTS[stepRisk] > RISK_WEIGHTS[highestRisk]) {
      highestRisk = stepRisk;
    }
  }

  return highestRisk;
}

// ============================================================================
// 3. POLICY ENGINE & APPROVAL ENGINE
// ============================================================================

/**
 * Evaluates static planning policies against target tools and step risks.
 *
 * @throws PlanningPolicyError if a plan uses blacklisted or restricted tools.
 */
export function evaluatePlanningPolicy(steps: readonly PlanStep[], policy: PlanningPolicy): Readonly<PolicyEvaluationResult> {
  const restrictedTools = new Set(policy.restrictedTools || []);
  const violatedTools: string[] = [];

  for (const step of steps) {
    if (restrictedTools.has(step.targetTool)) {
      violatedTools.push(step.targetTool);
    }
  }

  if (violatedTools.length > 0) {
    throw new PlanningPolicyError(
      `Plan execution blocked: restricted tools detected [${violatedTools.join(", ")}].`
    );
  }

  return deepFreeze({
    isAllowed: true,
    isBlocked: false,
    violatedTools: deepFreeze([]),
  });
}

/**
 * Evaluates user approval requirements and builds confirmation prompt text.
 */
export function evaluateApprovalMetadata(
  compositeRisk: RiskLevel,
  steps: readonly PlanStep[],
  policy: PlanningPolicy
): { requiresUserApproval: boolean; approvalRequirement: ApprovalRequirement; userConfirmationPrompt?: string } {
  const mandatoryRisks = new Set(policy.mandatoryApprovalRiskLevels || [RiskLevel.HIGH, RiskLevel.CRITICAL]);
  const requiresUserApproval = mandatoryRisks.has(compositeRisk);

  if (!requiresUserApproval) {
    return {
      requiresUserApproval: false,
      approvalRequirement: ApprovalRequirement.NONE,
    };
  }

  const approvalRequirement =
    compositeRisk === RiskLevel.CRITICAL ? ApprovalRequirement.STRICT_CONFIRMATION : ApprovalRequirement.MANDATORY;

  const toolList = steps.map((s) => s.targetTool).join(", ");
  const userConfirmationPrompt = `Safety Approval Required [Risk: ${compositeRisk}]: Plan involves target operations (${toolList}). Confirm execution?`;

  return {
    requiresUserApproval: true,
    approvalRequirement,
    userConfirmationPrompt,
  };
}

// ============================================================================
// 4. PLAN SAFETY SUBSYSTEM FACADE
// ============================================================================

/**
 * Evaluates capabilities, calculates intrinsic risk, verifies policies, and enriches an ExecutionPlan.
 *
 * @param plan Input ExecutionPlan from graph construction stage.
 * @param policy System static PlanningPolicy.
 * @returns Readonly<ExecutionPlan> enriched with safety metadata and deeply frozen.
 */
export function evaluatePlanSafety(plan: ExecutionPlan, policy?: PlanningPolicy): Readonly<ExecutionPlan> {
  const activePolicy = policy || createPlanningPolicy();

  // 1. Analyze capabilities and estimate risk
  const compositeRiskLevel = estimateCompositeRisk(plan.steps);

  // 2. Evaluate policy boundaries (throws PlanningPolicyError if restricted tool present)
  evaluatePlanningPolicy(plan.steps, activePolicy);

  // 3. Evaluate user approval requirements
  const approvalMeta = evaluateApprovalMetadata(compositeRiskLevel, plan.steps, activePolicy);

  // 4. Re-enrich ExecutionPlan with safety metadata
  const securedPlan = createExecutionPlan({
    metadata: plan.metadata,
    primaryActionType: plan.primaryActionType,
    steps: plan.steps,
    executionStages: plan.executionStages,
    compositeRiskLevel,
    priority: plan.priority,
    requiresUserApproval: approvalMeta.requiresUserApproval,
    approvalRequirement: approvalMeta.approvalRequirement,
    userConfirmationPrompt: approvalMeta.userConfirmationPrompt,
    confidenceScore: plan.confidenceScore,
    preconditions: plan.preconditions,
    postconditions: plan.postconditions,
    fallbackPlan: plan.fallbackPlan,
  });

  return deepFreeze(securedPlan);
}
