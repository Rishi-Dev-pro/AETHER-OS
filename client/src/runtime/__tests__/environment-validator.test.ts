/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Environment Validator (`environment-validator.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { validateEnvironment, detectConfiguredProviders } from "../environment-validator";
import { EnvironmentValidationError } from "../bootstrap-errors";

describe("Phase 9.10 Milestone 7 Environment Validator Unit Tests", () => {
  it("should detect configured provider IDs correctly based on environment variables", () => {
    const env = {
      GROQ_API_KEY: "gsk_valid_key",
      NVIDIA_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
    };

    const providers = detectConfiguredProviders(env);
    expect(providers).toEqual(["ollama-provider", "groq-provider"]);
  });

  it("should pass validation for clean non-empty environment strings", () => {
    const env = {
      GROQ_API_KEY: "gsk_valid_groq_key_123",
      NVIDIA_API_KEY: "nvapi-valid_nvidia_key_456",
    };

    expect(() => validateEnvironment(env)).not.toThrow();
  });

  it("should throw EnvironmentValidationError on illegal newline or whitespace characters", () => {
    const env = {
      GROQ_API_KEY: "gsk_invalid_key_with\nnewline",
    };

    expect(() => validateEnvironment(env)).toThrow(EnvironmentValidationError);
  });
});
