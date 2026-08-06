/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 1: Foundation Barrel Export (`index.ts`)
 *
 * @file index.ts
 * @description Canonical barrel export defining public API for `@aether/provider-adapters`.
 * Re-exports enums, exception hierarchy, adapter types, contracts, capability utilities, and factory constructors.
 *
 * @module @aether/provider-adapters
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1 — RELEASE
 */

export * from "./enums";
export * from "./errors";
export * from "./adapter-types";
export * from "./contracts";
export * from "./factories";
export * from "./adapter-capabilities";
