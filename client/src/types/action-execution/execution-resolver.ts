/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Deterministic Execution Resolver (`execution-resolver.ts`)
 *
 * @file execution-resolver.ts
 * @description Resolves validated SecuredExecutionPlan blueprints into immutable
 * ResolvedExecutionPlan envelopes by matching step target tools against the frozen
 * ExecutionRegistry, binding parameters, checking environmental capabilities, and injecting sandbox descriptors.
 *
 * @module @aether/action-execution/execution-resolver
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import { PermissionScope, ExecutionCapability } from "./enums";
import type {
  SecuredExecutionPlan,
  PlanStep,
} from "./contracts";
import type { ExecutionRegistryEntry } from "./registry-types";
import type { ExecutionRegistry } from "./execution-registry";
import type {
  ResolvedExecutionStep,
  ResolvedExecutionPlan,
  ExecutionDescriptor,
  ExecutionBinding,
  ExecutionEnvironment,
  ExecutionCompatibilityReport,
  ExecutionBindingResult,
} from "./resolver-types";
import {
  ExecutionResolutionError,
  ExecutionUnitResolutionError,
  ExecutionCompatibilityError,
  ParameterBindingError,
} from "./resolver-errors";
import { deepFreeze, createExecutionSandbox } from "./factories";

/**
 * Deterministic Execution Resolver implementation.
 */
export class ExecutionResolver {
  /**
   * Resolves an entire SecuredExecutionPlan blueprint into an immutable ResolvedExecutionPlan.
   *
   * @param plan - Validated input execution plan.
   * @param registry - Execution registry containing registered adapters.
   * @param environment - Optional execution environment constraints (defaults to system default).
   * @returns Readonly ResolvedExecutionPlan.
   */
  public static resolveExecutionPlan(
    plan: Readonly<SecuredExecutionPlan>,
    registry: ExecutionRegistry,
    environment?: Readonly<ExecutionEnvironment>
  ): Readonly<ResolvedExecutionPlan> {
    if (!plan || !plan.metadata || !plan.metadata.planId) {
      throw new ExecutionResolutionError("Cannot resolve execution plan: Plan metadata or planId is missing.");
    }
    if (!registry) {
      throw new ExecutionResolutionError("Cannot resolve execution plan: ExecutionRegistry reference is null.");
    }

    const activeEnv = environment ?? this.resolveExecutionEnvironment();
    const resolvedSteps: Readonly<ResolvedExecutionStep>[] = [];

    for (const step of plan.steps) {
      const resolvedStep = this.resolveExecutionStep(step, registry, activeEnv);
      resolvedSteps.push(resolvedStep);
    }

    const resolvedPlan: ResolvedExecutionPlan = {
      planId: plan.metadata.planId,
      resolvedSteps: deepFreeze(resolvedSteps),
      resolvedStages: deepFreeze([...plan.executionStages]),
      resolvedAtMs: Date.now(),
      totalStepsCount: resolvedSteps.length,
    };

    return deepFreeze(resolvedPlan);
  }

  /**
   * Resolves a single PlanStep by looking up its target tool, checking compatibility, and binding descriptors.
   */
  public static resolveExecutionStep(
    step: Readonly<PlanStep>,
    registry: ExecutionRegistry,
    environment?: Readonly<ExecutionEnvironment>
  ): Readonly<ResolvedExecutionStep> {
    if (!step || !step.stepId || !step.targetTool) {
      throw new ExecutionResolutionError("Cannot resolve step: Step definition or targetTool is missing.");
    }

    const activeEnv = environment ?? this.resolveExecutionEnvironment();

    // 1. Locate ExecutionUnit adapter in registry
    const unitEntry = this.resolveExecutionUnit(step.targetTool, registry);

    // 2. Validate environmental compatibility
    const compatReport = this.validateExecutionCompatibility(unitEntry, activeEnv);
    if (!compatReport.isCompatible) {
      throw new ExecutionCompatibilityError(
        unitEntry.unitId,
        compatReport.errors.join("; "),
        { stepId: step.stepId, targetTool: step.targetTool }
      );
    }

    // 3. Resolve execution descriptor and parameter bindings
    const descriptor = this.resolveExecutionDescriptor(step, unitEntry);

    const resolvedStep: ResolvedExecutionStep = {
      stepId: step.stepId,
      sequenceIndex: step.sequenceIndex,
      targetTool: step.targetTool,
      unitEntry,
      descriptor,
      dependencies: deepFreeze([...step.dependencies]),
      riskLevel: step.riskLevel,
    };

    return deepFreeze(resolvedStep);
  }

  /**
   * Resolves the matching registered ExecutionUnit entry supporting the target tool.
   */
  public static resolveExecutionUnit(
    targetTool: string,
    registry: ExecutionRegistry
  ): Readonly<ExecutionRegistryEntry> {
    if (!targetTool || targetTool.trim() === "") {
      throw new ExecutionUnitResolutionError("empty_tool");
    }

    const registeredUnits = registry.listExecutionUnits();
    const matchingUnit = registeredUnits.find((entry) =>
      entry.metadata.namespacedTools.includes(targetTool)
    );

    if (!matchingUnit) {
      throw new ExecutionUnitResolutionError(targetTool);
    }

    return matchingUnit;
  }

