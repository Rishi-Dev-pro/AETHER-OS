import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConversationRuntime } from "../../conversation/conversation-runtime";
import { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-adapter-runtime";
import { destroyRuntime, hasRuntime } from "../../runtime-singleton";
import { initializeRuntimeBridge, resetRuntimeBridge } from "../../frontend/runtime-bridge";
import { runtimeController } from "../../frontend/runtime-controller";
import { useConversationStore } from "../../frontend/conversation-store";

describe("Phase 9.11 Milestone 6: Resilience & Recovery End-to-End Integration", () => {
  beforeEach(() => {
    resetRuntimeBridge();
    destroyRuntime();
    useConversationStore.setState({
      messages: [],
      isThinking: false,
      isStreaming: false,
      errors: [],
      sessions: [],
    });
  });

  afterEach(() => {
    resetRuntimeBridge();
    destroyRuntime();
  });

  it("recovers execution queue: failed task releases queue lock and subsequent task executes cleanly", async () => {
    const mockUnifiedRuntime: any = {
      execute: async (_adapter: string, req: any) => {
        const lastMsg = req.context.messages[req.context.messages.length - 1];
        if (lastMsg.content.includes("Task 1")) {
          const err: any = new Error("Task 1 Permanent 500 Failure");
          err.statusCode = 500;
          throw err;
        }
        return {
          responseId: "resp_success",
          requestId: "req_2",
          modelId: "llama-3.3-70b-versatile",
          message: {
            id: "msg_2",
            role: "assistant",
            content: "Task 2 Succeeded!",
            timestamp: Date.now(),
          },
          usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 },
        };
      },
    };

    const runtime = new ConversationRuntime(mockUnifiedRuntime as UnifiedAdapterRuntime);

    // Enqueue task 1 (will fail across retries/failovers)
    const task1Promise = runtime.sendMessage("Task 1 Prompt");
    // Enqueue task 2 (must execute after task 1 fails)
    const task2Promise = runtime.sendMessage("Task 2 Prompt");

    await expect(task1Promise).rejects.toThrow();
    const task2Result = await task2Promise;

    expect(task2Result.response.message.content).toBe("Task 2 Succeeded!");
    expect(runtime.getQueueSnapshot()).toHaveLength(0);
  });

  it("preserves session isolation during recovery: failures in Session A never leak into Session B", async () => {
    const mockUnifiedRuntime: any = {
      execute: async (_adapter: string, req: any) => {
        const lastMsg = req.context.messages[req.context.messages.length - 1];
        if (lastMsg.content.includes("in A")) {
          const err: any = new Error("Session A Permanent 500 Failure");
          err.statusCode = 500;
          throw err;
        }
        return {
          responseId: "resp_b",
          requestId: req.requestId,
          modelId: "llama-3.3-70b-versatile",
          message: {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: "Response for Session B",
            timestamp: Date.now(),
          },
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      },
    };

    const runtime = new ConversationRuntime(mockUnifiedRuntime as UnifiedAdapterRuntime);
    const sessionA = runtime.getActiveSession();
    const sessionB = await runtime.createSession({ title: "Session B" });

    // Switch to Session A and trigger error
    await runtime.switchSession(sessionA.metadata.sessionId);
    await expect(runtime.sendMessage("Prompt in A")).rejects.toThrow();

    // Switch to Session B and trigger successful message
    await runtime.switchSession(sessionB.sessionId);
    const resultB = await runtime.sendMessage("Prompt in B");

    expect(resultB.response.message.content).toBe("Response for Session B");

    // Verify Session A history contains failed turn and Session B contains success turn
    await runtime.switchSession(sessionA.metadata.sessionId);
    expect(runtime.history()[0].status).toBe("FAILED");

    await runtime.switchSession(sessionB.sessionId);
    expect(runtime.history()[0].status).toBe("COMPLETED");
  });

  it("handles StrictMode / repeated initialization idempotently without RuntimeSingletonError", async () => {
    const bridge1 = await initializeRuntimeBridge();
    expect(hasRuntime()).toBe(true);

    // Repeated init (StrictMode simulation)
    const bridge2 = await initializeRuntimeBridge();
    expect(bridge2).toBe(bridge1);

    // Self-healing recovery
    await runtimeController.recover();
    expect(useConversationStore.getState().isThinking).toBe(false);
  });
});
