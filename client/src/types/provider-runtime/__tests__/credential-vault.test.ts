/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Unit Test: CredentialVault Suite (`credential-vault.test.ts`)
 *
 * @file credential-vault.test.ts
 * @description Validates credential registration, reference generation, secret protection in snapshots,
 * freeze enforcement, duplicate rejection, and secret resolution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CredentialType } from "../enums";
import {
  DuplicateCredentialError,
  CredentialNotFoundError,
  CredentialVaultFrozenError,
  InvalidCredentialMetadataError,
} from "../credential-errors";
import { CredentialVault } from "../credential-vault";

describe("Phase 9.9 — Milestone 3: CredentialVault Unit Test Suite", () => {
  let vault: CredentialVault;

  beforeEach(() => {
    vault = new CredentialVault();
  });

  it("should register credentials and return secret-free CredentialReference handles", () => {
    const ref = vault.registerCredential(
      "cred_groq_api_key",
      "groq-cloud",
      CredentialType.API_KEY,
      { apiKey: "gsk_secret_12345" },
      "Groq API Key"
    );

    expect(ref.credentialId).toBe("cred_groq_api_key");
    expect(ref.providerId).toBe("groq-cloud");
    expect(ref.credentialType).toBe(CredentialType.API_KEY);
    expect(ref.referenceId).toBeDefined();
    // @ts-expect-error Ensure no raw secret is exposed on reference
    expect(ref.apiKey).toBeUndefined();
    expect(Object.isFrozen(ref)).toBe(true);
  });

  it("should reject duplicate credential registration with DuplicateCredentialError", () => {
    vault.registerCredential(
      "cred_1",
      "p1",
      CredentialType.API_KEY,
      { key: "val1" }
    );

    expect(() =>
      vault.registerCredential(
        "cred_1",
        "p1",
        CredentialType.API_KEY,
        { key: "val2" }
      )
    ).toThrow(DuplicateCredentialError);
  });

  it("should reject empty secret payloads with InvalidCredentialMetadataError", () => {
    expect(() =>
      vault.registerCredential(
        "cred_empty",
        "p1",
        CredentialType.API_KEY,
        {}
      )
    ).toThrow(InvalidCredentialMetadataError);
  });

  it("should create snapshots that contain ZERO secret values", () => {
    vault.registerCredential(
      "cred_openai",
      "openai-cloud",
      CredentialType.API_KEY,
      { apiKey: "sk-proj-secret-key-12345" }
    );

    const snapshot = vault.createSnapshot();

    expect(snapshot.credentialsCount).toBe(1);
    expect(snapshot.credentials[0].credentialId).toBe("cred_openai");
    expect(snapshot.credentials[0].providerId).toBe("openai-cloud");
    // @ts-expect-error Verify zero secret leakage in snapshot
    expect(snapshot.credentials[0].apiKey).toBeUndefined();
    // @ts-expect-error Verify zero secret leakage in snapshot
    expect(snapshot.credentials[0].secretPayload).toBeUndefined();
    expect(JSON.stringify(snapshot)).not.toContain("sk-proj-secret-key-12345");
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("should enforce freeze rules on CredentialVault", () => {
    vault.registerCredential(
      "cred_1",
      "p1",
      CredentialType.API_KEY,
      { key: "val1" }
    );
    vault.freezeVault();

    expect(vault.isFrozen()).toBe(true);

    expect(() =>
      vault.registerCredential(
        "cred_2",
        "p2",
        CredentialType.API_KEY,
        { key: "val2" }
      )
    ).toThrow(CredentialVaultFrozenError);

    expect(() => vault.unregisterCredential("cred_1")).toThrow(CredentialVaultFrozenError);
    expect(() => vault.clear()).toThrow(CredentialVaultFrozenError);
  });

  it("should resolve secret payload inside execution boundary using valid reference", () => {
    const ref = vault.registerCredential(
      "cred_secret",
      "p1",
      CredentialType.API_KEY,
      { apiKey: "top_secret_value" }
    );

    const secrets = vault.resolveSecretPayload(ref.referenceId);
    expect(secrets.apiKey).toBe("top_secret_value");
    expect(Object.isFrozen(secrets)).toBe(true);
  });

  it("should throw CredentialNotFoundError for invalid reference resolution", () => {
    expect(() => vault.resolveSecretPayload("invalid_ref")).toThrow(CredentialNotFoundError);
    expect(() => vault.getCredentialReference("missing_cred")).toThrow(CredentialNotFoundError);
  });
});
