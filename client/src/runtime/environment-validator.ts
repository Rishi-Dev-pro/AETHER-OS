/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 7 Component: Environment Validator (`environment-validator.ts`)
 *
 * @file environment-validator.ts
 * @description Validates environment variables format fail-fast and detects configured provider IDs.
 *
 * @module @aether/runtime/environment-validator
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 7
 */

import type { RuntimeEnvironmentVariables } from "./runtime-environment";
import { EnvironmentValidationError } from "./bootstrap-errors";

/**
 * Detects provider IDs that have credentials configured in the environment environment.
 * Note: Ollama is always included because it requires no credentials.
 *
 * @param env Runtime environment variables object.
 * @returns Array of configured provider IDs.
 */
export function detectConfiguredProviders(
  env: Readonly<RuntimeEnvironmentVariables>
): ReadonlyArray<string> {
  const configured: string[] = ["ollama-provider"];

  if (env.GROQ_API_KEY) {
    configured.push("groq-provider");
  }
  if (env.NVIDIA_API_KEY) {
    configured.push("nvidia-provider");
  }
  if (env.OPENAI_API_KEY) {
    configured.push("openai-provider");
  }

  return Object.freeze(configured);
}

/**
 * Validates formatting of present environment variable credentials fail-fast.
 *
 * @param env Runtime environment variables object.
 * @throws EnvironmentValidationError if any key violates structural format rules.
 */
export function validateEnvironment(env: Readonly<RuntimeEnvironmentVariables>): void {
  if (!env) {
    throw new EnvironmentValidationError("RuntimeEnvironmentVariables object cannot be null or undefined.");
  }

  const keysToValidate: Array<[string, string | undefined]> = [
    ["GROQ_API_KEY", env.GROQ_API_KEY],
    ["NVIDIA_API_KEY", env.NVIDIA_API_KEY],
    ["OPENAI_API_KEY", env.OPENAI_API_KEY],
  ];

  for (const [keyName, keyValue] of keysToValidate) {
    if (keyValue !== undefined) {
      if (typeof keyValue !== "string" || keyValue.trim().length === 0) {
        throw new EnvironmentValidationError(`Environment variable '${keyName}' contains an empty or whitespace key.`);
      }
      if (keyValue.includes(" ") || keyValue.includes("\n") || keyValue.includes("\r")) {
        throw new EnvironmentValidationError(
          `Environment variable '${keyName}' contains illegal newline or whitespace characters.`
        );
      }
    }
  }
}
