/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Translation Subsystem (`translation.integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { validateConversationContext, validateTranslationRequest } from "../payload-validator";
import { translateRequest } from "../request-translator";
import { translateResponse } from "../response-translator";
import { calculateUsage, aggregateUsage } from "../usage-calculator";
import type { ConversationContext } from "../message-types";

describe("Phase 9.10 Translation Pipeline Integration", () => {
  it("should execute complete conversation -> validation -> request translation -> response translation -> usage aggregation pipeline", () => {
    const rawContext: ConversationContext = {
      conversationId: "conv-integration-001",
      messages: [
        { id: "msg-sys-1", role: "system", content: "System instruction.", timestamp: 1000 },
        { id: "msg-usr-1", role: "user", content: "What is 10 + 10?", timestamp: 1001 },
      ],
    };

    // Stage 1: Validate Conversation Context
    expect(() => validateConversationContext(rawContext)).not.toThrow();

    // Stage 2: Translate Request
    const translatedReq = translateRequest({
      requestId: "req-integ-1",
      modelId: "model-generic-v1",
      context: rawContext,
      systemInstruction: "System instruction.",
      temperature: 0.5,
      maxTokens: 256,
    });

    expect(() => validateTranslationRequest(translatedReq)).not.toThrow();
    expect(Object.isFrozen(translatedReq)).toBe(true);

    // Stage 3: Translate Response
    const translatedRes = translateResponse({
      responseId: "res-integ-1",
      requestId: translatedReq.requestId,
      modelId: translatedReq.modelId,
      finishReason: "stop",
      message: {
        id: "msg-ast-1",
        role: "assistant",
        content: "10 + 10 = 20",
        timestamp: 1002,
      },
      usage: calculateUsage(45, 12, 0.001, 0.002),
    });

    expect(Object.isFrozen(translatedRes)).toBe(true);
    expect(translatedRes.message.content).toBe("10 + 10 = 20");

    // Stage 4: Aggregate Usage
    const aggregated = aggregateUsage([translatedRes.usage]);
    expect(aggregated.totalTokens).toBe(57);
    expect(Object.isFrozen(aggregated)).toBe(true);
  });
});
