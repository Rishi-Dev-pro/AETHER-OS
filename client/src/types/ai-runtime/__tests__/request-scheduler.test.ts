import { describe, it, expect } from "vitest";
import { ModelTier, PriorityTier, PrivacyMode, CircuitState } from "../types";
import { createAIRequest } from "../ai-request";
import { createDefaultRuntimeConfig } from "../config";
import { createInitialSnapshot } from "../circuit-breaker";
import { createInitialRetryState } from "../retry-engine";
import { createDefaultRoutingTable } from "../strategy-router";
import { ConfigurationError } from "../errors";
import {
  SchedulerStage,
  createSchedulerContext,
  validateSchedulerPlan,
  buildExecutionPlan,
  type SchedulerContext,
  type SchedulerPlan,
} from "../request-scheduler";

describe("Phase 9.4 Component 12: Request Scheduler (request-scheduler.ts)", () => {
  const mockAIRequest = createAIRequest({
    requestId: "req_sched_1001",
    priorityTier: PriorityTier.USER_INTERACTIVE,
    modelTier: ModelTier.STANDARD,
    privacyMode: PrivacyMode.STANDARD,
    promptPackage: {
      systemInstructions: "System instruction prompt",
      activeContext: "",
      userRequest: "Execute user command",
      metadata: { snapshotId: "snap_101", intentId: "intent_202" },
    },
  });

  const defaultRoutingTable = createDefaultRoutingTable();
  const defaultConfig = createDefaultRuntimeConfig();

  describe("SchedulerStage Enum Integrity", () => {
    it("should contain all 5 mandatory scheduling stages", () => {
      expect(SchedulerStage.REQUEST_VALIDATION).toBe("REQUEST_VALIDATION");
      expect(SchedulerStage.ROUTE_PROVIDER).toBe("ROUTE_PROVIDER");
      expect(SchedulerStage.VERIFY_CIRCUIT).toBe("VERIFY_CIRCUIT");
      expect(SchedulerStage.PREPARE_RETRY).toBe("PREPARE_RETRY");
      expect(SchedulerStage.READY_FOR_EXECUTION).toBe("READY_FOR_EXECUTION");
    });
  });

  describe("SchedulerContext Factory & Validation", () => {
    it("should create a valid SchedulerContext with defaults", () => {
      const ctx = createSchedulerContext({
        request: mockAIRequest,
        routingTable: defaultRoutingTable,
        runtimeConfig: defaultConfig,
      });

      expect(ctx.request.metadata.requestId).toBe("req_sched_1001");
      expect(ctx.circuitSnapshots).toEqual({});
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it("should throw ConfigurationError if any required property is missing", () => {
      expect(() => {
        createSchedulerContext({
          request: null as unknown as typeof mockAIRequest,
          routingTable: defaultRoutingTable,
          runtimeConfig: defaultConfig,
        });
      }).toThrow("SchedulerContext requires a valid AIRequest instance.");

      expect(() => {
        createSchedulerContext({
          request: mockAIRequest,
          routingTable: null as unknown as typeof defaultRoutingTable,
          runtimeConfig: defaultConfig,
        });
      }).toThrow("SchedulerContext requires a valid RoutingTable instance.");

      expect(() => {
        createSchedulerContext({
          request: mockAIRequest,
          routingTable: defaultRoutingTable,
          runtimeConfig: null as unknown as typeof defaultConfig,
        });
      }).toThrow("SchedulerContext requires a valid AIRuntimeConfig instance.");
    });
  });

  describe("SchedulerPlan Validation (validateSchedulerPlan)", () => {
    it("should validate a complete, valid SchedulerPlan", () => {
      const validPlan: SchedulerPlan = {
        requestId: "req_sched_1001",
        selectedProviderId: "gemini",
        concreteModel: "gemini-2.5-flash",
        fallbackChain: [],
        retryState: createInitialRetryState(defaultConfig.retries),
        circuitSnapshot: createInitialSnapshot(),
        stages: [
          { stage: SchedulerStage.REQUEST_VALIDATION, description: "Valid", timestamp: Date.now() },
          { stage: SchedulerStage.READY_FOR_EXECUTION, description: "Ready", timestamp: Date.now() },
        ],
        routingReason: "default_primary",
        isReady: true,
        timestamp: Date.now(),
      };

      expect(() => validateSchedulerPlan(validPlan)).not.toThrow();
    });

    it("should throw ConfigurationError if plan is missing mandatory fields or isReady is false", () => {
      expect(() => {
        validateSchedulerPlan(null as unknown as SchedulerPlan);
      }).toThrow(ConfigurationError);

      const invalidPlan: SchedulerPlan = {
        requestId: "",
        selectedProviderId: "gemini",
        concreteModel: "gemini-2.5-flash",
        fallbackChain: [],
        retryState: createInitialRetryState(defaultConfig.retries),
        circuitSnapshot: createInitialSnapshot(),
        stages: [],
        routingReason: "default_primary",
        isReady: false,
        timestamp: Date.now(),
      };

      expect(() => validateSchedulerPlan(invalidPlan)).toThrow("SchedulerPlan requires a non-empty requestId string.");
    });
  });

  describe("Pure Execution Plan Pipeline (buildExecutionPlan)", () => {
    it("should construct a valid SchedulerPlan progressing across all 5 stages", () => {
      const ctx = createSchedulerContext({
        request: mockAIRequest,
        routingTable: defaultRoutingTable,
        runtimeConfig: defaultConfig,
      });

      const result = buildExecutionPlan(ctx);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.error).toBeUndefined();

      const plan = result.plan!;
      expect(plan.requestId).toBe("req_sched_1001");
      expect(plan.selectedProviderId).toBe("gemini");
      expect(plan.concreteModel).toBe("gemini-2.5-flash");
      expect(plan.fallbackChain.length).toBe(2);
      expect(plan.retryState.maxAttempts).toBe(3);
      expect(plan.isReady).toBe(true);
      expect(Object.isFrozen(plan)).toBe(true);

      // Verify stage ordering
      expect(plan.stages.length).toBe(5);
      expect(plan.stages[0].stage).toBe(SchedulerStage.REQUEST_VALIDATION);
      expect(plan.stages[1].stage).toBe(SchedulerStage.ROUTE_PROVIDER);
      expect(plan.stages[2].stage).toBe(SchedulerStage.VERIFY_CIRCUIT);
      expect(plan.stages[3].stage).toBe(SchedulerStage.PREPARE_RETRY);
      expect(plan.stages[4].stage).toBe(SchedulerStage.READY_FOR_EXECUTION);
    });

    it("should fail scheduling with ConfigurationError if target provider circuit breaker is OPEN", () => {
      const openSnapshot = {
        ...createInitialSnapshot(),
        state: CircuitState.OPEN,
        consecutiveFailures: 5,
        lastFailureTimestamp: Date.now(), // Recent failure -> OPEN
      };

      const ctx = createSchedulerContext({
        request: mockAIRequest,
        routingTable: defaultRoutingTable,
        runtimeConfig: defaultConfig,
        circuitSnapshots: {
          gemini: openSnapshot, // Primary gemini is OPEN
          openai: openSnapshot, // Fallback openai is OPEN
          claude: openSnapshot, // Fallback claude is OPEN
        },
      });

      const result = buildExecutionPlan(ctx);

      expect(result.success).toBe(false);
      expect(result.plan).toBeUndefined();
      expect(result.error).toBeInstanceOf(ConfigurationError);
      expect(result.error?.subCode).toBe("NoEligibleProviderFound");
    });
  });
});
