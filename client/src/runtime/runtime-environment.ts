/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 7 Component: Runtime Environment Reader (`runtime-environment.ts`)
 *
 * @file runtime-environment.ts
 * @description Safe environment reader retrieving provider API keys from runtime environment.
 *
 * @module @aether/runtime/runtime-environment
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 7
 */

/**
 * Standard provider environment variable keys.
 */
export const PROVIDER_ENV_KEYS = {
  GROQ: "GROQ_API_KEY",
  NVIDIA: "NVIDIA_API_KEY",
  OPENAI: "OPENAI_API_KEY",
} as const;

/**
 * Interface contract representing environment variables read at runtime.
 */
export interface RuntimeEnvironmentVariables {
  readonly GROQ_API_KEY?: string;
  readonly NVIDIA_API_KEY?: string;
  readonly OPENAI_API_KEY?: string;
}

/**
 * Safely reads provider API keys from current process environment or override record.
 *
 * @param customEnv Optional override environment dictionary.
 * @returns Readonly map of environment key values.
 */
export function readRuntimeEnvironment(
  customEnv?: Record<string, string | undefined>
): Readonly<RuntimeEnvironmentVariables> {
  const globalEnv =
    typeof globalThis !== "undefined" && (globalThis as any).process?.env
      ? (globalThis as any).process.env
      : {};

  const envSource = customEnv ?? globalEnv;

  return Object.freeze({
    GROQ_API_KEY: envSource[PROVIDER_ENV_KEYS.GROQ]?.trim() || undefined,
    NVIDIA_API_KEY: envSource[PROVIDER_ENV_KEYS.NVIDIA]?.trim() || undefined,
    OPENAI_API_KEY: envSource[PROVIDER_ENV_KEYS.OPENAI]?.trim() || undefined,
  });
}
