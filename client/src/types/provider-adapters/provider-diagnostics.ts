/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 6 Component: Provider Diagnostics (`provider-diagnostics.ts`)
 *
 * @file provider-diagnostics.ts
 * @description Provider diagnostics utility evaluating health status, credential readiness,
 * model capabilities, and operational status without exposing secret material.
 *
 * @module @aether/provider-adapters/provider-diagnostics
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import { AdapterStatus, AuthenticationType } from "./enums";
import type { ProviderAdapter } from "./contracts";
import type { ProviderDiagnosticsReport } from "./runtime-types";
import { ProviderDiagnosticsError } from "./runtime-errors";
import type { CredentialVault } from "../provider-runtime";
import { ProviderBase } from "./provider-base";
import { deepFreeze } from "./factories";

/**
 * Generates a comprehensive, secret-free diagnostic report for a ProviderAdapter instance.
 *
 * @param adapter Target ProviderAdapter.
 * @param vault Optional CredentialVault for secret presence check.
 * @returns Deeply frozen ProviderDiagnosticsReport object.
 * @throws ProviderDiagnosticsError if adapter is null or invalid.
 */
export function diagnoseProvider(
  adapter: ProviderAdapter,
  vault?: CredentialVault
): Readonly<ProviderDiagnosticsReport> {
  if (!adapter || !adapter.identity) {
    throw new ProviderDiagnosticsError("Cannot generate diagnostics for null or invalid adapter.");
  }

  let providerConfig: any;
  if (adapter instanceof ProviderBase) {
    providerConfig = adapter.providerConfig;
  }

  const authType: AuthenticationType = providerConfig?.authConfig?.authType ?? AuthenticationType.NONE;
  const credentialId: string | undefined = providerConfig?.authConfig?.credentialId;

  let hasCredentialRegistered = false;
  if (authType === AuthenticationType.NONE) {
    hasCredentialRegistered = true;
  } else if (vault && credentialId) {
    hasCredentialRegistered = vault.hasCredential(credentialId);
  }

  const isHealthy = adapter.status === AdapterStatus.READY;
  const isRuntimeReady = isHealthy && hasCredentialRegistered;

  const supportedModels: string[] = providerConfig?.supportedModels ? [...providerConfig.supportedModels] : [];

  const report: ProviderDiagnosticsReport = {
    providerId: providerConfig?.providerId || adapter.identity.adapterId,
    adapterId: adapter.identity.adapterId,
    vendor: adapter.identity.vendor,
    status: adapter.status,
    supportedModels,
    capabilities: (adapter as any).capabilities ?? {},
    authType,
    hasCredentialRegistered,
    isHealthy,
    isRuntimeReady,
    timestamp: 1677652288000,
  };

  return deepFreeze(report);
}
