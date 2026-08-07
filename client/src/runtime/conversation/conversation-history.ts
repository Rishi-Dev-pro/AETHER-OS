/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Conversation History (`conversation-history.ts`)
 *
 * @file conversation-history.ts
 * @description Canonical chronological history manager enabling turn tracking, deterministic serialization, and replay.
 *
 * @module @aether/runtime/conversation/conversation-history
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import type {
  ConversationTurn,
  ConversationExport,
  ConversationStateSnapshot,
} from "./conversation-types";
import { ConversationHistoryError } from "./conversation-errors";

/**
 * Helper to deeply freeze objects recursively.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Manages chronological turns and import/export capabilities for a conversation runtime.
 */
export class ConversationHistory {
  private turns: ConversationTurn[] = [];

  /**
   * Adds a new turn to canonical history.
   *
   * @param turn Turn object.
   */
  public addTurn(turn: ConversationTurn): void {
    if (!turn || !turn.turnId || !turn.userMessage) {
      throw new ConversationHistoryError("Invalid turn object. turnId and userMessage are required.");
    }
    this.turns.push(turn);
  }

  /**
   * Removes a turn by ID.
   *
   * @param turnId Target turn ID.
   * @returns True if removed, false otherwise.
   */
  public removeTurn(turnId: string): boolean {
    const idx = this.turns.findIndex((t) => t.turnId === turnId);
    if (idx !== -1) {
      this.turns.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Returns list of canonical turns.
   */
  public listTurns(): ReadonlyArray<ConversationTurn> {
    return deepFreeze(this.turns.map((t) => ({ ...t })));
  }

  /**
   * Clears all history turns.
   */
  public clearHistory(): void {
    this.turns = [];
  }

  /**
   * Exports full conversation state and history into a serializable container.
   *
   * @param state Active ConversationStateSnapshot.
   * @returns Frozen ConversationExport object.
   */
  public exportConversation(state: ConversationStateSnapshot): Readonly<ConversationExport> {
    const exportData: ConversationExport = {
      version: "1.0.0",
      state,
      turns: this.turns.map((t) => ({ ...t })),
      exportedAt: Date.now(),
    };
    return deepFreeze(exportData);
  }

  /**
   * Imports conversation turns from a valid ConversationExport.
   *
   * @param data Exported conversation payload.
   */
  public importConversation(data: ConversationExport): void {
    if (!data || !data.version || !Array.isArray(data.turns)) {
      throw new ConversationHistoryError("Invalid ConversationExport payload format.");
    }
    this.turns = data.turns.map((t) => ({ ...t }));
  }
}