  /**
   * Resolves an immutable ExecutionDescriptor with bound parameters and step sandbox.
   */
  public static resolveExecutionDescriptor(
    step: Readonly<PlanStep>,
    unitEntry: Readonly<ExecutionRegistryEntry>
  ): Readonly<ExecutionDescriptor> {
    const bindingResult = this.bindParameters(step.parameters ?? {}, step.stepId);
    if (!bindingResult.isBound) {
      throw new ParameterBindingError(step.stepId, bindingResult.errors.join("; "));
    }

    const sandbox = createExecutionSandbox({
      sandboxId: `sb_${step.stepId}`,
      stepId: step.stepId,
      timeoutMs: step.timeoutMs || 5000,
      allowedPermissions: unitEntry.metadata.requiredPermissions,
      allowedCapabilities: unitEntry.metadata.requiredCapabilities,
    });

    const descriptor: ExecutionDescriptor = {
      descriptorId: `desc_${step.stepId}_${step.sequenceIndex}`,
      stepId: step.stepId,
      sequenceIndex: step.sequenceIndex,
      targetTool: step.targetTool,
      unitId: unitEntry.unitId,
      parameters: bindingResult.boundParameters,
      bindings: bindingResult.bindings,
      timeoutMs: step.timeoutMs || 5000,
      sandbox,
    };

    return deepFreeze(descriptor);
  }

  /**
   * Validates compatibility between an ExecutionUnit and the active ExecutionEnvironment.
   */
  public static validateExecutionCompatibility(
    unitEntry: Readonly<ExecutionRegistryEntry>,
    environment: Readonly<ExecutionEnvironment>
  ): Readonly<ExecutionCompatibilityReport> {
    const errors: string[] = [];
    const missingPermissions: PermissionScope[] = [];
    const missingCapabilities: ExecutionCapability[] = [];

    const availablePermsSet = new Set(environment.availablePermissions);
    for (const reqPerm of unitEntry.metadata.requiredPermissions) {
      if (!availablePermsSet.has(reqPerm)) {
        missingPermissions.push(reqPerm);
        errors.push(`Missing required permission: ${reqPerm}`);
      }
    }

    const activeCapSet = new Set(environment.activeCapabilities);
    for (const reqCap of unitEntry.metadata.requiredCapabilities) {
      if (!activeCapSet.has(reqCap)) {
        missingCapabilities.push(reqCap);
        errors.push(`Missing required capability: ${reqCap}`);
      }
    }

    const report: ExecutionCompatibilityReport = {
      isCompatible: errors.length === 0,
      unitId: unitEntry.unitId,
      missingCapabilities: deepFreeze(missingCapabilities),
      missingPermissions: deepFreeze(missingPermissions),
      versionMatch: true,
      errors: deepFreeze(errors),
    };

    return deepFreeze(report);
  }

  /**
   * Checks whether active capabilities satisfy all required capabilities.
   */
  public static validateExecutionCapabilities(
    requiredCapabilities: readonly ExecutionCapability[],
    activeCapabilities: readonly ExecutionCapability[]
  ): boolean {
    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true;
    }
    const activeSet = new Set(activeCapabilities);
    return requiredCapabilities.every((cap) => activeSet.has(cap));
  }

  /**
   * Resolves the system ExecutionEnvironment with default platform capabilities.
   */
  public static resolveExecutionEnvironment(
    overrides?: Partial<ExecutionEnvironment>
  ): Readonly<ExecutionEnvironment> {
    const defaultEnv: ExecutionEnvironment = {
      platform: "windows",
      isHeadless: true,
      activeCapabilities: Object.values(ExecutionCapability),
      availablePermissions: Object.values(PermissionScope),
      customEnvironment: {},
      ...overrides,
    };

    return deepFreeze(defaultEnv);
  }

  /**
   * Performs deterministic parameter binding and schema checks on a step's parameter map.
   */
  public static bindParameters(
    parameters: Readonly<Record<string, unknown>>,
    stepId: string
  ): Readonly<ExecutionBindingResult> {
    const errors: string[] = [];
    const boundParameters: Record<string, unknown> = {};
    const bindings: ExecutionBinding[] = [];
    const missingRequiredParameters: string[] = [];

    if (!parameters || typeof parameters !== "object") {
      errors.push(`Parameters for step '${stepId}' must be a non-null object.`);
      return deepFreeze({
        isBound: false,
        boundParameters: {},
        bindings: [],
        missingRequiredParameters: ["*"],
        errors,
      });
    }

    Object.entries(parameters).forEach(([key, val]) => {
      if (val === undefined) {
        missingRequiredParameters.push(key);
        errors.push(`Parameter '${key}' is undefined.`);
      } else {
        boundParameters[key] = val;
        bindings.push({
          parameterName: key,
          value: val,
          isResolved: true,
          bindingType: "STATIC",
        });
      }
    });

    const result: ExecutionBindingResult = {
      isBound: errors.length === 0,
      boundParameters: deepFreeze(boundParameters),
      bindings: deepFreeze(bindings),
      missingRequiredParameters: deepFreeze(missingRequiredParameters),
      errors: deepFreeze(errors),
    };

    return deepFreeze(result);
  }
}
