import { describe, it, expect } from "vitest";
import { MessageRole } from "../types";
import { ConversationValidationError } from "../errors";
import {
  sanitizeMessageText,
  generateMessageId,
  createSystemMessage,
  createUserMessage,
  createAssistantMessage,
  createToolResponseMessage,
  createDeveloperMessage,
} from "../message-canonicalizer";

describe("Phase 9.5 Component 3: Message Canonicalizer (message-canonicalizer.ts)", () => {
  describe("Sanitization & Message ID Utilities", () => {
    it("sanitizeMessageText should strip non-printable control characters", () => {
      const rawText = "Hello\x00 World\x07!\nLine 2\tTabbed";
      const sanitized = sanitizeMessageText(rawText);

      expect(sanitized).toBe("Hello World!\nLine 2\tTabbed");
    });

    it("generateMessageId should return structured unique IDs matching 'msg_<timestamp>_<counter>'", () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();

      expect(id1).toMatch(/^msg_\d+_\d+$/);
      expect(id2).toMatch(/^msg_\d+_\d+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("Role-Specific Canonical Message Creators", () => {
    it("createSystemMessage should create a valid SYSTEM role message", () => {
      const msg = createSystemMessage("conv_100", "System rule: Be helpful.");

      expect(msg.role).toBe(MessageRole.SYSTEM);
      expect(msg.text).toBe("System rule: Be helpful.");
      expect(msg.conversationId).toBe("conv_100");
      expect(Object.isFrozen(msg)).toBe(true);
    });

    it("createUserMessage should create a valid USER role message", () => {
      const msg = createUserMessage("conv_100", "Hello AETHER OS");

      expect(msg.role).toBe(MessageRole.USER);
      expect(msg.text).toBe("Hello AETHER OS");
      expect(Object.isFrozen(msg)).toBe(true);
    });

    it("createAssistantMessage should accept text and optional toolCalls", () => {
      const toolCalls = [
        { id: "call_001", name: "search_web", arguments: { query: "AETHER OS" } },
      ];

      const msg = createAssistantMessage("conv_100", "Searching...", toolCalls);

      expect(msg.role).toBe(MessageRole.ASSISTANT);
      expect(msg.text).toBe("Searching...");
      expect(msg.toolCalls).toEqual(toolCalls);
      expect(Object.isFrozen(msg.toolCalls)).toBe(true);
      expect(Object.isFrozen(msg)).toBe(true);
    });

    it("createToolResponseMessage should require toolCallId and assign MessageRole.TOOL", () => {
      const msg = createToolResponseMessage("conv_100", "call_001", "{\"result\": \"success\"}");

      expect(msg.role).toBe(MessageRole.TOOL);
      expect(msg.toolCallId).toBe("call_001");
      expect(msg.text).toBe("{\"result\": \"success\"}");
      expect(Object.isFrozen(msg)).toBe(true);
    });

    it("createDeveloperMessage should create a valid DEVELOPER role message", () => {
      const msg = createDeveloperMessage("conv_100", "Developer flag: debug=true");

      expect(msg.role).toBe(MessageRole.DEVELOPER);
      expect(msg.text).toBe("Developer flag: debug=true");
      expect(Object.isFrozen(msg)).toBe(true);
    });
  });

  describe("Validation & Error Path Enforcement", () => {
    it("should throw ConversationValidationError if SYSTEM text is empty", () => {
      expect(() => {
        createSystemMessage("conv_100", "   ");
      }).toThrow(ConversationValidationError);
    });

    it("should throw ConversationValidationError if USER text is empty", () => {
      expect(() => {
        createUserMessage("conv_100", "");
      }).toThrow("USER message requires a non-empty text string.");
    });

    it("should throw ConversationValidationError if ASSISTANT message has both empty text and no toolCalls", () => {
      expect(() => {
        createAssistantMessage("conv_100", "   ", []);
      }).toThrow("ASSISTANT message must contain either non-empty text or at least one toolCall descriptor.");
    });

    it("should throw ConversationValidationError if TOOL response message lacks toolCallId", () => {
      expect(() => {
        createToolResponseMessage("conv_100", "  ", "output text");
      }).toThrow("TOOL response message requires a non-empty toolCallId matching the requested tool.");
    });
  });
});
