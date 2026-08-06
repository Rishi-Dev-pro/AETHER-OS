/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 3 Component: Authentication Manager (`authentication-manager.ts`)
 *
 * @file authentication-manager.ts
 * @description Provider-independent authentication manager. Resolves credentials securely from
 * Phase 9.9 CredentialVault and generates normalized, immutable authorization headers.
 *
 * @module @aether/provider-adapters/authentication-manager
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { AuthenticationType } from "./enums";
import type { AuthConfig, AuthHeaderPayload } from "./authentication-types";
import {
  InvalidAuthConfigError,
  CredentialResolutionError,
  ExpiredCredentialError,
  HeaderInjectionError,
} from "./authentication-errors";
import { deepFreeze } from "./factories";
import { CredentialInjector } from "../provider-runtime";
import type { CredentialReference, CredentialVault } from "../provider-runtime";

/**
 * Options for generating authorization headers.
 */
export interface GenerateAuthHeadersOptions {
  readonly authConfig: AuthConfig;
  readonly vault?: CredentialVault;
  readonly credentialRef?: CredentialReference;
  readonly rawCredentials?: Record<string, string>;
}

/**
 * Generates an immutable map of authorization headers based on the provider's AuthConfig.
 *
 * @param options Authentication generation options.
 * @returns Deeply frozen AuthHeaderPayload containing header mappings.
 * @throws InvalidAuthConfigError, CredentialResolutionError, or ExpiredCredentialError on failure.
 */
export async function generateAuthHeaders(
  options: GenerateAuthHeadersOptions
): Promise<Readonly<AuthHeaderPayload>> {
  if (!options || !options.authConfig) {
    throw new InvalidAuthConfigError("Authentication header generation requires a valid authConfig.");
  }

  const { authConfig, vault, credentialRef, rawCredentials } = options;

  if (authConfig.authType === AuthenticationType.NONE) {
    return deepFreeze({ headers: {} });
  }

  let secretPayload: Record<string, string> = {};

  if (rawCredentials && Object.keys(rawCredentials).length > 0) {
    secretPayload = rawCredentials;
  } else if (credentialRef) {
    if (!CredentialInjector.validateCredentialReference(credentialRef)) {
      throw new ExpiredCredentialError(
        `Credential reference handle '${credentialRef.referenceId}' has expired or is invalid.`,
        { referenceId: credentialRef.referenceId }
      );
    }
    if (!vault) {
      throw new CredentialResolutionError(
        "CredentialVault instance is required to resolve secrets from CredentialReference."
      );
    }
    try {
      secretPayload = CredentialInjector.resolveCredentialReference(vault, credentialRef);
    } catch (err) {
      throw new CredentialResolutionError(
        `Failed to resolve credential reference handle '${credentialRef.referenceId}': ${(err as Error).message}`
      );
    }
  } else if (authConfig.credentialId && vault) {
    try {
      const ref = vault.getCredentialReference(authConfig.credentialId);
      secretPayload = CredentialInjector.resolveCredentialReference(vault, ref);
    } catch (err) {
      throw new CredentialResolutionError(
        `Failed to lookup credential for id '${authConfig.credentialId}': ${(err as Error).message}`
      );
    }
  } else {
    throw new CredentialResolutionError(
      `No valid CredentialVault, CredentialReference, or rawCredentials provided for authType '${authConfig.authType}'.`
    );
  }

  // Extract primary secret token from payload (e.g. apiKey, secretKey, bearerToken, token, key)
  const secretKey =
    Object.keys(secretPayload).find((k) => /api[-_]?key|secret|token|key|bearer|password/i.test(k)) ||
    Object.keys(secretPayload)[0];

  const rawSecret = secretPayload[secretKey];
  if (!rawSecret || typeof rawSecret !== "string" || rawSecret.trim() === "") {
    throw new HeaderInjectionError(
      `Resolved credential payload contains no valid secret string for authType '${authConfig.authType}'.`
    );
  }

  const cleanSecret = rawSecret.trim();
  const headers: Record<string, string> = {};

  switch (authConfig.authType) {
    case AuthenticationType.BEARER_TOKEN: {
      const prefix = authConfig.tokenPrefix ? authConfig.tokenPrefix.trim() : "Bearer";
      headers["authorization"] = `${prefix} ${cleanSecret}`;
      break;
    }

    case AuthenticationType.API_KEY: {
      const headerName = authConfig.headerName ? authConfig.headerName.trim().toLowerCase() : "x-api-key";
      if (headerName === "authorization") {
        const prefix = authConfig.tokenPrefix ? authConfig.tokenPrefix.trim() : "Bearer";
        headers["authorization"] = `${prefix} ${cleanSecret}`;
      } else {
        const prefix = authConfig.tokenPrefix ? `${authConfig.tokenPrefix.trim()} ` : "";
        headers[headerName] = `${prefix}${cleanSecret}`;
      }
      break;
    }

    case AuthenticationType.OAUTH2: {
      const prefix = authConfig.tokenPrefix ? authConfig.tokenPrefix.trim() : "Bearer";
      headers["authorization"] = `${prefix} ${cleanSecret}`;
      break;
    }

    case AuthenticationType.CUSTOM_HEADER: {
      if (!authConfig.headerName || authConfig.headerName.trim() === "") {
        throw new InvalidAuthConfigError("CUSTOM_HEADER authentication type requires a non-empty headerName.");
      }
      const headerName = authConfig.headerName.trim().toLowerCase();
      const prefix = authConfig.tokenPrefix ? `${authConfig.tokenPrefix.trim()} ` : "";
      headers[headerName] = `${prefix}${cleanSecret}`;
      break;
    }

    default:
      throw new InvalidAuthConfigError(`Unsupported authentication type: '${authConfig.authType}'`);
  }

  return deepFreeze({ headers: deepFreeze(headers) });
}
