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
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
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
