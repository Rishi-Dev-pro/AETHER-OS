/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Adapter Manager (`adapter-manager.ts`)
 *
 * @file adapter-manager.ts
 * @description Master orchestration manager for Phase 9.10 provider adapters. Provides execution,
 * translation, validation, streaming capability declaration checks, and health probes.
 *
 * @module @aether/provider-adapters/adapter-manager
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { AdapterStatus } from "./enums";
import type { ProviderAdapter } from "./contracts";
import type { TranslationRequest, TranslationResponse } from "./message-types";
import { AdapterRegistry } from "./adapter-registry";
import { AdapterConfigurationError } from "./errors";
import { translateRequest } from "./request-translator";
import { validateTranslationRequest } from "./payload-validator";
import { ProviderBase } from "./provider-base";
import type { CredentialVault, CredentialReference } from "../provider-runtime";

/**
 * Orchestrator managing execution, validation, translation, and health checks across registered AI provider adapters.
 */
export class AdapterManager {
  private readonly registry: AdapterRegistry = new AdapterRegistry();

  /**
   * Registers a concrete ProviderAdapter.
   */
  public registerAdapter(adapter: ProviderAdapter): void {
    this.registry.registerAdapter(adapter);
  }

  /**
   * Fetches a registered adapter by ID or throws if not found.
   */
  public getAdapter(adapterId: string): ProviderAdapter {
    const canonicalId = adapterId.endsWith("-provider")
      ? adapterId.replace("-provider", "-adapter")
      : adapterId;
    const adapter = this.registry.getAdapter(canonicalId);
    if (!adapter) {
      throw new AdapterConfigurationError(`Adapter '${adapterId}' is not registered in AdapterManager.`);
    }
    return adapter;
  }


  /**
   * Executes an end-to-end AI request on the target adapter.
   */
  public async execute(
    adapterId: string,
    request: TranslationRequest,
    vault?: CredentialVault,
    credentialRef?: CredentialReference
  ): Promise<Readonly<TranslationResponse>> {
    const adapter = this.getAdapter(adapterId);
    if (adapter instanceof ProviderBase) {
      return adapter.execute(request, vault, credentialRef);
    }
    throw new AdapterConfigurationError(`Adapter '${adapterId}' does not support direct pipeline execution.`);
  }



  /**
   * Translates and normalizes request attributes into a canonical TranslationRequest using request-translator.
   */
  public translate(adapterId: string, input: Partial<TranslationRequest>): Readonly<TranslationRequest> {
    this.getAdapter(adapterId); // Assert adapter registered
    return translateRequest(input);
  }

  /**
   * Validates a canonical TranslationRequest payload using payload-validator.
   */
  public validate(adapterId: string, request: TranslationRequest): void {
    this.getAdapter(adapterId); // Assert adapter registered
    validateTranslationRequest(request);
  }

  /**
   * Checks health and capability readiness of the target adapter.
   */
  public async health(adapterId: string): Promise<boolean> {
    const adapter = this.getAdapter(adapterId);
    return adapter !== undefined && adapter.status === AdapterStatus.READY;
  }

  /**
   * Returns a snapshot of registered adapters in the registry.
   */
  public listAdapters(): ReadonlyArray<ProviderAdapter> {
    return this.registry.listAdapters();
  }

  /**
   * Freezes internal registry.
   */
  public freeze(): void {
    this.registry.freezeRegistry();
  }
}
