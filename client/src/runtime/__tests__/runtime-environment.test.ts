/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Runtime Environment Reader (`runtime-environment.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { readRuntimeEnvironment, PROVIDER_ENV_KEYS } from "../runtime-environment";

describe("Phase 9.10 Milestone 7 Runtime Environment Reader Unit Tests", () => {
  it("should read and trim API keys from custom environment dictionary", () => {
    const custom = {
      [PROVIDER_ENV_KEYS.GROQ]: "  gsk_trimmed_key_123  ",
      [PROVIDER_ENV_KEYS.NVIDIA]: "nvapi-trimmed_key_456",
    };

    const env = readRuntimeEnvironment(custom);

    expect(env.GROQ_API_KEY).toBe("gsk_trimmed_key_123");
    expect(env.NVIDIA_API_KEY).toBe("nvapi-trimmed_key_456");
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(Object.isFrozen(env)).toBe(true);
  });
});
