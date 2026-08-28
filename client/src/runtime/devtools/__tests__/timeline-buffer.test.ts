import { describe, it, expect } from "vitest";
import { DevToolsService } from "../devtools-service";

describe("Phase 9.11 Milestone 7: Bounded Timeline & Debug Log Buffers", () => {
  it("enforces FIFO cap of 150 entries on event timeline buffer to prevent memory leaks", () => {
    const devTools = new DevToolsService();

    for (let i = 0; i < 200; i++) {
      devTools.handleRuntimeEvent({
        eventId: `evt_${i}`,
        type: "ExecutionChunkReceived",
        conversationId: "sess_1",
        executionId: "exec_1",
        tokenDelta: 1,
        accumulatedLength: i + 1,
        timestamp: Date.now(),
      } as any);
    }

    const events = devTools.getTimelineEvents();
    expect(events.length).toBe(150);
    // Latest event should be at index 0 (unshifted)
    expect(events[0].eventId).toBe("evt_199");
  });

  it("enforces FIFO cap of 250 entries on structured debug logs buffer", () => {
    const devTools = new DevToolsService();

    for (let i = 0; i < 300; i++) {
      devTools.addLog("INFO", "RUNTIME", `Log message iteration #${i}`);
    }

    const logs = devTools.getDebugLogs();
    expect(logs.length).toBe(250);
    expect(logs[0].message).toContain("iteration #299");
  });
});
