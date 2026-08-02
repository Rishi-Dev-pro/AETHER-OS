/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Component: CredentialInjector (`credential-injector.ts`)
 *
 * @file credential-injector.ts
 * @description Secure credential reference injection and resolution engine.
 * Injects secret-free transient references into ProviderExecutionContext payloads,
 * resolving secret payloads exclusively at provider call boundaries inside CredentialVault.
 *
 * @module @aether/provider-runtime/credential-injector
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { CredentialReferenceError } from "./credential-errors";
import type { ProviderExecutionContext } from "./contracts";
import type { CredentialReference } from "./credential-types";
import type { CredentialVault } from "./credential-vault";
import { deepFreeze, createProviderExecutionContext } from "./factories";

/**
 * Pure helper for injecting and resolving secret references at execution boundaries.
 */
export class CredentialInjector {
  /**
   * Injects an immutable CredentialReference handle into a ProviderExecutionContext.
   *
   * @param context Target ProviderExecutionContext payload.
   * @param credentialReference Secret-free CredentialReference handle.
   * @returns Deeply frozen updated ProviderExecutionContext.
   * @throws CredentialReferenceError if inputs are invalid.
   */
  public static injectCredentialReference(
    context: Readonly<ProviderExecutionContext>,
    credentialReference: Readonly<CredentialReference>
  ): Readonly<ProviderExecutionContext> {
    if (!context || !context.requestId || !context.providerId) {
      throw new CredentialReferenceError("Credential injection failed: Invalid ProviderExecutionContext.");
    }
    if (!credentialReference || !credentialReference.referenceId) {
      throw new CredentialReferenceError("Credential injection failed: Invalid CredentialReference handle.");
    }

    const updatedContext = createProviderExecutionContext({
      ...context,
      credentialReference: credentialReference.referenceId,
    });

    return deepFreeze(updatedContext);
  }

  /**
   * Resolves raw secret bytes from CredentialVault for a valid, unexpired CredentialReference handle.
   * Must only be invoked inside ephemeral driver dispatch boundaries.
   *
   * @param vault CredentialVault instance.
   * @param reference Transient CredentialReference handle.
   * @returns Deeply frozen secret dictionary.
   * @throws CredentialReferenceError if reference validation fails.
   */
  public static resolveCredentialReference(
    vault: CredentialVault,
    reference: Readonly<CredentialReference>
  ): Readonly<Record<string, string>> {
    if (!vault) {
      throw new CredentialReferenceError("Credential resolution failed: CredentialVault instance required.");
    }
    if (!this.validateCredentialReference(reference)) {
      throw new CredentialReferenceError("Credential resolution failed: Invalid or expired CredentialReference.", {
        reference,
      });
    }

    return vault.resolveSecretPayload(reference.referenceId);
  }

  /**
   * Validates structural integrity and expiration state of a CredentialReference handle.
   */
  public static validateCredentialReference(reference: Readonly<CredentialReference>): boolean {
    if (!reference || typeof reference !== "object") {
      return false;
    }
    if (!reference.referenceId || typeof reference.referenceId !== "string" || reference.referenceId.trim() === "") {
      return false;
    }
    if (!reference.credentialId || typeof reference.credentialId !== "string" || reference.credentialId.trim() === "") {
      return false;
    }
    if (reference.expiresAtMs && reference.expiresAtMs <= Date.now()) {
      return false;
    }

    return true;
  }
}
