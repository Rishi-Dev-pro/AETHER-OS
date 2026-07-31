/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component 3: Domain Contracts & Readonly Interfaces (`contracts.ts`)
 *
 * @file contracts.ts
 * @description Immutable data contracts and readonly interfaces for all Action Planning Layer concepts.
 *
 * @module @aether/action-planner/contracts
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import type { ActionType, RiskLevel, PlanPriority, StepType, ApprovalRequirement } from "./enums";
import type { StructuredContext } from "../cognitive";
import type { IntentResult } from "../intent";
import type { ConversationTurn } from "../conversation-core/types";
import type { MemoryEntry } from "../memory-system/types";

// ============================================================================
// 1. STEP CONDITION & DEPENDENCY CONTRACTS
// ============================================================================

/**
 * Dependency requirement linking a step to an earlier prerequisite step.
 */
export interface PlanDependency {
  /** Identifier of the prerequisite step that must complete first */
  readonly stepId: string;
  /** Dependency strictness ("STRICT" = must succeed, "OPTIONAL" = best effort) */
  readonly dependencyType: "STRICT" | "OPTIONAL";
  /** Optional conditional evaluation predicate key */
  readonly condition?: string;
}

/**
 * World state or parameter precondition assertion evaluated prior to step entry.
 */
export interface PlanPrecondition {
  /** Target state variable or parameter path key */
  readonly key: string;
  /** Expected value or pattern target */
  readonly expectedValue: unknown;
  /** Assertion comparator */
  readonly comparator: "EQUALS" | "CONTAINS" | "EXISTS" | "GREATER_THAN" | "LESS_THAN";
}

/**
 * Expected outcome or system mutation postcondition verified after step completion.
 */
export interface PlanPostcondition {
  /** Target state variable or metric path key */
  readonly key: string;
  /** Expected target value after completion */
  readonly targetValue: unknown;
  /** Postcondition assertion type */
  readonly assertType: "STATE_MUTATION" | "OUTPUT_EMISSION" | "LOG_PERSISTENCE";
}

// ============================================================================
// 2. STEP & CANDIDATE PLAN CONTRACTS
// ============================================================================

/**
 * An individual atomic unit of work within a larger ExecutionPlan.
 */
export interface PlanStep {
  /** Unique step instance identifier (e.g. "step_01_navigate") */
  readonly stepId: string;
  /** 0-based sequence index within the plan step array */
  readonly sequenceIndex: number;
  /** Functional classification of this step */
  readonly stepType: StepType;
  /** Target tool identifier (e.g. "browser.navigate", "system.read_file", "chat.respond") */
  readonly targetTool: string;
  /** Readonly dictionary of tool parameters and input bindings */
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Prerequisites that must complete before this step executes */
  readonly dependencies: readonly PlanDependency[];
  /** Safety risk rating for this specific step */
  readonly riskLevel: RiskLevel;
  /** Maximum allowable execution time budget in milliseconds */
  readonly timeoutMs: number;
  /** Preconditions required before step execution */
  readonly preconditions: readonly PlanPrecondition[];
  /** Postconditions asserted upon step completion */
  readonly postconditions: readonly PlanPostcondition[];
}

/**
 * Unvalidated candidate plan draft generated during resolution before policy/graph synthesis.
 */
export interface CandidatePlan {
  /** Candidate plan instance identifier */
  readonly candidateId: string;
  /** Proposed primary action classification */
  readonly primaryActionType: ActionType;
  /** Collection of candidate steps */
  readonly candidateSteps: readonly PlanStep[];
  /** Estimated resolution confidence score [0.0 - 1.0] */
  readonly estimatedConfidence: number;
  /** Raw unmitigated risk classification */
  readonly rawRiskLevel: RiskLevel;
  /** Architectural reasoning summary explaining why this plan candidate was generated */
  readonly reasoningSummary: string;
}

// ============================================================================
// 3. POLICY & CONTEXT CONTRACTS
// ============================================================================

/**
 * Static configuration policy governing risk boundaries, timeouts, and approval rules.
 */
