/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 1 Component: Runtime Environment Validator (`runtime-environment.ts`)
 *
 * @file runtime-environment.ts
 * @description Secret-free environment validation verifying provider credential availability and configurations.
 *
 * @module @aether/runtime/runtime-environment
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 1
 */

import { RuntimeEnvironmentError } from "./runtime-errors";

/**
 * Provider credential configuration status categories.
 */
export type CredentialStatus = "Configured" | "Missing" | "Optional" | "Unavailable";

/**
 * Standard provider environment variable keys.
 */
export const PROVIDER_ENV_KEYS = {
  GROQ: "GROQ_API_KEY",
  NVIDIA: "NVIDIA_API_KEY",
  OPENAI: "OPENAI_API_KEY",
} as const;

/**
 * Interface representing normalized environment variables read at runtime.
 */
export interface RuntimeEnvironmentVariables {
  readonly GROQ_API_KEY?: string;
  readonly NVIDIA_API_KEY?: string;
  readonly OPENAI_API_KEY?: string;
}

/**
 * Secret-free status of a specific provider's configuration.
 */
export interface ProviderValidationResult {
  readonly providerId: string;
  readonly status: CredentialStatus;
  readonly isReady: boolean;
  readonly requiresAuth: boolean;
}

/**
 * Secret-free overall credential validation result.
 */
export interface CredentialValidationResult {
  readonly groqStatus: CredentialStatus;
  readonly nvidiaStatus: CredentialStatus;
  readonly openaiStatus: CredentialStatus;
  readonly ollamaStatus: CredentialStatus;
  readonly totalConfigured: number;
}

/**
 * Secret-free overall environment validation report.
 */
export interface EnvironmentValidationReport {
  readonly isEnvironmentValid: boolean;
  readonly providers: ReadonlyArray<ProviderValidationResult>;
  readonly credentials: CredentialValidationResult;
  readonly timestamp: number;
}

/**
 * Helper to deeply freeze objects recursively.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Safely reads provider API keys from process environment or custom override map.
 *
 * @param customEnv Optional custom environment map.
 * @returns Readonly map of environment key values.
 */
export function readRuntimeEnvironment(
  customEnv?: Record<string, string | undefined>
): Readonly<RuntimeEnvironmentVariables> {
  const globalEnv =
    typeof globalThis !== "undefined" && (globalThis as any).process?.env
      ? (globalThis as any).process.env
      : {};

  const viteEnv =
    typeof import.meta !== "undefined" && (import.meta as any).env
      ? (import.meta as any).env
      : {};

  const envSource = customEnv ?? { ...globalEnv, ...viteEnv };

  const getEnvVal = (key: string): string | undefined => {
    const direct = envSource[key];
    if (direct) return direct;
    const viteKey = `VITE_${key}`;
    const viteVal = envSource[viteKey];
    if (viteVal) return viteVal;
    return undefined;
  };

  return Object.freeze({
    GROQ_API_KEY: getEnvVal(PROVIDER_ENV_KEYS.GROQ)?.trim() || undefined,
    NVIDIA_API_KEY: getEnvVal(PROVIDER_ENV_KEYS.NVIDIA)?.trim() || undefined,
    OPENAI_API_KEY: getEnvVal(PROVIDER_ENV_KEYS.OPENAI)?.trim() || undefined,
  });
}


/**
 * Validates formatting of present environment variable credentials fail-fast.
 *
 * @param env Runtime environment variables object.
 * @throws RuntimeEnvironmentError if any key violates structural format rules.
 */
export function validateConfiguration(
  customEnv?: Record<string, string | undefined>
): void {
  const env = readRuntimeEnvironment(customEnv);

  const keysToValidate: Array<[string, string | undefined]> = [
    ["GROQ_API_KEY", env.GROQ_API_KEY],
    ["NVIDIA_API_KEY", env.NVIDIA_API_KEY],
    ["OPENAI_API_KEY", env.OPENAI_API_KEY],
  ];

  for (const [keyName, keyValue] of keysToValidate) {
    if (keyValue !== undefined) {
      if (typeof keyValue !== "string" || keyValue.trim().length === 0) {
        throw new RuntimeEnvironmentError(
          `Environment variable '${keyName}' contains an empty or whitespace key.`
        );
      }
      if (keyValue.includes(" ") || keyValue.includes("\n") || keyValue.includes("\r")) {
        throw new RuntimeEnvironmentError(
          `Environment variable '${keyName}' contains illegal newline or whitespace characters.`
        );
      }
    }
  }
}

