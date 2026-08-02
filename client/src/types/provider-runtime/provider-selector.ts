/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Component: Provider Selector (`provider-selector.ts`)
 *
 * @file provider-selector.ts
 * @description Pure deterministic Provider Selection Engine evaluating provider eligibility,
 * capability negotiation, health metrics, circuit breaker states, and selection policies.
 * Consumes ProviderRegistry, CapabilityNegotiator, ProviderHealthManager, and CircuitBreakerEngine.
 * Contains ZERO execution logic or credential inspection.
 *
 * @module @aether/provider-runtime/provider-selector
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderSelectionPolicy } from "./enums";
import { NoEligibleProviderError } from "./errors";
import type { ProviderEntry } from "./registry-types";
import type { ProviderRegistry } from "./provider-registry";
import { CapabilityNegotiator } from "./capability-negotiator";
import type { ProviderHealthManager } from "./provider-health-manager";
import type { CircuitBreakerEngine } from "./circuit-breaker-engine";
import type { ProviderLifecycleManager } from "./provider-lifecycle-manager";
import type { CapabilityRequirements } from "./registry-types";
import type {
  ProviderCandidateScore,
  ProviderRejectionDetail,
  ProviderSelectionReport,
  ProviderSelectionResult,
  SelectionPolicyWeights,
} from "./selector-types";
import { deepFreeze } from "./factories";

/**
 * Default selection policy weights summing to 1.0.
 */
const DEFAULT_WEIGHTS: SelectionPolicyWeights = {
  healthWeight: 0.35,
  capabilityWeight: 0.25,
  latencyWeight: 0.2,
  costWeight: 0.1,
  priorityWeight: 0.1,
};

/**
 * Deterministic Provider Selection Engine.
 */
