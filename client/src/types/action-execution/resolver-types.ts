/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Execution Resolver Domain Contracts (`resolver-types.ts`)
 *
 * @file resolver-types.ts
 * @description Immutable data contracts and readonly interfaces for Execution Resolver
 * outputs, parameter bindings, environment descriptors, and resolution reports.
 *
 * @module @aether/action-execution/resolver-types
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import type { ExecutionCapability, PermissionScope } from "./enums";
import type { ExecutionSandbox, ExecutionBoundary, PlanDependency } from "./contracts";
import type { ExecutionRegistryEntry } from "./registry-types";
import type { RiskLevel } from "../action-planner/enums";

/**
 * Resolved parameter binding linking a step input parameter to a static value or prior step dependency.
 */
export interface ExecutionBinding {
  readonly parameterName: string;
  readonly value: unknown;
  readonly sourceStepId?: string;
  readonly isResolved: boolean;
  readonly bindingType: "STATIC" | "RUNTIME_DEPENDENCY" | "DEFAULT";
}

/**
 * Immutable execution descriptor containing bound inputs and sandbox context ready for worker dispatch.
 */
export interface ExecutionDescriptor {
  readonly descriptorId: string;
  readonly stepId: string;
  readonly sequenceIndex: number;
  readonly targetTool: string;
  readonly unitId: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly bindings: readonly Readonly<ExecutionBinding>[];
  readonly timeoutMs: number;
  readonly sandbox: Readonly<ExecutionSandbox>;
}

/**
 * Completely resolved execution step pair containing registry entry and execution descriptor.
 */
export interface ResolvedExecutionStep {
  readonly stepId: string;
  readonly sequenceIndex: number;
  readonly targetTool: string;
  readonly unitEntry: Readonly<ExecutionRegistryEntry>;
  readonly descriptor: Readonly<ExecutionDescriptor>;
  readonly dependencies: readonly Readonly<PlanDependency>[];
  readonly riskLevel: RiskLevel;
}

/**
 * Master resolved plan containing all resolved step descriptors and stage topologies.
 */
export interface ResolvedExecutionPlan {
  readonly planId: string;
  readonly resolvedSteps: readonly Readonly<ResolvedExecutionStep>[];
  readonly resolvedStages: readonly Readonly<{
    readonly stageIndex: number;
    readonly stepIds: readonly string[];
  }>[];
  readonly resolvedAtMs: number;
  readonly totalStepsCount: number;
}

/**
 * Runtime execution environment capabilities and system platform constraints.
 */
export interface ExecutionEnvironment {
  readonly platform: "windows" | "posix" | "darwin" | "browser" | "unknown";
  readonly nodeVersion?: string;
  readonly isHeadless: boolean;
  readonly activeCapabilities: readonly ExecutionCapability[];
  readonly availablePermissions: readonly PermissionScope[];
  readonly customEnvironment?: Readonly<Record<string, unknown>>;
}

/**
 * Compatibility validation report matching an ExecutionUnit to an ExecutionEnvironment.
 */
export interface ExecutionCompatibilityReport {
  readonly isCompatible: boolean;
  readonly unitId: string;
  readonly missingCapabilities: readonly ExecutionCapability[];
  readonly missingPermissions: readonly PermissionScope[];
  readonly versionMatch: boolean;
  readonly errors: readonly string[];
}

/**
 * Summary report of an ExecutionPlan resolution attempt.
 */
export interface ExecutionResolutionReport {
  readonly planId: string;
  readonly isResolved: boolean;
  readonly resolvedStepsCount: number;
  readonly unresolvedStepsCount: number;
  readonly errors: readonly string[];
  readonly resolvedAtMs: number;
}

/**
 * Resolution context passed during plan resolution.
 */
export interface ExecutionResolutionContext {
  readonly planId: string;
  readonly registrySnapshot: readonly Readonly<ExecutionRegistryEntry>[];
  readonly environment: Readonly<ExecutionEnvironment>;
  readonly boundary?: Readonly<ExecutionBoundary>;
  readonly customContext?: Readonly<Record<string, unknown>>;
}

/**
 * Result of parameter schema validation and parameter binding resolution.
 */
export interface ExecutionBindingResult {
  readonly isBound: boolean;
  readonly boundParameters: Readonly<Record<string, unknown>>;
  readonly bindings: readonly Readonly<ExecutionBinding>[];
  readonly missingRequiredParameters: readonly string[];
  readonly errors: readonly string[];
}
