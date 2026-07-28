import { describe, it, expect } from "vitest";
import { ModelTier, PriorityTier, PrivacyMode, CircuitState } from "../types";
import { createAIRequest } from "../ai-request";
import { createDefaultRuntimeConfig } from "../config";
import { createInitialSnapshot } from "../circuit-breaker";
import { createDefaultRoutingTable } from "../strategy-router";
import {
  SchedulerStage,
  createSchedulerContext,
  buildExecutionPlan,
} from "../request-scheduler";

describe("Phase 9.4 Milestone 2 End-to-End Integration Suite (integration-runtime.test.ts)", () => {
  const defaultRoutingTable = createDefaultRoutingTable();
  const defaultConfig = createDefaultRuntimeConfig();

  it("should execute complete deterministic pipeline: AIRequest → Router → Circuit Breaker → Retry → SchedulerPlan", () => {
    // Step 1: Instantiate canonical AIRequest
    const aiRequest = createAIRequest({
      requestId: "req_integ_001",
      priorityTier: PriorityTier.USER_INTERACTIVE,
      modelTier: ModelTier.STANDARD,
      privacyMode: PrivacyMode.STANDARD,
      promptPackage: {
        systemInstructions: "You are the AETHER OS kernel assistant",
        activeContext: "<context><user>Active Workspace</user></context>",
        userRequest: "Summarize recent activity logs",
        metadata: { snapshotId: "snap_integ_1", intentId: "intent_integ_1" },
      },
    });

    // Step 2: Build Scheduler Context
    const context = createSchedulerContext({
      request: aiRequest,
      routingTable: defaultRoutingTable,
      runtimeConfig: defaultConfig,
    });

    // Step 3: Execute pure scheduler pipeline
    const result = buildExecutionPlan(context);

    // Step 4: Verify complete integration pipeline output
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const plan = result.plan!;
    expect(plan.requestId).toBe("req_integ_001");
    expect(plan.selectedProviderId).toBe("gemini");
    expect(plan.concreteModel).toBe("gemini-2.5-flash");
    expect(plan.fallbackChain.length).toBe(2);
    expect(plan.fallbackChain[0].providerId).toBe("openai");

    // Retry Engine integration verification
    expect(plan.retryState.attemptNumber).toBe(1);
    expect(plan.retryState.maxAttempts).toBe(defaultConfig.retries.maxAttempts);
    expect(plan.retryState.isExhausted).toBe(false);

    // Circuit Breaker integration verification
    expect(plan.circuitSnapshot.state).toBe(CircuitState.CLOSED);

    // Pipeline stage progression verification
    expect(plan.stages.map((s) => s.stage)).toEqual([
      SchedulerStage.REQUEST_VALIDATION,
      SchedulerStage.ROUTE_PROVIDER,
      SchedulerStage.VERIFY_CIRCUIT,
      SchedulerStage.PREPARE_RETRY,
      SchedulerStage.READY_FOR_EXECUTION,
    ]);

    // Immutability verification
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.stages)).toBe(true);
    expect(Object.isFrozen(plan.fallbackChain)).toBe(true);
  });

  it("should gracefully reroute around OPEN circuits during end-to-end scheduling", () => {
    const aiRequest = createAIRequest({
      requestId: "req_integ_002",
      modelTier: ModelTier.STANDARD,
      promptPackage: {
        systemInstructions: "Test",
        activeContext: "",
        userRequest: "Test command",
        metadata: { snapshotId: "s", intentId: "i" },
      },
    });

    // Primary candidate 'gemini' has an OPEN circuit
    const openGeminiSnapshot = {
      ...createInitialSnapshot(),
      state: CircuitState.OPEN,
      consecutiveFailures: 5,
      lastFailureTimestamp: Date.now(),
    };

    const context = createSchedulerContext({
      request: aiRequest,
      routingTable: defaultRoutingTable,
      runtimeConfig: defaultConfig,
      circuitSnapshots: {
        gemini: openGeminiSnapshot,
      },
    });

    const result = buildExecutionPlan(context);

    expect(result.success).toBe(true);
    const plan = result.plan!;

    // Router skipped gemini -> selected openai
    expect(plan.selectedProviderId).toBe("openai");
    expect(plan.concreteModel).toBe("gpt-4o");
    expect(plan.routingReason).toContain("circuit_breaker_fallback (skipped gemini)");
  });

  it("should enforce LOCAL_ONLY privacy mode isolation through the entire pipeline", () => {
    const aiRequest = createAIRequest({
      requestId: "req_integ_003",
      modelTier: ModelTier.REASONING, // User asked for REASONING
      privacyMode: PrivacyMode.LOCAL_ONLY, // But requested LOCAL_ONLY privacy
      promptPackage: {
        systemInstructions: "Local helper",
        activeContext: "",
        userRequest: "Private calculation",
        metadata: { snapshotId: "s", intentId: "i" },
      },
    });

    const context = createSchedulerContext({
      request: aiRequest,
      routingTable: defaultRoutingTable,
      runtimeConfig: defaultConfig,
    });

    const result = buildExecutionPlan(context);

    expect(result.success).toBe(true);
    const plan = result.plan!;

    expect(plan.selectedProviderId).toBe("ollama");
    expect(plan.concreteModel).toBe("llama3.2:latest");
    expect(plan.routingReason).toBe("privacy_local_only");
  });

  it("should guarantee complete determinism across repeated executions", () => {
    const aiRequest = createAIRequest({
      requestId: "req_integ_004",
      modelTier: ModelTier.FAST,
      promptPackage: {
        systemInstructions: "System",
        activeContext: "",
        userRequest: "Transform text",
        metadata: { snapshotId: "s", intentId: "i" },
      },
    });

    const context = createSchedulerContext({
      request: aiRequest,
      routingTable: defaultRoutingTable,
      runtimeConfig: defaultConfig,
    });

    const result1 = buildExecutionPlan(context);
    const result2 = buildExecutionPlan(context);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    expect(result1.plan!.selectedProviderId).toBe(result2.plan!.selectedProviderId);
    expect(result1.plan!.concreteModel).toBe(result2.plan!.concreteModel);
    expect(result1.plan!.routingReason).toBe(result2.plan!.routingReason);
    expect(result1.plan!.fallbackChain).toEqual(result2.plan!.fallbackChain);
  });
});
