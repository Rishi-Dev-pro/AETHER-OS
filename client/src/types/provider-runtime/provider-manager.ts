/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 6 Component: ProviderManager Facade (`provider-manager.ts`)
 *
 * @file provider-manager.ts
 * @description Single canonical public façade and orchestration entry point over all
 * Provider Runtime Layer subsystems (ProviderRegistry, CapabilityNegotiator, CredentialVault,
 * CredentialInjector, ProviderLifecycleManager, ProviderHealthManager, CircuitBreakerEngine,
 * ProviderSelector, ProviderSessionManager).
 * Contains ZERO execution logic or browser/desktop/AI automation drivers.
 *
 * @module @aether/provider-runtime/provider-manager
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import { ProviderSelectionPolicy, ProviderPriority, CredentialType, SessionType } from "./enums";
import { CircuitBreakerOpenError } from "./errors";
import { ProviderUnavailableError } from "./lifecycle-errors";
import { RuntimeFrozenError } from "./provider-manager-errors";

import type { ProviderContract, ProviderExecutionContext } from "./contracts";
import type { ProviderEntry, ProviderLookupQuery, CapabilityRequirements, CapabilityNegotiationResult, ProviderRegistrySnapshot } from "./registry-types";
import type { CredentialReference, CredentialVaultSnapshot } from "./credential-types";
import type { HealthSnapshot, HealthMetrics } from "./lifecycle-types";
import type { ProviderSelectionResult } from "./selector-types";
import type { ProviderSessionHandle, ProviderSessionSnapshot } from "./session-types";
import type { ProviderRuntimeSnapshot, ProviderManagerConfig } from "./provider-manager-types";

import { ProviderRegistry } from "./provider-registry";
import { CapabilityNegotiator } from "./capability-negotiator";
import { CredentialVault } from "./credential-vault";
import { CredentialInjector } from "./credential-injector";
import { ProviderLifecycleManager } from "./provider-lifecycle-manager";
import { ProviderHealthManager } from "./provider-health-manager";
import { CircuitBreakerEngine } from "./circuit-breaker-engine";
import { ProviderSelector } from "./provider-selector";
import { ProviderSessionManager } from "./provider-session-manager";
import { deepFreeze, createProviderExecutionContext } from "./factories";

/**
 * Unified Public Orchestration Façade for `@aether/provider-runtime`.
 */
export class ProviderManager {
  public readonly registry: ProviderRegistry;
  public readonly credentialVault: CredentialVault;
  public readonly lifecycleManager: ProviderLifecycleManager;
  public readonly healthManager: ProviderHealthManager;
  public readonly circuitBreaker: CircuitBreakerEngine;
  public readonly sessionManager: ProviderSessionManager;
  public readonly selector: ProviderSelector;

  private isRuntimeFrozenState = false;

  constructor(
    registry?: ProviderRegistry,
    credentialVault?: CredentialVault,
    lifecycleManager?: ProviderLifecycleManager,
    healthManager?: ProviderHealthManager,
    circuitBreaker?: CircuitBreakerEngine,
    sessionManager?: ProviderSessionManager,
    selector?: ProviderSelector,
    private readonly config?: Readonly<ProviderManagerConfig>
  ) {
    this.registry = registry ?? new ProviderRegistry();
    this.credentialVault = credentialVault ?? new CredentialVault();
    this.lifecycleManager = lifecycleManager ?? new ProviderLifecycleManager();
    this.healthManager = healthManager ?? new ProviderHealthManager();
    this.circuitBreaker = circuitBreaker ?? new CircuitBreakerEngine();
    this.sessionManager = sessionManager ?? new ProviderSessionManager();
    this.selector =
      selector ??
      new ProviderSelector(
        this.registry,
        this.healthManager,
        this.circuitBreaker,
        this.lifecycleManager
      );

    if (config?.autoFreezeOnBoot) {
      this.freezeRuntime();
    }
  }

  // =========================================================================
  // Provider Registry Management
  // =========================================================================

  public registerProvider(contract: Readonly<ProviderContract>): Readonly<ProviderEntry> {
    this.assertNotFrozen("registerProvider");
    const entry = this.registry.registerProvider(contract);
    this.lifecycleManager.registerProvider(entry.providerId);
    return entry;
  }

