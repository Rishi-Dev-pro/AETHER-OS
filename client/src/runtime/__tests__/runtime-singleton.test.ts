/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Runtime Singleton (`runtime-singleton.test.ts`)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  bootstrapRuntime,
  getRuntime,
  hasRuntime,
  resetRuntime,
  destroyRuntime,
  RuntimeSingletonError,
} from "../index";

describe("Phase 9.11 Milestone 1 Runtime Singleton Unit Tests", () => {
  beforeEach(() => {
    resetRuntime();
  });

  it("should enforce exactly one active runtime instance container", async () => {
    expect(hasRuntime()).toBe(false);
    expect(() => getRuntime()).toThrow(RuntimeSingletonError);

    await bootstrapRuntime({}, {});

    expect(hasRuntime()).toBe(true);
    const instance = getRuntime();
    expect(instance.runtime).toBeDefined();

    // Duplicate bootstrap attempt must throw RuntimeSingletonError
    await expect(bootstrapRuntime({}, {})).rejects.toThrow(RuntimeSingletonError);
  });

  it("should destroy runtime instance cleanly and allow re-creation", async () => {
    await bootstrapRuntime({}, {});
    expect(hasRuntime()).toBe(true);

    destroyRuntime();
    expect(hasRuntime()).toBe(false);

    await bootstrapRuntime({}, {});
    expect(hasRuntime()).toBe(true);
  });
});
