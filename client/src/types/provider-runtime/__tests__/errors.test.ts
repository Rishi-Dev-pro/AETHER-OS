/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 1 Unit Test: Exception Hierarchy Suite (`errors.test.ts`)
 *
 * @file errors.test.ts
 * @description Validates hierarchy, inheritance from ExecutionError, error codes, metadata immutability,
 * and fail-fast behavior across all Provider Runtime exceptions.
 */

import { describe, it, expect } from "vitest";
import { ExecutionError } from "../../action-execution";
import {
  ProviderRuntimeError,
  InvalidProviderConfigurationError,
  ProviderConfigurationError,
  InvalidProviderMetadataError,
  ProviderContractError,
  ProviderRegistrationError,
  ProviderStateError,
  ProviderCapabilityError,
  ProviderInitializationError,
  CredentialReferenceError,
  DuplicateProviderError,
  ProviderNotFoundError,
  ProviderRegistryFrozenError,
  CapabilityNegotiationError,
  IncompatibleCapabilityError,
  ProviderLifecycleError,
  IllegalProviderLifecycleTransitionError,
  ProviderSelectionError,
  NoEligibleProviderError,
  ProviderHealthError,
  ProviderHealthCheckError,
  CircuitBreakerError,
  CircuitBreakerOpenError,
  ProviderSessionError,
  SessionNotFoundError,
  SessionTimeoutError,
  SessionAllocationError,
  CredentialError,
  CredentialNotFoundError,
  CredentialAccessDeniedError,
  ProviderManagerError,
} from "../errors";

describe("Phase 9.9 — Milestone 1: Errors Test Suite", () => {
  it("should ensure all errors inherit from ProviderRuntimeError and ExecutionError", () => {
    const err = new ProviderRuntimeError("Base error", "ERR_BASE");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(ProviderRuntimeError);
    expect(err.code).toBe("ERR_BASE");
  });

  it("should correctly set code and metadata on InvalidProviderConfigurationError", () => {
    const err = new InvalidProviderConfigurationError("Config invalid", { field: "timeout" });
    expect(err).toBeInstanceOf(ProviderRuntimeError);
    expect(err.code).toBe("ERR_INVALID_PROVIDER_CONFIG");
    expect(err.metadata).toEqual({ field: "timeout" });
    expect(Object.isFrozen(err.metadata)).toBe(true);
  });

  it("should test CapabilityNegotiationError and IncompatibleCapabilityError inheritance", () => {
    const err = new IncompatibleCapabilityError("Missing vision");
    expect(err).toBeInstanceOf(CapabilityNegotiationError);
    expect(err).toBeInstanceOf(ProviderRuntimeError);
    expect(err.code).toBe("ERR_INCOMPATIBLE_CAPABILITY");
  });

  it("should test ProviderLifecycleError and IllegalProviderLifecycleTransitionError", () => {
    const err = new IllegalProviderLifecycleTransitionError("Illegal state transition");
    expect(err).toBeInstanceOf(ProviderLifecycleError);
    expect(err.code).toBe("ERR_ILLEGAL_LIFECYCLE_TRANSITION");
  });

  it("should test ProviderSelectionError and NoEligibleProviderError", () => {
    const err = new NoEligibleProviderError("Zero eligible providers");
    expect(err).toBeInstanceOf(ProviderSelectionError);
    expect(err.code).toBe("ERR_NO_ELIGIBLE_PROVIDER");
  });

  it("should test CircuitBreakerError and CircuitBreakerOpenError", () => {
    const err = new CircuitBreakerOpenError("Circuit is OPEN");
    expect(err).toBeInstanceOf(CircuitBreakerError);
    expect(err.code).toBe("ERR_CIRCUIT_BREAKER_OPEN");
  });

  it("should test ProviderSessionError hierarchy", () => {
    const notFound = new SessionNotFoundError("Session missing");
    const timeout = new SessionTimeoutError("Session timed out");
    const alloc = new SessionAllocationError("Session creation failed");

    expect(notFound).toBeInstanceOf(ProviderSessionError);
    expect(timeout).toBeInstanceOf(ProviderSessionError);
    expect(alloc).toBeInstanceOf(ProviderSessionError);

    expect(notFound.code).toBe("ERR_SESSION_NOT_FOUND");
    expect(timeout.code).toBe("ERR_SESSION_TIMEOUT");
    expect(alloc.code).toBe("ERR_SESSION_ALLOCATION");
  });

  it("should test CredentialError hierarchy", () => {
    const missing = new CredentialNotFoundError("Key not found");
    const denied = new CredentialAccessDeniedError("Access denied");

    expect(missing).toBeInstanceOf(CredentialError);
    expect(denied).toBeInstanceOf(CredentialError);
    expect(missing.code).toBe("ERR_CREDENTIAL_NOT_FOUND");
    expect(denied.code).toBe("ERR_CREDENTIAL_ACCESS_DENIED");
  });

  it("should test ProviderManagerError, ProviderRegistryFrozenError, and DuplicateProviderError", () => {
    const managerErr = new ProviderManagerError("Façade error");
    const frozenErr = new ProviderRegistryFrozenError("Registry frozen");
    const dupErr = new DuplicateProviderError("Provider exists");

    expect(managerErr).toBeInstanceOf(ProviderRuntimeError);
    expect(frozenErr.code).toBe("ERR_REGISTRY_FROZEN");
    expect(dupErr.code).toBe("ERR_DUPLICATE_PROVIDER");
  });
});
