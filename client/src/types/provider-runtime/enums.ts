/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Foundation Component: Canonical Enums (`enums.ts`)
 *
 * @file enums.ts
 * @description Strongly-typed enum definitions governing provider types, status,
 * lifecycle states, capability flags, selection policies, health states, circuit
 * breaker states, credential types, session types, and failure reasons.
 *
 * @module @aether/provider-runtime/enums
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

/**
 * Supported provider runtime category types.
 */
export enum ProviderType {
  BROWSER = "BROWSER",
  AI_CLOUD = "AI_CLOUD",
  AI_LOCAL = "AI_LOCAL",
  AI_EMBEDDED = "AI_EMBEDDED",
  LOCAL_OS = "LOCAL_OS",
  DESKTOP = "DESKTOP",
  MCP = "MCP",
}

/**
 * High-level provider operational status.
 */
export enum ProviderStatus {
  UNREGISTERED = "UNREGISTERED",
  REGISTERED = "REGISTERED",
  INITIALIZING = "INITIALIZING",
  WARMING_UP = "WARMING_UP",
  READY = "READY",
  BUSY = "BUSY",
  DEGRADED = "DEGRADED",
  UNHEALTHY = "UNHEALTHY",
  DISABLED = "DISABLED",
  DISPOSED = "DISPOSED",
}

/**
 * Formal Provider Lifecycle FSM states.
 */
export enum ProviderLifecycleState {
  UNREGISTERED = "UNREGISTERED",
  REGISTERED = "REGISTERED",
  INITIALIZING = "INITIALIZING",
  WARMING_UP = "WARMING_UP",
  READY = "READY",
  BUSY = "BUSY",
  DEGRADED = "DEGRADED",
  UNHEALTHY = "UNHEALTHY",
  DISABLED = "DISABLED",
  DISPOSED = "DISPOSED",
}

/**
 * Standard capability feature flags supported by provider runtime adapters.
 */
export enum ProviderCapability {
  STREAMING = "STREAMING",
  VISION = "VISION",
  IMAGE_GENERATION = "IMAGE_GENERATION",
  FUNCTION_CALLING = "FUNCTION_CALLING",
  VIDEO = "VIDEO",
  BATCHING = "BATCHING",
  AUDIO = "AUDIO",
  TOOL_USE = "TOOL_USE",
}

/**
 * Routing and provider selection policy strategies.
 */
export enum ProviderSelectionPolicy {
  FIRST_AVAILABLE = "FIRST_AVAILABLE",
  ROUND_ROBIN = "ROUND_ROBIN",
  LOWEST_LATENCY = "LOWEST_LATENCY",
  HIGHEST_AVAILABILITY = "HIGHEST_AVAILABILITY",
  HIGHEST_HEALTH = "HIGHEST_HEALTH",
  LOWEST_COST = "LOWEST_COST",
  PREFER_LOCAL = "PREFER_LOCAL",
  PREFER_CLOUD = "PREFER_CLOUD",
  MANUAL_PRIORITY = "MANUAL_PRIORITY",
  STRICT_PROVIDER = "STRICT_PROVIDER",
  WEIGHTED_SCORE = "WEIGHTED_SCORE",
}

/**
 * Priority levels for execution requests.
 */
export enum ProviderPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  NORMAL = "NORMAL",
  LOW = "LOW",
  BACKGROUND = "BACKGROUND",
}

/**
 * Operational health assessment states.
 */
export enum ProviderHealthState {
  HEALTHY = "HEALTHY",
  DEGRADED = "DEGRADED",
  UNHEALTHY = "UNHEALTHY",
  UNKNOWN = "UNKNOWN",
}

/**
 * Circuit Breaker FSM states.
 */
export enum CircuitBreakerState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

/**
 * Credential types managed exclusively by CredentialVault.
 */
export enum CredentialType {
  API_KEY = "API_KEY",
  OAUTH2 = "OAUTH2",
  JWT = "JWT",
  BEARER_TOKEN = "BEARER_TOKEN",
  CLIENT_CERTIFICATE = "CLIENT_CERTIFICATE",
  TEMPORARY_TOKEN = "TEMPORARY_TOKEN",
}

/**
 * Sources for ProviderConfiguration initialization.
 */
export enum ConfigurationSource {
  DEFAULT = "DEFAULT",
  ENVIRONMENT = "ENVIRONMENT",
  CONFIG_FILE = "CONFIG_FILE",
  INJECTED = "INJECTED",
  DYNAMIC = "DYNAMIC",
}

/**
 * Managed runtime session context types.
 */
export enum SessionType {
  BROWSER_CONTEXT = "BROWSER_CONTEXT",
  BROWSER_PAGE = "BROWSER_PAGE",
  ELECTRON_WINDOW = "ELECTRON_WINDOW",
  MCP_SESSION = "MCP_SESSION",
  AI_CONVERSATION = "AI_CONVERSATION",
  SSH_SESSION = "SSH_SESSION",
  DATABASE_SESSION = "DATABASE_SESSION",
  LONG_LIVED_RUNTIME = "LONG_LIVED_RUNTIME",
}

/**
 * Standard failure reason codes for provider execution errors.
 */
export enum ProviderFailureReason {
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  AUTH_FAILURE = "AUTH_FAILURE",
  CAPABILITY_UNSUPPORTED = "CAPABILITY_UNSUPPORTED",
  CIRCUIT_OPEN = "CIRCUIT_OPEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  BAD_REQUEST = "BAD_REQUEST",
  SERVER_ERROR = "SERVER_ERROR",
}
