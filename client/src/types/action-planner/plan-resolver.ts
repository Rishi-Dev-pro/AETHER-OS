/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component: Candidate Plan Resolver (`plan-resolver.ts`)
 *
 * @file plan-resolver.ts
 * @description Transforms a normalized `PlanningContext` into an immutable `CandidatePlan`.
 * Implements Intent Resolver, Entity Resolver, Parameter Resolver, Confidence Engine,
 * and Clarification Engine for all 5 canonical action types (CHAT, TOOL, AUTOMATION, ASK_CLARIFICATION, NO_ACTION).
 *
 * @module @aether/action-planner/plan-resolver
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import { ActionType, RiskLevel, StepType } from "./enums";
import type { PlanningContext, CandidatePlan } from "./contracts";
import { createCandidatePlan, createPlanStep } from "./factories";
import { validatePlanningContext } from "./context-normalizer";

// ============================================================================
// INTENT & CATEGORY MAPPING HELPERS
// ============================================================================

const CONVERSATIONAL_DOMAINS = new Set([
  "chat",
  "dialogue",
  "greeting",
  "question",
  "info_query",
  "conversation",
  "general",
]);

const AUTOMATION_INTENTS = new Set([
  "macro_sequence",
  "workflow_automate",
  "multi_tool_chain",
  "browser_automation_suite",
]);

// Map raw intent names to canonical target tools
const INTENT_TOOL_MAP: Record<string, string> = {
  browser_open: "browser.openUrl",
  browser_search: "browser.search",
  browser_navigate: "browser.navigate",
  system_control: "system.executeCommand",
  file_read: "system.readFile",
  file_write: "system.writeFile",
  file_delete: "system.deleteFile",
  volume_set: "system.setVolume",
  camera_toggle: "camera.toggle",
};

// Required parameters for target tools
const TOOL_REQUIRED_PARAMS: Record<string, string[]> = {
  "browser.openUrl": ["url"],
  "browser.search": ["query"],
  "browser.navigate": ["url"],
  "system.executeCommand": ["command"],
  "system.readFile": ["filePath"],
  "system.writeFile": ["filePath", "content"],
  "system.deleteFile": ["filePath"],
};

// ============================================================================
// RESOLVER SUBSYSTEMS
// ============================================================================

/**
 * Calculates planning confidence composited from intent confidence and context factors.
 */
export function calculatePlanningConfidence(context: PlanningContext): number {
  if (!context.intentResult) {
    return 0.5; // Default neutral confidence when no intent classified
  }

  let baseConfidence = context.intentResult.confidence;

  // Boost confidence if memory corroborates or structured context is present
  if (context.retrievedMemories && context.retrievedMemories.length > 0) {
    baseConfidence = Math.min(1.0, baseConfidence + 0.05);
  }

  if (context.structuredContext?.voice.isFinal) {
    baseConfidence = Math.min(1.0, baseConfidence + 0.05);
  }

  return Number(baseConfidence.toFixed(2));
}

/**
 * Resolves the primary ActionType candidate based on Intent and Context inputs.
 */
export function resolveIntentCategory(context: PlanningContext): ActionType {
  const intent = context.intentResult;

  if (!intent || intent.intent === "no_action" || intent.intent === "idle") {
    return ActionType.NO_ACTION;
  }

  if (intent.needsClarification) {
    return ActionType.ASK_CLARIFICATION;
  }

  const domain = intent.domain.toLowerCase();
  const intentName = intent.intent.toLowerCase();

  if (AUTOMATION_INTENTS.has(intentName) || intent.category === "automation") {
    return ActionType.AUTOMATION;
  }

  if (CONVERSATIONAL_DOMAINS.has(domain) || intent.category === "dialogue") {
    return ActionType.CHAT;
  }

  // Default to TOOL for operational categories
  return ActionType.TOOL;
}

/**
 * Resolves parameters for a candidate tool action.
 */
export function resolveParameters(context: PlanningContext, _targetTool: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (context.intentResult?.parameters) {
    Object.assign(params, context.intentResult.parameters);
  }

  // Map extracted entities into parameter keys if missing
  if (context.intentResult?.entities) {
    for (const entity of context.intentResult.entities) {
      if (entity.type === "url" && !params.url) {
        params.url = entity.normalized;
      } else if (entity.type === "text" && !params.query && !params.content) {
        params.query = entity.normalized;
      } else if (entity.type === "file_name" && !params.filePath) {
        params.filePath = entity.normalized;
      }
    }
  }

  return params;
}

/**
 * Checks if target tool is missing mandatory parameters.
 */
export function findMissingParameters(targetTool: string, params: Record<string, unknown>): string[] {
  const required = TOOL_REQUIRED_PARAMS[targetTool] || [];
  return required.filter((param) => params[param] === undefined || params[param] === "");
}

// ============================================================================
// MAIN RESOLVER PIPELINE
// ============================================================================

/**
 * Transforms a normalized `PlanningContext` into an immutable `CandidatePlan`.
 *
 * @param context Fully validated PlanningContext input.
 * @returns Immutable Readonly<CandidatePlan>.
 * @throws InvalidPlanningContextError if context validation fails.
 */
