/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Component: Registry & Capability Exception Exports (`registry-errors.ts`)
 *
 * @file registry-errors.ts
 * @description Canonical error re-exports for Provider Registry and Capability Negotiator.
 *
 * @module @aether/provider-runtime/registry-errors
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

export {
  DuplicateProviderError,
  ProviderNotFoundError,
  ProviderRegistryFrozenError,
  CapabilityNegotiationError,
  IncompatibleCapabilityError,
  InvalidProviderMetadataError,
  ProviderContractError,
  ProviderRegistrationError,
} from "./errors";