export class ProviderSelector {
  private roundRobinIndex = 0;

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly healthManager: ProviderHealthManager,
    private readonly circuitBreaker: CircuitBreakerEngine,
    private readonly lifecycleManager?: ProviderLifecycleManager
  ) {}

  /**
   * Evaluates catalog candidates and selects the optimal provider based on target policy.
   *
   * @param policy Target selection policy (LOWEST_LATENCY, HIGHEST_HEALTH, WEIGHTED_SCORE, etc.).
   * @param requirements Optional capability demand specifications.
   * @param customWeights Optional custom scoring weights.
   * @returns Deeply frozen ProviderSelectionResult payload.
   * @throws NoEligibleProviderError if zero candidate providers pass eligibility criteria.
   */
  public selectProvider(
    policy: ProviderSelectionPolicy = ProviderSelectionPolicy.FIRST_AVAILABLE,
    requirements?: Readonly<CapabilityRequirements>,
    customWeights?: Readonly<SelectionPolicyWeights>
  ): Readonly<ProviderSelectionResult> {
    const { eligible, rejected } = this.filterEligibleProviders(requirements);

    if (eligible.length === 0) {
      throw new NoEligibleProviderError(
        `Provider selection failed: Zero eligible providers satisfy the constraints under policy '${policy}'.`,
        {
          policy,
          rejectedCount: rejected.length,
          rejectedProviders: rejected,
        }
      );
    }

    const weights = customWeights ?? DEFAULT_WEIGHTS;
    const candidateScores = eligible.map((p) => this.evaluateProvider(p, requirements, weights));

    // Sort candidate scores deterministically: finalWeightedScore descending, tie-breaker providerId ascending
    candidateScores.sort((a, b) => {
      if (Math.abs(b.finalWeightedScore - a.finalWeightedScore) > 1e-6) {
        return b.finalWeightedScore - a.finalWeightedScore;
      }
      return a.providerId.localeCompare(b.providerId);
    });

    const selectedProvider = this.applySelectionPolicy(eligible, candidateScores, policy);

    const calculatedScores: Record<string, number> = {};
    for (const cs of candidateScores) {
      calculatedScores[cs.providerId] = cs.finalWeightedScore;
    }

    const report: ProviderSelectionReport = {
      selectionId: `sel_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      timestampMs: Date.now(),
      appliedPolicy: policy,
      selectedProviderId: selectedProvider.providerId,
      candidateCount: eligible.length,
      rejectedCount: rejected.length,
      candidateScores: deepFreeze([...candidateScores]),
      rejectedProviders: deepFreeze([...rejected]),
    };

    const result: ProviderSelectionResult = {
      selectedProvider,
      candidateProviders: deepFreeze([...eligible]),
      rejectedProviders: deepFreeze([...rejected]),
      appliedPolicy: policy,
      calculatedScores: deepFreeze(calculatedScores),
      selectionReport: deepFreeze(report),
    };

    return deepFreeze(result);
  }

  /**
   * Ranks eligible candidate providers by final weighted score descending.
   */
  public rankProviders(
    requirements?: Readonly<CapabilityRequirements>
  ): readonly Readonly<ProviderCandidateScore>[] {
    const { eligible } = this.filterEligibleProviders(requirements);
    const candidateScores = eligible.map((p) => this.evaluateProvider(p, requirements, DEFAULT_WEIGHTS));

    candidateScores.sort((a, b) => {
      if (Math.abs(b.finalWeightedScore - a.finalWeightedScore) > 1e-6) {
        return b.finalWeightedScore - a.finalWeightedScore;
      }
      return a.providerId.localeCompare(b.providerId);
    });

    return deepFreeze(candidateScores);
  }

  /**
   * Filters all catalog providers into eligible vs rejected lists based on lifecycle, circuit breaker, and capabilities.
   */
  public filterEligibleProviders(
    requirements?: Readonly<CapabilityRequirements>
  ): { eligible: ProviderEntry[]; rejected: ProviderRejectionDetail[] } {
    const allProviders = this.registry.listProviders();
    const eligible: ProviderEntry[] = [];
    const rejected: ProviderRejectionDetail[] = [];

    for (const provider of allProviders) {
      const { providerId } = provider;

      // 1. Lifecycle State Verification (if lifecycleManager available)
      if (this.lifecycleManager) {
        const state = this.lifecycleManager.getLifecycleState(providerId);
        if (state === "DISABLED" || state === "DISPOSED" || state === "UNHEALTHY") {
          rejected.push({ providerId, reason: `Provider lifecycle state is '${state}'.` });
          continue;
        }
      }

      // 2. Circuit Breaker State Verification
      if (!this.circuitBreaker.canExecute(providerId)) {
        rejected.push({ providerId, reason: "Circuit breaker is in OPEN state." });
        continue;
      }

      // 3. Capability Negotiation Verification
      if (requirements && requirements.requiredCapabilities.length > 0) {
        const negotiation = CapabilityNegotiator.negotiateCapabilities(provider.metadata, requirements);
        if (!negotiation.isFullyCompatible) {
          rejected.push({
            providerId,
            reason: `Missing required capabilities: ${negotiation.unsupportedCapabilities.join(", ")}.`,
          });
          continue;
        }
      }

      eligible.push(provider);
    }

    // Sort eligible and rejected arrays deterministically by providerId
    eligible.sort((a, b) => a.providerId.localeCompare(b.providerId));
    rejected.sort((a, b) => a.providerId.localeCompare(b.providerId));

    return { eligible, rejected };
  }

  /**
   * Evaluates individual candidate provider score components.
   */
  public evaluateProvider(
    provider: Readonly<ProviderEntry>,
    requirements?: Readonly<CapabilityRequirements>,
    weights: Readonly<SelectionPolicyWeights> = DEFAULT_WEIGHTS
  ): Readonly<ProviderCandidateScore> {
    const { providerId } = provider;

    const healthScore = this.healthManager.calculateHealthScore(providerId);

    let capabilityScore = 1.0;
    if (requirements && requirements.requiredCapabilities.length > 0) {
      const negotiation = CapabilityNegotiator.negotiateCapabilities(provider.metadata, requirements);
      const reqTotal = requirements.requiredCapabilities.length;
      capabilityScore = negotiation.supportedCapabilities.length / reqTotal;
    }

    const metrics = this.healthManager.getHealthMetrics(providerId);
    const latencyMs = metrics.averageLatencyMs;
    const latencyScore = 1 / (1 + latencyMs / 1000);

    const costScore = 1.0; // Standard baseline cost score
    const priorityScore = 0.6; // Standard baseline priority score

    const finalWeightedScore = this.calculateProviderScore(
      healthScore,
      capabilityScore,
      latencyScore,
      costScore,
      priorityScore,
      weights
    );

    const candidateScore: ProviderCandidateScore = {
      providerId,
      healthScore: Number(healthScore.toFixed(4)),
      capabilityScore: Number(capabilityScore.toFixed(4)),
      latencyScore: Number(latencyScore.toFixed(4)),
      costScore: Number(costScore.toFixed(4)),
      priorityScore: Number(priorityScore.toFixed(4)),
      finalWeightedScore: Number(finalWeightedScore.toFixed(4)),
    };

    return deepFreeze(candidateScore);
  }

  /**
   * Calculates final weighted score formula.
   */
  public calculateProviderScore(
    healthScore: number,
    capabilityScore: number,
    latencyScore: number,
    costScore: number,
    priorityScore: number,
    weights: Readonly<SelectionPolicyWeights> = DEFAULT_WEIGHTS
  ): number {
    return (
      healthScore * weights.healthWeight +
      capabilityScore * weights.capabilityWeight +
      latencyScore * weights.latencyWeight +
      costScore * weights.costWeight +
      priorityScore * weights.priorityWeight
    );
  }

  /**
   * Applies target selection policy strategy to pick winning provider.
   */
  public applySelectionPolicy(
    eligible: readonly Readonly<ProviderEntry>[],
    scores: readonly Readonly<ProviderCandidateScore>[],
    policy: ProviderSelectionPolicy
  ): Readonly<ProviderEntry> {
    if (eligible.length === 0) {
      throw new NoEligibleProviderError("Selection policy application failed: Candidate list is empty.");
    }

    const scoreMap = new Map<string, ProviderCandidateScore>();
    for (const sc of scores) {
      scoreMap.set(sc.providerId, sc);
    }

    switch (policy) {
      case ProviderSelectionPolicy.LOWEST_LATENCY: {
        const sorted = [...eligible].sort((a, b) => {
          const latA = this.healthManager.getHealthMetrics(a.providerId).averageLatencyMs;
          const latB = this.healthManager.getHealthMetrics(b.providerId).averageLatencyMs;
          if (latA !== latB) {
            return latA - latB; // Lowest latency first
          }
          return a.providerId.localeCompare(b.providerId);
        });
        return sorted[0];
      }

      case ProviderSelectionPolicy.HIGHEST_AVAILABILITY: {
        const sorted = [...eligible].sort((a, b) => {
          const avA = this.healthManager.calculateAvailability(a.providerId);
          const avB = this.healthManager.calculateAvailability(b.providerId);
          if (Math.abs(avB - avA) > 1e-6) {
            return avB - avA; // Highest availability first
          }
          return a.providerId.localeCompare(b.providerId);
        });
        return sorted[0];
      }

      case ProviderSelectionPolicy.HIGHEST_HEALTH: {
        const sorted = [...eligible].sort((a, b) => {
          const hA = this.healthManager.calculateHealthScore(a.providerId);
          const hB = this.healthManager.calculateHealthScore(b.providerId);
          if (Math.abs(hB - hA) > 1e-6) {
            return hB - hA;
          }
          return a.providerId.localeCompare(b.providerId);
        });
        return sorted[0];
      }

      case ProviderSelectionPolicy.ROUND_ROBIN: {
        const sorted = [...eligible].sort((a, b) => a.providerId.localeCompare(b.providerId));
        const index = this.roundRobinIndex % sorted.length;
        this.roundRobinIndex++;
        return sorted[index];
      }

      case ProviderSelectionPolicy.PREFER_LOCAL: {
        const sorted = [...eligible].sort((a, b) => {
          const isLocalA = a.metadata.providerType.includes("LOCAL");
          const isLocalB = b.metadata.providerType.includes("LOCAL");
          if (isLocalA && !isLocalB) return -1;
          if (!isLocalA && isLocalB) return 1;

          const scoreA = scoreMap.get(a.providerId)?.finalWeightedScore ?? 0;
          const scoreB = scoreMap.get(b.providerId)?.finalWeightedScore ?? 0;
          if (Math.abs(scoreB - scoreA) > 1e-6) return scoreB - scoreA;

          return a.providerId.localeCompare(b.providerId);
        });
        return sorted[0];
      }

      case ProviderSelectionPolicy.PREFER_CLOUD: {
        const sorted = [...eligible].sort((a, b) => {
          const isCloudA = a.metadata.providerType.includes("CLOUD");
          const isCloudB = b.metadata.providerType.includes("CLOUD");
          if (isCloudA && !isCloudB) return -1;
          if (!isCloudA && isCloudB) return 1;

          const scoreA = scoreMap.get(a.providerId)?.finalWeightedScore ?? 0;
          const scoreB = scoreMap.get(b.providerId)?.finalWeightedScore ?? 0;
          if (Math.abs(scoreB - scoreA) > 1e-6) return scoreB - scoreA;

          return a.providerId.localeCompare(b.providerId);
        });
        return sorted[0];
      }

      case ProviderSelectionPolicy.WEIGHTED_SCORE:
      case ProviderSelectionPolicy.FIRST_AVAILABLE:
      default: {
        const sorted = [...eligible].sort((a, b) => {
          const scoreA = scoreMap.get(a.providerId)?.finalWeightedScore ?? 0;
          const scoreB = scoreMap.get(b.providerId)?.finalWeightedScore ?? 0;
          if (Math.abs(scoreB - scoreA) > 1e-6) {
            return scoreB - scoreA;
          }
          return a.providerId.localeCompare(b.providerId);
        });
        return sorted[0];
      }
    }
  }
}
