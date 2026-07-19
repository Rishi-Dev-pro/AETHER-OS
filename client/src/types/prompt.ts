import type { StructuredContext } from "./cognitive";
import type { IntentResult } from "./intent";

/**
 * Interface representing a modular context provider that extracts specific telemetry
 * and constructs tag-delimited text blocks.
 */
export interface ContextProvider {
  id: string;
  priority: number; // 1 = Critical, 2 = High, 3 = Medium, 4 = Low
  execute(context: StructuredContext, intent: IntentResult): string;
}

/**
 * Configuration blueprint that determines which context providers to execute,
 * target token budgets, and prioritization heuristics for an intent.
 */
export interface PromptProfile {
  id: string;
  requiredProviders: string[];
  maxOutputTokens: number;
  fallbackStrategy: string;
  systemInstructions: string;
}

/**
 * Internal structured representation of the compiled prompt elements
 * before final token validation and packaging.
 */
export interface PromptDocument {
  systemInstructions: string;
  contextBlocks: Map<string, string>; // Maps provider.id -> serialized string block
  userRequest: string;
  estimatedTokens: number;
  metadata: {
    snapshotId: string;
    intentId: string;
  };
}

/**
 * Final immutable transport object returned by the Prompt Builder phase.
 */
export interface PromptPackage {
  systemInstructions: string;
  activeContext: string; // Serialized XML context
  userRequest: string;
  metadata: {
    snapshotId: string;
    intentId: string;
    tokenCount: number;
    latencyMs: number;
    engineOverrides?: Record<string, any>;
  };
}
