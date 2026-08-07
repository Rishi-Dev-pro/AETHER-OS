/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 7 Component: Secure Credential Bootstrap (`credential-bootstrap.ts`)
 *
 * @file credential-bootstrap.ts
 * @description Application startup credential loader registering environment API keys
 * into Phase 9.9 CredentialVault securely.
 *
 * @module @aether/runtime/credential-bootstrap
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 7
 */

import type { CredentialVault } from "../types/provider-runtime";
import { readRuntimeEnvironment, type RuntimeEnvironmentVariables } from "./runtime-environment";
import { validateEnvironment, detectConfiguredProviders } from "./environment-validator";
import { DuplicateCredentialBootstrapError } from "./bootstrap-errors";

/**
 * Secret-free report summarizing application credential bootstrap results.
 */
export interface BootstrapReport {
  readonly status: "SUCCESS" | "FAILED";
  readonly configuredProviders: ReadonlyArray<string>;
  readonly registeredCredentialIds: ReadonlyArray<string>;
  readonly timestamp: number;
}

/**
 * Registers environment credentials into CredentialVault securely.
 *
 * @param vault Target CredentialVault instance.
 * @param env Runtime environment variables.
 * @returns Array of registered credential IDs.
 * @throws DuplicateCredentialBootstrapError if credential already registered.
 */
export function registerEnvironmentCredentials(
  vault: CredentialVault,
  env: Readonly<RuntimeEnvironmentVariables>
): ReadonlyArray<string> {
  const registeredIds: string[] = [];

  if (env.GROQ_API_KEY) {
    const credId = "groq-credential-id";
    if (vault.hasCredential(credId)) {
      throw new DuplicateCredentialBootstrapError(`Credential '${credId}' is already registered in CredentialVault.`);
    }
    vault.registerCredential(credId, "groq-provider", "API_KEY" as any, { apiKey: env.GROQ_API_KEY });
    registeredIds.push(credId);
  }

  if (env.NVIDIA_API_KEY) {
    const credId = "nvidia-credential-id";
    if (vault.hasCredential(credId)) {
      throw new DuplicateCredentialBootstrapError(`Credential '${credId}' is already registered in CredentialVault.`);
    }
    vault.registerCredential(credId, "nvidia-provider", "API_KEY" as any, { apiKey: env.NVIDIA_API_KEY });
    registeredIds.push(credId);
  }

  if (env.OPENAI_API_KEY) {
    const credId = "openai-credential-id";
    if (vault.hasCredential(credId)) {
      throw new DuplicateCredentialBootstrapError(`Credential '${credId}' is already registered in CredentialVault.`);
    }
    vault.registerCredential(credId, "openai-provider", "API_KEY" as any, { apiKey: env.OPENAI_API_KEY });
    registeredIds.push(credId);
  }

  return Object.freeze(registeredIds);
}

/**
 * Generates a secret-free BootstrapReport from vault and configured provider list.
 *
 * @param vault Active CredentialVault instance.
 * @param configuredProviders List of configured provider IDs.
 * @returns Frozen BootstrapReport instance.
 */
export function generateBootstrapReport(
  vault: CredentialVault,
  configuredProviders: ReadonlyArray<string>
): Readonly<BootstrapReport> {
  const registeredCredentialIds = vault.lookupCredential({}).map((c) => c.credentialId);

  const report: BootstrapReport = {
    status: "SUCCESS",
    configuredProviders,
    registeredCredentialIds,
    timestamp: 1677652288000,
  };

  return Object.freeze(report);
}

/**
 * Main production startup entry point reading environment variables, validating formats,
 * registering credentials into CredentialVault, and producing a secret-free report.
 *
 * @param vault Active CredentialVault instance.
 * @param customEnv Optional custom environment dictionary for testing.
 * @returns Secret-free BootstrapReport object.
 */
export function bootstrapCredentials(
  vault: CredentialVault,
  customEnv?: Record<string, string | undefined>
): Readonly<BootstrapReport> {
  const env = readRuntimeEnvironment(customEnv);
  validateEnvironment(env);

  const configuredProviders = detectConfiguredProviders(env);
  registerEnvironmentCredentials(vault, env);

  return generateBootstrapReport(vault, configuredProviders);
}
