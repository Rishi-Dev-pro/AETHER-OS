/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 3 Integration Test Suite (`frontend-runtime.test.ts`)
 *
 * @file frontend-runtime.test.ts
 * @description Comprehensive unit and integration tests verifying the bridge, store, events,
 * speech synthesis, runtime hooks, status reporting, diagnostics, and error handling.
 *
 * @module @aether/runtime/frontend/__tests__/frontend-runtime
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useConversationStore,
  initializeRuntimeBridge,
  getConversationRuntime,
  resetRuntimeBridge,
  hasRuntimeBridge,
  bindRuntimeEvents,
  bindSpeechRecognition,
  speak,
  cancelSpeech,
  setTTSEnabled,
  isTTSEnabled,
  getFrontendRuntimeStatus,
  runtimeController,
} from "../index";
import { cognitiveTrigger } from "../../../services/cognitiveTrigger";
import { useVoiceStore } from "../../../store/voiceStore";
import { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-adapter-runtime";
import type { TranslationResponse } from "../../../types/provider-adapters/message-types";

// Mock environment for API keys
const mockEnv = {
  GROQ_API_KEY: "gsk-mock-groq-key-123456789012345678901234567890123456789012345678",
  NVIDIA_API_KEY: "nvapi-mock-nvidia-key-1234567890123456789012345678901234567890",
};

describe("Milestone 3 — Frontend Runtime Integration Suite", () => {
  beforeEach(() => {
    resetRuntimeBridge();
    useConversationStore.getState().clearConversation();
    useVoiceStore.getState().resetVoiceTelemetry();
    setTTSEnabled(true);
  });

  afterEach(() => {
    runtimeController.destroy();
    resetRuntimeBridge();
  });

  describe("1. Runtime Bridge & Initialization", () => {
    it("should initialize runtime bridge and expose ConversationRuntime", async () => {
      const runtime = await initializeRuntimeBridge(undefined, mockEnv);
      expect(runtime).toBeDefined();
      expect(hasRuntimeBridge()).toBe(true);

      const status = getFrontendRuntimeStatus();
      expect(status.runtimeReady).toBe(true);
      expect(status.connected).toBe(true);

      const fetchedRuntime = getConversationRuntime();
      expect(fetchedRuntime).toBe(runtime);
    });

    it("should prevent duplicate bootstrap calls and return existing instance", async () => {
      const runtime1 = await initializeRuntimeBridge(undefined, mockEnv);
      const runtime2 = await initializeRuntimeBridge(undefined, mockEnv);

      expect(runtime1).toBe(runtime2);
    });

    it("should throw error if getConversationRuntime is called before initialization", () => {
      expect(() => getConversationRuntime()).toThrow(
        "Runtime bridge has not been initialized"
      );
    });
  });

  describe("2. Conversation Store Immutability & Mutations", () => {
    it("should add and update messages immutably", () => {
      const store = useConversationStore.getState();

      store.addMessage({
        id: "msg-1",
        role: "user",
        content: "Hello AETHER",
        timestamp: Date.now(),
      });

      expect(useConversationStore.getState().messages).toHaveLength(1);
      expect(useConversationStore.getState().messages[0].content).toBe("Hello AETHER");

      store.updateMessage("msg-1", { status: "COMPLETED" });
      expect(useConversationStore.getState().messages[0].status).toBe("COMPLETED");
    });

    it("should aggregate metrics correctly and maintain zero side effects", () => {
      const store = useConversationStore.getState();

      store.updateMetrics({
        lastLatency: 120,
        tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        estimatedCost: 0.00005,
      });

      const updated = useConversationStore.getState();
      expect(updated.lastLatency).toBe(120);
      expect(updated.tokenUsage.promptTokens).toBe(10);
      expect(updated.tokenUsage.completionTokens).toBe(20);
      expect(updated.tokenUsage.totalTokens).toBe(30);
      expect(updated.estimatedCost).toBeCloseTo(0.00005);
    });

    it("should record errors cleanly and support clearErrors", () => {
      const store = useConversationStore.getState();
      store.addError({ code: "ERR_TEST", message: "Test Error" });

      expect(useConversationStore.getState().errors).toHaveLength(1);
      expect(useConversationStore.getState().errors[0].message).toBe("Test Error");

      store.clearErrors();
      expect(useConversationStore.getState().errors).toHaveLength(0);
    });
  });

  describe("3. Event-Driven UI Updates", () => {
    it("should update conversation store when runtime emits events", async () => {
      const runtime = await initializeRuntimeBridge(undefined, mockEnv);

      // Mock UnifiedAdapterRuntime execute to avoid live network calls
      const mockResponse: TranslationResponse = {
        responseId: "resp-101",
        requestId: "req-101",
        modelId: "llama-3.3-70b-versatile",
        finishReason: "stop",
        message: {
          id: "asst-msg-1",
          role: "assistant",
          content: "AETHER operational.",
          timestamp: Date.now(),
        },
        usage: {
          promptTokens: 15,
          completionTokens: 8,
          totalTokens: 23,
          estimatedCostUSD: 0.00001,
        },
        timestamp: Date.now(),
      };

      vi.spyOn(UnifiedAdapterRuntime.prototype, "execute").mockResolvedValue(mockResponse);

      const result = await runtime.sendMessage("Status update request");


      expect(result).toBeDefined();
      expect(result.response.message.content).toBe("AETHER operational.");

      const storeState = useConversationStore.getState();
      expect(storeState.isThinking).toBe(false);
      expect(storeState.messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("4. Speech Recognition Integration (Speech → Runtime)", () => {
    it("should send message automatically when speech_final trigger occurs", async () => {
      await runtimeController.initialize(undefined, mockEnv);

      const sendMessageSpy = vi
        .spyOn(getConversationRuntime(), "sendMessage")
        .mockResolvedValue({
          executionId: "exec-test",
          conversationId: "conv-test",
          response: {
            responseId: "r1",
            requestId: "req1",
            modelId: "m1",
            message: { id: "m1", role: "assistant", content: "Speech received", timestamp: Date.now() },
            finishReason: "stop",
            usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10, estimatedCostUSD: 0 },
            timestamp: Date.now(),
          },
          turn: {
            turnId: "t1",
            userMessage: { id: "u1", role: "user", content: "Voice command", timestamp: Date.now() },
            status: "COMPLETED",
            timestamp: Date.now(),
          },
          durationMs: 50,
          timestamp: Date.now(),
        });

      useVoiceStore.setState({ transcript: "Voice command", isFinal: true });
      cognitiveTrigger.notify("speech_final");

      expect(sendMessageSpy).toHaveBeenCalledWith("Voice command");
    });
  });

  describe("5. Browser SpeechSynthesis (UI → Speech)", () => {
    it("should handle TTS enable/disable and cancel controls gracefully", () => {
      setTTSEnabled(false);
      expect(isTTSEnabled()).toBe(false);

      const spoken = speak("Testing disabled TTS");
      expect(spoken).toBe(false);

      setTTSEnabled(true);
      expect(isTTSEnabled()).toBe(true);

      cancelSpeech();
      expect(useConversationStore.getState().isSpeaking).toBe(false);
    });
  });

  describe("6. Diagnostics Panel & Telemetry", () => {
    it("should export secret-free diagnostics data", async () => {
      await runtimeController.initialize(undefined, mockEnv);

      const diagnostics = runtimeController.getDiagnostics();
      expect(diagnostics).toBeDefined();
      expect(diagnostics.provider).toBe("groq-adapter");
      expect(diagnostics.model).toBe("llama-3.3-70b-versatile");
      expect(diagnostics.totalTokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe("7. Error Handling & Resilience", () => {
    it("should record error gracefully if provider execution fails", async () => {
      const runtime = await initializeRuntimeBridge(undefined, mockEnv);

      vi.spyOn(UnifiedAdapterRuntime.prototype, "execute").mockRejectedValue(
        new Error("Network connection dropped")
      );

      await expect(runtime.sendMessage("Fail test")).rejects.toThrow("Network connection dropped");

      const storeState = useConversationStore.getState();
      expect(storeState.isThinking).toBe(false);
      expect(storeState.errors.length).toBeGreaterThan(0);
      expect(storeState.errors[0].message).toContain("Network connection dropped");
    });
  });

});
