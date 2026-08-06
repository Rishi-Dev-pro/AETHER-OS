/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Foundation Component: Canonical Enums (`enums.ts`)
 *
 * @file enums.ts
 * @description Strongly-typed enum definitions governing provider adapter types, status,
 * model capabilities, streaming modes, authentication types, priorities, request/response types,
 * model families, and vendor definitions.
 *
 * @module @aether/provider-adapters/enums
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

/**
 * Supported AI provider adapter category types.
 */
export enum ProviderAdapterType {
  OPENAI = "OPENAI",
  NVIDIA = "NVIDIA",
  GROQ = "GROQ",
  OLLAMA = "OLLAMA",
  ANTHROPIC = "ANTHROPIC",
  GEMINI = "GEMINI",
  CUSTOM = "CUSTOM",
}

/**
 * Operational state of an individual provider adapter instance.
 */
export enum AdapterStatus {
  UNINITIALIZED = "UNINITIALIZED",
  INITIALIZING = "INITIALIZING",
  READY = "READY",
  DEGRADED = "DEGRADED",
  FAULTED = "FAULTED",
  DISPOSED = "DISPOSED",
}

/**
 * High-level capabilities supported by provider adapters.
 */
export enum AdapterCapability {
  TEXT_GENERATION = "TEXT_GENERATION",
  STREAMING = "STREAMING",
  VISION = "VISION",
  EMBEDDING = "EMBEDDING",
  SPEECH = "SPEECH",
  IMAGE_GENERATION = "IMAGE_GENERATION",
  TOOL_CALLING = "TOOL_CALLING",
  REASONING = "REASONING",
  JSON_MODE = "JSON_MODE",
  STRUCTURED_OUTPUT = "STRUCTURED_OUTPUT",
  FUNCTION_CALLING = "FUNCTION_CALLING",
}

/**
 * Granular modality and feature capabilities of individual AI models.
 */
export enum ModelCapability {
  TEXT = "TEXT",
  VISION = "VISION",
  AUDIO = "AUDIO",
  EMBEDDINGS = "EMBEDDINGS",
  IMAGE_GEN = "IMAGE_GEN",
  TOOLS = "TOOLS",
  REASONING = "REASONING",
  SYSTEM_PROMPT = "SYSTEM_PROMPT",
}

/**
 * Supported streaming protocol modes.
 */
export enum StreamingMode {
  NONE = "NONE",
  SERVER_SENT_EVENTS = "SERVER_SENT_EVENTS",
  WEBSOCKET = "WEBSOCKET",
  CHUNKED_TRANSFER = "CHUNKED_TRANSFER",
}

/**
 * Supported authentication mechanisms for provider endpoints.
 */
export enum AuthenticationType {
  NONE = "NONE",
  API_KEY = "API_KEY",
  BEARER_TOKEN = "BEARER_TOKEN",
  OAUTH2 = "OAUTH2",
  CUSTOM_HEADER = "CUSTOM_HEADER",
}

/**
 * Dispatch and routing priority levels for provider adapters.
 */
export enum AdapterPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Categorization of incoming execution requests.
 */
export enum RequestType {
  TEXT = "TEXT",
  VISION = "VISION",
  EMBEDDING = "EMBEDDING",
  SPEECH = "SPEECH",
  IMAGE = "IMAGE",
  TOOL = "TOOL",
}

/**
 * Categorization of returned provider responses.
 */
export enum ResponseType {
  TEXT = "TEXT",
  STREAM_CHUNK = "STREAM_CHUNK",
  EMBEDDING = "EMBEDDING",
  AUDIO = "AUDIO",
  IMAGE = "IMAGE",
  TOOL_RESULT = "TOOL_RESULT",
}

/**
 * Architectural model family lineages.
 */
export enum ModelFamily {
  GPT = "GPT",
  CLAUDE = "CLAUDE",
  GEMINI = "GEMINI",
  LLAMA = "LLAMA",
  MISTRAL = "MISTRAL",
  DEEPSEEK = "DEEPSEEK",
  CUSTOM = "CUSTOM",
}

/**
 * Upstream provider vendors and organizations.
 */
export enum ProviderVendor {
  OPENAI = "OPENAI",
  NVIDIA = "NVIDIA",
  GROQ = "GROQ",
  OLLAMA = "OLLAMA",
  ANTHROPIC = "ANTHROPIC",
  GOOGLE = "GOOGLE",
  META = "META",
  CUSTOM = "CUSTOM",
}
