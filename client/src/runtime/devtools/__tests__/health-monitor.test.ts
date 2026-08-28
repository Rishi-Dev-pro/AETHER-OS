import { describe, it, expect } from "vitest";
import { DevToolsService } from "../devtools-service";
import { offlineDetector } from "../../resilience/offline-detector";
import { ConversationRuntime } from "../../conversation/conversation-runtime";
import type { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-runtime";

describe("Phase 9.11 Milestone 7: Health Monitor Evaluation Rules", () => {
  it("evaluates healthy status when online and zero failure thresholds crossed", () => {
    offlineDetector.setMockOnlineState(true);
    const devTools = new DevToolsService();
    const mockUnified: any = { execute: async () => ({}) };
    const runtime = new ConversationRuntime(mockUnified as UnifiedAdapterRuntime);

    devTools.bindRuntime(runtime);
    const report = devTools.getHealthReport();

    expect(report.status).toBe("HEALTHY");
    expect(report.scorePercent).toBeGreaterThanOrEqual(80);
    expect(report.checks.find((c) => c.name === "Network Connectivity")?.status).toBe("PASS");
  });

  it("transitions to OFFLINE status immediately when offline detector reports disconnected", () => {
    offlineDetector.setMockOnlineState(false);
    const devTools = new DevToolsService();
    const report = devTools.getHealthReport();

    expect(report.status).toBe("OFFLINE");
    expect(report.checks.find((c) => c.name === "Network Connectivity")?.status).toBe("FAIL");

    // Restore online
    offlineDetector.setMockOnlineState(null);
  });
});
