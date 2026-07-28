import { describe, it, expect, beforeEach } from "vitest";
import { ConversationStatus, TurnStatus, MessageRole } from "../types";
import { ConversationStateError, ConversationValidationError } from "../errors";
import {
  createOrGetConversation,
  getConversation,
  beginTurn,
  appendAssistantMessage,
  appendToolMessage,
  prepareContext,
  completeTurn,
  failTurn,
  cancelTurn,
  resetConversationStore,
} from "../turn-orchestrator";

describe("Phase 9.5 Component 7: Turn Orchestrator (turn-orchestrator.test.ts)", () => {
  const convId = "conv_orch_100";
  const sessId = "sess_orch_100";

  beforeEach(() => {
    resetConversationStore();
    createOrGetConversation(convId, sessId, "System instructions: Be helpful.");
  });

  describe("Conversation Creation & Initialization", () => {
    it("should initialize a new conversation with System turn (Turn 1)", () => {
      const conv = getConversation(convId);

      expect(conv.conversationId).toBe(convId);
      expect(conv.sessionId).toBe(sessId);
      expect(conv.status).toBe(ConversationStatus.CREATED);
      expect(conv.turns.length).toBe(1);
      expect(conv.turns[0].userMessage?.role).toBe(MessageRole.SYSTEM);
      expect(Object.isFrozen(conv)).toBe(true);
    });

    it("createOrGetConversation should return existing conversation if already instantiated", () => {
      const conv2 = createOrGetConversation(convId, sessId);
      expect(conv2.conversationId).toBe(convId);
      expect(conv2.turns.length).toBe(1);
    });
  });

  describe("Turn Initiation & User Message Appending (beginTurn)", () => {
    it("beginTurn should create Turn 2 with USER message and transition FSM status to WAITING", () => {
      const { turn, conversation } = beginTurn(convId, "Hello AETHER OS");

      expect(turn.turnIndex).toBe(2);
      expect(turn.status).toBe(TurnStatus.PROCESSING);
      expect(turn.userMessage?.text).toBe("Hello AETHER OS");
      expect(turn.userMessage?.role).toBe(MessageRole.USER);

      expect(conversation.status).toBe(ConversationStatus.WAITING);
      expect(conversation.turns.length).toBe(2);
      expect(Object.isFrozen(turn)).toBe(true);
      expect(Object.isFrozen(conversation)).toBe(true);
    });

    it("beginTurn should throw ConversationValidationError if userText is empty", () => {
      expect(() => {
        beginTurn(convId, "   ");
      }).toThrow(ConversationValidationError);
    });
  });

  describe("Assistant Message & Tool Output Appending", () => {
    it("appendAssistantMessage should append completion text and update turn status to COMPLETED", () => {
      const { turn: t2 } = beginTurn(convId, "What is 2+2?");
      const { turn, conversation } = appendAssistantMessage(convId, t2.turnId, "2+2 equals 4.");

      expect(turn.assistantMessage?.text).toBe("2+2 equals 4.");
      expect(turn.assistantMessage?.role).toBe(MessageRole.ASSISTANT);
      expect(turn.status).toBe(TurnStatus.COMPLETED);
      expect(conversation.status).toBe(ConversationStatus.ACTIVE);
      expect(Object.isFrozen(turn)).toBe(true);
    });

    it("appendAssistantMessage should update turn status to AWAITING_TOOL when toolCalls requested", () => {
      const { turn: t2 } = beginTurn(convId, "Search web");
      const toolCall = { id: "call_web_1", name: "search", arguments: { query: "AETHER" } };

      const { turn, conversation } = appendAssistantMessage(convId, t2.turnId, "Searching...", [toolCall]);

      expect(turn.status).toBe(TurnStatus.AWAITING_TOOL);
      expect(turn.assistantMessage?.toolCalls).toEqual([toolCall]);
      expect(conversation.status).toBe(ConversationStatus.WAITING);
    });

    it("appendToolMessage should append TOOL response message to turn", () => {
      const { turn: t2 } = beginTurn(convId, "Run tool");
      const toolCall = { id: "call_t1", name: "exec", arguments: {} };
      appendAssistantMessage(convId, t2.turnId, "Executing", [toolCall]);

      const { turn } = appendToolMessage(convId, t2.turnId, "call_t1", "Tool result: OK");

      expect(turn.toolMessages?.length).toBe(1);
      expect(turn.toolMessages![0].role).toBe(MessageRole.TOOL);
      expect(turn.toolMessages![0].toolCallId).toBe("call_t1");
      expect(turn.toolMessages![0].text).toBe("Tool result: OK");
      expect(Object.isFrozen(turn)).toBe(true);
    });
  });

  describe("Context Snapshot Preparation (prepareContext)", () => {
    it("prepareContext should integrate Milestone 2 ContextTrimmer and return immutable ContextSnapshot", () => {
      beginTurn(convId, "User turn 1");
      const t2 = getConversation(convId).turns[1];
      appendAssistantMessage(convId, t2.turnId, "Assistant reply 1");

      const snapshot = prepareContext(convId, 2000, { reserveOutputTokens: 200 });

      expect(snapshot.conversationId).toBe(convId);
      expect(snapshot.systemMessage.role).toBe(MessageRole.SYSTEM);
      expect(snapshot.totalTokenEstimate).toBeGreaterThan(0);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe("Turn Sealing & Exception Handling (completeTurn / failTurn / cancelTurn)", () => {
    it("completeTurn should seal turn status as COMPLETED and transition conversation FSM status to IDLE", () => {
      const { turn: t2 } = beginTurn(convId, "Prompt");
      appendAssistantMessage(convId, t2.turnId, "Response");

      const { turn, conversation } = completeTurn(convId, t2.turnId);

      expect(turn.status).toBe(TurnStatus.COMPLETED);
      expect(conversation.status).toBe(ConversationStatus.IDLE);
      expect(Object.isFrozen(turn)).toBe(true);
      expect(Object.isFrozen(conversation)).toBe(true);
    });

    it("failTurn should mark turn status as FAILED and record error message in metadata", () => {
      const { turn: t2 } = beginTurn(convId, "Failing turn prompt");
      const { turn, conversation } = failTurn(convId, t2.turnId, "Transport timeout error");

      expect(turn.status).toBe(TurnStatus.FAILED);
      expect(conversation.status).toBe(ConversationStatus.IDLE);
      expect(conversation.metadata.lastError).toBe("Transport timeout error");
    });

    it("cancelTurn should mark turn status as FAILED and record cancellation reason", () => {
      const { turn: t2 } = beginTurn(convId, "Cancelled prompt");
      const { turn, conversation } = cancelTurn(convId, t2.turnId, "User aborted");

      expect(turn.status).toBe(TurnStatus.FAILED);
      expect(conversation.status).toBe(ConversationStatus.IDLE);
      expect(conversation.metadata.cancellationReason).toBe("User aborted");
    });
  });
});
