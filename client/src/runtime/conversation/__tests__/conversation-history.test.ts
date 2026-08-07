/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Conversation History (`conversation-history.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ConversationHistory } from "../conversation-history";
import { ConversationState } from "../conversation-state";
import { ConversationHistoryError } from "../conversation-errors";
import type { ConversationTurn } from "../conversation-types";

describe("Phase 9.11 Milestone 2 Conversation History Unit Tests", () => {
  it("should maintain chronological turns and support export/import", () => {
    const history = new ConversationHistory();
    const state = new ConversationState("conv_hist_1");

    const turn1: ConversationTurn = {
      turnId: "turn_1",
      userMessage: { id: "m1", role: "user", content: "Hi", timestamp: 1000 },
      assistantMessage: { id: "m2", role: "assistant", content: "Hello", timestamp: 1001 },
      status: "COMPLETED",
      timestamp: 1001,
    };

    history.addTurn(turn1);
    expect(history.listTurns().length).toBe(1);

    const exportData = history.exportConversation(state.createSnapshot());
    expect(exportData.turns.length).toBe(1);
    expect(Object.isFrozen(exportData)).toBe(true);

    const history2 = new ConversationHistory();
    history2.importConversation(exportData);
    expect(history2.listTurns().length).toBe(1);
    expect(history2.listTurns()[0].turnId).toBe("turn_1");
  });

  it("should throw ConversationHistoryError on invalid turn or invalid export format", () => {
    const history = new ConversationHistory();

    expect(() => history.addTurn(null as any)).toThrow(ConversationHistoryError);
    expect(() => history.importConversation({} as any)).toThrow(ConversationHistoryError);
  });
});