export interface PlanningPolicy {
  /** Minimum required confidence score [0.0 - 1.0] before fallback to ASK_CLARIFICATION */
  readonly minConfidenceThreshold: number;
  /** Default execution timeout assigned to atomic tool steps in milliseconds */
  readonly defaultStepTimeoutMs: number;
  /** Maximum allowable steps within a single ExecutionPlan */
  readonly maxStepsPerPlan: number;
  /** Blacklisted or restricted tool identifiers */
  readonly restrictedTools: readonly string[];
  /** Risk levels that trigger mandatory user approval */
  readonly mandatoryApprovalRiskLevels: readonly RiskLevel[];
  /** Readonly dictionary of custom domain policy key-value rules */
  readonly customRules: Readonly<Record<string, unknown>>;
}

/**
 * Unified immutable context package provided as the single input to the planner.
 */
export interface PlanningContext {
  /** Unique context correlation identifier */
  readonly contextId: string;
  /** Unix timestamp of context capture in ms */
  readonly timestampMs: number;
  /** Phase 9.1 Structured Perception Context (optional/partial supported) */
  readonly structuredContext?: Readonly<StructuredContext>;
  /** Phase 9.2 Classified Intent Result */
  readonly intentResult?: Readonly<IntentResult>;
  /** Phase 9.5 Active Conversation Turn */
  readonly conversationTurn?: Readonly<ConversationTurn>;
  /** Phase 9.6 Relevant Memory Entries */
  readonly retrievedMemories?: readonly Readonly<MemoryEntry>[];
  /** Static system planning policy */
  readonly policy: Readonly<PlanningPolicy>;
}

// ============================================================================
// 4. EXECUTION PLAN CONTRACT
// ============================================================================

/**
 * Envelope containing administrative metadata for an ExecutionPlan.
 */
export interface PlanMetadata {
  /** Unique plan identifier (e.g. "plan_a1b2c3d4") */
  readonly planId: string;
  /** Active session reference ID */
  readonly sessionId: string;
  /** Correlation turn ID from conversation core */
  readonly turnId: string;
  /** Unix timestamp when plan was generated in ms */
  readonly createdAtMs: number;
  /** Unix timestamp when plan expires in ms */
  readonly expiresAtMs: number;
  readonly generatorVersion: string;
  readonly customMetadata: Readonly<Record<string, unknown>>;
}

/**
 * Group of step IDs that can be executed in parallel within the same execution tier.
 */
export interface ExecutionStage {
  /** 0-based stage index */
  readonly stageIndex: number;
  /** Array of step IDs included in this parallel execution tier */
  readonly stepIds: readonly string[];
}

/**
 * Master immutable ExecutionPlan blueprint emitted by Phase 9.7.
 */
export interface ExecutionPlan {
  /** Administrative metadata envelope */
  readonly metadata: Readonly<PlanMetadata>;
  /** Primary action classification */
  readonly primaryActionType: ActionType;
  /** Ordered list of plan steps */
  readonly steps: readonly PlanStep[];
  /** Pre-calculated topological execution stages for parallel dispatch */
  readonly executionStages: readonly ExecutionStage[];
  /** Overall composited risk level of the plan */
  readonly compositeRiskLevel: RiskLevel;
  /** Priority assigned to this plan */
  readonly priority: PlanPriority;
  /** Flag indicating whether explicit user approval is required prior to execution */
  readonly requiresUserApproval: boolean;
  /** Governance approval requirement classification */
  readonly approvalRequirement: ApprovalRequirement;
  /** Optional human-readable prompt displayed to user during approval */
  readonly userConfirmationPrompt?: string;
  /** Final calculated confidence score [0.0 - 1.0] */
  readonly confidenceScore: number;
  /** Global plan preconditions */
  readonly preconditions: readonly PlanPrecondition[];
  /** Global plan postconditions */
  readonly postconditions: readonly PlanPostcondition[];
  /** Immutable fallback execution plan for error recovery or safe abort */
  readonly fallbackPlan?: Readonly<ExecutionPlan>;
}
