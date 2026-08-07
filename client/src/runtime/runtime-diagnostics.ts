/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 1 Component: Runtime Diagnostics Engine (`runtime-diagnostics.ts`)
 *
 * @file runtime-diagnostics.ts
 * @description Generates secret-free, immutable runtime diagnostic reports and health summaries.
 *
 * @module @aether/runtime/runtime-diagnostics
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 1
 */

import type { UnifiedAdapterRuntime } from "../types/provider-adapters/unified-adapter-runtime";
import type { EnvironmentValidationReport } from "./runtime-environment";
import { getStatus, RuntimeStatus } from "./runtime-status";

/**
 * Secret-free status summary of a single provider.
 */
export interface ProviderStatusReport {
  readonly providerId: string;
  readonly adapterId: string;
  readonly vendor: string;
  readonly isHealthy: boolean;
  readonly hasCredentialRegistered: boolean;
  readonly isRuntimeReady: boolean;
}

/**
 * Secret-free overall runtime health summary.
 */
export interface RuntimeHealthSummary {
  readonly isRuntimeHealthy: boolean;
  readonly activeStatus: RuntimeStatus;
  readonly totalRegisteredAdapters: number;
  readonly healthyAdaptersCount: number;
  readonly readyAdaptersCount: number;
}

/**
 * Secret-free high-level runtime summary report.
 */
export interface RuntimeSummaryReport {
  readonly isInitialized: boolean;
  readonly status: RuntimeStatus;
  readonly adaptersRegistered: number;
  readonly providersAvailable: number;
  readonly providersConfigured: number;
  readonly providersMissingCredentials: number;
  readonly isHealthy: boolean;
  readonly timestamp: number;
}

/**
 * Comprehensive secret-free runtime diagnostics package.
 */
export interface RuntimeDiagnosticsReport {
  readonly summary: RuntimeSummaryReport;
  readonly health: RuntimeHealthSummary;
  readonly providerStatuses: ReadonlyArray<ProviderStatusReport>;
  readonly timestamp: number;
}

/**
 * Helper to deeply freeze objects recursively.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Generates status reports for all registered concrete provider adapters.
 *
 * @param runtime Active UnifiedAdapterRuntime instance.
 * @returns Array of secret-free ProviderStatusReport objects.
 */
export function providerStatus(
  runtime: UnifiedAdapterRuntime
): ReadonlyArray<ProviderStatusReport> {
  const diagnostics = runtime.diagnostics();

  const reports: ProviderStatusReport[] = diagnostics.map((diag) => ({
    providerId: diag.providerId,
    adapterId: diag.adapterId,
    vendor: String(diag.vendor),
    isHealthy: diag.isHealthy,
    hasCredentialRegistered: diag.hasCredentialRegistered,
    isRuntimeReady: diag.isRuntimeReady,
  }));

  return deepFreeze(reports);
}

/**
 * Generates overall runtime health metrics.
 *
 * @param runtime Active UnifiedAdapterRuntime instance.
 * @returns Secret-free RuntimeHealthSummary object.
 */
export function runtimeHealth(
  runtime: UnifiedAdapterRuntime
): Readonly<RuntimeHealthSummary> {
  const statuses = providerStatus(runtime);
  const totalRegisteredAdapters = statuses.length;
  const healthyAdaptersCount = statuses.filter((s) => s.isHealthy).length;
  const readyAdaptersCount = statuses.filter((s) => s.isRuntimeReady).length;
  const isRuntimeHealthy = getStatus() === RuntimeStatus.READY && readyAdaptersCount > 0;

  return deepFreeze({
    isRuntimeHealthy,
    activeStatus: getStatus(),
    totalRegisteredAdapters,
    healthyAdaptersCount,
    readyAdaptersCount,
  });
}

/**
 * Generates high-level runtime summary report.
 *
 * @param runtime Active UnifiedAdapterRuntime instance.
 * @param envReport EnvironmentValidationReport instance.
 * @returns Secret-free RuntimeSummaryReport object.
 */
export function runtimeSummary(
  runtime: UnifiedAdapterRuntime,
  envReport: EnvironmentValidationReport
): Readonly<RuntimeSummaryReport> {
  const health = runtimeHealth(runtime);
  const statuses = providerStatus(runtime);

  const adaptersRegistered = statuses.length;
  const providersAvailable = envReport.providers.filter((p) => p.isReady).length;
  const providersConfigured = envReport.credentials.totalConfigured;
  const providersMissingCredentials = envReport.providers.filter(
    (p) => p.requiresAuth && p.status === "Missing"
  ).length;

  return deepFreeze({
    isInitialized: getStatus() === RuntimeStatus.READY,
    status: getStatus(),
    adaptersRegistered,
    providersAvailable,
    providersConfigured,
    providersMissingCredentials,
    isHealthy: health.isRuntimeHealthy,
    timestamp: Date.now(),
  });
}

/**
 * Creates a complete secret-free RuntimeDiagnosticsReport.
 *
 * @param runtime Active UnifiedAdapterRuntime instance.
 * @param envReport EnvironmentValidationReport instance.
 * @returns Deeply frozen RuntimeDiagnosticsReport object.
 */
export function createDiagnostics(
  runtime: UnifiedAdapterRuntime,
  envReport: EnvironmentValidationReport
): Readonly<RuntimeDiagnosticsReport> {
  const summary = runtimeSummary(runtime, envReport);
  const health = runtimeHealth(runtime);
  const providerStatuses = providerStatus(runtime);

  return deepFreeze({
    summary,
    health,
    providerStatuses,
    timestamp: Date.now(),
  });
}
