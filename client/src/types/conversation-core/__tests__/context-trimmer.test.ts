import { describe, it, expect } from "vitest";
import { MessageRole, TrimmingStrategy } from "../types";
import { ContextError, ConversationValidationError } from "../errors";
import {
  createSystemMessage,
  createUserMessage,
  createAssistantMessage,
  createToolResponseMessage,
} from "../message-canonicalizer";
import {
  estimateMessageTokens,
  estimateTokenCount,
  calculateBudget,
  trimConversation,
  DEFAULT_PROTECTED_RECENT_TURNS,
  DEFAULT_RESERVE_OUTPUT_TOKENS,
} from "../context-trimmer";

describe("Phase 9.5 Component 5: Context Trimming & Token Budgeting Engine (context-trimmer.test.ts)", () => {
  const convId = "conv_trim_001";
  const sysMsg = createSystemMessage(convId, "System instructions: Be helpful and concise.");

  describe("Deterministic Token Estimator (estimateMessageTokens / estimateTokenCount)", () => {
    it("should deterministically estimate message tokens based on text length and overhead", () => {
      const userMsg = createUserMessage(convId, "Hello world"); // 11 chars -> ceil(11/4) = 3 + 4 overhead = 7 tokens
      const tokenCount = estimateMessageTokens(userMsg);

      expect(tokenCount).toBe(7);
      expect(Number.isInteger(tokenCount)).toBe(true);
    });

    it("should account for tool call descriptor tokens in estimateMessageTokens", () => {
      const toolCall = { id: "call_123", name: "search", arguments: { query: "AETHER" } };
      const assistantMsg = createAssistantMessage(convId, "Searching", [toolCall]);

      const tokenCount = estimateMessageTokens(assistantMsg);
      expect(tokenCount).toBeGreaterThan(15);
    });

    it("should sum token counts across message arrays in estimateTokenCount", () => {
      const u1 = createUserMessage(convId, "User 1");
      const a1 = createAssistantMessage(convId, "Reply 1");
      const total = estimateTokenCount([u1, a1]);

      expect(total).toBe(estimateMessageTokens(u1) + estimateMessageTokens(a1));
    });
  });

  describe("Budget Calculator (calculateBudget)", () => {
    it("should calculate net input budget correctly", () => {
      const budget = calculateBudget(8192, 1000);
      expect(budget).toBe(7192);
    });

    it("should throw ContextError for non-positive targetMaxTokens", () => {
      expect(() => {
        calculateBudget(0, 1000);
      }).toThrow(ContextError);

      expect(() => {
        calculateBudget(-100, 1000);
      }).toThrow("targetMaxTokens must be a positive integer > 0.");
    });

    it("should throw ContextError if targetMaxTokens <= reserveOutputTokens", () => {
      expect(() => {
        calculateBudget(1000, 1000);
      }).toThrow(ContextError);

      expect(() => {
        calculateBudget(500, 1000);
      }).toThrow("must be strictly greater than reserveOutputTokens");
    });
  });

  describe("Trimming Rules & Context Window Management (trimConversation)", () => {
    it("Rule 1: SYSTEM message must NEVER be trimmed", () => {
      // Create a small budget to force aggressive trimming
      const u1 = createUserMessage(convId, "Old message 1 ".repeat(20));
      const u2 = createUserMessage(convId, "Recent message ".repeat(20));

      const snapshot = trimConversation([sysMsg, u1, u2], 100, { reserveOutputTokens: 20 });

      expect(snapshot.systemMessage.text).toBe(sysMsg.text);
      expect(snapshot.systemMessage.role).toBe(MessageRole.SYSTEM);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it("Rule 2: Protect the most recent K conversation turns (default K=3)", () => {
      // Build 5 user/assistant turn pairs
      const messages = [sysMsg];
      for (let i = 1; i <= 5; i++) {
        messages.push(createUserMessage(convId, `User Turn ${i} text content `.repeat(5)));
        messages.push(createAssistantMessage(convId, `Assistant Turn ${i} response `.repeat(5)));
      }

      // Constrain budget so 2 older turns must be trimmed, but 3 recent turns fit
      const targetTokens = 350;
      const snapshot = trimConversation(messages, targetTokens, {
        reserveOutputTokens: 20,
        protectedRecentTurns: 3,
      });

      expect(snapshot.trimmedCount).toBeGreaterThan(0);
      // Recent turns 3, 4, 5 must remain in activeMessages
      const activeTexts = snapshot.activeMessages.map((m) => m.text);
      expect(activeTexts.some((t) => t.includes("User Turn 5"))).toBe(true);
      expect(activeTexts.some((t) => t.includes("User Turn 4"))).toBe(true);
      expect(activeTexts.some((t) => t.includes("User Turn 3"))).toBe(true);
    });

    it("Rule 3: Tool-call pair integrity — Assistant tool request and Tool response trimmed together", () => {
      const toolCallId = "call_pair_99";
      const uOld = createUserMessage(convId, "Old user prompt ".repeat(10));
      const aToolReq = createAssistantMessage(convId, "Calling tool", [{ id: toolCallId, name: "get_weather", arguments: {} }]);
      const tResp = createToolResponseMessage(convId, toolCallId, "Weather result: Sunny ".repeat(10));
      const uRecent = createUserMessage(convId, "Recent prompt ".repeat(5));

      const messages = [sysMsg, uOld, aToolReq, tResp, uRecent];

      // Trim with tight budget
      const snapshot = trimConversation(messages, 150, {
        reserveOutputTokens: 20,
        protectedRecentTurns: 1,
      });

      // If aToolReq is present, tResp MUST be present; if trimmed, both are trimmed
      const hasReq = snapshot.activeMessages.some((m) => m.role === MessageRole.ASSISTANT && m.toolCalls?.some((tc) => tc.id === toolCallId));
      const hasResp = snapshot.activeMessages.some((m) => m.role === MessageRole.TOOL && m.toolCallId === toolCallId);

      expect(hasReq).toBe(hasResp); // Both true or both false
    });

    it("Rule 4: Sliding window removes oldest non-protected messages until total <= budget", () => {
      const u1 = createUserMessage(convId, "Turn 1 content ".repeat(10));
      const u2 = createUserMessage(convId, "Turn 2 content ".repeat(10));
      const u3 = createUserMessage(convId, "Turn 3 content ".repeat(10));
      const u4 = createUserMessage(convId, "Turn 4 content ".repeat(10));

      const messages = [sysMsg, u1, u2, u3, u4];

      const snapshot = trimConversation(messages, 180, {
        reserveOutputTokens: 20,
        protectedRecentTurns: 2, // Protect u3, u4
      });

      expect(snapshot.totalTokenEstimate).toBeLessThanOrEqual(160);
      expect(snapshot.trimmedCount).toBeGreaterThan(0);
    });

    it("should support SUMMARY_HYBRID trimming strategy placeholder", () => {
      const u1 = createUserMessage(convId, "User turn 1");
      const snapshot = trimConversation([sysMsg, u1], 200, {
        reserveOutputTokens: 20,
        strategy: TrimmingStrategy.SUMMARY_HYBRID,
      });

      expect(snapshot.trimmingStrategy).toBe(TrimmingStrategy.SUMMARY_HYBRID);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe("Validation & Error Paths", () => {
    it("should throw ConversationValidationError if messages parameter is not an array", () => {
      expect(() => {
        trimConversation(null as unknown as typeof sysMsg[], 1000);
      }).toThrow(ConversationValidationError);
    });

    it("should throw ContextError if system message tokens exceed net available input budget", () => {
      const hugeSysMsg = createSystemMessage(convId, "Huge system instruction ".repeat(100));

      expect(() => {
        trimConversation([hugeSysMsg], 50, { reserveOutputTokens: 20 });
      }).toThrow("SYSTEM message token estimate");
    });
  });
});