  public unregisterProvider(providerId: string): boolean {
    this.assertNotFrozen("unregisterProvider");
    this.sessionManager.cleanupSession(providerId);
    if (this.registry.hasProvider(providerId)) {
      this.registry.unregisterProvider(providerId);
      this.lifecycleManager.shutdownProvider(providerId);
      return true;
    }
    return false;
  }

  public getProvider(providerId: string): Readonly<ProviderEntry> {
    return this.registry.getProvider(providerId);
  }

  public lookupProviders(query: Readonly<ProviderLookupQuery>): readonly Readonly<ProviderEntry>[] {
    return this.registry.lookupProvider(query);
  }

  // =========================================================================
  // Credential Management (Vault Delegation)
  // =========================================================================

  public registerCredential(
    credentialId: string,
    providerId: string,
    credentialType: CredentialType,
    secretPayload: Readonly<Record<string, string>>,
    description?: string,
    expiresAtMs?: number
  ): Readonly<CredentialReference> {
    this.assertNotFrozen("registerCredential");
    return this.credentialVault.registerCredential(
      credentialId,
      providerId,
      credentialType,
      secretPayload,
      description,
      expiresAtMs
    );
  }

  public unregisterCredential(credentialId: string): boolean {
    this.assertNotFrozen("unregisterCredential");
    return this.credentialVault.unregisterCredential(credentialId);
  }

  // =========================================================================
  // Capability Negotiation & Selection
  // =========================================================================

  public negotiateCapabilities(
    providerId: string,
    requirements: Readonly<CapabilityRequirements>
  ): Readonly<CapabilityNegotiationResult> {
    const entry = this.registry.getProvider(providerId);
    return CapabilityNegotiator.negotiateCapabilities(entry.metadata, requirements);
  }

  public selectProvider(
    policy: ProviderSelectionPolicy = ProviderSelectionPolicy.FIRST_AVAILABLE,
    requirements?: Readonly<CapabilityRequirements>
  ): Readonly<ProviderSelectionResult> {
    return this.selector.selectProvider(policy, requirements);
  }

  // =========================================================================
  // ProviderExecutionContext Assembly Pipeline
  // =========================================================================

  public createExecutionContext(params: {
    requestId: string;
    providerId?: string;
    policy?: ProviderSelectionPolicy;
    requirements?: Readonly<CapabilityRequirements>;
    priority?: ProviderPriority;
    timeoutMs?: number;
  }): Readonly<ProviderExecutionContext> {
    let targetProviderId = params.providerId;

    if (!targetProviderId) {
      const selection = this.selectProvider(
        params.policy ?? this.config?.defaultSelectionPolicy ?? ProviderSelectionPolicy.FIRST_AVAILABLE,
        params.requirements
      );
      targetProviderId = selection.selectedProvider.providerId;
    }

    const entry = this.registry.getProvider(targetProviderId);

    // 1. Lifecycle Verification
    const state = this.lifecycleManager.getLifecycleState(targetProviderId);
    if (state === "DISABLED" || state === "DISPOSED" || state === "UNHEALTHY") {
      throw new ProviderUnavailableError(
        `Execution context creation failed: Provider '${targetProviderId}' lifecycle state is '${state}'.`,
        { providerId: targetProviderId, state }
      );
    }

    // 2. Circuit Breaker Verification
    if (!this.circuitBreaker.canExecute(targetProviderId)) {
      throw new CircuitBreakerOpenError(
        `Execution context creation failed: Circuit breaker for '${targetProviderId}' is OPEN.`,
        { providerId: targetProviderId }
      );
    }

    // 3. Construct base context
    const baseContext = createProviderExecutionContext({
      requestId: params.requestId,
      providerId: targetProviderId,
      providerType: entry.metadata.providerType,
      executionPriority: params.priority ? 1 : 1,
      timeoutMs: params.timeoutMs ?? entry.metadata.defaultTimeoutMs,
      providerConfigurationReference: entry.contract.configuration.configurationId,
    });

    // 4. Inject credential reference handle if available
    const credentialMetadataList = this.credentialVault.lookupCredential({ providerId: targetProviderId });
    if (credentialMetadataList.length > 0) {
      const primaryMetadata = credentialMetadataList[0];
      const credentialRef = this.credentialVault.getCredentialReference(primaryMetadata.credentialId);
      return CredentialInjector.injectCredentialReference(baseContext, credentialRef);
    }

    return baseContext;
  }

