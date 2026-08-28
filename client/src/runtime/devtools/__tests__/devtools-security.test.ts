import { describe, it, expect } from "vitest";
import { DevToolsService } from "../devtools-service";
import { ConversationRuntime } from "../../conversation/conversation-runtime";
import type { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-runtime";

describe("Phase 9.11 Milestone 7: DevTools Security & Secret Isolation", () => {
  it("sanitizes event payloads containing sensitive keys", () => {
    const devTools = new DevToolsService();
    const mockUnified: any = { execute: async () => ({}) };
    const runtime = new ConversationRuntime(mockUnified as UnifiedAdapterRuntime);

    devTools.bindRuntime(runtime);

    // Emit event with simulated secret keys in payload
    devTools.handleRuntimeEvent({
      eventId: "evt_sec_1",
      type: "RequestDispatched" as any,
      conversationId: "sess_1",
      executionId: "exec_1",
      timestamp: Date.now(),
      providerId: "groq-adapter",
      apiKey: "gsk_super_secret_key_12345",
      bearerToken: "Bearer secret_bearer_token",
      authorization: "Bearer confidential",
      nested: {
        credentialSecret: "top_secret_passphrase",
        safeMeta: "safe_value",
      },
    } as any);

    const timeline = devTools.getTimelineEvents();
    expect(timeline).toHaveLength(1);

    const payload = timeline[0].safePayload;
    expect(payload.apiKey).toBe("[REDACTED]");
    expect(payload.bearerToken).toBe("[REDACTED]");
    expect(payload.authorization).toBe("[REDACTED]");
    expect((payload.nested as any).credentialSecret).toBe("[REDACTED]");
    expect((payload.nested as any).safeMeta).toBe("safe_value");

    // Also check logs
    const logs = devTools.getDebugLogs();
    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain("gsk_super_secret_key_12345");
    expect(serializedLogs).not.toContain("secret_bearer_token");
    expect(serializedLogs).not.toContain("top_secret_passphrase");
  });

  it("ensures provider metadata contains zero credentials", () => {
    const devTools = new DevToolsService();
    const providers = devTools.getProviderData();

    for (const p of providers) {
      expect((p as any).apiKey).toBeUndefined();
      expect((p as any).token).toBeUndefined();
      expect((p as any).secret).toBeUndefined();
      expect((p as any).authorization).toBeUndefined();
    }
  });
});
