/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component 4: Immutable Factory Constructors (`factories.ts`)
 *
 * @file factories.ts
 * @description Fail-fast factory constructors enforcing domain invariants, field validation,
 * readonly interfaces, and recursive runtime immutability via `deepFreeze`.
 *
 * @module @aether/action-planner/factories
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import { ActionType, RiskLevel, PlanPriority, StepType, ApprovalRequirement } from "./enums";
import { PlanConstructionError } from "./errors";
import type {
  PlanDependency,
  PlanPrecondition,
  PlanPostcondition,
  PlanStep,
  CandidatePlan,
  PlanningPolicy,
  PlanningContext,
  PlanMetadata,
  ExecutionStage,
  ExecutionPlan,
} from "./contracts";
import type { StructuredContext } from "../cognitive";
import type { IntentResult } from "../intent";
import type { ConversationTurn } from "../conversation-core/types";
import type { MemoryEntry } from "../memory-system/types";

// ============================================================================
// INPUT INTERFACES FOR FACTORY CONSTRUCTORS
// ============================================================================

export interface CreatePlanMetadataInput {
  planId?: string;
  sessionId?: string;
  turnId?: string;
  createdAtMs?: number;
  expiresAtMs?: number;
  generatorVersion?: string;
  customMetadata?: Record<string, unknown>;
}

export interface CreatePlanDependencyInput {
  stepId: string;
  dependencyType?: "STRICT" | "OPTIONAL";
  condition?: string;
}

export interface CreatePlanPreconditionInput {
  key: string;
  expectedValue: unknown;
  comparator?: "EQUALS" | "CONTAINS" | "EXISTS" | "GREATER_THAN" | "LESS_THAN";
}

export interface CreatePlanPostconditionInput {
  key: string;
  targetValue: unknown;
  assertType?: "STATE_MUTATION" | "OUTPUT_EMISSION" | "LOG_PERSISTENCE";
}

export interface CreatePlanStepInput {
  stepId: string;
  sequenceIndex: number;
  stepType?: StepType;
  targetTool: string;
  parameters?: Record<string, unknown>;
  dependencies?: readonly PlanDependency[];
  riskLevel?: RiskLevel;
  timeoutMs?: number;
  preconditions?: readonly PlanPrecondition[];
  postconditions?: readonly PlanPostcondition[];
}

export interface CreateCandidatePlanInput {
  candidateId?: string;
  primaryActionType: ActionType;
  candidateSteps?: readonly PlanStep[];
  estimatedConfidence?: number;
  rawRiskLevel?: RiskLevel;
  reasoningSummary?: string;
}

export interface CreatePlanningPolicyInput {
  minConfidenceThreshold?: number;
  defaultStepTimeoutMs?: number;
  maxStepsPerPlan?: number;
  restrictedTools?: readonly string[];
  mandatoryApprovalRiskLevels?: readonly RiskLevel[];
  customRules?: Record<string, unknown>;
}

export interface CreatePlanningContextInput {
  contextId?: string;
  timestampMs?: number;
  structuredContext?: StructuredContext;
  intentResult?: IntentResult;
  conversationTurn?: ConversationTurn;
  retrievedMemories?: readonly MemoryEntry[];
  policy?: PlanningPolicy;
}

export interface CreateExecutionStageInput {
  stageIndex: number;
  stepIds: readonly string[];
}

export interface CreateExecutionPlanInput {
  metadata?: PlanMetadata;
  primaryActionType: ActionType;
  steps: readonly PlanStep[];
  executionStages?: readonly ExecutionStage[];
  compositeRiskLevel?: RiskLevel;
  priority?: PlanPriority;
  requiresUserApproval?: boolean;
  approvalRequirement?: ApprovalRequirement;
  userConfirmationPrompt?: string;
  confidenceScore?: number;
  preconditions?: readonly PlanPrecondition[];
  postconditions?: readonly PlanPostcondition[];
  fallbackPlan?: ExecutionPlan;
}

// ============================================================================
// HELPER VALIDATORS
// ============================================================================

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PlanConstructionError(`Field '${fieldName}' must be a non-empty string.`);
  }
  return value.trim();
}

function assertValidConfidence(score: unknown, fieldName = "confidenceScore"): number {
  if (typeof score !== "number" || Number.isNaN(score) || score < 0.0 || score > 1.0) {
    throw new PlanConstructionError(`Field '${fieldName}' must be a valid number between 0.0 and 1.0.`);
  }
  return score;
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
}

// ============================================================================
// FACTORY CONSTRUCTORS
// ============================================================================

/**
 * Creates an immutable Readonly<PlanMetadata> instance.
 */
