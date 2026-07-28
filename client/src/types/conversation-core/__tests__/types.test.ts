import { describe, it, expect } from "vitest";
import {
  MessageRole,
  ConversationStatus,
  TurnStatus,
  TrimmingStrategy,
  createConversationMessage,
  createConversationTurn,
  createContextSnapshot,
  createConversationSession,
  createConversation,
} from "../types";
import { ConversationValidationError } from "../errors";

describe("Phase 9.5 Component 1: Conversation Core Types & Factories (types.ts)", () => {
  describe("Enum Invariant Verification", () => {
    it("should contain exactly 5 distinct MessageRole values", () => {
      const roles = Object.values(MessageRole);
      expect(roles).toHaveLength(5);
      expect(MessageRole.SYSTEM).toBe("SYSTEM");
      expect(MessageRole.USER).toBe("USER");
      expect(MessageRole.ASSISTANT).toBe("ASSISTANT");
      expect(MessageRole.TOOL).toBe("TOOL");
      expect(MessageRole.DEVELOPER).toBe("DEVELOPER");
    });

    it("should contain exactly 6 distinct ConversationStatus lifecycle states", () => {
      const statuses = Object.values(ConversationStatus);
      expect(statuses).toHaveLength(6);
      expect(ConversationStatus.CREATED).toBe("CREATED");
      expect(ConversationStatus.ACTIVE).toBe("ACTIVE");
      expect(ConversationStatus.WAITING).toBe("WAITING");
      expect(ConversationStatus.IDLE).toBe("IDLE");
      expect(ConversationStatus.ARCHIVED).toBe("ARCHIVED");
      expect(ConversationStatus.CLOSED).toBe("CLOSED");
    });

    it("should contain all mandatory TurnStatus and TrimmingStrategy values", () => {
      expect(TurnStatus.TURN_CREATED).toBe("TURN_CREATED");
      expect(TurnStatus.COMPLETED).toBe("COMPLETED");
      expect(TrimmingStrategy.SLIDING_WINDOW).toBe("SLIDING_WINDOW");
    });
  });

  describe("createConversationMessage Factory & Invariants", () => {
    it("should create a valid ConversationMessage object and enforce immutability", () => {
      const msg = createConversationMessage({
        messageId: "msg_001",
        conversationId: "conv_001",
        role: MessageRole.USER,
        text: "Hello AETHER OS",
      });

      expect(msg.messageId).toBe("msg_001");
      expect(msg.conversationId).toBe("conv_001");
      expect(msg.role).toBe(MessageRole.USER);
      expect(msg.text).toBe("Hello AETHER OS");
      expect(msg.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(msg)).toBe(true);
      expect(Object.isFrozen(msg.metadata)).toBe(true);
    });

    it("should throw ConversationValidationError if messageId or conversationId is empty", () => {
      expect(() => {
        createConversationMessage({
          messageId: "",
          conversationId: "conv_001",
          role: MessageRole.USER,
          text: "Test",
        });
      }).toThrow(ConversationValidationError);

      expect(() => {
        createConversationMessage({
          messageId: "msg_001",
          conversationId: "   ",
          role: MessageRole.USER,
          text: "Test",
        });
      }).toThrow(ConversationValidationError);
    });

    it("should throw ConversationValidationError if MessageRole.TOOL is missing toolCallId", () => {
      expect(() => {
        createConversationMessage({
          messageId: "msg_002",
          conversationId: "conv_001",
          role: MessageRole.TOOL,
          text: "Tool result output",
        });
      }).toThrow("ConversationMessage with role TOOL requires a non-empty toolCallId.");
    });
  });

  describe("createConversationTurn Factory & Invariants", () => {
    it("should create a valid ConversationTurn and calculate duration", () => {
      const turn = createConversationTurn({
        turnId: "turn_001",
        conversationId: "conv_001",
        turnIndex: 1,
        status: TurnStatus.COMPLETED,
        durationMs: 150,
      });

      expect(turn.turnId).toBe("turn_001");
      expect(turn.turnIndex).toBe(1);
      expect(turn.status).toBe(TurnStatus.COMPLETED);
      expect(turn.durationMs).toBe(150);
      expect(Object.isFrozen(turn)).toBe(true);
    });

    it("should throw ConversationValidationError if turnIndex < 1 or invalid status", () => {
      expect(() => {
        createConversationTurn({
          turnId: "turn_002",
          conversationId: "conv_001",
          turnIndex: 0,
        });
      }).toThrow("turnIndex must be a positive integer >= 1.");
    });
  });

  describe("createContextSnapshot Factory & Invariants", () => {
    it("should create a valid ContextSnapshot with deepFreeze verification", () => {
      const sysMsg = createConversationMessage({
        messageId: "msg_sys_1",
        conversationId: "conv_001",
        role: MessageRole.SYSTEM,
        text: "System prompt",
      });

      const snapshot = createContextSnapshot({
        snapshotId: "snap_001",
        conversationId: "conv_001",
        systemMessage: sysMsg,
        totalTokenEstimate: 500,
        trimmedCount: 2,
      });

      expect(snapshot.snapshotId).toBe("snap_001");
      expect(snapshot.systemMessage.role).toBe(MessageRole.SYSTEM);
      expect(snapshot.totalTokenEstimate).toBe(500);
      expect(snapshot.trimmedCount).toBe(2);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it("should throw ConversationValidationError if systemMessage is not SYSTEM role", () => {
      const userMsg = createConversationMessage({
        messageId: "msg_usr_1",
        conversationId: "conv_001",
        role: MessageRole.USER,
        text: "User text",
      });

      expect(() => {
        createContextSnapshot({
          snapshotId: "snap_002",
          conversationId: "conv_001",
          systemMessage: userMsg,
        });
      }).toThrow("ContextSnapshot requires a valid systemMessage with role === MessageRole.SYSTEM.");
    });
  });

  describe("createConversationSession & createConversation Factories", () => {
    it("createConversationSession should create a deep-frozen session", () => {
      const session = createConversationSession({
        sessionId: "sess_001",
        activeConversationId: "conv_001",
        maxConcurrentConversations: 3,
      });

      expect(session.sessionId).toBe("sess_001");
      expect(session.activeConversationId).toBe("conv_001");
      expect(session.conversationIds).toEqual(["conv_001"]);
      expect(session.maxConcurrentConversations).toBe(3);
      expect(Object.isFrozen(session)).toBe(true);
    });

    it("createConversation should calculate messageCount from turns", () => {
      const msgUser = createConversationMessage({ messageId: "m1", conversationId: "c1", role: MessageRole.USER, text: "Hi" });
      const msgAss = createConversationMessage({ messageId: "m2", conversationId: "c1", role: MessageRole.ASSISTANT, text: "Hello" });
      const turn1 = createConversationTurn({ turnId: "t1", conversationId: "c1", turnIndex: 1, userMessage: msgUser, assistantMessage: msgAss });

      const conv = createConversation({
        conversationId: "c1",
        sessionId: "s1",
        turns: [turn1],
      });

      expect(conv.conversationId).toBe("c1");
      expect(conv.messageCount).toBe(2);
      expect(conv.status).toBe(ConversationStatus.CREATED);
      expect(Object.isFrozen(conv)).toBe(true);
    });
  });
});
