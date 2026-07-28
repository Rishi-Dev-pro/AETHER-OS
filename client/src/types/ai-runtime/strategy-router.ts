/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 11: Strategy Router (`strategy-router.ts`)
 *
 * @file strategy-router.ts
 * @description Pure-function strategy routing engine mapping abstract ModelTier requests
 * into concrete ProviderPlugin selections using priority-ranked routing tables, privacy isolation,
 * circuit breaker filtering, and fallback chain generation.
 *
 * @module @aether/ai-runtime/strategy-router
 * @version 1.0.0
 * @status MILESTONE 2 — PROVIDER INFRASTRUCTURE
 */

import { ModelTier, PrivacyMode, CircuitState } from "./types";
import { ConfigurationError } from "./errors";
import { deepFreeze } from "./internal/deep-freeze";
import type { ProviderCapabilities } from "./provider-plugin";


// ============================================================================
// 1. DATA CONTRACT INTERFACES
// ============================================================================

/**
 * Immutable candidate mapping associating a provider backend with a concrete model handle.
 */
export interface ProviderCandidate {
  /** Target provider identifier (e.g. "gemini", "openai", "claude", "ollama") */
  readonly providerId: string;
  /** Concrete vendor model handle string (e.g. "gemini-2.5-flash", "gpt-4o", "claude-3-5-sonnet") */
  readonly concreteModel: string;
}

/**
 * Immutable routing table entry mapping an abstract ModelTier to a priority-ranked list of candidate providers.
 */
export interface ModelTierMapping {
  /** Target abstract model capability tier */
  readonly modelTier: ModelTier;
  /** Priority-ordered array of candidate providers (index 0 is primary, fallback candidates follow) */
  readonly candidates: readonly ProviderCandidate[];
}

/**
 * Immutable collection of ModelTierMapping records covering all system model tiers.
 */
