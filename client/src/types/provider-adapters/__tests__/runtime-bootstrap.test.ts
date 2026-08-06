/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Runtime Bootstrap & Validation (`runtime-bootstrap.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { bootstrapRuntime } from "../runtime-bootstrap";
import { validateRuntime } from "../runtime-validation";

describe("Phase 9.10 Runtime Bootstrap & Validation Unit Tests", () => {
  it("should bootstrap subsystems and register all concrete provider adapters by default", async () => {
    const bootstrapped = bootstrapRuntime({ autoRegisterDefaultAdapters: true });

    expect(bootstrapped.runtime).toBeDefined();
    expect(bootstrapped.vault).toBeDefined();
    expect(bootstrapped.adapterManager).toBeDefined();
    expect(bootstrapped.providerManager).toBeDefined();

    await bootstrapped.runtime.initialize();

    const snapshot = bootstrapped.runtime.runtimeSnapshot();
    expect(snapshot.registeredAdapterIds.length).toBe(4);
    expect(snapshot.registeredAdapterIds).toContain("openai-adapter");
    expect(snapshot.registeredAdapterIds).toContain("groq-adapter");
    expect(snapshot.registeredAdapterIds).toContain("nvidia-adapter");
    expect(snapshot.registeredAdapterIds).toContain("ollama-adapter");

    expect(() => validateRuntime(bootstrapped.runtime)).not.toThrow();
    expect(Object.isFrozen(bootstrapped)).toBe(true);
  });
});
