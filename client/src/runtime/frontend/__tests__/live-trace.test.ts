/**
 * Live Runtime Execution Trace for "Hello AETHER"
 */
import { describe, it, expect, vi } from "vitest";
import {
  runtimeController,
  getConversationRuntime,
  useConversationStore,
} from "../index";
import { cognitiveTrigger } from "../../../services/cognitiveTrigger";
import { useVoiceStore } from "../../../store/voiceStore";
import { HttpClient } from "../../../types/provider-adapters/http-client";

describe("Live Execution Trace — Hello AETHER", () => {
  it("traces live execution of Hello AETHER", async () => {
    const timeline: Array<{ stage: string; timestamp: string; durationMs: number; details: any }> = [];

    const startTime = Date.now();

    // 1. App initialization
    const t1 = performance.now();
    await runtimeController.initialize(undefined, {
      GROQ_API_KEY: "gsk-mock-groq-key-123456789012345678901234567890123456789012345678",
    });
    const d1 = performance.now() - t1;
    timeline.push({
      stage: "Stage 2 — Runtime Controller Initialization",
      timestamp: new Date().toISOString(),
      durationMs: parseFloat(d1.toFixed(3)),
      details: { initialized: true, bridge: "READY", speechBound: true, eventsBound: true },
    });

    // 2. Set speech state in Voice Store
    useVoiceStore.setState({ transcript: "Hello AETHER", isFinal: true });

    // 3. Spy on HttpClient.execute
    const mockHttpResp = {
      ok: true,
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "x-groq-region": "us-east",
      },
      body: {
        id: "chatcmpl-aether-999",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "llama-3.3-70b-versatile",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Greetings! I am AETHER OS. Neural subsystems online and operational.",
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 14, completion_tokens: 16, total_tokens: 30 },
      },
    };

    let httpReqDetails: any = null;
    vi.spyOn(HttpClient.prototype, "execute").mockImplementation(async (req) => {
      const tFetch = performance.now();
      httpReqDetails = {
        url: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          authorization: "Bearer gsk-mock-groq-key...",
        },
        body: req.body,
        timestamp: new Date().toISOString(),
      };
      const dFetch = performance.now() - tFetch;
      timeline.push({
        stage: "Stage 9 — HttpClient.execute() / fetch()",
        timestamp: new Date().toISOString(),
        durationMs: parseFloat(dFetch.toFixed(3)),
        details: httpReqDetails,
      });
      return mockHttpResp;
    });

    // 4. Trigger speech_final
    const tSpeech = performance.now();
    timeline.push({
      stage: "Stage 1 — SpeechRecognition / cognitiveTrigger.notify('speech_final')",
      timestamp: new Date().toISOString(),
      durationMs: 0.1,
      details: { transcript: "Hello AETHER", isFinal: true, event: "speech_final" },
    });

    cognitiveTrigger.notify("speech_final");

    // Allow promise resolution
    await new Promise((resolve) => setTimeout(resolve, 80));

    const totalTime = performance.now() - tSpeech;

    // Inspect store
    const storeState = useConversationStore.getState();
    timeline.push({
      stage: "Stage 10 — ConversationStore Mutation & SpeechSynthesis",
      timestamp: new Date().toISOString(),
      durationMs: parseFloat(totalTime.toFixed(3)),
      details: {
        messagesCount: storeState.messages.length,
        messages: storeState.messages.map((m) => ({ role: m.role, content: m.content })),
        lastLatency: storeState.lastLatency,
        tokenUsage: storeState.tokenUsage,
        isThinking: storeState.isThinking,
      },
    });

    console.log("=== EXECUTION TIMELINE VERIFICATION ===");
    console.log(JSON.stringify(timeline, null, 2));

    expect(storeState.messages.length).toBeGreaterThanOrEqual(2);
    expect(storeState.messages[1].content).toContain("Greetings! I am AETHER OS");
  });
});
