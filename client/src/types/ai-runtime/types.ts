/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 1: Shared Runtime Types & Enums (`types.ts`)
 *
 * @file types.ts
 * @description Foundation layer shared runtime types, enums, metadata descriptors,
 * correlation contexts, usage metrics, and state definitions for Phase 9.4.
 *
 * @module @aether/ai-runtime/types
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT
 */

// ============================================================================
// 1. SYSTEM ENUMS
// ============================================================================

/**
 * Formal lifecycle states for the Phase 9.4 Non-Reentrant Finite State Machine (FSM).
 * State transitions are atomic, strictly guarded, and enforced by the Runtime Orchestrator.
 */
export enum FsmState {
  /** Request envelope instantiated and validated against system invariants */
  CREATED = "CREATED",
  /** Enqueued in Request Scheduler priority queue awaiting concurrency allocation */
  QUEUED = "QUEUED",
  /** Strategy Router mapping abstract model tier to concrete Provider Plugin */
  RESOLVING_PROVIDER = "RESOLVING_PROVIDER",
  /** Provider Plugin encoding canonical AIRequest into vendor wire protocol format */
  TRANSLATING_PAYLOAD = "TRANSLATING_PAYLOAD",
  /** Transport connection active; awaiting wire response frame or stream start */
  EXECUTING_TRANSPORT = "EXECUTING_TRANSPORT",
  /** Actively ingesting real-time token deltas and updating stream buffer */
  STREAMING = "STREAMING",
  /** Response payload undergoing structural, schema, and integrity verification */
  VALIDATING = "VALIDATING",
  /** Mapping vendor output into canonical immutable AIResponse envelope */
  NORMALIZING = "NORMALIZING",
  /** Terminal State: Successfully generated, validated, normalized, and emitted */
  COMPLETED = "COMPLETED",
  /** Terminal State: Non-retryable error encountered or retry limits exhausted */
  FAILED = "FAILED",
  /** Terminal State: Execution terminated via explicit cancellation signal */
  CANCELLED = "CANCELLED",
  /** Terminal State: Execution aborted due to provider circuit breaker tripping */
  CIRCUIT_TRIPPED = "CIRCUIT_TRIPPED",
}

/**
 * Request Priority Tiers enforced by the Preemptive Request Scheduler.
 * Lower numerical values denote higher execution priority.
 */
export enum PriorityTier {
  /** OS safety controls, critical system diagnostic recovery (P0) */
  SYSTEM_CRITICAL = 0,
  /** Real-time voice commands, active UI interactions (P1 - Highest SLA) */
  USER_INTERACTIVE = 1,
  /** Proactive agent suggestions, automated context synthesis (P2) */
  BACKGROUND_ROUTINE = 2,
  /** System indexing, bulk memory summarization, audit log analysis (P3) */
  BATCH_PROCESSING = 3,
}

/**
 * Abstract Model Tiers used by upstream systems to request capabilities
 * without binding to concrete vendor model strings.
 */
export enum ModelTier {
  /** High-capacity, multi-step reasoning models (e.g. extended thinking models) */
  REASONING = "REASONING",
  /** Balanced intelligence and latency for general conversational tasks */
  STANDARD = "STANDARD",
  /** Ultra-low latency, high-throughput models for rapid transformation */
  FAST = "FAST",
  /** Multimodal models capable of processing visual perception snapshots */
  VISION = "VISION",
  /** On-device offline models executed strictly via local IPC (e.g. Ollama) */
  LOCAL = "LOCAL",
}

/**
 * System Privacy Modes governing network transport boundaries.
 */
export enum PrivacyMode {
  /** Standard execution allowing cloud or local provider dispatch */
  STANDARD = "STANDARD",
  /** Cloud execution with payload field encryption */
  ENCRYPTED = "ENCRYPTED",
  /** Strict local execution; cloud network dispatch throws SecurityError */
  LOCAL_ONLY = "LOCAL_ONLY",
}

/**
 * Structured Logging Categories for diagnostic classification.
 */
export enum LogCategory {
  SYSTEM = "SYSTEM",
  ORCHESTRATOR = "ORCHESTRATOR",
  SCHEDULER = "SCHEDULER",
  STRATEGY = "STRATEGY",
  PROVIDER = "PROVIDER",
  RESILIENCE = "RESILIENCE",
  VALIDATION = "VALIDATION",
  STREAMING = "STREAMING",
  SECURITY = "SECURITY",
  DIAGNOSTICS = "DIAGNOSTICS",
}

/**
 * Standardized LLM Generation Finish Reasons across all provider backends.
 */
export enum FinishReason {
  /** Natural stop token reached */
  STOP = "STOP",
  /** Maximum token limit or context window reached */
  LENGTH = "LENGTH",
  /** LLM generated one or more structured tool invocation requests */
  TOOL_CALLS = "TOOL_CALLS",
  /** Provider safety filter or content policy redacted the response */
  CONTENT_FILTER = "CONTENT_FILTER",
  /** Transport or generation error forced stream termination */
  ERROR = "ERROR",
  /** Explicit cancellation signal severed execution before completion */
  CANCELLED = "CANCELLED",
}

