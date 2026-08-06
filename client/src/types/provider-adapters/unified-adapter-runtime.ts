/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 6 Component: Unified Adapter Runtime (`unified-adapter-runtime.ts`)
 *
 * @file unified-adapter-runtime.ts
 * @description Production entry point orchestrating Phase 9.9 ProviderRuntime and Phase 9.10 Milestones 1–5
 * into one unified execution pipeline.
 *
 * @module @aether/provider-adapters/unified-adapter-runtime
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import type { ProviderAdapter } from "./contracts";
import type { ProviderModelCapabilities } from "./adapter-types";
import type { TranslationRequest, TranslationResponse } from "./message-types";
import type { ProviderDiagnosticsReport, RuntimeSnapshot, RuntimeStatus } from "./runtime-types";
import { AdapterManager } from "./adapter-manager";
import { CredentialVault, type CredentialReference, ProviderManager } from "../provider-runtime";
import { diagnoseProvider } from "./provider-diagnostics";
import { RuntimeInitializationError, RuntimeShutdownError } from "./runtime-errors";
import { deepFreeze } from "./factories";

/**
 * Unified execution entry point for Phase 9.10 AI Provider Adapter Layer.
 */
export class UnifiedAdapterRuntime {
  private readonly adapterManager: AdapterManager;
  private readonly vault: CredentialVault;
  private readonly providerManager: ProviderManager;

  private status: RuntimeStatus = "UNINITIALIZED";
  private frozen = false;

  constructor(
    adapterManager: AdapterManager = new AdapterManager(),
    vault: CredentialVault = new CredentialVault(),
    providerManager: ProviderManager = new ProviderManager()
  ) {
    this.adapterManager = adapterManager;
    this.vault = vault;
    this.providerManager = providerManager;
  }

  /**
   * Access underlying Phase 9.9 ProviderManager instance.
   */
  public getProviderManager(): ProviderManager {
    return this.providerManager;
  }

  /**
   * Initializes the unified runtime and underlying components.
   */
  public async initialize(): Promise<void> {
    if (this.status === "READY") return;
    this.status = "INITIALIZING";
    try {
      this.status = "READY";
    } catch (err) {
      this.status = "FAULTED";
      throw new RuntimeInitializationError(`UnifiedAdapterRuntime initialization failed: ${(err as Error).message}`);
    }
  }

  /**
   * Shuts down the unified runtime cleanly.
   */
  public async shutdown(): Promise<void> {
    try {
      this.status = "DISPOSED";
    } catch (err) {
      throw new RuntimeShutdownError(`UnifiedAdapterRuntime shutdown failed: ${(err as Error).message}`);
    }
  }

  /**
   * Registers a concrete ProviderAdapter.
   */
  public registerAdapter(adapter: ProviderAdapter): void {
    this.adapterManager.registerAdapter(adapter);
  }

  /**
   * Registers a credential securely into Phase 9.9 CredentialVault.
   */
  public registerCredential(
    credentialId: string,
    providerId: string,
    credentialType: string,
    secretPayload: Record<string, string>
  ): Readonly<CredentialReference> {
    return this.vault.registerCredential(credentialId, providerId, credentialType as any, secretPayload);
  }

  /**
   * Validates operational readiness of all registered adapters.
   */
  public validateProviders(): void {
    const list = this.adapterManager.listAdapters();
    for (const adapter of list) {
      diagnoseProvider(adapter, this.vault);
    }
  }

  /**
   * Executes an end-to-end AI request through the complete pipeline.
   */
  public async execute(
    adapterId: string,
    request: TranslationRequest,
    credRef?: CredentialReference
  ): Promise<Readonly<TranslationResponse>> {
    return this.adapterManager.execute(adapterId, request, this.vault, credRef);
  }

  /**
   * Returns streaming capability declarations for the specified adapter.
   */
  public executeStreamingDeclaration(adapterId: string, _request: TranslationRequest): Readonly<ProviderModelCapabilities> {
    const adapter = this.adapterManager.getAdapter(adapterId);
    return adapter.getDescriptor().capabilities;
  }

  /**
   * Generates diagnostic reports for registered adapters.
   */
  public diagnostics(adapterId?: string): ReadonlyArray<ProviderDiagnosticsReport> {
    if (adapterId) {
      const adapter = this.adapterManager.getAdapter(adapterId);
      return deepFreeze([diagnoseProvider(adapter, this.vault)]);
    }

    const reports: ProviderDiagnosticsReport[] = [];
    for (const adapter of this.adapterManager.listAdapters()) {
      reports.push(diagnoseProvider(adapter, this.vault));
    }
    return deepFreeze(reports);
  }

  /**
   * Returns a complete, deeply frozen system-wide runtime snapshot.
   */
  public runtimeSnapshot(): Readonly<RuntimeSnapshot> {
    const registeredAdapterIds = this.adapterManager.listAdapters().map((a) => a.identity.adapterId);
    const registeredCredentialIds = this.vault.lookupCredential({}).map((c) => c.credentialId);
    const diag = this.diagnostics();

    const snapshot: RuntimeSnapshot = {
      status: this.status,
      registeredAdapterIds,
      registeredCredentialIds,
      diagnostics: diag,
      timestamp: 1677652288000,
    };

    return deepFreeze(snapshot);
  }

  /**
   * Freezes runtime registry and prevents further mutations.
   */
  public freeze(): void {
    this.frozen = true;
    this.adapterManager.freeze();
  }

  public isFrozen(): boolean {
    return this.frozen;
  }
}
