/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Canonical Barrel Export (`index.ts`)
 *
 * @file index.ts
 * @description Canonical barrel export defining public API for `@aether/provider-adapters`.
 * Re-exports enums, exception hierarchy, adapter types, contracts, capability utilities, factory constructors,
 * transport types, transport errors, request builder, response parser, retry policy, timeout controller, and HTTP client.
 *
 * @module @aether/provider-adapters
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2 — RELEASE
 */

export * from "./enums";
export * from "./errors";
export * from "./adapter-types";
export * from "./contracts";
export * from "./factories";
export * from "./adapter-capabilities";
export * from "./transport-types";
export * from "./transport-errors";
export * from "./request-builder";
export * from "./response-parser";
export * from "./retry-policy";
export * from "./timeout-controller";
export * from "./http-client";