  // =========================================================================
  // Session Ownership & Lifecycle
  // =========================================================================

  public allocateSession(
    providerId: string,
    sessionType: SessionType | string = SessionType.LONG_LIVED_RUNTIME,
    sessionConfig?: Readonly<Record<string, unknown>>,
    ttlMs?: number
  ): Readonly<ProviderSessionHandle> {
    this.assertNotFrozen("allocateSession");
    return this.sessionManager.createSession(providerId, sessionType, sessionConfig, ttlMs);
  }

  public releaseSession(sessionId: string): Readonly<ProviderSessionHandle> {
    return this.sessionManager.releaseSession(sessionId);
  }

  public destroySession(sessionId: string): boolean {
    return this.sessionManager.destroySession(sessionId);
  }

  // =========================================================================
  // Lifecycle Delegation & Health Tracking
  // =========================================================================

  public initializeProvider(providerId: string) {
    return this.lifecycleManager.initializeProvider(providerId);
  }

  public warmProvider(providerId: string) {
    return this.lifecycleManager.warmProvider(providerId);
  }

  public markProviderReady(providerId: string) {
    return this.lifecycleManager.markReady(providerId);
  }

  public markProviderBusy(providerId: string) {
    return this.lifecycleManager.markBusy(providerId);
  }

  public markProviderAvailable(providerId: string) {
    return this.lifecycleManager.markAvailable(providerId);
  }

  public markProviderUnavailable(providerId: string, reason?: string) {
    return this.lifecycleManager.markUnavailable(providerId, reason);
  }

  public shutdownProvider(providerId: string) {
    return this.lifecycleManager.shutdownProvider(providerId);
  }

  public recordSuccess(providerId: string, latencyMs: number): Readonly<HealthMetrics> {
    this.circuitBreaker.recordSuccess(providerId);
    return this.healthManager.recordSuccess(providerId, latencyMs);
  }

  public recordFailure(providerId: string, latencyMs?: number): Readonly<HealthMetrics> {
    this.circuitBreaker.recordFailure(providerId);
    return this.healthManager.recordFailure(providerId, latencyMs);
  }

  // =========================================================================
  // Subsystem Snapshots & Runtime Freeze
  // =========================================================================

  public getProviderSnapshot(): Readonly<ProviderRegistrySnapshot> {
    return this.registry.createSnapshot();
  }

  public getHealthSnapshot(providerId: string): Readonly<HealthSnapshot> {
    return this.healthManager.createHealthSnapshot(providerId);
  }

  public getSessionSnapshot(): Readonly<ProviderSessionSnapshot> {
    return this.sessionManager.createSnapshot();
  }

  public getCredentialSnapshot(): Readonly<CredentialVaultSnapshot> {
    return this.credentialVault.createSnapshot();
  }

  public freezeRuntime(): void {
    this.isRuntimeFrozenState = true;
    this.registry.freezeRegistry();
    this.credentialVault.freezeVault();
  }

  public isFrozen(): boolean {
    return this.isRuntimeFrozenState;
  }

  public createRuntimeSnapshot(): Readonly<ProviderRuntimeSnapshot> {
    const registrySnapshot = this.registry.createSnapshot();
    const credentialSnapshot = this.credentialVault.createSnapshot();
    const sessionSnapshot = this.sessionManager.createSnapshot();

    const snapshot: ProviderRuntimeSnapshot = {
      snapshotId: `snap_runtime_${Date.now()}`,
      timestampMs: Date.now(),
      isFrozen: this.isRuntimeFrozenState,
      registrySnapshot,
      credentialSnapshot,
      sessionSnapshot,
      totalProvidersCount: registrySnapshot.providers.length,
      activeSessionsCount: sessionSnapshot.activeSessionsCount,
      credentialsCount: credentialSnapshot.credentialsCount,
    };

    return deepFreeze(snapshot);
  }

  private assertNotFrozen(operation: string): void {
    if (this.isRuntimeFrozenState) {
      throw new RuntimeFrozenError(
        `Runtime mutation rejected: Cannot perform '${operation}' on a frozen ProviderRuntime instance.`
      );
    }
  }
}