export function resolveCandidatePlan(context: PlanningContext): Readonly<CandidatePlan> {
  validatePlanningContext(context);

  const confidence = calculatePlanningConfidence(context);
  let primaryActionType = resolveIntentCategory(context);
  const policy = context.policy;

  // Clarification Engine Rule 1: Low confidence triggers ASK_CLARIFICATION
  if (primaryActionType !== ActionType.NO_ACTION && confidence < policy.minConfidenceThreshold) {
    primaryActionType = ActionType.ASK_CLARIFICATION;
  }

  // Handle NO_ACTION
  if (primaryActionType === ActionType.NO_ACTION) {
    return createCandidatePlan({
      candidateId: `cand_no_action_${context.contextId}`,
      primaryActionType: ActionType.NO_ACTION,
      candidateSteps: [],
      estimatedConfidence: 1.0,
      rawRiskLevel: RiskLevel.LOW,
      reasoningSummary: "Intercepted idle or passive system state; no action required.",
    });
  }

  // Handle CHAT
  if (primaryActionType === ActionType.CHAT) {
    const chatStep = createPlanStep({
      stepId: "step_chat_respond",
      sequenceIndex: 0,
      stepType: StepType.ATOMIC_TOOL,
      targetTool: "chat.respond",
      parameters: {
        userText: context.structuredContext?.voice.transcript || context.conversationTurn?.userMessage?.text || "",
      },
      riskLevel: RiskLevel.LOW,
    });

    return createCandidatePlan({
      candidateId: `cand_chat_${context.contextId}`,
      primaryActionType: ActionType.CHAT,
      candidateSteps: [chatStep],
      estimatedConfidence: confidence,
      rawRiskLevel: RiskLevel.LOW,
      reasoningSummary: "Conversational dialog intent resolved.",
    });
  }

  // Handle TOOL
  if (primaryActionType === ActionType.TOOL) {
    const intentName = context.intentResult?.intent || "";
    const targetTool = INTENT_TOOL_MAP[intentName] || `tool.${intentName || "generic"}`;
    const parameters = resolveParameters(context, targetTool);
    const missingParams = findMissingParameters(targetTool, parameters);

    // Clarification Engine Rule 2: Missing required parameters triggers ASK_CLARIFICATION
    if (missingParams.length > 0) {
      const clarifyStep = createPlanStep({
        stepId: "step_clarify_params",
        sequenceIndex: 0,
        stepType: StepType.CLARIFICATION_PROMPT,
        targetTool: "system.ask_clarification",
        parameters: {
          missingParameters: missingParams,
          targetTool,
          promptText: `Please provide missing parameters for ${targetTool}: ${missingParams.join(", ")}`,
        },
        riskLevel: RiskLevel.LOW,
      });

      return createCandidatePlan({
        candidateId: `cand_clarify_${context.contextId}`,
        primaryActionType: ActionType.ASK_CLARIFICATION,
        candidateSteps: [clarifyStep],
        estimatedConfidence: confidence,
        rawRiskLevel: RiskLevel.LOW,
        reasoningSummary: `Missing required parameters [${missingParams.join(", ")}] for tool ${targetTool}.`,
      });
    }

    const toolStep = createPlanStep({
      stepId: `step_${targetTool.replace(".", "_")}`,
      sequenceIndex: 0,
      stepType: StepType.ATOMIC_TOOL,
      targetTool,
      parameters,
      riskLevel: targetTool.includes("delete") ? RiskLevel.HIGH : RiskLevel.MEDIUM,
    });

    return createCandidatePlan({
      candidateId: `cand_tool_${context.contextId}`,
      primaryActionType: ActionType.TOOL,
      candidateSteps: [toolStep],
      estimatedConfidence: confidence,
      rawRiskLevel: toolStep.riskLevel,
      reasoningSummary: `Atomic tool action ${targetTool} resolved with complete parameters.`,
    });
  }

  // Handle AUTOMATION
  if (primaryActionType === ActionType.AUTOMATION) {
    const step1 = createPlanStep({
      stepId: "step_auto_init",
      sequenceIndex: 0,
      stepType: StepType.ATOMIC_TOOL,
      targetTool: "browser.openUrl",
      parameters: { url: "https://google.com" },
      riskLevel: RiskLevel.LOW,
    });

    const step2 = createPlanStep({
      stepId: "step_auto_search",
      sequenceIndex: 1,
      stepType: StepType.ATOMIC_TOOL,
      targetTool: "browser.search",
      parameters: { query: context.intentResult?.parameters?.query || "AETHER OS" },
      riskLevel: RiskLevel.MEDIUM,
    });

    return createCandidatePlan({
      candidateId: `cand_automation_${context.contextId}`,
      primaryActionType: ActionType.AUTOMATION,
      candidateSteps: [step1, step2],
      estimatedConfidence: confidence,
      rawRiskLevel: RiskLevel.MEDIUM,
      reasoningSummary: "Multi-step automation workflow resolved.",
    });
  }

  // Handle explicit ASK_CLARIFICATION
  const clarifyStep = createPlanStep({
    stepId: "step_ask_clarification",
    sequenceIndex: 0,
    stepType: StepType.CLARIFICATION_PROMPT,
    targetTool: "system.ask_clarification",
    parameters: {
      clarificationReason: "Ambiguous user intent or low confidence threshold.",
    },
    riskLevel: RiskLevel.LOW,
  });

  return createCandidatePlan({
    candidateId: `cand_clarify_${context.contextId}`,
    primaryActionType: ActionType.ASK_CLARIFICATION,
    candidateSteps: [clarifyStep],
    estimatedConfidence: confidence,
    rawRiskLevel: RiskLevel.LOW,
    reasoningSummary: "User disambiguation required.",
  });
}
