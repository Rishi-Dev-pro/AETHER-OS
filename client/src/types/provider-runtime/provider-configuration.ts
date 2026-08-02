/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Foundation Component: ProviderConfiguration (`provider-configuration.ts`)
 *
 * @file provider-configuration.ts
 * @description Strongly-typed, deeply immutable configuration contracts and secret verification rules.
 * ProviderConfiguration owns non-secret runtime parameters (model, timeout, temperature, maxTokens,
 * baseURL/endpoint, proxy, region, retries, headers, customSettings).
 * It MUST NOT contain secrets (API keys, OAuth tokens, JWTs, certificates).
 *
 * @module @aether/provider-runtime/provider-configuration
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import { ConfigurationSource } from "./enums";
import { InvalidProviderConfigurationError } from "./errors";

/**
 * Immutable non-secret provider configuration contract.
 */
export interface ProviderConfiguration {
  readonly configurationId: string;
  readonly providerId: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly baseURL?: string;
  readonly endpoint?: string;
  readonly proxy?: string;
  readonly region?: string;
  readonly retries?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly customSettings?: Readonly<Record<string, unknown>>;
  readonly source: ConfigurationSource;
}

/**
 * Pattern matching secret key names that must NOT appear in ProviderConfiguration.
 */
const SECRET_KEY_PATTERN = /(?:api_?key|secret|password|bearer|jwt|private_?key|cert|client_?secret|auth_?token|access_?token|oauth_?token|secret_?token)/i;

/**
 * Set of allowed non-secret property names that contain words like "token" (e.g. token limits).
 */
const ALLOWED_NON_SECRET_KEYS = new Set([
  "maxtokens",
  "max_tokens",
  "maximumtokens",
  "maximum_tokens",
  "tokenlimit",
  "token_limit",
  "contextwindowtokens",
]);

/**
 * Verifies that a configuration dictionary contains no secret properties or secret key patterns.
 * Throws InvalidProviderConfigurationError immediately if secrets are detected.
 *
 * @param obj Configuration dictionary or custom runtime settings.
 * @throws InvalidProviderConfigurationError if any secret pattern is found.
 */
export function verifyNoSecrets(obj: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase();

    if (!ALLOWED_NON_SECRET_KEYS.has(normalizedKey)) {
      if (SECRET_KEY_PATTERN.test(key) || normalizedKey === "auth" || normalizedKey === "token") {
        throw new InvalidProviderConfigurationError(
          `Secret property '${key}' is strictly forbidden in ProviderConfiguration. Secrets belong exclusively to CredentialVault.`,
          { forbiddenKey: key }
        );
      }
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      verifyNoSecrets(value as Record<string, unknown>);
    }
  }
}
