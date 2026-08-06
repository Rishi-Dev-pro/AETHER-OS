/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Provider Models & Configurations (`provider-models.ts`)
 *
 * @file provider-models.ts
 * @description Canonical model identifiers, default endpoints, and provider configuration factories
 * for OpenAI, Groq, NVIDIA NIM, and Ollama.
 *
 * @module @aether/provider-adapters/provider-models
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderVendor, AuthenticationType } from "./enums";
import type { AdapterProviderConfig } from "./authentication-types";
import { createAdapterProviderConfig } from "./provider-configuration";

/** Supported OpenAI model identifiers */
export const OPENAI_MODELS = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4o",
  "gpt-4o-mini",
] as const;

/** Supported Groq model identifiers */
export const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "deepseek-r1-distill-llama-70b",
  "qwen-qwq-32b",
  "mixtral-8x7b-32768",
] as const;

/** Supported NVIDIA NIM model identifiers */
export const NVIDIA_MODELS = [
  "meta/llama-3.3-70b-instruct",
  "mistralai/mistral-large-2-instruct",
  "nvidia/nemotron-4-340b-instruct",
] as const;

/** Supported Ollama model identifiers */
export const OLLAMA_MODELS = [
  "llama3",
  "qwen2.5",
  "mistral",
  "deepseek-r1",
] as const;

/**
 * Creates default secret-free AdapterProviderConfig for OpenAI.
 */
export function createOpenAIProviderConfig(credentialId: string = "openai-credential-id"): Readonly<AdapterProviderConfig> {
  return createAdapterProviderConfig({
    providerId: "openai-provider",
    vendor: ProviderVendor.OPENAI,
    endpointConfig: {
      baseUrl: "https://api.openai.com/v1",
      endpoints: {
        chat: "/chat/completions",
      },
      defaultApiVersion: "v1",
    },
    authConfig: {
      authType: AuthenticationType.BEARER_TOKEN,
      credentialId,
    },
    defaultTimeoutMs: 30000,
    supportedModels: [...OPENAI_MODELS],
  });
}

/**
 * Creates default secret-free AdapterProviderConfig for Groq.
 */
export function createGroqProviderConfig(credentialId: string = "groq-credential-id"): Readonly<AdapterProviderConfig> {
  return createAdapterProviderConfig({
    providerId: "groq-provider",
    vendor: ProviderVendor.GROQ,
    endpointConfig: {
      baseUrl: "https://api.groq.com/openai/v1",
      endpoints: {
        chat: "/chat/completions",
      },
      defaultApiVersion: "v1",
    },
    authConfig: {
      authType: AuthenticationType.BEARER_TOKEN,
      credentialId,
    },
    defaultTimeoutMs: 30000,
    supportedModels: [...GROQ_MODELS],
  });
}

/**
 * Creates default secret-free AdapterProviderConfig for NVIDIA NIM.
 */
export function createNVIDIAProviderConfig(credentialId: string = "nvidia-credential-id"): Readonly<AdapterProviderConfig> {
  return createAdapterProviderConfig({
    providerId: "nvidia-provider",
    vendor: ProviderVendor.NVIDIA,
    endpointConfig: {
      baseUrl: "https://integrate.api.nvidia.com/v1",
      endpoints: {
        chat: "/chat/completions",
      },
      defaultApiVersion: "v1",
    },
    authConfig: {
      authType: AuthenticationType.BEARER_TOKEN,
      credentialId,
    },
    defaultTimeoutMs: 30000,
    supportedModels: [...NVIDIA_MODELS],
  });
}

/**
 * Creates default secret-free AdapterProviderConfig for Ollama (localhost).
 */
export function createOllamaProviderConfig(): Readonly<AdapterProviderConfig> {
  return createAdapterProviderConfig({
    providerId: "ollama-provider",
    vendor: ProviderVendor.OLLAMA,
    endpointConfig: {
      baseUrl: "http://localhost:11434/api",
      endpoints: {
        chat: "/chat",
      },
    },
    authConfig: {
      authType: AuthenticationType.NONE,
    },
    defaultTimeoutMs: 60000,
    supportedModels: [...OLLAMA_MODELS],
  });
}
