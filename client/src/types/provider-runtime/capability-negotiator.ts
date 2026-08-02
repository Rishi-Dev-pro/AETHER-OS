/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Component: Capability Negotiator (`capability-negotiator.ts`)
 *
 * @file capability-negotiator.ts
 * @description Pre-selection deterministic Capability Negotiation Stage comparing execution capability
 * requirements against provider metadata capability descriptors.
 *
 * @module @aether/provider-runtime/capability-negotiator
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import { IncompatibleCapabilityError } from "./errors";
import type { ProviderMetadata } from "./provider-types";
import type {
  CapabilityRequirements,
  CapabilityNegotiationResult,
} from "./registry-types";
import { deepFreeze } from "./factories";

/**
 * Pure deterministic Capability Negotiation engine.
 */
export class CapabilityNegotiator {
  /**
   * Negotiates capability compatibility between a provider's metadata and execution requirements.
   *
   * @param providerMetadata Target provider metadata.
   * @param requirements Execution capability demands.
   * @param options Negotiation options (e.g. strict enforcement).
   * @returns Deeply frozen CapabilityNegotiationResult.
   * @throws IncompatibleCapabilityError if strict mode is enabled and required capabilities are missing.
   */
  public static negotiateCapabilities(
    providerMetadata: Readonly<ProviderMetadata>,
    requirements: Readonly<CapabilityRequirements>,
    options: Readonly<{ strict?: boolean }> = {}
  ): Readonly<CapabilityNegotiationResult> {
    const providerCaps = new Set<string>();
    if (providerMetadata && providerMetadata.capabilities) {
      for (const capDesc of providerMetadata.capabilities) {
        if (capDesc && capDesc.capability) {
          providerCaps.add(String(capDesc.capability));
        }
      }
    }

    const supportedSet = new Set<string>();
    const unsupportedSet = new Set<string>();

    const reqList = requirements?.requiredCapabilities ?? [];
    for (const reqCap of reqList) {
      const capName = String(reqCap);
      if (providerCaps.has(capName)) {
        supportedSet.add(capName);
      } else {
        unsupportedSet.add(capName);
      }
    }

    const optList = requirements?.optionalCapabilities ?? [];
    for (const optCap of optList) {
      const capName = String(optCap);
      if (providerCaps.has(capName)) {
        supportedSet.add(capName);
      }
    }

    const supportedCapabilities = Array.from(supportedSet).sort((a, b) => a.localeCompare(b));
    const unsupportedCapabilities = Array.from(unsupportedSet).sort((a, b) => a.localeCompare(b));
    const isFullyCompatible = unsupportedCapabilities.length === 0;

    if (!isFullyCompatible && options.strict) {
      throw new IncompatibleCapabilityError(
        `Provider '${providerMetadata.providerId}' lacks required capabilities: ${unsupportedCapabilities.join(", ")}`,
        {
          providerId: providerMetadata.providerId,
          unsupportedCapabilities,
        }
      );
    }

    const result: CapabilityNegotiationResult = {
      providerId: providerMetadata.providerId,
      supportedCapabilities,
      unsupportedCapabilities,
      isFullyCompatible,
      negotiatedAtMs: Date.now(),
    };

    return deepFreeze(result);
  }

  /**
   * Fast boolean check to verify if a provider satisfies all required capabilities.
   */
  public static validateCapabilities(
    providerMetadata: Readonly<ProviderMetadata>,
    requiredCapabilities: readonly string[]
  ): boolean {
    if (!providerMetadata || !providerMetadata.capabilities) {
      return false;
    }
    const providerCaps = new Set(providerMetadata.capabilities.map((c) => String(c.capability)));
    return requiredCapabilities.every((req) => providerCaps.has(String(req)));
  }

  /**
   * Evaluates provider compatibility against host environment constraints.
   */
  public static negotiateEnvironment(
    providerMetadata: Readonly<ProviderMetadata>,
    environmentConstraints: Readonly<{ os?: string; minFrameworkVersion?: string }>
  ): boolean {
    if (!providerMetadata) {
      return false;
    }
    if (environmentConstraints.minFrameworkVersion) {
      if (providerMetadata.minFrameworkVersion < environmentConstraints.minFrameworkVersion) {
        return false;
      }
    }
    return true;
  }
}
