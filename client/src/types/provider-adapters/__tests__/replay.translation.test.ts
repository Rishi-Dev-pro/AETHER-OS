/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: 100 Replay Translation Determinism (`replay.translation.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { translateRequest } from "../request-translator";
import { translateResponse } from "../response-translator";
import { calculateUsage } from "../usage-calculator";
import type { ConversationContext } from "../message-types";

describe("Phase 9.10 Replay Translation Determinism", () => {
  it("should execute 100 translation replay runs producing 100% bit-for-bit identical frozen outputs", () => {
    const replayCount = 100;
    const requestOutputs: string[] = [];
    const responseOutputs: string[] = [];

    const baseContext: ConversationContext = {
      conversationId: "conv-replay-001",
      messages: [
        { id: "msg-s1", role: "system", content: "You are a deterministic AI.", timestamp: 1000 },
        { id: "msg-u1", role: "user", content: "State 1 + 1.", timestamp: 1001 },
      ],
    };

    for (let i = 0; i < replayCount; i++) {
      const translatedReq = translateRequest({
        requestId: "req-deterministic-replay-100",
        modelId: "model-replay-v1",
        context: baseContext,
        temperature: 0.1,
        maxTokens: 100,
      });

      const translatedRes = translateResponse({
        responseId: "res-deterministic-replay-100",
        requestId: translatedReq.requestId,
        modelId: translatedReq.modelId,
        finishReason: "stop",
        message: {
          id: "msg-a1",
          role: "assistant",
          content: "1 + 1 = 2.",
          timestamp: 2000,
        },
        usage: calculateUsage(30, 10, 0.001, 0.002),
        timestamp: 2000,
      });

      expect(Object.isFrozen(translatedReq)).toBe(true);
      expect(Object.isFrozen(translatedReq.context)).toBe(true);
      expect(Object.isFrozen(translatedRes)).toBe(true);
      expect(Object.isFrozen(translatedRes.usage)).toBe(true);

      requestOutputs.push(JSON.stringify(translatedReq));
      responseOutputs.push(JSON.stringify(translatedRes));
    }

    const firstReq = requestOutputs[0];
    const firstRes = responseOutputs[0];

    for (let i = 1; i < replayCount; i++) {
      expect(requestOutputs[i]).toBe(firstReq);
      expect(responseOutputs[i]).toBe(firstRes);
    }
  });
});
