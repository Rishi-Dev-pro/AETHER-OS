/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Unified Adapter Runtime (`unified-runtime.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { UnifiedAdapterRuntime } from "../unified-adapter-runtime";
import { OpenAIAdapter } from "../openai-adapter";
import { GroqAdapter } from "../groq-adapter";

describe("Phase 9.10 Unified Adapter Runtime Unit Tests", () => {
  it("should initialize, register adapters, register credentials, and generate snapshots", async () => {
    const runtime = new UnifiedAdapterRuntime();
    await runtime.initialize();

    const openai = new OpenAIAdapter("openai-key-id");
    runtime.registerAdapter(openai);

    const credRef = runtime.registerCredential("openai-key-id", "openai-provider", "API_KEY", {
      apiKey: "sk-proj-test-key-12345",
    });

    expect(credRef.credentialId).toBe("openai-key-id");

    const snapshot = runtime.runtimeSnapshot();
    expect(snapshot.status).toBe("READY");
    expect(snapshot.registeredAdapterIds).toContain("openai-adapter");
    expect(snapshot.registeredCredentialIds).toContain("openai-key-id");
    expect(Object.isFrozen(snapshot)).toBe(true);

    await runtime.shutdown();
  });

  it("should generate diagnostics for registered adapters", async () => {
    const runtime = new UnifiedAdapterRuntime();
    runtime.registerAdapter(new GroqAdapter("groq-cred"));

    const diags = runtime.diagnostics("groq-adapter");
    expect(diags.length).toBe(1);
    expect(diags[0].adapterId).toBe("groq-adapter");
    expect(diags[0].hasCredentialRegistered).toBe(false);
    expect(Object.isFrozen(diags)).toBe(true);
  });
});