/**
 * Standard Provider Circuit Breaker States.
 */
export enum CircuitState {
  /** Normal operations; traffic flows to provider */
  CLOSED = "CLOSED",
  /** Degraded operations; requests bypass provider immediately */
  OPEN = "OPEN",
  /** Probing state; single health probe permitted to verify recovery */
  HALF_OPEN = "HALF_OPEN",
}

/**
 * High-level execution outcome classification.
 */
export enum ExecutionResult {
  SUCCESS = "SUCCESS",
  PARTIAL_STREAM = "PARTIAL_STREAM",
  RETRY_HANDLED = "RETRY_HANDLED",
  CIRCUIT_TRIPPED = "CIRCUIT_TRIPPED",
  FATAL_ERROR = "FATAL_ERROR",
}

/**
 * Standardized Root Error Category Codes for AIRuntimeError taxonomy.
 */
export enum ErrorCategoryCode {
  TRANSIENT_ERROR = "TRANSIENT_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  CONTEXT_BOUNDARY_ERROR = "CONTEXT_BOUNDARY_ERROR",
  SAFETY_ERROR = "SAFETY_ERROR",
  SYSTEM_ERROR = "SYSTEM_ERROR",
}


// ============================================================================
// 2. READONLY METADATA & DATA DESCRIPTORS
// ============================================================================

/**
 * Immutable correlation context for end-to-end distributed tracing across
 * Phase 9.1 (Perception), Phase 9.2 (Intent), Phase 9.3 (Prompt), and Phase 9.4.
 */
export interface CorrelationContext {
  /** Unique session identifier for the multi-turn conversation */
  readonly sessionId: string;
  /** Linked Phase 9.1 Perception Snapshot identifier */
  readonly snapshotId: string;
  /** Linked Phase 9.2 Intent Result identifier */
  readonly intentId: string;
  /** Optional multi-tenant organizational identifier */
  readonly tenantId?: string;
  /** Optional OpenTelemetry distributed trace identifier */
  readonly traceId?: string;
}

/**
 * Immutable unified token consumption metrics across vendor models.
 */
export interface TokenUsage {
  /** Number of tokens in input system instructions, context XML, and user text */
  readonly promptTokens: number;
  /** Number of tokens generated in model completion output */
  readonly completionTokens: number;
  /** Total tokens consumed (promptTokens + completionTokens) */
  readonly totalTokens: number;
  /** Optional internal chain-of-thought/reasoning tokens consumed */
  readonly reasoningTokens?: number;
  /** Optional tokens served directly from provider prompt cache */
  readonly cachedTokens?: number;
}

/**
 * Immutable fine-grained timing breakdowns for request SLAs and performance analysis.
 */
export interface LatencyMetrics {
  /** Duration spent waiting in Request Scheduler priority queues (ms) */
  readonly queueDurationMs: number;
  /** Duration spent establishing socket/TLS handshake with provider (ms) */
  readonly connectionDurationMs: number;
  /** Time-To-First-Token: Latency from dispatch to first stream token arrival (ms) */
  readonly timeToFirstTokenMs: number;
  /** Total end-to-end elapsed request lifecycle duration (ms) */
  readonly totalExecutionDurationMs: number;
}

/**
 * Immutable canonical descriptor for LLM tool invocation requests.
 * Phase 9.4 normalizes tool call intents into this structure without executing them.
 */
export interface ToolCallDescriptor {
  /** Unique tool call instance identifier provided by vendor model */
  readonly id: string;
  /** Name of the requested tool function */
  readonly name: string;
  /** Parsed JSON argument key-value object */
  readonly arguments: Readonly<Record<string, unknown>>;
}

/**
 * Immutable diagnostic status summary attached to every AIResponse envelope.
 */
export interface DiagnosticStatus {
  /** Provider identifier (e.g. "openai", "gemini", "claude", "ollama") */
  readonly providerId: string;
  /** Concrete vendor model string resolved by Strategy Router (e.g. "gpt-4o") */
  readonly concreteModel: string;
  /** Total transport attempt count (1 + retries) */
  readonly attemptCount: number;
  /** Status of provider circuit breaker at execution dispatch */
  readonly circuitState: CircuitState;
  /** Final execution outcome summary */
  readonly executionResult: ExecutionResult;
}

/**
 * Immutable structured stream chunk event payload emitted to public OS event bus.
 */
export interface TokenDeltaEvent {
  /** Unique request execution identifier */
  readonly requestId: string;
  /** Incremental text token delta generated by model */
  readonly tokenText: string;
  /** Monotonically increasing chunk sequence index */
  readonly sequenceIndex: number;
  /** Optional intermediate reasoning token indicator */
  readonly isReasoningToken?: boolean;
}
