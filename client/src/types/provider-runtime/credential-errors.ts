/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Component: Credential Exceptions (`credential-errors.ts`)
 *
 * @file credential-errors.ts
 * @description Exception classes for CredentialVault and CredentialInjector failures.
 *
 * @module @aether/provider-runtime/credential-errors
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { CredentialError } from "./errors";

export {
  CredentialError,
  CredentialNotFoundError,
  CredentialAccessDeniedError,
  CredentialReferenceError,
} from "./errors";

/**
 * Thrown when attempting to register a duplicate credentialId in CredentialVault.
 */
export class DuplicateCredentialError extends CredentialError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_DUPLICATE_CREDENTIAL", metadata);
  }
}

/**
 * Thrown when mutation is attempted on a frozen CredentialVault.
 */
export class CredentialVaultFrozenError extends CredentialError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_VAULT_FROZEN", metadata);
  }
}

/**
 * Thrown when credential metadata or secret payloads fail validation.
 */
export class InvalidCredentialMetadataError extends CredentialError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_CREDENTIAL_METADATA", metadata);
  }
}
