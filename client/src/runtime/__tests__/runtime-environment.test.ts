/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Runtime Environment (`runtime-environment.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  validateEnvironment,
  validateProvider,
  validateCredentials,
  validateConfiguration,
  RuntimeEnvironmentError,
} from "../index";

describe("Phase 9.11 Milestone 1 Runtime Environment Unit Tests", () => {
  it("should validate Groq and NVIDIA configured environment without secret leakage", () => {
    const env = {
      GROQ_API_KEY: "gsk_env_test_groq_key",
      NVIDIA_API_KEY: "nvapi-env_test_nvidia_key",
    };

    const report = validateEnvironment(env);

    expect(report.isEnvironmentValid).toBe(true);
    expect(report.credentials.groqStatus).toBe("Configured");
    expect(report.credentials.nvidiaStatus).toBe("Configured");
    expect(report.credentials.openaiStatus).toBe("Optional");
    expect(report.credentials.ollamaStatus).toBe("Configured");

    const groqProv = validateProvider("groq-provider", env);
    expect(groqProv.status).toBe("Configured");
    expect(groqProv.isReady).toBe(true);
    expect(groqProv.requiresAuth).toBe(true);

    const openaiProv = validateProvider("openai-provider", env);
    expect(openaiProv.status).toBe("Optional");
    expect(openaiProv.isReady).toBe(false);

    expect(Object.isFrozen(report)).toBe(true);
  });

  it("should throw RuntimeEnvironmentError on illegal whitespace or line breaks in key", () => {
    const env = {
      GROQ_API_KEY: "gsk_illegal_key\nwith_newline",
    };

    expect(() => validateConfiguration(env)).toThrow(RuntimeEnvironmentError);
  });
});
