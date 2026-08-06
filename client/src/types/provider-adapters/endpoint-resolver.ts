/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 3 Component: Endpoint Resolver (`endpoint-resolver.ts`)
 *
 * @file endpoint-resolver.ts
 * @description Deterministic provider endpoint path resolution utility. Concatenates base URLs,
 * endpoint paths, and API versions safely without double slashes, returning deeply frozen ResolvedEndpoint objects.
 *
 * @module @aether/provider-adapters/endpoint-resolver
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import type { ProviderEndpointConfig, ResolvedEndpoint } from "./authentication-types";
import { EndpointResolutionError } from "./authentication-errors";
import { deepFreeze } from "./factories";

/**
 * Resolves a full target endpoint URL deterministically from a ProviderEndpointConfig.
 *
 * @param endpointConfig Target provider endpoint configuration.
 * @param endpointKey Key identifying the endpoint path (e.g. "chat", "embeddings").
 * @param apiVersionOverride Optional API version string override.
 * @returns Deeply frozen ResolvedEndpoint instance.
 * @throws EndpointResolutionError if input parameters or endpoint keys are invalid.
 */
export function resolveEndpoint(
  endpointConfig: ProviderEndpointConfig,
  endpointKey: string,
  apiVersionOverride?: string
): Readonly<ResolvedEndpoint> {
  if (!endpointConfig) {
    throw new EndpointResolutionError("Endpoint resolution requires a valid endpointConfig object.");
  }

  if (!endpointKey || typeof endpointKey !== "string" || endpointKey.trim() === "") {
    throw new EndpointResolutionError("Endpoint resolution requires a non-empty endpointKey.");
  }

  const normalizedKey = endpointKey.trim();
  const rawPath = endpointConfig.endpoints[normalizedKey];

  if (!rawPath) {
    throw new EndpointResolutionError(
      `Endpoint key '${normalizedKey}' does not exist in provider configuration endpoints.`
    );
  }

  const apiVersion = apiVersionOverride?.trim() || endpointConfig.defaultApiVersion?.trim();

  // Normalize base URL trailing slash and path leading slash
  const baseUrlClean = endpointConfig.baseUrl.replace(/\/+$/, "");
  let pathClean = rawPath.replace(/^\/+/, "");

  // If apiVersion is provided and path contains {version} template, replace it; otherwise prepend version if not present
  if (apiVersion) {
    if (pathClean.includes("{version}")) {
      pathClean = pathClean.replace("{version}", apiVersion);
    } else if (!pathClean.startsWith(apiVersion) && !baseUrlClean.includes(apiVersion)) {
      // If version is not already part of baseUrl or path, prepend to path
      pathClean = `${apiVersion}/${pathClean}`;
    }
  }

  const fullUrl = `${baseUrlClean}/${pathClean}`;

  try {
    new URL(fullUrl);
  } catch {
    throw new EndpointResolutionError(`Resolved endpoint URL '${fullUrl}' is invalid.`);
  }

  const result: ResolvedEndpoint = {
    baseUrl: baseUrlClean,
    endpointPath: `/${pathClean}`,
    apiVersion,
    fullUrl,
  };

  return deepFreeze(result);
}
