/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Conversation Runtime Diagnostics (`runtime-diagnostics.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { RuntimeDiagnostics } from "../runtime-diagnostics";

describe("Phase 9.11 Milestone 2 Conversation Runtime Diagnostics Unit Tests", () => {
  it("should record execution performance metrics and produce secret-free snapshots", () => {
    const diag = new RuntimeDiagnostics();

    diag.recordExecution("groq-adapter", "llama-3.3-70b-versatile", { promptTokens: 10, completionTokens: 20, totalTokens: 30 }, 150, true);
    diag.recordExecution("groq-adapter", "llama-3.3-70b-versatile", { promptTokens: 15, completionTokens: 25, totalTokens: 40 }, 250, true);

    const snapshot = diag.createSnapshot();

    expect(snapshot.totalRequests).toBe(2);
    expect(snapshot.successfulRequests).toBe(2);
    expect(snapshot.averageLatencyMs).toBe(200);
    expect(snapshot.totalPromptTokens).toBe(25);
    expect(snapshot.totalCompletionTokens).toBe(45);
    expect(snapshot.totalTokens).toBe(70);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});
