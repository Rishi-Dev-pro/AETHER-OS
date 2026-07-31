/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component 1: Domain Enumerations (`enums.ts`)
 *
 * @file enums.ts
 * @description Canonical enumeration definitions for the Action Planning Layer.
 * Defines action types, risk levels, plan priorities, step classifications, and approval rules.
 *
 * @module @aether/action-planner/enums
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

/**
 * Top-level canonical action classification assigned to every ExecutionPlan.
 */
export enum ActionType {
  /** Conversational dialog or direct informative answer; no tool execution required */
  CHAT = "CHAT",
  /** Atomic single-tool dispatch operation */
  TOOL = "TOOL",
  /** Directed acyclic graph (DAG) multi-step workflow execution */
  AUTOMATION = "AUTOMATION",
  /** Disambiguation request when intent or parameters are incomplete/ambiguous */
  ASK_CLARIFICATION = "ASK_CLARIFICATION",
  /** Intercepted system noise, background heartbeats, or passive silent operations */
  NO_ACTION = "NO_ACTION",
}

/**
 * Canonical safety risk ratings for individual plan steps and composite plans.
 */
export enum RiskLevel {
  /** Read-only state access or pure dialog; zero system modification impact */
  LOW = "LOW",
  /** Non-destructive configuration changes or internal state updates */
  MEDIUM = "MEDIUM",
  /** File modifications, network communications, or external service calls */
  HIGH = "HIGH",
  /** Destructive filesystem operations, shell execution, or credential access */
  CRITICAL = "CRITICAL",
}

/**
 * Relative execution priority assigned to candidate plans and steps.
 */
export enum PlanPriority {
  /** Low-priority background context or passive maintenance actions */
  LOW = "LOW",
  /** Standard user interactive prompt execution */
  NORMAL = "NORMAL",
  /** Expedited turn dispatch requiring rapid processing */
  HIGH = "HIGH",
  /** System critical safety override or emergency handling */
  URGENT = "URGENT",
}

/**
 * Functional classification of an individual step within an ExecutionPlan.
 */
export enum StepType {
  /** Invocation of a concrete registered system or browser tool */
  ATOMIC_TOOL = "ATOMIC_TOOL",
  /** Pre-step state verification or invariant assertion check */
  CONDITION_CHECK = "CONDITION_CHECK",
  /** Mid-execution clarification or prompt interaction step */
  CLARIFICATION_PROMPT = "CLARIFICATION_PROMPT",
  /** Grouped sub-stage containing multiple parallelizable child steps */
  AUTOMATION_SUBSTAGE = "AUTOMATION_SUBSTAGE",
}

/**
 * Formal user approval requirement governing plan dispatch.
 */
export enum ApprovalRequirement {
  /** Execution allowed immediately without user confirmation */
  NONE = "NONE",
  /** Optional user notification or non-blocking prompt */
  OPTIONAL = "OPTIONAL",
  /** Mandatory user explicit confirmation required before execution */
  MANDATORY = "MANDATORY",
  /** Strict dual-factor or explicit interactive verification prompt required */
  STRICT_CONFIRMATION = "STRICT_CONFIRMATION",
}
