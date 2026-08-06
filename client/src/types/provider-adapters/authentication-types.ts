/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 3 Component: Authentication & Pipeline Types (`authentication-types.ts`)
 *
 * @file authentication-types.ts
 * @description Pure, immutable interface contracts defining authentication configurations,
 * auth header payloads, resolved endpoints, provider endpoint maps, adapter provider configs,
 * and request pipeline execution contexts.
 *
 * @module @aether/provider-adapters/authentication-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { AuthenticationType, ProviderVendor } from "./enums";
import type { RequestBody } from "./transport-types";
import type { CredentialReference } from "../provider-runtime";

/**
 * Authentication configuration contract for a provider.
 */
export interface AuthConfig {
  readonly authType: AuthenticationType;
  readonly credentialId?: string;
  readonly headerName?: string;
  readonly tokenPrefix?: string;
}

/**
 * Container payload for generated authorization headers.
 */
export interface AuthHeaderPayload {
  readonly headers: Readonly<Record<string, string>>;
}

/**
 * Result of deterministic endpoint resolution.
 */
export interface ResolvedEndpoint {
  readonly baseUrl: string;
  readonly endpointPath: string;
  readonly apiVersion?: string;
  readonly fullUrl: string;
}

/**
 * Map of endpoints and version settings for a provider.
 */
export interface ProviderEndpointConfig {
  readonly baseUrl: string;
  readonly endpoints: Readonly<Record<string, string>>;
  readonly defaultApiVersion?: string;
}

/**
 * Complete immutable configuration profile for a provider adapter.
 * Contains zero secret payload material.
 */
export interface AdapterProviderConfig {
  readonly providerId: string;
  readonly vendor: ProviderVendor;
  readonly endpointConfig: ProviderEndpointConfig;
  readonly authConfig: AuthConfig;
  readonly defaultTimeoutMs: number;
  readonly supportedModels: ReadonlyArray<string>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Context required to build an authenticated HttpRequest through the pipeline.
 */
export interface PipelineRequestContext {
  readonly providerConfig: AdapterProviderConfig;
  readonly endpointKey: string;
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
  readonly queryParams?: Readonly<Record<string, string | number | boolean>>;
  readonly extraHeaders?: Readonly<Record<string, string>>;
  readonly body?: RequestBody;
  readonly requestId?: string;
  readonly credentialRef?: CredentialReference;
  readonly rawCredentials?: Readonly<Record<string, string>>;
}
