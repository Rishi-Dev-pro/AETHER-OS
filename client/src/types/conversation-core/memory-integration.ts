/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 8: Conversation Core Memory Integration (`memory-integration.ts`)
 *
 * @file memory-integration.ts
 * @description Integration adapter connecting Conversation Core lifecycle turns with MemoryManager.
 * Handles deterministic memory creation, retrieval before prompt generation, reinforcement, and graceful fallback.
 *
 * @module @aether/conversation-core/memory-integration
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import type { IMemoryManager } from "../memory-system/memory-manager";
import type { MemoryEntry, MemorySearchResult } from "../memory-system/types";
import { createMemoryQuery } from "../memory-system/types";

import type { Conversation, ContextSnapshot } from "./types";

/**
 * Global bound MemoryManager instance reference for Conversation Core integration.
 */
let globalMemoryManager: IMemoryManager | null = null;

/**
 * Binds a global IMemoryManager instance for Conversation Core operations.
 * Passing null unbinds the instance.
 */
export function bindMemoryManager(manager: IMemoryManager | null): void {
  globalMemoryManager = manager;
}

/**
 * Retrieves the currently bound IMemoryManager instance, if any.
 */
export function getMemoryManager(): IMemoryManager | null {
  return globalMemoryManager;
}

/**
 * Deterministic memory creation threshold configuration.
 */
export interface MemoryCreationRules {
  /** Minimum completed turns in conversation required to trigger memory creation */
  readonly minCompletedTurns?: number;
  /** Minimum total user/assistant messages required */
  readonly minMessageCount?: number;
}

/**
 * Default memory creation rule constraints.
 */
export const DEFAULT_MEMORY_CREATION_RULES: Readonly<MemoryCreationRules> = Object.freeze({
  minCompletedTurns: 1,
  minMessageCount: 2,
});

/**
 * Deterministically decides whether to create a long-term/episodic memory entry from a finished conversation.
 * Avoids duplicate creation by checking existing memory ID `mem_conv_${conversation.conversationId}`.
 * Does NOT use LLM reasoning or AI summarization.
 *
 * @param conversation - Target conversation object.
 * @param manager - Optional explicit MemoryManager instance (falls back to global binding).
 * @param rules - Memory creation threshold constraints.
 * @returns Readonly<MemoryEntry> if created, or null if rules not met or on failure.
 */
export function evaluateAndCreateMemory(
  conversation: Readonly<Conversation>,
  manager?: IMemoryManager | null,
  rules: MemoryCreationRules = DEFAULT_MEMORY_CREATION_RULES
): Readonly<MemoryEntry> | null {
  const activeManager = manager ?? globalMemoryManager;
  if (!activeManager) {
    return null; // Graceful fallback: Memory system unavailable
  }

  try {
    const minTurns = rules.minCompletedTurns ?? 1;
    const minMessages = rules.minMessageCount ?? 2;

    const completedTurns = conversation.turns.filter((t) => t.status === "COMPLETED");
    if (completedTurns.length < minTurns || conversation.messageCount < minMessages) {
      return null;
    }

    const memoryId = `mem_conv_${conversation.conversationId}`;

    // Duplicate check: verify if memory already exists for this conversation
    try {
      const existing = activeManager.getMemory(memoryId);
      if (existing) {
        return existing;
      }
    } catch {
      // MemoryNotFoundError expected if entry does not exist yet
    }

    // Extract deterministic dialogue text without AI summarization
    const extractedTextParts: string[] = [];
    for (const turn of completedTurns) {
      if (turn.userMessage?.text) {
        extractedTextParts.push(`User: ${turn.userMessage.text}`);
      }
      if (turn.assistantMessage?.text) {
        extractedTextParts.push(`Assistant: ${turn.assistantMessage.text}`);
      }
    }

    if (extractedTextParts.length === 0) {
      return null;
    }

    const content = extractedTextParts.join("\n");

    const createdEntry = activeManager.createMemory({
      id: memoryId,
      type: "episodic",
      content,
      metadata: {
        id: memoryId,
        sourceSessionId: conversation.sessionId,
        importanceScore: 0.7,
        confidenceScore: 1.0,
        tags: ["conversation", `conv_${conversation.conversationId}`],
        customMetadata: {
          conversationId: conversation.conversationId,
          turnCount: completedTurns.length,
        },
      },
    });

    return createdEntry;
  } catch (error) {
    // Graceful fallback: catch error to prevent Conversation Core crashes
    return null;
  }
}

/**
 * Retrieves relevant memories prior to building prompt context.
 *
 * @param textQuery - User prompt text to search against memories.
 * @param manager - Optional explicit MemoryManager instance.
 * @param limit - Maximum memory search results.
 * @returns Readonly array of MemorySearchResult (or empty array if memory system unavailable).
 */
export function retrieveMemoriesForContext(
  textQuery: string,
  manager?: IMemoryManager | null,
  limit: number = 5
): readonly MemorySearchResult[] {
  const activeManager = manager ?? globalMemoryManager;
  if (!activeManager || !textQuery || textQuery.trim() === "") {
    return deepFreeze([]);
  }

  try {
    const query = createMemoryQuery({
      textQuery: textQuery.trim(),
      limit,
    });

    const results = activeManager.retrieveMemory(query);
    return results;
  } catch (error) {
    // Graceful fallback
    return deepFreeze([]);
  }
}

/**
 * Reinforces retrieved memory entries that were actively used in prompt context.
 * Updates access count and timestamps deterministically.
 *
 * @param memories - Array of memory search results used in context.
 * @param manager - Optional explicit MemoryManager instance.
 */
export function reinforceContextMemories(
  memories: readonly MemorySearchResult[],
  manager?: IMemoryManager | null
): void {
  const activeManager = manager ?? globalMemoryManager;
  if (!activeManager || memories.length === 0) {
    return;
  }

  for (const item of memories) {
    try {
      activeManager.reinforceMemory(item.entry.id, { importanceDelta: 0.02 });
    } catch {
      // Graceful fallback: individual reinforcement error suppressed
    }
  }
}

/**
 * Extends a ContextSnapshot with injected memory context blocks for Prompt Builder consumption.
 */
export interface MemoryEnhancedContextSnapshot extends ContextSnapshot {
  readonly retrievedMemories: readonly MemorySearchResult[];
  readonly memoryContextBlock?: string;
}

/**
 * Injects retrieved memories into a ContextSnapshot, producing an immutable MemoryEnhancedContextSnapshot.
 *
 * @param snapshot - Base ContextSnapshot prepared by ContextTrimmer.
 * @param memories - Retrieved memory search results.
 * @returns MemoryEnhancedContextSnapshot.
 */
export function injectMemoriesIntoContextSnapshot(
  snapshot: Readonly<ContextSnapshot>,
  memories: readonly MemorySearchResult[]
): Readonly<MemoryEnhancedContextSnapshot> {
  if (!memories || memories.length === 0) {
    const emptyEnhanced: MemoryEnhancedContextSnapshot = {
      ...snapshot,
      retrievedMemories: [],
    };
    return deepFreeze(emptyEnhanced);
  }

  const memoryBlocks = memories.map(
    (m, idx) => `[Memory ${idx + 1} (${m.entry.type})]: ${m.entry.content}`
  );
  const memoryContextBlock = `<retrieved_memories>\n${memoryBlocks.join("\n")}\n</retrieved_memories>`;

  const enhancedSnapshot: MemoryEnhancedContextSnapshot = {
    ...snapshot,
    retrievedMemories: deepFreeze([...memories]),
    memoryContextBlock,
  };

  return deepFreeze(enhancedSnapshot);
}
