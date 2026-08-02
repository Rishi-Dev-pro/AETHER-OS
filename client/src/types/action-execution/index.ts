/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Canonical Barrel Module Export (`index.ts`)
 *
 * @file index.ts
 * @description Single canonical entry point exporting all domain contracts, enums,
 * errors, factory constructors, ExecutionBoundaryValidator, ExecutionRegistry,
 * Adapter Contracts, and ExecutionResolver for `@aether/action-execution`.
 *
 * @module @aether/action-execution
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 6
 */

export * from "./enums";
export * from "./errors";
export * from "./contracts";
export * from "./factories";
export * from "./boundary-validator";
export * from "./registry-errors";
export * from "./registry-types";
export * from "./execution-registry";
export * from "./resolver-errors";
export * from "./resolver-types";
export * from "./adapter-contracts";
export * from "./execution-resolver";
export * from "./engine-types";
export * from "./engine-errors";
export * from "./lifecycle-controller";
export * from "./stage-dispatcher";
export * from "./worker-dispatcher";
export * from "./timeout-manager";
export * from "./execution-engine";
export * from "./result-types";
export * from "./result-errors";
export * from "./result-aggregator";
export * from "./cleanup-manager";
export * from "./result-validator";
export * from "./execution-manager-types";
export * from "./execution-manager";