export interface RoutingTable {
  /** Map of ModelTier to its corresponding ModelTierMapping entry */
  readonly mappings: Readonly<Record<ModelTier, ModelTierMapping>>;
  /** Routing table creation timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Immutable context provided to the Strategy Router during provider resolution.
 */
export interface RoutingContext {
  /** Abstract model capability tier requested by upstream caller */
  readonly modelTier: ModelTier;
  /** Active system privacy mode (STANDARD, ENCRYPTED, LOCAL_ONLY) */
  readonly privacyMode: PrivacyMode;
  /** Map of provider identifiers to their current CircuitState */
  readonly circuitStates: Readonly<Record<string, CircuitState>>;
  /** Optional list of provider identifiers explicitly disabled in registry */
  readonly disabledProviders?: readonly string[];
}

/**
 * Immutable result returned by the Strategy Router after resolving a request context.
 * Contains the selected primary provider, concrete model string, ordered fallback chain, and selection reason.
 */
export interface RoutingDecision {
  /** Selected target provider identifier */
  readonly providerId: string;
  /** Concrete vendor model handle string to be invoked */
  readonly concreteModel: string;
  /** Ordered list of secondary fallback candidates if primary provider fails during transport */
  readonly fallbackChain: readonly ProviderCandidate[];
  /**
   * Informational explanation describing why this provider and model were selected.
   * (e.g. "default_primary", "privacy_local_only", "circuit_breaker_fallback", "single_candidate")
   */
  readonly reason: string;
  /** Resolution timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 2. DEFAULT SYSTEM ROUTING TABLE
// ============================================================================

/**
 * Returns a canonical, pre-configured default RoutingTable mapping all 5 ModelTiers
 * to standard production provider and model candidates.
 */
export function createDefaultRoutingTable(): Readonly<RoutingTable> {
  const defaultMappings: Record<ModelTier, ModelTierMapping> = {
    [ModelTier.REASONING]: {
      modelTier: ModelTier.REASONING,
      candidates: [
        { providerId: "claude", concreteModel: "claude-3-7-sonnet-thinking" },
        { providerId: "openai", concreteModel: "o3-mini" },
        { providerId: "gemini", concreteModel: "gemini-2.5-pro-thinking" },
      ],
    },
    [ModelTier.STANDARD]: {
      modelTier: ModelTier.STANDARD,
      candidates: [
        { providerId: "gemini", concreteModel: "gemini-2.5-flash" },
        { providerId: "openai", concreteModel: "gpt-4o" },
        { providerId: "claude", concreteModel: "claude-3-5-sonnet" },
      ],
    },
    [ModelTier.FAST]: {
      modelTier: ModelTier.FAST,
      candidates: [
        { providerId: "gemini", concreteModel: "gemini-2.5-flash-lite" },
        { providerId: "openai", concreteModel: "gpt-4o-mini" },
        { providerId: "claude", concreteModel: "claude-3-5-haiku" },
      ],
    },
    [ModelTier.VISION]: {
      modelTier: ModelTier.VISION,
      candidates: [
        { providerId: "gemini", concreteModel: "gemini-2.5-flash" },
        { providerId: "openai", concreteModel: "gpt-4o" },
        { providerId: "claude", concreteModel: "claude-3-5-sonnet" },
      ],
    },
    [ModelTier.LOCAL]: {
      modelTier: ModelTier.LOCAL,
      candidates: [
        { providerId: "ollama", concreteModel: "llama3.2:latest" },
        { providerId: "ollama", concreteModel: "mistral:latest" },
      ],
    },
  };

  return createRoutingTable({ mappings: defaultMappings });
}


// ============================================================================
// 3. FACTORY FUNCTIONS & INVARIANT VALIDATORS
// ============================================================================

/**
 * Parameters passed to createModelTierMapping factory function.
 */
export interface CreateModelTierMappingParams {
  readonly modelTier: ModelTier;
  readonly candidates: readonly ProviderCandidate[];
}

/**
 * Factory function creating an immutable ModelTierMapping object.
 * Validates invariants and applies deep freeze.
 *
 * @throws {ConfigurationError} If candidates array is empty or contains invalid entries.
 */
export function createModelTierMapping(
  params: CreateModelTierMappingParams
): Readonly<ModelTierMapping> {
  if (!params || !params.modelTier || !Object.values(ModelTier).includes(params.modelTier)) {
    throw new ConfigurationError({
      subCode: "InvalidModelTier",
      message: `createModelTierMapping requires a valid ModelTier. Received: ${String(params?.modelTier)}`,
    });
  }

  if (!params.candidates || !Array.isArray(params.candidates) || params.candidates.length === 0) {
    throw new ConfigurationError({
      subCode: "EmptyRoutingCandidates",
      message: `ModelTierMapping for '${params.modelTier}' must contain at least one ProviderCandidate.`,
    });
  }

  for (let i = 0; i < params.candidates.length; i++) {
    const candidate = params.candidates[i];
    if (
      !candidate ||
      typeof candidate.providerId !== "string" ||
      candidate.providerId.trim() === "" ||
      typeof candidate.concreteModel !== "string" ||
      candidate.concreteModel.trim() === ""
    ) {
      throw new ConfigurationError({
        subCode: "InvalidCandidateDescriptor",
        message: `ModelTierMapping for '${params.modelTier}' candidate at index ${i} requires non-empty providerId and concreteModel strings.`,
      });
    }
  }

  const rawMapping: ModelTierMapping = {
    modelTier: params.modelTier,
    candidates: params.candidates.map((c) => ({
      providerId: c.providerId.trim(),
      concreteModel: c.concreteModel.trim(),
    })),
  };

  return deepFreeze(rawMapping);
}

/**
 * Parameters passed to createRoutingTable factory function.
 */
export interface CreateRoutingTableParams {
  readonly mappings: Record<string, ModelTierMapping>;
}

/**
 * Factory function creating an immutable RoutingTable object.
 * Validates complete coverage of all 5 ModelTiers and applies deep freeze.
 *
 * @throws {ConfigurationError} If any ModelTier is missing from the table mappings.
 */
export function createRoutingTable(
  params: CreateRoutingTableParams
): Readonly<RoutingTable> {
  if (!params || !params.mappings || typeof params.mappings !== "object") {
    throw new ConfigurationError({
      subCode: "NullRoutingTableMappings",
      message: "createRoutingTable requires a valid mappings object.",
    });
  }

  // Validate complete coverage across all 5 ModelTiers
  const requiredTiers = Object.values(ModelTier);
  const validatedMappings: Partial<Record<ModelTier, ModelTierMapping>> = {};

  for (const tier of requiredTiers) {
    const mapping = params.mappings[tier];
    if (!mapping) {
      throw new ConfigurationError({
        subCode: "MissingModelTierMapping",
        message: `RoutingTable is missing required mapping for ModelTier '${tier}'.`,
      });
    }
    validatedMappings[tier] = createModelTierMapping(mapping);
  }

  const rawTable: RoutingTable = {
    mappings: validatedMappings as Record<ModelTier, ModelTierMapping>,
    timestamp: Date.now(),
  };

  return deepFreeze(rawTable);
}

/**
 * Validates a RoutingTable instance against complete tier coverage and candidate non-emptiness invariants.
 *
 * @throws {ConfigurationError} If validation fails.
 */
export function validateRoutingTable(table: RoutingTable): void {
  if (!table) {
    throw new ConfigurationError({
      subCode: "NullRoutingTable",
      message: "RoutingTable object cannot be null or undefined.",
    });
  }

  const requiredTiers = Object.values(ModelTier);
  for (const tier of requiredTiers) {
    const mapping = table.mappings[tier];
    if (!mapping || mapping.candidates.length === 0) {
      throw new ConfigurationError({
        subCode: "InvalidRoutingTable",
        message: `RoutingTable validation failed: ModelTier '${tier}' mapping is missing or has no candidates.`,
      });
    }
  }
}

/**
 * Parameters passed to createRoutingContext factory function.
 */
export interface CreateRoutingContextParams {
  readonly modelTier?: ModelTier;
  readonly privacyMode?: PrivacyMode;
  readonly circuitStates?: Record<string, CircuitState>;
  readonly disabledProviders?: readonly string[];
}

/**
 * Factory function creating an immutable RoutingContext object.
 * Validates invariants and applies deep freeze.
 */
export function createRoutingContext(
  params: CreateRoutingContextParams = {}
): Readonly<RoutingContext> {
  const modelTier = params.modelTier ?? ModelTier.STANDARD;
  const privacyMode = params.privacyMode ?? PrivacyMode.STANDARD;

  if (!Object.values(ModelTier).includes(modelTier)) {
    throw new ConfigurationError({
      subCode: "InvalidModelTier",
      message: `RoutingContext requires a valid ModelTier. Received: ${String(modelTier)}`,
    });
  }

  if (!Object.values(PrivacyMode).includes(privacyMode)) {
    throw new ConfigurationError({
      subCode: "InvalidPrivacyMode",
      message: `RoutingContext requires a valid PrivacyMode. Received: ${String(privacyMode)}`,
    });
  }

  const rawContext: RoutingContext = {
    modelTier,
    privacyMode,
    circuitStates: { ...(params.circuitStates ?? {}) },
    disabledProviders: params.disabledProviders ? [...params.disabledProviders] : undefined,
  };

  return deepFreeze(rawContext);
}


// ============================================================================
// 4. PURE ROUTING EVALUATION LOGIC
// ============================================================================

/**
 * Pure evaluation function resolving a RoutingContext against a RoutingTable.
 *
 * Deterministic Routing Algorithm:
 * 1. Privacy Check: If PrivacyMode is LOCAL_ONLY, strictly override target tier to ModelTier.LOCAL.
 * 2. Lookup Mapping: Fetch priority-ranked candidates for target ModelTier from routing table.
 * 3. Candidate Filtering: Iterate candidates in priority order and filter out:
 *    - Disabled providers (if present in disabledProviders list)
 *    - Unhealthy providers (where circuitState === CircuitState.OPEN)
 *    - Non-local providers if PrivacyMode is LOCAL_ONLY
 *    - Providers missing required capability flags (if optional providerCapabilitiesMap is supplied)
 * 4. Selection & Fallback Chain: First valid candidate becomes primary selection; remaining valid candidates become fallbackChain.
 * 5. Failure Case: If no candidate survives filtering, throws ConfigurationError.
 *
 * @param context - Immutable routing request context.
 * @param routingTable - Immutable routing table mapping tiers to candidate providers.
 * @param providerCapabilitiesMap - Optional read-only map of providerId to static ProviderCapabilities for capability verification.
 * @returns Immutable RoutingDecision containing primary provider, concrete model, fallback chain, and decision reason.
 *
 * @throws {ConfigurationError} If routing fails or no healthy eligible candidate is available.
 */
export function resolveProvider(
  context: RoutingContext,
  routingTable: RoutingTable,
  providerCapabilitiesMap?: Readonly<Record<string, ProviderCapabilities>>
): Readonly<RoutingDecision> {
  // Fail-fast validation on inputs
  if (!context) {
    throw new ConfigurationError({
      subCode: "NullRoutingContext",
      message: "resolveProvider requires a valid RoutingContext.",
    });
  }
  validateRoutingTable(routingTable);

  // Rule 1: Privacy Isolation — LOCAL_ONLY enforces ModelTier.LOCAL
  const isLocalOnly = context.privacyMode === PrivacyMode.LOCAL_ONLY;
  const effectiveModelTier = isLocalOnly ? ModelTier.LOCAL : context.modelTier;

  // Rule 2: Lookup candidates for effective model tier
  const tierMapping = routingTable.mappings[effectiveModelTier];
  const candidates = tierMapping.candidates;

  // Set up filtering criteria sets
  const disabledSet = new Set(context.disabledProviders ?? []);

  // Filter candidates deterministically in priority order
  const eligibleCandidates: ProviderCandidate[] = [];
  const rejectionReasons: string[] = [];

  for (const candidate of candidates) {
    const pId = candidate.providerId;

    // Filter A: Disabled check
    if (disabledSet.has(pId)) {
      rejectionReasons.push(`${pId}:disabled`);
      continue;
    }

    // Filter B: Circuit Breaker OPEN check
    const circuitState = context.circuitStates[pId] ?? CircuitState.CLOSED;
    if (circuitState === CircuitState.OPEN) {
      rejectionReasons.push(`${pId}:circuit_open`);
      continue;
    }

    // Filter C: Privacy Mode LOCAL_ONLY constraint check (must be local provider)
    if (isLocalOnly && pId !== "ollama" && pId !== "local") {
      // If capability map available, check if candidate supports LOCAL tier
      const caps = providerCapabilitiesMap?.[pId];
      if (caps && !caps.supportedModelTiers.includes(ModelTier.LOCAL)) {
        rejectionReasons.push(`${pId}:not_local_compliant`);
        continue;
      }
    }

    // Filter D: Vision capability verification if modelTier is VISION
    if (effectiveModelTier === ModelTier.VISION && providerCapabilitiesMap) {
      const caps = providerCapabilitiesMap[pId];
      if (caps && !caps.supportsVision) {
        rejectionReasons.push(`${pId}:missing_vision_capability`);
        continue;
      }
    }

    // Candidate passed all filters
    eligibleCandidates.push(candidate);
  }

  // If zero candidates survive filtering, throw typed ConfigurationError
  if (eligibleCandidates.length === 0) {
    const reasonsStr = rejectionReasons.length > 0 ? ` Rejections: [${rejectionReasons.join(", ")}]` : "";
    throw new ConfigurationError({
      subCode: "NoEligibleProviderFound",
      message: `Routing failed for ModelTier '${context.modelTier}' (PrivacyMode: '${context.privacyMode}'): No healthy eligible provider available.${reasonsStr}`,
    });
  }

  // Primary selection is index 0; remaining eligible candidates form the fallback chain
  const primaryCandidate = eligibleCandidates[0];
  const fallbackChain = eligibleCandidates.slice(1);

  // Construct informational selection reason
  let reason = "default_primary";
  if (isLocalOnly) {
    reason = "privacy_local_only";
  } else if (primaryCandidate.providerId !== candidates[0].providerId) {
    reason = `circuit_breaker_fallback (skipped ${candidates[0].providerId})`;
  } else if (fallbackChain.length === 0) {
    reason = "single_eligible_candidate";
  }

  const rawDecision: RoutingDecision = {
    providerId: primaryCandidate.providerId,
    concreteModel: primaryCandidate.concreteModel,
    fallbackChain: deepFreeze(fallbackChain),
    reason,
    timestamp: Date.now(),
  };

  return deepFreeze(rawDecision);
}
