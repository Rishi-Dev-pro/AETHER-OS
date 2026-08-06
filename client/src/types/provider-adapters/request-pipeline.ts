/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 3 Component: Request Pipeline (`request-pipeline.ts`)
 *
 * @file request-pipeline.ts
 * @description Request preparation pipeline engine. Assembles provider configurations, endpoint resolution,
 * authentication injection, and Milestone 2 Request Builder into immutable HttpRequest contracts.
 *
 * @module @aether/provider-adapters/request-pipeline
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import type { HttpRequest } from "./transport-types";
import type { PipelineRequestContext } from "./authentication-types";
import { PipelineExecutionError } from "./authentication-errors";
import { resolveEndpoint } from "./endpoint-resolver";
import { generateAuthHeaders } from "./authentication-manager";
import { buildHttpRequest } from "./request-builder";
import { deepFreeze } from "./factories";
import type { CredentialVault } from "../provider-runtime";

/**
 * Executes the request preparation pipeline, converting a PipelineRequestContext into a deeply frozen HttpRequest.
 *
 * Pipeline sequence:
 * 1. Validate Context & Provider Configuration
 * 2. Resolve Target Endpoint URL (EndpointResolver)
 * 3. Generate Authorization Headers (AuthenticationManager)
 * 4. Assemble & Normalize Headers & Query Parameters
 * 5. Construct & Freeze HttpRequest (RequestBuilder)
 *
 * @param context Input pipeline request context.
 * @param vault Optional CredentialVault instance for resolving CredentialReferences.
 * @returns Deeply frozen HttpRequest contract instance ready for transport dispatch.
 * @throws PipelineExecutionError if pipeline assembly fails at any stage.
 */
export async function buildPipelineRequest(
  context: PipelineRequestContext,
  vault?: CredentialVault
): Promise<Readonly<HttpRequest>> {
  if (!context) {
    throw new PipelineExecutionError("Pipeline execution requires a valid PipelineRequestContext.");
  }

  if (!context.providerConfig) {
    throw new PipelineExecutionError("Pipeline execution context requires providerConfig.");
  }

  if (!context.endpointKey || typeof context.endpointKey !== "string" || context.endpointKey.trim() === "") {
    throw new PipelineExecutionError("Pipeline execution context requires a non-empty endpointKey.");
  }

  try {
    // Stage 1: Endpoint Resolution
    const resolvedEndpoint = resolveEndpoint(
      context.providerConfig.endpointConfig,
      context.endpointKey
    );

    // Stage 2: Authentication Header Generation
    const authPayload = await generateAuthHeaders({
      authConfig: context.providerConfig.authConfig,
      vault,
      credentialRef: context.credentialRef,
      rawCredentials: context.rawCredentials,
    });

    // Stage 3: Merge Headers (Auth headers + extra headers)
    const mergedHeaders: Record<string, string> = {
      ...authPayload.headers,
    };

    if (context.extraHeaders) {
      for (const [key, val] of Object.entries(context.extraHeaders)) {
        if (val !== undefined && val !== null) {
          mergedHeaders[key] = String(val);
        }
      }
    }

    // Stage 4: Milestone 2 Request Builder Invocation
    const httpRequest = buildHttpRequest({
      method: context.method,
      url: resolvedEndpoint.fullUrl,
      headers: mergedHeaders,
      queryParams: context.queryParams,
      body: context.body,
      timeoutMs: context.providerConfig.defaultTimeoutMs,
      requestId: context.requestId,
    });

    return deepFreeze(httpRequest);
  } catch (err) {
    if (err instanceof PipelineExecutionError) {
      throw err;
    }
    throw new PipelineExecutionError(
      `Request pipeline assembly failed: ${(err as Error).message}`,
      { endpointKey: context.endpointKey, providerId: context.providerConfig.providerId }
    );
  }
}
