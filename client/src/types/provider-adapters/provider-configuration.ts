/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 3 Component: Provider Configuration (`provider-configuration.ts`)
 *
 * @file provider-configuration.ts
 * @description Factory constructors and secret isolation verifiers for provider configurations.
 * Enforces secret isolation invariants, fail-fast validation, and recursive immutability.
 *
 * @module @aether/provider-adapters/provider-configuration
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { AuthenticationType, ProviderVendor } from "./enums";
import type { ProviderEndpointConfig, AdapterProviderConfig, AuthConfig } from "./authentication-types";
import { InvalidProviderConfigError } from "./authentication-errors";
import { deepFreeze } from "./factories";

/**
 * Common secret key patterns for enforcing secret isolation checks.
 */
const SECRET_KEY_PATTERNS = [/api[-_]?key/i, /secret/i, /bearer/i, /password/i, /token/i, /private[-_]?key/i];

/**
 * Verifies that a ProviderEndpointConfig object passes structural and URL validation.
 *
 * @param input Endpoint configuration parameters.
 * @returns Frozen ProviderEndpointConfig object.
 * @throws InvalidProviderConfigError if inputs are invalid.
 */
export function createProviderEndpointConfig(
  input: Partial<ProviderEndpointConfig>
): Readonly<ProviderEndpointConfig> {
  if (!input.baseUrl || typeof input.baseUrl !== "string" || input.baseUrl.trim() === "") {
    throw new InvalidProviderConfigError("Provider endpoint configuration requires a non-empty baseUrl.");
  }

  try {
    new URL(input.baseUrl);
  } catch {
    throw new InvalidProviderConfigError(`Invalid baseUrl format provided: '${input.baseUrl}'`);
  }

  if (!input.endpoints || typeof input.endpoints !== "object" || Object.keys(input.endpoints).length === 0) {
    throw new InvalidProviderConfigError("Provider endpoint configuration requires at least one endpoint mapping.");
  }

  const normalizedEndpoints: Record<string, string> = {};
  for (const key of Object.keys(input.endpoints)) {
    const path = input.endpoints[key];
    if (typeof path !== "string" || path.trim() === "") {
      throw new InvalidProviderConfigError(`Endpoint key '${key}' requires a non-empty path string.`);
    }
    normalizedEndpoints[key.trim()] = path.trim();
  }

  const result: ProviderEndpointConfig = {
    baseUrl: input.baseUrl.trim(),
    endpoints: normalizedEndpoints,
    defaultApiVersion: input.defaultApiVersion?.trim(),
  };

  return deepFreeze(result);
}

/**
 * Scans a ProviderAdapterConfig to guarantee zero raw secret payload leakage.
 *
 * @param config Target provider configuration.
 * @throws InvalidProviderConfigError if secret material is detected.
 */
export function verifyNoSecretsInConfig(config: AdapterProviderConfig): void {
  const scanObj = (obj: unknown, path: string) => {
    if (!obj || typeof obj !== "object") return;

    for (const [key, val] of Object.entries(obj)) {
      const fullPath = `${path}.${key}`;
      for (const pattern of SECRET_KEY_PATTERNS) {
        if (pattern.test(key)) {
          // Allow authConfig.credentialId or headerName references
          if (path.includes("authConfig") && (key === "credentialId" || key === "headerName" || key === "tokenPrefix")) {
            continue;
          }
          if (typeof val === "string" && val.length > 0) {
            throw new InvalidProviderConfigError(
              `Secret isolation violation: Config field '${fullPath}' contains sensitive key name '${key}'.`
            );
          }
        }
      }

      if (typeof val === "object") {
        scanObj(val, fullPath);
      }
    }
  };

  scanObj(config, "config");
}

/**
 * Constructs and validates an AdapterProviderConfig object.
 *
 * @param input Partial configuration properties.
 * @returns Deeply frozen AdapterProviderConfig instance.
 * @throws InvalidProviderConfigError if validation fails or secret isolation is violated.
 */
export function createAdapterProviderConfig(
  input: Partial<AdapterProviderConfig>
): Readonly<AdapterProviderConfig> {
  if (!input.providerId || typeof input.providerId !== "string" || input.providerId.trim() === "") {
    throw new InvalidProviderConfigError("Adapter provider config requires a non-empty providerId.");
  }

  if (!input.vendor || !Object.values(ProviderVendor).includes(input.vendor)) {
    throw new InvalidProviderConfigError("Adapter provider config requires a valid ProviderVendor.");
  }

  if (!input.endpointConfig) {
    throw new InvalidProviderConfigError("Adapter provider config requires endpointConfig.");
  }

  const endpointConfig = createProviderEndpointConfig(input.endpointConfig);

  const authConfig: AuthConfig = input.authConfig ?? {
    authType: AuthenticationType.NONE,
  };

  if (!Object.values(AuthenticationType).includes(authConfig.authType)) {
    throw new InvalidProviderConfigError("Adapter provider config requires a valid authType.");
  }

  const defaultTimeoutMs = input.defaultTimeoutMs ?? 30000;
  if (typeof defaultTimeoutMs !== "number" || defaultTimeoutMs <= 0) {
    throw new InvalidProviderConfigError("Adapter provider config defaultTimeoutMs must be a positive number.");
  }

  const supportedModels = input.supportedModels ?? [];
  if (!Array.isArray(supportedModels)) {
    throw new InvalidProviderConfigError("Adapter provider config supportedModels must be an array.");
  }

  const config: AdapterProviderConfig = {
    providerId: input.providerId.trim(),
    vendor: input.vendor,
    endpointConfig,
    authConfig: deepFreeze(authConfig),
    defaultTimeoutMs,
    supportedModels: deepFreeze([...supportedModels]),
    metadata: input.metadata ? deepFreeze(input.metadata) : deepFreeze({}),
  };

  verifyNoSecretsInConfig(config);

  return deepFreeze(config);
}