export function createPlanMetadata(input: CreatePlanMetadataInput = {}): Readonly<PlanMetadata> {
  const planId = input.planId ? assertNonEmptyString(input.planId, "planId") : generateId("plan");
  const sessionId = input.sessionId ? assertNonEmptyString(input.sessionId, "sessionId") : generateId("session");
  const turnId = input.turnId ? assertNonEmptyString(input.turnId, "turnId") : generateId("turn");
  const createdAtMs = input.createdAtMs ?? Date.now();
  const expiresAtMs = input.expiresAtMs ?? createdAtMs + 300000; // default 5 min expiration

  if (createdAtMs <= 0) {
    throw new PlanConstructionError("createdAtMs must be a positive timestamp.");
  }
  if (expiresAtMs <= createdAtMs) {
    throw new PlanConstructionError("expiresAtMs must be greater than createdAtMs.");
  }

  const metadata: PlanMetadata = {
    planId,
    sessionId,
    turnId,
    createdAtMs,
    expiresAtMs,
    generatorVersion: input.generatorVersion || "1.0.0",
    customMetadata: input.customMetadata ? { ...input.customMetadata } : {},
  };

  return deepFreeze(metadata);
}

/**
 * Creates an immutable Readonly<PlanDependency> instance.
 */
export function createPlanDependency(input: CreatePlanDependencyInput): Readonly<PlanDependency> {
  const stepId = assertNonEmptyString(input.stepId, "stepId");
  const dependencyType = input.dependencyType || "STRICT";

  if (dependencyType !== "STRICT" && dependencyType !== "OPTIONAL") {
    throw new PlanConstructionError("dependencyType must be either 'STRICT' or 'OPTIONAL'.");
  }

  const dependency: PlanDependency = {
    stepId,
    dependencyType,
    ...(input.condition ? { condition: input.condition } : {}),
  };

  return deepFreeze(dependency);
}

/**
 * Creates an immutable Readonly<PlanPrecondition> instance.
 */
export function createPlanPrecondition(input: CreatePlanPreconditionInput): Readonly<PlanPrecondition> {
  const key = assertNonEmptyString(input.key, "key");
  if (input.expectedValue === undefined) {
    throw new PlanConstructionError("expectedValue must be specified for precondition.");
  }

  const precondition: PlanPrecondition = {
    key,
    expectedValue: input.expectedValue,
    comparator: input.comparator || "EQUALS",
  };

  return deepFreeze(precondition);
}

/**
 * Creates an immutable Readonly<PlanPostcondition> instance.
 */
export function createPlanPostcondition(input: CreatePlanPostconditionInput): Readonly<PlanPostcondition> {
  const key = assertNonEmptyString(input.key, "key");
  if (input.targetValue === undefined) {
    throw new PlanConstructionError("targetValue must be specified for postcondition.");
  }

  const postcondition: PlanPostcondition = {
    key,
    targetValue: input.targetValue,
    assertType: input.assertType || "STATE_MUTATION",
  };

  return deepFreeze(postcondition);
}

/**
 * Creates an immutable Readonly<PlanStep> instance.
 */
export function createPlanStep(input: CreatePlanStepInput): Readonly<PlanStep> {
  const stepId = assertNonEmptyString(input.stepId, "stepId");
  if (typeof input.sequenceIndex !== "number" || input.sequenceIndex < 0) {
    throw new PlanConstructionError("sequenceIndex must be a non-negative integer.");
  }
  const targetTool = assertNonEmptyString(input.targetTool, "targetTool");
  const timeoutMs = input.timeoutMs ?? 30000;
  if (timeoutMs <= 0) {
    throw new PlanConstructionError("timeoutMs must be a positive integer.");
  }

  const step: PlanStep = {
    stepId,
    sequenceIndex: input.sequenceIndex,
    stepType: input.stepType || StepType.ATOMIC_TOOL,
    targetTool,
    parameters: input.parameters ? { ...input.parameters } : {},
    dependencies: input.dependencies ? [...input.dependencies] : [],
    riskLevel: input.riskLevel || RiskLevel.LOW,
    timeoutMs,
    preconditions: input.preconditions ? [...input.preconditions] : [],
    postconditions: input.postconditions ? [...input.postconditions] : [],
  };

  return deepFreeze(step);
}

/**
 * Creates an immutable Readonly<CandidatePlan> instance.
 */
export function createCandidatePlan(input: CreateCandidatePlanInput): Readonly<CandidatePlan> {
  const candidateId = input.candidateId ? assertNonEmptyString(input.candidateId, "candidateId") : generateId("cand");
  const estimatedConfidence = assertValidConfidence(input.estimatedConfidence ?? 1.0, "estimatedConfidence");

  const candidate: CandidatePlan = {
    candidateId,
    primaryActionType: input.primaryActionType,
    candidateSteps: input.candidateSteps ? [...input.candidateSteps] : [],
    estimatedConfidence,
    rawRiskLevel: input.rawRiskLevel || RiskLevel.LOW,
    reasoningSummary: input.reasoningSummary || "Candidate plan resolved",
  };

  return deepFreeze(candidate);
}

/**
 * Creates an immutable Readonly<PlanningPolicy> instance with default safety fallbacks.
 */