/**
 * Validates credential status for a specific provider fail-fast without exposing secret values.
 *
 * @param providerId Target provider ID.
 * @param customEnv Optional custom environment map.
 * @returns Immutable ProviderValidationResult.
 */
export function validateProvider(
  providerId: string,
  customEnv?: Record<string, string | undefined>
): Readonly<ProviderValidationResult> {
  const env = readRuntimeEnvironment(customEnv);

  switch (providerId) {
    case "groq-provider": {
      const isConfigured = Boolean(env.GROQ_API_KEY);
      return deepFreeze({
        providerId,
        status: isConfigured ? "Configured" : "Missing",
        isReady: isConfigured,
        requiresAuth: true,
      });
    }
    case "nvidia-provider": {
      const isConfigured = Boolean(env.NVIDIA_API_KEY);
      return deepFreeze({
        providerId,
        status: isConfigured ? "Configured" : "Missing",
        isReady: isConfigured,
        requiresAuth: true,
      });
    }
    case "openai-provider": {
      const isConfigured = Boolean(env.OPENAI_API_KEY);
      return deepFreeze({
        providerId,
        status: isConfigured ? "Configured" : "Optional",
        isReady: isConfigured,
        requiresAuth: true,
      });
    }
    case "ollama-provider": {
      return deepFreeze({
        providerId,
        status: "Configured",
        isReady: true,
        requiresAuth: false,
      });
    }
    default:
      return deepFreeze({
        providerId,
        status: "Unavailable",
        isReady: false,
        requiresAuth: false,
      });
  }
}

/**
 * Validates overall credential availability across all supported providers without secret leakage.
 *
 * @param customEnv Optional custom environment map.
 * @returns Secret-free CredentialValidationResult object.
 */
export function validateCredentials(
  customEnv?: Record<string, string | undefined>
): Readonly<CredentialValidationResult> {
  const env = readRuntimeEnvironment(customEnv);

  const groqStatus: CredentialStatus = env.GROQ_API_KEY ? "Configured" : "Missing";
  const nvidiaStatus: CredentialStatus = env.NVIDIA_API_KEY ? "Configured" : "Missing";
  const openaiStatus: CredentialStatus = env.OPENAI_API_KEY ? "Configured" : "Optional";
  const ollamaStatus: CredentialStatus = "Configured";

  let totalConfigured = 1; // Ollama local provider is always available
  if (groqStatus === "Configured") totalConfigured++;
  if (nvidiaStatus === "Configured") totalConfigured++;
  if (openaiStatus === "Configured") totalConfigured++;

  return deepFreeze({
    groqStatus,
    nvidiaStatus,
    openaiStatus,
    ollamaStatus,
    totalConfigured,
  });
}

/**
 * Validates the complete runtime environment and produces a secret-free EnvironmentValidationReport.
 *
 * @param customEnv Optional custom environment map.
 * @returns Deeply frozen EnvironmentValidationReport.
 */
export function validateEnvironment(
  customEnv?: Record<string, string | undefined>
): Readonly<EnvironmentValidationReport> {
  validateConfiguration(customEnv);

  const providerIds = ["groq-provider", "nvidia-provider", "openai-provider", "ollama-provider"];
  const providers = providerIds.map((id) => validateProvider(id, customEnv));
  const credentials = validateCredentials(customEnv);

  const isEnvironmentValid = credentials.totalConfigured > 0;

  return deepFreeze({
    isEnvironmentValid,
    providers,
    credentials,
    timestamp: Date.now(),
  });
}

/**
 * Legacy support function detecting provider IDs configured in environment.
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
