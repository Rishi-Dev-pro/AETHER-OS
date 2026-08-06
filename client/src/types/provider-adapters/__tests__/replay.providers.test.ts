/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: 100 Provider Replay Determinism (`replay.providers.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { OpenAIAdapter } from "../openai-adapter";
import { GroqAdapter } from "../groq-adapter";
import { NVIDIAAdapter } from "../nvidia-adapter";
import { OllamaAdapter } from "../ollama-adapter";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 Provider Replay Determinism", () => {
  it("should execute 100 replay runs of serialization and response parsing for OpenAI, Groq, NVIDIA, and Ollama", () => {
    const replayCount = 100;

    const openai = new OpenAIAdapter();
    const groq = new GroqAdapter();
    const nvidia = new NVIDIAAdapter();
    const ollama = new OllamaAdapter();

    const request = translateRequest({
      requestId: "req-provider-replay-100",
      modelId: "gpt-4o",
      context: {
        conversationId: "conv-replay-providers",
        messages: [{ id: "m1", role: "user", content: "Deterministic prompt", timestamp: 1000 }],
      },
      temperature: 0.5,
    });

    const mockOpenAIResponse = {
      id: "chatcmpl-replay-100",
      object: "chat.completion",
      model: "gpt-4o",
      choices: [{ index: 0, message: { role: "assistant", content: "Replay response" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };

    const openaiOutputs: string[] = [];
    const groqOutputs: string[] = [];
    const nvidiaOutputs: string[] = [];
    const ollamaOutputs: string[] = [];

    for (let i = 0; i < replayCount; i++) {
      const resOpenAI = openai.parseResponse(mockOpenAIResponse, request.requestId, "gpt-4o");
      const resGroq = groq.parseResponse(mockOpenAIResponse, request.requestId, "llama-3.3-70b-versatile");
      const resNVIDIA = nvidia.parseResponse(mockOpenAIResponse, request.requestId, "meta/llama-3.3-70b-instruct");
      const resOllama = ollama.parseResponse(
        {
          model: "llama3",
          message: { role: "assistant", content: "Ollama replay" },
          done: true,
          prompt_eval_count: 10,
          eval_count: 5,
        },
        request.requestId,
        "llama3"
      );

      expect(Object.isFrozen(resOpenAI)).toBe(true);
      expect(Object.isFrozen(resGroq)).toBe(true);
      expect(Object.isFrozen(resNVIDIA)).toBe(true);
      expect(Object.isFrozen(resOllama)).toBe(true);

      openaiOutputs.push(JSON.stringify(resOpenAI));
      groqOutputs.push(JSON.stringify(resGroq));
      nvidiaOutputs.push(JSON.stringify(resNVIDIA));
      ollamaOutputs.push(JSON.stringify(resOllama));
    }

    // Assert bit-for-bit identical outputs across all 100 replay runs
    for (let i = 1; i < replayCount; i++) {
      expect(openaiOutputs[i]).toBe(openaiOutputs[0]);
      expect(groqOutputs[i]).toBe(groqOutputs[0]);
      expect(nvidiaOutputs[i]).toBe(nvidiaOutputs[0]);
      expect(ollamaOutputs[i]).toBe(ollamaOutputs[0]);
    }
  });
});
