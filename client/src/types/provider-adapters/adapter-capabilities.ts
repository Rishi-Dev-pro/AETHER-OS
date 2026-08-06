/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Foundation Component: Adapter Capabilities (`adapter-capabilities.ts`)
 *
 * @file adapter-capabilities.ts
 * @description Pure capability query functions and predicate assertions operating on
 * ProviderModelCapabilities contracts.
 *
 * @module @aether/provider-adapters/adapter-capabilities
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import { AdapterCapability } from "./enums";
import type { ProviderModelCapabilities } from "./adapter-types";

/**
 * Checks whether streaming capability is supported.
 */
export function supportsStreaming(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsStreaming ||
    capabilities.capabilities.includes(AdapterCapability.STREAMING)
  );
}

/**
 * Checks whether vision capability is supported.
 */
export function supportsVision(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsVision ||
    capabilities.capabilities.includes(AdapterCapability.VISION)
  );
}

/**
 * Checks whether embedding generation capability is supported.
 */
export function supportsEmbeddings(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsEmbeddings ||
    capabilities.capabilities.includes(AdapterCapability.EMBEDDING)
  );
}

/**
 * Checks whether tool calling capability is supported.
 */
export function supportsToolCalling(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsToolCalling ||
    capabilities.capabilities.includes(AdapterCapability.TOOL_CALLING)
  );
}

/**
 * Checks whether image generation capability is supported.
 */
export function supportsImageGeneration(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsImageGen ||
    capabilities.capabilities.includes(AdapterCapability.IMAGE_GENERATION)
  );
}

/**
 * Checks whether speech capability is supported.
 */
export function supportsSpeech(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsSpeech ||
    capabilities.capabilities.includes(AdapterCapability.SPEECH)
  );
}

/**
 * Checks whether reasoning capability is supported.
 */
export function supportsReasoning(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsReasoning ||
    capabilities.capabilities.includes(AdapterCapability.REASONING)
  );
}

/**
 * Checks whether JSON mode capability is supported.
 */
export function supportsJSONMode(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsJSONMode ||
    capabilities.capabilities.includes(AdapterCapability.JSON_MODE)
  );
}

/**
 * Checks whether structured output capability is supported.
 */
export function supportsStructuredOutput(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsStructuredOutput ||
    capabilities.capabilities.includes(AdapterCapability.STRUCTURED_OUTPUT)
  );
}

/**
 * Checks whether function calling capability is supported.
 */
export function supportsFunctionCalling(
  capabilities: Readonly<ProviderModelCapabilities>
): boolean {
  return (
    capabilities.supportsFunctionCalling ||
    capabilities.capabilities.includes(AdapterCapability.FUNCTION_CALLING)
  );
}
