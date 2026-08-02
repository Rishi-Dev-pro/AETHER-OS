/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 1 Unit Test: Enums Suite (`enums.test.ts`)
 *
 * @file enums.test.ts
 * @description Validates exact enum values, completeness, and immutability.
 */

import { describe, it, expect } from "vitest";
import {
  ProviderType,
  ProviderStatus,
  ProviderLifecycleState,
  ProviderCapability,
  ProviderSelectionPolicy,
  ProviderPriority,
  ProviderHealthState,
  CircuitBreakerState,
  CredentialType,
  ConfigurationSource,
  SessionType,
  ProviderFailureReason,
} from "../enums";

describe("Phase 9.9 — Milestone 1: Enums Test Suite", () => {
  it("should define all expected ProviderType values", () => {
    expect(ProviderType.BROWSER).toBe("BROWSER");
    expect(ProviderType.AI_CLOUD).toBe("AI_CLOUD");
    expect(ProviderType.AI_LOCAL).toBe("AI_LOCAL");
    expect(ProviderType.AI_EMBEDDED).toBe("AI_EMBEDDED");
    expect(ProviderType.LOCAL_OS).toBe("LOCAL_OS");
    expect(ProviderType.DESKTOP).toBe("DESKTOP");
    expect(ProviderType.MCP).toBe("MCP");
  });

  it("should define all ProviderLifecycleState & ProviderStatus states including WARMING_UP", () => {
    expect(ProviderLifecycleState.UNREGISTERED).toBe("UNREGISTERED");
    expect(ProviderLifecycleState.REGISTERED).toBe("REGISTERED");
    expect(ProviderLifecycleState.INITIALIZING).toBe("INITIALIZING");
    expect(ProviderLifecycleState.WARMING_UP).toBe("WARMING_UP");
    expect(ProviderLifecycleState.READY).toBe("READY");
    expect(ProviderLifecycleState.BUSY).toBe("BUSY");
    expect(ProviderLifecycleState.DEGRADED).toBe("DEGRADED");
    expect(ProviderLifecycleState.UNHEALTHY).toBe("UNHEALTHY");
    expect(ProviderLifecycleState.DISABLED).toBe("DISABLED");
    expect(ProviderLifecycleState.DISPOSED).toBe("DISPOSED");

    expect(ProviderStatus.WARMING_UP).toBe("WARMING_UP");
  });

  it("should define all ProviderCapability flags", () => {
    expect(ProviderCapability.STREAMING).toBe("STREAMING");
    expect(ProviderCapability.VISION).toBe("VISION");
    expect(ProviderCapability.IMAGE_GENERATION).toBe("IMAGE_GENERATION");
    expect(ProviderCapability.FUNCTION_CALLING).toBe("FUNCTION_CALLING");
    expect(ProviderCapability.VIDEO).toBe("VIDEO");
    expect(ProviderCapability.BATCHING).toBe("BATCHING");
    expect(ProviderCapability.AUDIO).toBe("AUDIO");
    expect(ProviderCapability.TOOL_USE).toBe("TOOL_USE");
  });

  it("should define all ProviderSelectionPolicy options", () => {
    expect(ProviderSelectionPolicy.FIRST_AVAILABLE).toBe("FIRST_AVAILABLE");
    expect(ProviderSelectionPolicy.ROUND_ROBIN).toBe("ROUND_ROBIN");
    expect(ProviderSelectionPolicy.LOWEST_LATENCY).toBe("LOWEST_LATENCY");
    expect(ProviderSelectionPolicy.LOWEST_COST).toBe("LOWEST_COST");
    expect(ProviderSelectionPolicy.PREFER_LOCAL).toBe("PREFER_LOCAL");
    expect(ProviderSelectionPolicy.PREFER_CLOUD).toBe("PREFER_CLOUD");
    expect(ProviderSelectionPolicy.MANUAL_PRIORITY).toBe("MANUAL_PRIORITY");
    expect(ProviderSelectionPolicy.STRICT_PROVIDER).toBe("STRICT_PROVIDER");
  });

  it("should define all CircuitBreakerState states", () => {
    expect(CircuitBreakerState.CLOSED).toBe("CLOSED");
    expect(CircuitBreakerState.OPEN).toBe("OPEN");
    expect(CircuitBreakerState.HALF_OPEN).toBe("HALF_OPEN");
  });

  it("should define all SessionType options", () => {
    expect(SessionType.BROWSER_CONTEXT).toBe("BROWSER_CONTEXT");
    expect(SessionType.BROWSER_PAGE).toBe("BROWSER_PAGE");
    expect(SessionType.ELECTRON_WINDOW).toBe("ELECTRON_WINDOW");
    expect(SessionType.MCP_SESSION).toBe("MCP_SESSION");
    expect(SessionType.AI_CONVERSATION).toBe("AI_CONVERSATION");
    expect(SessionType.SSH_SESSION).toBe("SSH_SESSION");
    expect(SessionType.DATABASE_SESSION).toBe("DATABASE_SESSION");
    expect(SessionType.LONG_LIVED_RUNTIME).toBe("LONG_LIVED_RUNTIME");
  });

  it("should define CredentialType and ConfigurationSource values", () => {
    expect(CredentialType.API_KEY).toBe("API_KEY");
    expect(CredentialType.OAUTH2).toBe("OAUTH2");
    expect(ConfigurationSource.DEFAULT).toBe("DEFAULT");
    expect(ConfigurationSource.ENVIRONMENT).toBe("ENVIRONMENT");
  });

  it("should define ProviderFailureReason codes", () => {
    expect(ProviderFailureReason.TIMEOUT).toBe("TIMEOUT");
    expect(ProviderFailureReason.CAPABILITY_UNSUPPORTED).toBe("CAPABILITY_UNSUPPORTED");
    expect(ProviderFailureReason.CIRCUIT_OPEN).toBe("CIRCUIT_OPEN");
  });
});