export function createPlanningPolicy(input: CreatePlanningPolicyInput = {}): Readonly<PlanningPolicy> {
  const minConfidenceThreshold = assertValidConfidence(input.minConfidenceThreshold ?? 0.7, "minConfidenceThreshold");
  const defaultStepTimeoutMs = input.defaultStepTimeoutMs ?? 30000;
  const maxStepsPerPlan = input.maxStepsPerPlan ?? 50;

  if (defaultStepTimeoutMs <= 0) {
    throw new PlanConstructionError("defaultStepTimeoutMs must be positive.");
  }
  if (maxStepsPerPlan <= 0) {
    throw new PlanConstructionError("maxStepsPerPlan must be positive.");
  }

  const policy: PlanningPolicy = {
    minConfidenceThreshold,
    defaultStepTimeoutMs,
    maxStepsPerPlan,
    restrictedTools: input.restrictedTools ? [...input.restrictedTools] : [],
    mandatoryApprovalRiskLevels: input.mandatoryApprovalRiskLevels
      ? [...input.mandatoryApprovalRiskLevels]
      : [RiskLevel.HIGH, RiskLevel.CRITICAL],
    customRules: input.customRules ? { ...input.customRules } : {},
  };

  return deepFreeze(policy);
}

/**
 * Creates an immutable Readonly<PlanningContext> instance.
 */
export function createPlanningContext(input: CreatePlanningContextInput = {}): Readonly<PlanningContext> {
  const contextId = input.contextId ? assertNonEmptyString(input.contextId, "contextId") : generateId("ctx");
  const timestampMs = input.timestampMs ?? Date.now();
  if (timestampMs <= 0) {
    throw new PlanConstructionError("timestampMs must be a positive integer.");
  }

  const context: PlanningContext = {
    contextId,
    timestampMs,
    ...(input.structuredContext ? { structuredContext: input.structuredContext } : {}),
    ...(input.intentResult ? { intentResult: input.intentResult } : {}),
    ...(input.conversationTurn ? { conversationTurn: input.conversationTurn } : {}),
    ...(input.retrievedMemories ? { retrievedMemories: [...input.retrievedMemories] } : {}),
    policy: input.policy || createPlanningPolicy(),
  };

  return deepFreeze(context);
}

/**
 * Creates an immutable Readonly<ExecutionStage> instance.
 */
export function createExecutionStage(input: CreateExecutionStageInput): Readonly<ExecutionStage> {
  if (typeof input.stageIndex !== "number" || input.stageIndex < 0) {
    throw new PlanConstructionError("stageIndex must be a non-negative integer.");
  }
  if (!Array.isArray(input.stepIds) || input.stepIds.length === 0) {
    throw new PlanConstructionError("stepIds must be a non-empty array of step identifiers.");
  }

  const stage: ExecutionStage = {
    stageIndex: input.stageIndex,
    stepIds: input.stepIds.map((id) => assertNonEmptyString(id, "stepId")),
  };

  return deepFreeze(stage);
}

/**
 * Creates an immutable Readonly<ExecutionPlan> instance.
 */
export function createExecutionPlan(input: CreateExecutionPlanInput): Readonly<ExecutionPlan> {
  const metadata = input.metadata || createPlanMetadata();
  const confidenceScore = assertValidConfidence(input.confidenceScore ?? 1.0, "confidenceScore");

  if (
    (input.primaryActionType === ActionType.TOOL || input.primaryActionType === ActionType.AUTOMATION) &&
    (!input.steps || input.steps.length === 0)
  ) {
    throw new PlanConstructionError(`ActionType '${input.primaryActionType}' requires at least one plan step.`);
  }

  const compositeRiskLevel = input.compositeRiskLevel || RiskLevel.LOW;
  const requiresUserApproval =
    input.requiresUserApproval ??
    (compositeRiskLevel === RiskLevel.HIGH || compositeRiskLevel === RiskLevel.CRITICAL);

  const approvalRequirement =
    input.approvalRequirement ||
    (requiresUserApproval ? ApprovalRequirement.MANDATORY : ApprovalRequirement.NONE);

  const executionStages =
    input.executionStages && input.executionStages.length > 0
      ? [...input.executionStages]
      : input.steps.length > 0
      ? [createExecutionStage({ stageIndex: 0, stepIds: input.steps.map((s) => s.stepId) })]
      : [];

  const plan: ExecutionPlan = {
    metadata,
    primaryActionType: input.primaryActionType,
    steps: input.steps ? [...input.steps] : [],
    executionStages,
    compositeRiskLevel,
    priority: input.priority || PlanPriority.NORMAL,
    requiresUserApproval,
    approvalRequirement,
    ...(input.userConfirmationPrompt ? { userConfirmationPrompt: input.userConfirmationPrompt } : {}),
    confidenceScore,
    preconditions: input.preconditions ? [...input.preconditions] : [],
    postconditions: input.postconditions ? [...input.postconditions] : [],
    ...(input.fallbackPlan ? { fallbackPlan: input.fallbackPlan } : {}),
  };

  return deepFreeze(plan);
}
