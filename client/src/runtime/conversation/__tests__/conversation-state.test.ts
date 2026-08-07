/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Conversation State (`conversation-state.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ConversationState } from "../conversation-state";
import { ConversationStateError } from "../conversation-errors";

describe("Phase 9.11 Milestone 2 Conversation State Unit Tests", () => {
  it("should initialize with default parameters and append user/assistant messages", () => {
    const state = new ConversationState("test_conv_1", "Test System Prompt", "groq-provider", "llama-3.3-70b-versatile");

    expect(state.getConversationId()).toBe("test_conv_1");
    expect(state.getSystemPrompt()).toBe("Test System Prompt");
    expect(state.getActiveProvider()).toBe("groq-provider");

    const userMsg = state.appendUserMessage("Hello AETHER");
    expect(userMsg.role).toBe("user");
    expect(userMsg.content).toBe("Hello AETHER");

    const astMsg = state.appendAssistantMessage("Greetings User!");
    expect(astMsg.role).toBe("assistant");
    expect(astMsg.content).toBe("Greetings User!");

    const messages = state.getMessages();
    expect(messages.length).toBe(2);

    const snapshot = state.createSnapshot();
    expect(snapshot.messages.length).toBe(2);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("should throw ConversationStateError on empty content or invalid provider", () => {
    const state = new ConversationState();

    expect(() => state.appendUserMessage("   ")).toThrow(ConversationStateError);
    expect(() => state.setProviderAndModel("", "")).toThrow(ConversationStateError);
  });

  it("should clear conversation messages cleanly", () => {
    const state = new ConversationState();
    state.appendUserMessage("Test Message");
    expect(state.getMessages().length).toBe(1);

    state.clearConversation();
    expect(state.getMessages().length).toBe(0);
  });
});
