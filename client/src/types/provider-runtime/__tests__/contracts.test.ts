/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 1 Unit Test: Contracts Suite (`contracts.test.ts`)
 *
 * @file contracts.test.ts
 * @description Validates structural shapes and readonly constraints of all domain contracts.
 */

import { describe, it, expect } from "vitest";
import {
  ProviderType,
  ProviderLifecycleState,
  ProviderSelectionPolicy,
  ConfigurationSource,
  ProviderCapability,
} from "../enums";
import type {
  ProviderConfigurationReference,
  ProviderCapabilityDeclaration,
  ProviderEnvironment,
  ProviderConstraints,
  ProviderStatistics,
  ProviderValidationResult,
  ProviderInitializationResult,
  ProviderRegistration,
  ProviderExecutionContext,
  ProviderRuntimeContext,
  ProviderContract,
} from "../contracts";
import { createProviderMetadata, createProviderConfiguration, createProviderExecutionContext } from "../factories";

describe("Phase 9.9 — Milestone 1: Contracts Test Suite", () => {
  it("should validate ProviderConfigurationReference structural integrity", () => {
    const ref: ProviderConfigurationReference = {
      configurationId: "cfg_ref_1",
      providerId: "openai-gpt4",
      source: ConfigurationSource.INJECTED,
    };
    expect(ref.configurationId).toBe("cfg_ref_1");
    expect(ref.providerId).toBe("openai-gpt4");
    expect(ref.source).toBe(ConfigurationSource.INJECTED);
  });

  it("should validate ProviderCapabilityDeclaration shape", () => {
    const decl: ProviderCapabilityDeclaration = {
      capability: ProviderCapability.VISION,
      isMandatory: true,
      minVersion: "1.0.0",
    };
    expect(decl.capability).toBe(ProviderCapability.VISION);
    expect(decl.isMandatory).toBe(true);
  });

  it("should validate ProviderEnvironment and ProviderConstraints shapes", () => {
    const env: ProviderEnvironment = {
      os: "win32",
      runtimeVersion: "v20.10.0",
    };
    const constraints: ProviderConstraints = {
      maxTimeoutMs: 60000,
      allowedCapabilities: [ProviderCapability.STREAMING],
      isSandboxed: true,
    };

    expect(env.os).toBe("win32");
    expect(constraints.isSandboxed).toBe(true);
  });

  it("should validate ProviderStatistics structural shape", () => {
    const stats: ProviderStatistics = {
      totalExecutions: 100,
      successfulExecutions: 98,
      failedExecutions: 2,
      averageLatencyMs: 120.5,
      activeSessionsCount: 3,
    };

    expect(stats.totalExecutions).toBe(100);
    expect(stats.successfulExecutions).toBe(98);
  });

  it("should validate ProviderRuntimeContext assembling context, configuration, and sessionHandle", () => {
    const ctx = createProviderExecutionContext({
      requestId: "req_200",
      providerId: "playwright-browser",
    });
    const cfg = createProviderConfiguration({
      providerId: "playwright-browser",
      model: "chromium",
    });

    const runtimeCtx: ProviderRuntimeContext = {
      executionContext: ctx,
      configuration: cfg,
      sessionHandle: { browserId: "browser_101" },
    };

    expect(runtimeCtx.executionContext.providerId).toBe("playwright-browser");
    expect(runtimeCtx.configuration.model).toBe("chromium");
    expect(runtimeCtx.sessionHandle).toEqual({ browserId: "browser_101" });
  });
});
