/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Payload Validator (`payload-validator.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  validateConversationMessage,
  validateConversationContext,
  validateTranslationRequest,
} from "../payload-validator";
import {
  InvalidMessageError,
  MalformedConversationError,
  InvalidPayloadError,
  UnsupportedContentError,
} from "../translation-errors";
import type { ConversationContext, TranslationRequest } from "../message-types";

describe("Phase 9.10 Payload Validator Unit Tests", () => {
  it("should validate a valid system, user, assistant, and tool message sequence", () => {
    const context: ConversationContext = {
      conversationId: "conv-101",
      messages: [
        { id: "msg-1", role: "system", content: "You are a helpful AI assistant.", timestamp: 1000 },
        { id: "msg-2", role: "user", content: "Calculate 2+2.", timestamp: 1001 },
        {
          id: "msg-3",
          role: "assistant",
          content: "",
          toolCalls: [{ id: "call-1", type: "function", name: "calc", arguments: { expr: "2+2" } }],
          timestamp: 1002,
        },
        { id: "msg-4", role: "tool", toolCallId: "call-1", name: "calc", content: "4", timestamp: 1003 },
      ],
    };

    expect(() => validateConversationContext(context)).not.toThrow();
  });

  it("should throw MalformedConversationError on empty or missing conversation ID", () => {
    const invalidContext: any = { conversationId: "", messages: [] };
    expect(() => validateConversationContext(invalidContext)).toThrow(MalformedConversationError);
  });

  it("should throw MalformedConversationError if system message is placed after non-system message", () => {
    const badSequence: ConversationContext = {
      conversationId: "conv-bad-seq",
      messages: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: 1000 },
        { id: "msg-2", role: "system", content: "Pretending system message", timestamp: 1001 },
      ],
    };

    expect(() => validateConversationContext(badSequence)).toThrow(MalformedConversationError);
  });

  it("should throw MalformedConversationError on duplicate message IDs", () => {
    const dupContext: ConversationContext = {
      conversationId: "conv-dup",
      messages: [
        { id: "msg-same", role: "user", content: "Hello", timestamp: 1000 },
        { id: "msg-same", role: "assistant", content: "Hi", timestamp: 1001 },
      ],
    };

    expect(() => validateConversationContext(dupContext)).toThrow(MalformedConversationError);
  });

  it("should throw InvalidMessageError when assistant message lacks content, toolCalls, and reasoning", () => {
    const emptyAssistant: any = { id: "msg-empty", role: "assistant", timestamp: 1000 };
    expect(() => validateConversationMessage(emptyAssistant)).toThrow(InvalidMessageError);
  });

  it("should validate a complete TranslationRequest payload bounds", () => {
    const req: TranslationRequest = {
      requestId: "req-1",
      modelId: "model-alpha",
      context: {
        conversationId: "conv-1",
        messages: [{ id: "m1", role: "user", content: "Prompt", timestamp: 1000 }],
      },
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1024,
    };

    expect(() => validateTranslationRequest(req)).not.toThrow();
  });

  it("should throw InvalidPayloadError on out-of-bound request parameters", () => {
    const badTemp: TranslationRequest = {
      requestId: "req-bad-temp",
      modelId: "model-1",
      context: {
        conversationId: "conv-1",
        messages: [{ id: "m1", role: "user", content: "Prompt", timestamp: 1000 }],
      },
      temperature: 3.5, // > 2.0 limit
    };

    expect(() => validateTranslationRequest(badTemp)).toThrow(InvalidPayloadError);
  });
});
