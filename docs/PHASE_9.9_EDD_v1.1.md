# AETHER OS — Engineering Design Document (EDD)
## Phase 9.9 — Provider Runtime Layer
### Version: 1.1 (Production Engineering Refinement Specification)
### Target Subsystem: `@aether/provider-runtime`
### Status: FROZEN ARCHITECTURE SPECIFICATION

---

## 1. Vision

The Provider Runtime Layer (`@aether/provider-runtime`) serves as the hardware and software driver abstraction boundary of AETHER OS. It bridges the abstract, provider-independent Action Execution Framework (Phase 9.8) to concrete drivers and APIs (Playwright, Node FS, Groq API, NVIDIA NIM API, Electron, MCP Clients, OpenAI, Anthropic, Ollama, Local LLMs, etc.) while preserving strict architectural purity, zero secrets leakage, OS-grade reliability, explicit resource ownership, and deterministic failover routing.

In Version 1.1, the subsystem introduces refined operational boundaries: separating session state lifecycle (`ProviderSessionManager`), isolating circuit breaker transitions (`CircuitBreakerEngine`), adding pre-selection capability negotiation (`CapabilityNegotiator`), decoupling immutable non-secret configuration (`ProviderConfiguration`) from secret payloads (`CredentialVault`), formalizing optional warmup hooks (`WARMING_UP`), and enforcing hard plugin isolation rules.

---

## 2. Goals

1. **Strict Inversion of Control**: Ensure Phase 9.7 (Action Planning) and Phase 9.8 (Action Execution) remain 100% frozen and completely unaware of vendor SDKs or driver implementations.
2. **Zero Secrets Leakage**: Enforce `CredentialVault` as the exclusive owner of secrets (API keys, OAuth tokens, JWTs, client certificates, OS keychains). Providers receive only transient, immutable configuration objects (`ProviderConfiguration`) and execution references.
3. **Dedicated Session Management**: Delegate runtime session ownership (Browser Context, Electron Window, MCP Session, SSH, DB) to `ProviderSessionManager` to isolate state lifecycle from routing and health scoring.
4. **Decoupled Circuit Breaker & Health Management**: Explicitly segregate operational metric collecting (`ProviderHealthManager`) from state machine state transition logic (`CircuitBreakerEngine`).
5. **Deterministic Capability Negotiation**: Intercept requests prior to provider selection to filter candidates based on negotiated feature subsets (e.g., vision, streaming, function calling) rather than raw metadata lists.
6. **Deterministic Selection & Fallback**: Implement deterministic provider selection policies and a weighted scoring engine (Health, Capability Match, Latency, Cost, Priority) to handle failover seamlessly.
7. **Formal Finite State Machines**: Govern provider lifecycle (`UNREGISTERED` $\rightarrow$ `WARMING_UP` $\rightarrow$ `READY` $\rightarrow$ `DISPOSED`) and Circuit Breaker states (`CLOSED`, `OPEN`, `HALF_OPEN`) with fail-fast validation against illegal transitions.
8. **Expanded Immutable Execution Context**: Inject a deeply frozen `ProviderExecutionContext` payload into every provider call, expanded with `sessionId`, `providerId`, `providerType`, `selectionPolicy`, and `executionPriority`.
9. **Strict Plugin Isolation**: Enforce multi-layered security boundaries to prevent third-party plugins from accessing vaults, mutating registries, or bypassing selector logic.
10. **Deterministic Boot Sequence**: Enforce a strict 9-step startup pipeline guarantees zero timing-dependent initialization order.

---

## 3. Non-Goals

The Provider Runtime Layer explicitly DOES NOT perform:

1. **No Direct Tool/Driver Execution**: Phase 9.9 defines manager orchestrators and abstract adapter contracts. It does NOT make raw HTTP network calls, perform browser automation, write files, or execute CLI commands (these belong to external driver packages).
2. **No Plan Generation or Resolution**: Does not parse cognitive context into plans (Phase 9.7) or resolve target tool bindings (Phase 9.8).
3. **No Retries or Swallowed Failures**: Does not silently swallow exceptions or perform hidden retry loops. Failures trigger fail-fast domain exceptions or explicit fallback selection.
4. **No Telemetry, Analytics, Logging, or Monitoring**: Does not write to external logging servers, produce telemetry streams, or integrate with APM tools. Operational metrics are strictly in-memory numeric routing signals for `ProviderSelector`.
5. **No Persistent Credentials Storage**: Does not store unencrypted secrets on disk. Secrets live strictly inside memory-protected `CredentialVault` or native OS Keychains.
6. **No Health Probing in ProviderSessionManager**: `ProviderSessionManager` handles lifecycle of contexts only; it never performs health checks, provider selection, or tool executions.

---

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       PHASE 9.8: ACTION EXECUTION FRAMEWORK                             │
│       (ExecutionBoundaryValidator, ExecutionRegistry, ExecutionEngine Runtime)          │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │ Invokes ExecutionUnit.execute(descriptor)
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 9.9: PROVIDER RUNTIME LAYER                                │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                               ProviderManager                                   │   │
│   │                               (Public Façade)                                   │   │
│   └─┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬────┘   │
│     │              │              │              │              │              │        │
│     ▼              ▼              ▼              ▼              ▼              ▼        │
│┌─────────┐   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐ │
││Provider │   │Capability │  │ Provider  │  │ Provider  │  │  Circuit  │  │  Provider  │ │
││Registry │   │Negotiator │  │ Selector  │  │  Health   │  │  Breaker  │  │  Session   │ │
││(Catalog │   │(Feature   │  │(Weighted  │  │  Manager  │  │  Engine   │  │  Manager   │ │
││& Freeze)│   │ Filtering)│  │ Scoring)  │  │ (Metrics) │  │(State FSM)│  │ (Contexts) │ │
│└─────────┘   └───────────┘  └───────────┘  └───────────┘  └───────────┘  └────────────┘ │
│                                    │              │              │              │       │
│                                    └──────┬───────┴──────────────┘              │       │
│                                           ▼                                     │       │
│   ┌────────────────────────────────────────────────────────────────────────┐    │       │
│   │                       ProviderLifecycleManager                         │    │       │
│   │       (FSM: REGISTERED -> INITIALIZING -> WARMING_UP -> READY)         │    │       │
│   └───────────────────────────────────────┬────────────────────────────────┘    │       │
│                                           │                                     │       │
│   ┌───────────────────────────────────────┴────────────────────────────────┐    │       │
│   │                     ProviderConfiguration (Immutable)                  │    │       │
│   │      (Model, Timeout, BaseURL, Temperature, Proxy, Region, MaxTokens)    │    │       │
│   └───────────────────────────────────────┬────────────────────────────────┘    │       │
│                                           │                                     │       │
│   ┌───────────────────────────────────────┴────────────────────────────────┐    │       │
│   │                           CredentialVault                              │    │       │
│   │      (API Keys, OAuth, JWT, OS Keychains Secrets Exclusive Owner)      │    │       │
│   └───────────────────────────────────────┬────────────────────────────────┘    │       │
│                                           │                                     │       │
│   ┌───────────────────────────────────────┴────────────────────────────────┐    │       │
│   │                       Provider Adapter Contracts                       │    │       │
│   │  (BrowserAdapter, AIAdapter, OSAdapter, MCPAdapter, DesktopAdapter)    │◄───┘       │
│   └───────────────────────────────────────┬────────────────────────────────┘            │
└───────────────────────────────────────────┼─────────────────────────────────────────────┘
                                            │ Concrete Driver Bindings
             ┌──────────────────────────────┼────────────────────────────┐
             ▼                              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────┐
│   Browser Drivers        │  │    AI / LLM Drivers      │  │  Local / OS      │
│ (Playwright / Selenium)  │  │(Groq/NVIDIA/Ollama/OA)   │  │(Node FS/Electron)│
└──────────────────────────┘  └──────────────────────────┘  └──────────────────┘
```

---

## 5. Package Layout

```
packages/
├── @aether/provider-runtime/           # Phase 9.9 Core Framework Subsystem
│   ├── src/
│   │   ├── provider-types.ts           # Immutable domain interfaces & contracts
│   │   ├── provider-configuration.ts   # Immutable ProviderConfiguration object
│   │   ├── provider-execution-context.ts # Expanded ProviderExecutionContext payload
│   │   ├── provider-errors.ts          # Fail-fast domain exception hierarchy
│   │   ├── provider-registry.ts        # Provider catalog & freeze rules
│   │   ├── capability-negotiator.ts    # Deterministic Capability Negotiation Stage
│   │   ├── provider-selector.ts        # Weighted ranking & policy selection
│   │   ├── provider-lifecycle-manager.ts # Provider Lifecycle FSM (with WARMING_UP)
│   │   ├── provider-health-manager.ts  # Latency, success/failure counts, score owner
│   │   ├── circuit-breaker-engine.ts   # Circuit Breaker state machine (CLOSED/OPEN/HALF_OPEN)
│   │   ├── provider-session-manager.ts # Driver session context lifecycle manager
│   │   ├── credential-vault.ts         # Isolated secrets owner & keychain bridge
│   │   ├── provider-manager.ts         # Public façade orchestrating internal modules
│   │   ├── adapters/                   # Abstract provider adapter contracts
│   │   │   ├── base-provider-adapter.ts
│   │   │   ├── browser-provider-adapter.ts
│   │   │   ├── ai-provider-adapter.ts
│   │   │   ├── desktop-provider-adapter.ts
│   │   │   ├── local-os-provider-adapter.ts
│   │   │   └── mcp-provider-adapter.ts
│   │   └── index.ts                    # Barrel export
│   └── __tests__/                      # Unit & integration test suites
```

---

## 6. Public & Internal Modules Specifications

### 6.1 `ProviderManager` (Public Façade)
- **Responsibilities**: External entry point orchestrating high-level provider operations across Registry, CapabilityNegotiator, Selector, LifecycleManager, HealthManager, CircuitBreakerEngine, SessionManager, and Vault.
- **Non-Responsibilities**: Does not manage FSM state mutations directly, execute driver commands, or store raw secret bytes.
- **Invariants**: Single public façade; delegates session management to `ProviderSessionManager`; delegates circuit state to `CircuitBreakerEngine`; delegates capability negotiation to `CapabilityNegotiator`; passes immutable `ProviderConfiguration`.
- **Inputs**: `SecuredExecutionPlan`, `ProviderExecutionContext`, `ExecutionDescriptor`.
- **Outputs**: `Readonly<ExecutionWorkerResult>`, `Readonly<ProviderExecutionResult>`.
- **Dependencies**: `ProviderRegistry`, `CapabilityNegotiator`, `ProviderSelector`, `ProviderLifecycleManager`, `ProviderHealthManager`, `CircuitBreakerEngine`, `ProviderSessionManager`, `CredentialVault`, `ProviderConfiguration`.
- **Failure Conditions**: Throws `ProviderManagerError` or `ProviderSelectionError`.
- **Thread Safety**: Fully thread-safe, stateless orchestration.
- **Determinism Guarantees**: Identical inputs yield 100% identical delegation sequences.
- **Immutability Guarantees**: All return objects pass `Object.isFrozen()`.

### 6.2 `ProviderRegistry`
- **Responsibilities**: Maintains canonical catalog of registered provider adapters, indexes capability descriptors, enforces the Read-Only Freeze Rule.
- **Non-Responsibilities**: Does not evaluate health metrics, run capability negotiations, or manage driver sessions.
- **Invariants**: Unit IDs are unique; catalog list outputs are sorted alphabetically by `providerId`; once frozen, mutation throws `ProviderRegistryFrozenError`.
- **Inputs**: `Readonly<ProviderMetadata>`, `Readonly<ProviderAdapter>`.
- **Outputs**: `Readonly<ProviderRegistrySnapshot>`, `readonly Readonly<ProviderEntry>[]`.
- **Dependencies**: Domain contracts, `factories.ts`.
- **Failure Conditions**: Throws `DuplicateProviderError`, `ProviderRegistryFrozenError`.
- **Thread Safety**: Thread-safe internal Map accesses.
- **Determinism Guarantees**: Alphabetical sorting (`localeCompare`) guarantees deterministic lookup arrays.
- **Immutability Guarantees**: Snapshots and entries are deeply frozen.

### 6.3 `CapabilityNegotiator`
- **Responsibilities**: Performs a deterministic capability negotiation stage prior to provider selection. Validates requested feature demands against provider capability metadata.
- **Non-Responsibilities**: Does not calculate weighted health scores or select final providers.
- **Invariants**: Returns exact `Supported` and `Unsupported` capability partitions; deterministic execution without side effects.
- **Inputs**: `Readonly<ExecutionCapabilityRequirements>`, `Readonly<ProviderMetadata>`.
- **Outputs**: `Readonly<CapabilityNegotiationResult>` containing `supportedCapabilities` and `unsupportedCapabilities`.
- **Dependencies**: `provider-types.ts`, `provider-errors.ts`.
- **Failure Conditions**: Throws `CapabilityNegotiationError` if mandatory required capabilities are unsupported.
- **Thread Safety**: Pure stateless evaluation.
- **Determinism Guarantees**: Identical capability requests and metadata yield identical negotiation results.
- **Immutability Guarantees**: Output result object is deeply frozen.

### 6.4 `ProviderSelector`
- **Responsibilities**: Evaluates provider selection policies (`FIRST_AVAILABLE`, `LOWEST_LATENCY`, `LOWEST_COST`, `PREFER_LOCAL`, etc.) using negotiated capabilities rather than raw capability arrays, calculating deterministic weighted ranking scores.
- **Non-Responsibilities**: Does not initialize provider instances or manage session tokens.
- **Invariants**: Ranking formula produces a deterministic score; ties broken by lexicographical `providerId` sorting.
- **Inputs**: `ExecutionDescriptor`, `SelectionPolicy`, `readonly ProviderEntry[]`, `ProviderHealthMetrics`, `CapabilityNegotiationResult`.
- **Outputs**: `Readonly<ProviderSelectionResult>` containing ranked candidate list $[P_1, P_2, \dots]$.
- **Dependencies**: `CapabilityNegotiator`, `ProviderHealthManager`, `CircuitBreakerEngine`, `ProviderRegistry`.
- **Failure Conditions**: Throws `NoEligibleProviderError` if zero providers satisfy constraints.
- **Thread Safety**: Stateless mathematical calculation.
- **Determinism Guarantees**: Identical health metrics, negotiated capabilities, and policies yield identical ranking order.
- **Immutability Guarantees**: Returned selection arrays pass `Object.isFrozen()`.

### 6.5 `ProviderLifecycleManager`
- **Responsibilities**: Governs formal Provider Lifecycle FSM (`UNREGISTERED` $\rightarrow$ `INITIALIZING` $\rightarrow$ `WARMING_UP` $\rightarrow$ `READY` $\rightarrow$ `DISPOSED`), managing state changes, warmup initialization, shutdown, and resource cleanup hooks.
- **Non-Responsibilities**: Does not manage circuit breaker states or secret vaults.
- **Invariants**: Only legal state machine transitions permitted; state history is append-only.
- **Inputs**: `providerId`, target `ProviderLifecycleState`.
- **Outputs**: `ProviderLifecycleState`, state transition history snapshot.
- **Dependencies**: `provider-types.ts`, `provider-errors.ts`.
- **Failure Conditions**: Throws `IllegalProviderLifecycleTransitionError`.
- **Thread Safety**: Synchronous atomic state transitions.
- **Determinism Guarantees**: FSM state progression is strictly deterministic.
- **Immutability Guarantees**: History array copy is deeply frozen.

### 6.6 `ProviderHealthManager`
- **Responsibilities**: Tracks operational metrics exclusively (latency measurements, success counts, failure counts, availability score, queue depth) for routing decisions.
- **Non-Responsibilities**: Does NOT own Circuit Breaker FSM state transitions (delegated to `CircuitBreakerEngine`). Does NOT persist metrics or emit telemetry/analytics.
- **Invariants**: Metrics exist strictly in memory; updates occur atomically.
- **Inputs**: `providerId`, probe results, execution outcomes (latency, status).
- **Outputs**: `Readonly<ProviderHealthMetrics>`.
- **Dependencies**: `provider-types.ts`, `provider-errors.ts`.
- **Failure Conditions**: Throws `ProviderHealthError`.
- **Thread Safety**: Atomic in-memory updates.
- **Determinism Guarantees**: Health score computed using deterministic mathematical algorithms.
- **Immutability Guarantees**: Metric snapshots pass `Object.isFrozen()`.

### 6.7 `CircuitBreakerEngine`
- **Responsibilities**: Owns Circuit Breaker state machine (`CLOSED`, `OPEN`, `HALF_OPEN`), transition rules, cooldown timers, failure thresholds, and trial execution logic.
- **Non-Responsibilities**: Does not compute availability scores or store latency metrics.
- **Invariants**: State transitions strictly follow failure thresholds and cooldown rules; isolates circuit evaluation from health metrics collection.
- **Inputs**: `providerId`, execution success/failure signal, current timestamp.
- **Outputs**: `CircuitBreakerState`, `Readonly<CircuitBreakerStatus>`.
- **Dependencies**: `provider-types.ts`, `provider-errors.ts`.
- **Failure Conditions**: Throws `CircuitBreakerOpenError`.
- **Thread Safety**: Atomic state updates per provider.
- **Determinism Guarantees**: State transitions depend deterministically on failure counts and explicit timestamps.
- **Immutability Guarantees**: Status snapshots pass `Object.isFrozen()`.

### 6.8 `ProviderSessionManager`
- **Responsibilities**: Manages provider runtime driver sessions (Browser Context, Browser Page, Electron Window, MCP Session, AI Conversation Session, SSH Session, Database Session, Long-lived Runtime Contexts). Implements `createSession()`, `reuseSession()`, `releaseSession()`, `destroySession()`, `timeoutSession()`, `cleanupSession()`.
- **Non-Responsibilities**: NO provider selection, NO health checks, NO credential ownership, NO execution orchestration, NO tool execution.
- **Invariants**: Session IDs are globally unique UUID v4 strings; session maps are isolated; expired sessions are cleaned deterministically.
- **Inputs**: `providerId`, `sessionType`, `sessionConfig`.
- **Outputs**: `Readonly<ProviderSessionHandle>`.
- **Dependencies**: `provider-types.ts`, `provider-errors.ts`.
- **Failure Conditions**: Throws `ProviderSessionError`, `SessionNotFoundError`, `SessionTimeoutError`.
- **Thread Safety**: Thread-safe session tracking.
- **Determinism Guarantees**: Session allocation and recycling follow strict FIFO lifecycle policies.
- **Immutability Guarantees**: Handles returned pass `Object.isFrozen()`.

### 6.9 `ProviderConfiguration`
- **Responsibilities**: Immutable container for provider operational non-secret parameters (`model`, `timeout`, `temperature`, `maxTokens`, `baseURL`, `proxy`, `region`, `endpoint`, custom runtime configs).
- **Non-Responsibilities**: Does NOT store API keys, tokens, or secret bytes (owned by `CredentialVault`).
- **Invariants**: 100% secret-free; deeply frozen upon instantiation; immutable across execution lifecycles.
- **Inputs**: Configuration properties dictionary.
- **Outputs**: `Readonly<ProviderConfiguration>`.
- **Dependencies**: `provider-types.ts`.
- **Failure Conditions**: Throws `ProviderConfigurationError` on invalid property types or secret inclusion.
- **Thread Safety**: Immutable, thread-safe value object.
- **Determinism Guarantees**: Value equivalence guaranteed by frozen state.
- **Immutability Guarantees**: Enforces `deepFreeze()`.

### 6.10 `CredentialVault`
- **Responsibilities**: Exclusive owner and guardian of secret material (API keys, OAuth tokens, JWTs, client certificates, native OS Keychain bindings).
- **Non-Responsibilities**: Does not hold non-secret runtime configs or construct request headers directly.
- **Invariants**: Secrets never leak into public fields or logs; zero secrets leakage guarantee.
- **Inputs**: Secret reference IDs, secret payloads, OS keychain keys.
- **Outputs**: Transient credential reference handles.
- **Dependencies**: System keychains, `provider-errors.ts`.
- **Failure Conditions**: Throws `CredentialNotFoundError`, `CredentialAccessDeniedError`.
- **Thread Safety**: Secure thread-safe memory vault.
- **Determinism Guarantees**: Key retrieval maps deterministically to secret references.
- **Immutability Guarantees**: Secret descriptors are deeply frozen.

### 6.11 `Adapter Contracts`
- **Responsibilities**: Structural specifications for domain-specific provider adapters (Browser, AI Cloud/Local/Embedded, Desktop, OS, MCP).
- **Non-Responsibilities**: Do not handle core orchestration or credential storage.
- **Invariants**: Adapters implement `BaseProviderAdapter`; `execute()` accepts expanded `ProviderExecutionContext`.
- **Inputs**: `ProviderExecutionContext`, step parameter dictionary.
- **Outputs**: `Promise<Readonly<ExecutionWorkerResult>>`.
- **Dependencies**: `provider-types.ts`, `provider-configuration.ts`.
- **Failure Conditions**: Throws `ProviderInitializationError` or domain execution errors.
- **Thread Safety**: Defined per adapter specification (`isThreadSafe`).
- **Determinism Guarantees**: Execution inputs map to deterministic worker result envelopes.
- **Immutability Guarantees**: Execution descriptors and results pass `Object.isFrozen()`.

---

## 7. Domain Model (Contracts & Interfaces)

```ts
export type ProviderType =
  | "BROWSER"
  | "AI_CLOUD"
  | "AI_LOCAL"
  | "AI_EMBEDDED"
  | "LOCAL_OS"
  | "DESKTOP"
  | "MCP";

export type SelectionPolicy =
  | "FIRST_AVAILABLE"
  | "ROUND_ROBIN"
  | "LOWEST_LATENCY"
  | "LOWEST_COST"
  | "PREFER_LOCAL"
  | "PREFER_CLOUD"
  | "MANUAL_PRIORITY"
  | "STRICT_PROVIDER";

export type SessionType =
  | "BROWSER_CONTEXT"
  | "BROWSER_PAGE"
  | "ELECTRON_WINDOW"
  | "MCP_SESSION"
  | "AI_CONVERSATION"
  | "SSH_SESSION"
  | "DATABASE_SESSION"
  | "LONG_LIVED_RUNTIME";

export interface CapabilityMetadata {
  readonly capabilityId: string;
  readonly supportsStreaming: boolean;
  readonly supportsVision: boolean;
  readonly supportsImageGeneration: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly supportsVideo: boolean;
  readonly supportsBatching: boolean;
  readonly maximumImageResolution?: { readonly width: number; readonly height: number };
  readonly maximumTokens?: number;
  readonly maximumContextWindow?: number;
  readonly customMetadata?: Readonly<Record<string, unknown>>;
}

export interface ProviderCapabilityDescriptor {
  readonly capability: string;
  readonly metadata: Readonly<CapabilityMetadata>;
}

export interface CapabilityNegotiationResult {
  readonly supportedCapabilities: readonly string[];
  readonly unsupportedCapabilities: readonly string[];
  readonly isFullyCompatible: boolean;
}

export interface ProviderMetadata {
  readonly providerId: string;
  readonly providerType: ProviderType;
  readonly version: string;
  readonly minFrameworkVersion: string;
  readonly vendor: string;
  readonly capabilities: readonly Readonly<ProviderCapabilityDescriptor>[];
  readonly defaultTimeoutMs: number;
  readonly supportsWarmup: boolean;
}
```

---

## 8. Error Hierarchy

All Phase 9.9 exceptions extend `ExecutionError` from Phase 9.8 (`@aether/action-execution`):

```
ExecutionError (Phase 9.8 Base Exception)
  │
  ├── ProviderError
  │     ├── ProviderInitializationError
  │     ├── ProviderConfigurationError
  │     └── ProviderManagerError
  │
  ├── ProviderRegistryError
  │     ├── DuplicateProviderError
  │     ├── ProviderNotFoundError
  │     └── ProviderRegistryFrozenError
  │
  ├── CapabilityNegotiationError
  │     └── IncompatibleCapabilityError
  │
  ├── ProviderLifecycleError
  │     └── IllegalProviderLifecycleTransitionError
  │
  ├── ProviderSelectionError
  │     └── NoEligibleProviderError
  │
  ├── ProviderHealthError
  │     └── ProviderHealthCheckError
  │
  ├── CircuitBreakerError
  │     └── CircuitBreakerOpenError
  │
  ├── ProviderSessionError
  │     ├── SessionNotFoundError
  │     ├── SessionTimeoutError
  │     └── SessionAllocationError
  │
  └── CredentialError
        ├── CredentialNotFoundError
        └── CredentialAccessDeniedError
```

---

## 9. Provider Lifecycle FSM

Provider lifecycle transitions are strictly governed by `ProviderLifecycleManager`. Version 1.1 introduces an **optional `WARMING_UP` state** between `INITIALIZING` and `READY` to support asynchronous driver warmup (browser launch, AI model preload, MCP handshake, desktop initialization).

```
 UNREGISTERED
      │
      ▼ (register)
  REGISTERED
      │
      ▼ (initialize)
 INITIALIZING
      │
      ├─────────────────────────┐ (optional warmup)
      │                         ▼
      │                    WARMING_UP
      │                         │
      ▼ (startup complete)      ▼ (warmup complete)
    READY ◄─────────────────────┴─┐ (recovery / re-enable)
      │ └─────────────────┐       │
      │ (dispatch)        │       │
      ▼                   ▼       │
    BUSY              DEGRADED ───┤
      │                   │       │
      ▼ (complete/idle)   ▼ (probe fail)
    READY             UNHEALTHY ──┘
      │                   │
      ▼ (disable)         ▼ (fatal failure)
   DISABLED ──────────► DISPOSED
```

### State Transition Rules Table:

| From State | Legal Target States | Trigger Action / Hook |
| :--- | :--- | :--- |
| `UNREGISTERED` | `REGISTERED` | `register()` |
| `REGISTERED` | `INITIALIZING`, `DISPOSED` | `initialize()` |
| `INITIALIZING` | `WARMING_UP` (optional), `READY`, `UNHEALTHY`, `DISPOSED` | `warmup()` / `completeInit()` |
| `WARMING_UP` | `READY`, `UNHEALTHY`, `DISPOSED` | `warmupComplete()` |
| `READY` | `BUSY`, `DEGRADED`, `UNHEALTHY`, `DISABLED`, `DISPOSED` | `dispatch()` / health decay |
| `BUSY` | `READY`, `DEGRADED`, `UNHEALTHY`, `DISPOSED` | `executionDone()` |
| `DEGRADED` | `READY`, `UNHEALTHY`, `DISABLED`, `DISPOSED` | `healthProbe()` |
| `UNHEALTHY` | `READY`, `DISABLED`, `DISPOSED` | `recoveryProbe()` |
| `DISABLED` | `READY`, `DISPOSED` | `enable()` |
| `DISPOSED` | *None (Terminal State)* | `destroy()` |

Any illegal transition attempt immediately throws `IllegalProviderLifecycleTransitionError`.

---

## 10. Circuit Breaker FSM

`CircuitBreakerEngine` owns isolated Circuit Breaker state transitions for each registered provider:

```
  CLOSED (Healthy - Requests Routed Normally)
    │  ▲
    │  │ (consecutive trial successes >= threshold)
    │  │
    ▼  │
   OPEN (Failing - Fast Fail / Requests Bypassed)
    │
    ▼ (cooldown period expires)
 HALF_OPEN (Trial Execution / Probes)
    │
    └───────────► OPEN (trial execution failed)
```

### Transition Conditions & Rules:
- **`CLOSED` $\rightarrow$ `OPEN`**: Triggered when `consecutiveFailures >= failureThreshold` (e.g., 3 consecutive timeouts or 5xx errors).
- **`OPEN` $\rightarrow$ `HALF_OPEN`**: Triggered automatically when `currentTimeMs - openTimestampMs >= cooldownPeriodMs` (e.g., 30,000ms).
- **`HALF_OPEN` $\rightarrow$ `CLOSED`**: Triggered when `consecutiveTrialSuccesses >= successThreshold` (e.g., 2 consecutive successful trial calls).
- **`HALF_OPEN` $\rightarrow$ `OPEN`**: Triggered immediately if any trial execution fails during `HALF_OPEN` state.

---

## 11. Provider Boot Sequence

Startup order in Phase 9.9 is strictly deterministic and linear. No provider initialization order may depend on runtime timing, network responses, or asynchronous race conditions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Load Configuration (ProviderConfiguration objects initialized)           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Load Credentials (CredentialVault references prepared)                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Create Registry (ProviderRegistry catalog instantiated)                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Register Providers (Provider adapters added, catalog frozen)             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. Initialize Providers (ProviderLifecycleManager -> INITIALIZING)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. Warm Providers (Optional WARMING_UP stage for supported adapters)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. Health Probes (Initial ping probe via ProviderHealthManager)             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. Circuit Breakers (CircuitBreakerEngine initialized to CLOSED)            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 9. Ready (Providers enter READY state; ProviderManager façade unlocked)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Capability Negotiation Engine

Before provider selection, `CapabilityNegotiator` evaluates the requested capabilities against candidate providers.

### Execution Flow & Rules:
1. **Extraction**: `CapabilityNegotiator` extracts mandatory and optional capability demands from `ExecutionDescriptor`.
2. **Matching**: Compares required capabilities (`streaming`, `vision`, `image generation`, `function calling`) with `ProviderMetadata.capabilities`.
3. **Partitioning**: Produces a `CapabilityNegotiationResult` split into:
   - `supportedCapabilities`: Capabilities satisfied by provider.
   - `unsupportedCapabilities`: Capabilities requested but missing in provider.
4. **Filtering**: `ProviderSelector` ignores providers where mandatory capabilities reside in `unsupportedCapabilities`.
5. **Incompatibility Handling**: If no provider satisfies all mandatory capabilities, `CapabilityNegotiator` throws `IncompatibleCapabilityError` before selector ranking begins.

---

## 13. Provider Selection Engine

### Deterministic Weighted Ranking Formula

$$\text{Score}(P) = (W_H \times S_H) + (W_C \times S_C) + (W_L \times S_L) + (W_K \times S_K) + (W_P \times S_P)$$

Where:
- $S_H$: Health State Score (`READY` = 1.0, `DEGRADED` = 0.5, `UNHEALTHY` = 0.0)
- $S_C$: Negotiated Capability Precision Score ($\frac{|\text{Supported Capabilities}|}{|\text{Requested Capabilities}|}$)
- $S_L$: Moving Average Latency Score ($\frac{1}{1 + \text{avgLatencyMs}}$)
- $S_K$: Cost Score ($\frac{1}{1 + \text{costPer1kTokens}}$)
- $S_P$: Static Configuration Priority Score [0.0 - 1.0]
- $W_X$: Selection Policy Weights summing to 1.0.

### Tie-Breaking Invariant:
If two candidate providers yield identical floating-point scores, tie-breaking falls back deterministically to lexicographical sorting by `providerId` ascending (`a.providerId.localeCompare(b.providerId)`).

---

## 14. Resource Ownership Matrix

The following table forms the authoritative, single source of truth for resource ownership across Phase 9.9:

| Resource / Entity | Exclusive Owner | Non-Owners / Excluded Access |
| :--- | :--- | :--- |
| **API Keys, Certificates, Tokens** | `CredentialVault` | Providers, Registries, Selectors, Telemetry |
| **Provider Catalog & Metadata** | `ProviderRegistry` | Health Managers, External Drivers |
| **Runtime Metrics & Scores** | `ProviderHealthManager` | Circuit Breaker FSM, External Databases |
| **Circuit Breaker State Machine** | `CircuitBreakerEngine` | Health Metric Calculators, Selectors |
| **Driver Runtime Sessions** | `ProviderSessionManager` | ProviderSelector, Health Manager, CredentialVault |
| **Execution Context Assembly** | `ProviderManager` | Individual Adapters, Plugins |
| **Execution Results & Envelopes** | Phase 9.8 (`@aether/action-execution`) | Phase 9.9 Managers |
| **Non-Secret Configuration** | `ProviderConfiguration` | CredentialVault, External Logging Servers |

---

## 15. Credential Architecture vs Configuration

Phase 9.9 strictly decouples secrets from non-secret runtime configuration.

### `CredentialVault` (Secrets Owner)
- **Content**: API keys, OAuth tokens, JWTs, client certificates, native OS Keychain handles.
- **Access Rules**: Secrets never leave `CredentialVault`. Ephemeral reference handles (`credentialReference`) are resolved in-memory during adapter invocation and immediately wiped.

### `ProviderConfiguration` (Non-Secret Config Container)
```ts
export interface ProviderConfiguration {
  readonly configurationId: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly baseURL?: string;
  readonly proxy?: string;
  readonly region?: string;
  readonly endpoint?: string;
  readonly customSettings?: Readonly<Record<string, unknown>>;
}
```
- **Invariants**: Must pass `verifyNoSecrets(config)`. Immutably frozen via `deepFreeze()`. Contains ZERO secret material.

---

## 16. ProviderSessionManager Specification

`ProviderSessionManager` isolates long-lived runtime driver contexts from state scoring and selection logic.

### Session Types:
- `BROWSER_CONTEXT`, `BROWSER_PAGE` (Playwright / Selenium context handles)
- `ELECTRON_WINDOW` (Desktop UI window reference)
- `MCP_SESSION` (Model Context Protocol client connection handle)
- `AI_CONVERSATION` (Stateful chat session context handle)
- `SSH_SESSION`, `DATABASE_SESSION`, `LONG_LIVED_RUNTIME`

### Session Lifecycle Methods:
- `createSession(providerId, type, config)`: Allocates new driver session handle.
- `reuseSession(sessionId)`: Retrieves active session, updating last-accessed timestamp.
- `releaseSession(sessionId)`: Marks session idle for reuse.
- `destroySession(sessionId)`: Explicitly closes driver session and releases heap memory.
- `timeoutSession(sessionId)`: Reclaims timed-out idle sessions.
- `cleanupSession(providerId)`: Force-cleans all sessions associated with a disposed provider.

---

## 17. Expanded ProviderExecutionContext Specification

Every provider execution receives an expanded, deeply frozen context payload:

```ts
export interface ProviderExecutionContext {
  readonly requestId: string;
  readonly executionId: string;
  readonly executionUnitId: string;
  readonly sessionId?: string;           // Refinement 6: Active session reference handle
  readonly providerId: string;           // Refinement 6: Bound provider ID
  readonly providerType: ProviderType;   // Refinement 6: Bound provider type
  readonly selectionPolicy: SelectionPolicy; // Refinement 6: Selection policy used
  readonly executionPriority: number;    // Refinement 6: Execution priority rank
  readonly sandbox: Readonly<{
    readonly sandboxId: string;
    readonly allowedPermissions: readonly string[];
    readonly allowedCapabilities: readonly string[];
  }>;
  readonly permissions: readonly string[];
  readonly timeoutMs: number;
  readonly abortSignal?: AbortSignal;
  readonly credentialReference?: string;
  readonly retryCount: number;
  readonly providerConfigurationReference: string;
}
```

Context objects are deeply frozen (`deepFreeze()`) prior to adapter invocation. Mutating any field throws at runtime.

---

## 18. Provider Contracts

### Base Provider Adapter Contract
```ts
export interface BaseProviderAdapter {
  readonly metadata: Readonly<ProviderMetadata>;
  readonly lifecycleState: ProviderLifecycleState;
  readonly configuration: Readonly<ProviderConfiguration>;
  execute(
    context: Readonly<ProviderExecutionContext>,
    parameters: Readonly<Record<string, unknown>>
  ): Promise<Readonly<ExecutionWorkerResult>>;
}
```

### Domain-Specific Adapters:
- `BrowserProviderAdapter`: Managed Playwright / Selenium browser page & context pooling.
- `AIProviderAdapter`: Cloud / Local / Embedded AI contract supporting text, vision, streaming.
- `DesktopProviderAdapter`: Electron window management & screen capture contracts.
- `LocalOSProviderAdapter`: Node FS, subprocess execution contracts.
- `MCPProviderAdapter`: Model Context Protocol tool invocation & resource reading contracts.

---

## 19. Runtime Metrics vs Telemetry Specification

### Runtime Metrics (Phase 9.9 In-Memory Operational Signals)
- **Scope**: Average latency, failure rate, success rate, availability score, queue depth.
- **Storage**: In-memory only (`ProviderHealthManager`).
- **Persistence**: NEVER persisted to disk or external databases.
- **Purpose**: Strictly for `ProviderSelector` routing calculations.

### Telemetry (Explicitly EXCLUDED from Phase 9.9)
- **Non-Existence**: Phase 9.9 contains NO analytics, NO log aggregators, NO telemetry bridges, and NO third-party monitoring SDKs (Datadog, OpenTelemetry, Sentry, Prometheus).
- **Phase Boundary**: Telemetry belongs strictly to future system phases.

---

## 20. Security Model & Plugin Isolation Rules

Plugins and third-party provider extensions operate within strict security boundaries:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            THIRD-PARTY PLUGIN                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Restricted Sandbox Access)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLUGIN ISOLATION BOUNDARY                           │
│  - Sandbox Permissions Inheritance                                          │
│  - Isolated Heap / Memory Space                                             │
│  - Capability Filtering Interceptor                                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Invokes via BaseProviderAdapter ONLY)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 9.9 PROVIDER RUNTIME LAYER                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hard Prohibitions for Plugins:
1. **NO Access to CredentialVault**: Plugins cannot read API keys or request secret bytes.
2. **NO Registry Mutation**: Plugins cannot register, modify, or unregister providers directly in `ProviderRegistry`.
3. **NO Bypass of ProviderManager**: Direct driver calls bypassing `ProviderManager` are strictly forbidden.
4. **NO Bypass of ProviderSelector**: Plugins cannot override selection routing or circuit breaker logic.
5. **NO Context Mutation**: Plugins receive deeply frozen `ProviderExecutionContext` objects. Attempting property mutation throws immediately.

---

## 21. Determinism Requirements

1. **Replay Determinism**: Given identical inputs, identical provider registry snapshots, and identical health metrics, `ProviderSelector` must select the exact same primary and fallback providers.
2. **Stable Sorting**: All provider catalogs, candidate rankings, and capability lists use deterministic sorting (`localeCompare`).
3. **Boot Order Determinism**: Startup boot sequence strictly obeys the 9-step linear pipeline regardless of network or timing conditions.

---

## 22. Performance Requirements

- **Selector Complexity**: Provider ranking $\le O(P \log P)$ where $P$ is total eligible providers.
- **Dispatch Overhead**: Framework overhead per provider call $\le 0.2\text{ms}$.
- **Memory Footprint**: In-memory metrics, session handles, and registry snapshots must consume $< 5\text{MB}$ total heap.

---

## 23. Testing Strategy Matrix

For EVERY milestone, the following test coverage is strictly mandatory:

| Milestone | Unit Tests | Integration Tests | Replay / Determinism | Concurrency / Stress | Failure / Boundary | Expected Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M1: Foundation & Contracts** | Metadata, ProviderConfiguration validation | Contract inheritance | Immutable freezing assertions | Parallel descriptor creation | Exception hierarchy assertions | 100% |
| **M2: Provider Registry & Negotiator** | Duplicate detection, CapabilityNegotiator tests | Freeze rule verification | 100-run catalog sorting replay | Parallel lookup performance | Mutating frozen registry failure | 100% |
| **M3: CredentialVault** | Vault storage, token generation | OS Keychain bridge mocks | Deterministic secret token map | Parallel secret injection | Unauthorized token retrieval | 100% |
| **M4: FSM, Health & Circuit Engine** | Lifecycle FSM & CircuitBreakerEngine | Circuit breaker triggers | Deterministic health score probes | High-frequency probe stress | Illegal FSM transition throws | 100% |
| **M5: Selector, Session & Context** | Weighted formula, ProviderSessionManager | Selection routing & session reuse | 100-run replay identical selection | Parallel multi-session allocation | `NoEligibleProviderError` test | 100% |
| **M6: ProviderManager & E2E** | Façade delegation | Full pipeline (Phase 9.7 $\rightarrow$ 9.9) | 100-run bit-for-bit replay test | High-concurrency provider dispatch | Fail-fast error propagation | 100% |

---

## 24. Engineering Coding Standards

1. **Strict TypeScript**: `strict: true` in `tsconfig.json` with **zero `any` types** and zero unsafe type assertions (`as unknown as X` forbidden).
2. **Readonly & Deep Freeze Everywhere**: All public domain interfaces must be `readonly`. All return objects must pass `deepFreeze()` and `Object.isFrozen()`.
3. **Zero Mutable Globals**: No static caches, singleton runtime objects, or global mutable variables.
4. **Zero Circular Imports**: Clean downward dependency tree strictly enforced.
5. **Zero `console.log` / `TODO` / `FIXME`**: Production code contains 0 debug statements or placeholder comments.
6. **Fail-Fast Only**: Exceptions must throw immediately upon contract or boundary violation. Never swallow errors.

---

## 25. Milestone Breakdown

### Milestone 1: Foundation, Contracts & ProviderConfiguration
- **Objective**: Establish immutable domain types, `ProviderConfiguration`, capability metadata, and exception hierarchy.
- **Modules**: `provider-types.ts`, `provider-configuration.ts`, `provider-errors.ts`, `factories.ts`.
- **Files**: `provider-types.ts`, `provider-configuration.ts`, `provider-errors.ts`, `factories.ts`, `index.ts`, unit test suites.
- **Freeze Criteria**: 0 TS errors, 100% unit test pass, immutable freeze assertions pass.

### Milestone 2: Provider Registry & Capability Negotiator
- **Objective**: Implement provider catalog, capability indexing, registry freeze rules, and `CapabilityNegotiator`.
- **Modules**: `provider-registry.ts`, `capability-negotiator.ts`.
- **Files**: `provider-registry.ts`, `capability-negotiator.ts`, `registry-types.ts`, `registry-errors.ts`, test suites.
- **Freeze Criteria**: Deterministic alphabetical sorting verified, capability negotiation algorithm tested.

### Milestone 3: CredentialVault & Secrets Isolation
- **Objective**: Implement secrets owner, OS Keychain integration, and credential handle resolution.
- **Modules**: `credential-vault.ts`.
- **Files**: `credential-vault.ts`, test suites.
- **Freeze Criteria**: Zero secrets leakage confirmed, OS keychain bridge verified.

### Milestone 4: FSM, Health Manager & CircuitBreakerEngine
- **Objective**: Implement Lifecycle FSM (with `WARMING_UP`), Health metrics owner, and isolated `CircuitBreakerEngine`.
- **Modules**: `provider-lifecycle-manager.ts`, `provider-health-manager.ts`, `circuit-breaker-engine.ts`.
- **Files**: `provider-lifecycle-manager.ts`, `provider-health-manager.ts`, `circuit-breaker-engine.ts`, test suites.
- **Freeze Criteria**: All legal/illegal state machine transitions verified.

### Milestone 5: Selector, ProviderSessionManager & Expanded Context
- **Objective**: Implement selection policies, weighted scoring formula, `ProviderSessionManager`, and expanded `ProviderExecutionContext`.
- **Modules**: `provider-selector.ts`, `provider-session-manager.ts`, `provider-execution-context.ts`.
- **Files**: `provider-selector.ts`, `provider-session-manager.ts`, `provider-execution-context.ts`, test suites.
- **Freeze Criteria**: Weighted ranking formula verified, session lifecycle tested.

### Milestone 6: ProviderManager Façade, Boot Sequence & E2E Integration
- **Objective**: Implement public façade orchestrator, 9-step boot sequence, barrel exports, and 100-run replay test suite.
- **Modules**: `provider-manager.ts`, `index.ts`.
- **Files**: `provider-manager.ts`, `index.ts`, integration & 100-run replay test suite.
- **Freeze Criteria**: 100-run replay test pass with bit-for-bit identical output, 100% test coverage.

---

## 26. Milestone Dependency Matrix

```
Milestone 1 (Foundation, Contracts & ProviderConfiguration)
        │
        ▼
Milestone 2 (Provider Registry & Capability Negotiator)
        │
        ▼
Milestone 3 (CredentialVault)
        │
        ▼
Milestone 4 (FSM, Health Manager & CircuitBreakerEngine)
        │
        ▼
Milestone 5 (Selector, ProviderSessionManager & Context)
        │
        ▼
Milestone 6 (ProviderManager Façade, Boot Sequence & E2E)
```

- **Dependency Rule**: Milestone $N$ may depend ONLY on Milestones $< N$. No forward or circular references.

---

## 27. Production Audit Requirements

For EVERY milestone, the following audits are mandatory before phase freeze:
1. **Architecture Audit**: Verify SRP, module isolation, and downward dependency tree.
2. **Dependency Audit**: Confirm 0 circular imports and zero upward dependencies.
3. **Type Safety Audit**: Verify `strict: true`, 0 `any` types, 0 TS compilation errors (`tsc -b`).
4. **Security Audit**: Confirm credential isolation in `CredentialVault` and plugin sandbox rules.
5. **Performance Audit**: Verify dispatch overhead $\le 0.2\text{ms}$ and $O(1)$ map lookups.
6. **Immutability Audit**: Confirm `deepFreeze()` on all public outputs and `ProviderConfiguration`.
7. **Determinism Audit**: Verify 100-run replay test yields bit-for-bit identical outputs.
8. **Session Safety Audit**: Confirm zero memory leaks or uncleaned driver sessions in `ProviderSessionManager`.
9. **Dead Code Audit**: Confirm 0 unused imports, 0 unused exports, 0 dead branches.
10. **Future Milestone Leakage Audit**: Confirm zero driver SDK calls or execution side effects exist in Phase 9.9.

---

## 28. Production Readiness Criteria

Phase 9.9 is considered production-complete when:
1. `cmd /c npx tsc -b` passes with **0 errors**.
2. `cmd /c npx vitest run` passes with **100% success rate** across all unit and integration test suites.
3. 100-run deterministic replay verification proves bit-for-bit identical provider selection and zero memory leaks.

---

## 29. Future Extension Points

New providers (e.g., `@aether/provider-groq`, `@aether/provider-playwright`, `@aether/provider-ollama`) can be added by:
1. Creating an isolated subpackage (e.g., `packages/@aether/provider-groq`).
2. Implementing the target provider adapter contract (e.g., `AIProviderAdapter`).
3. Passing a valid `ProviderConfiguration` object.
4. Calling `ProviderRegistry.registerProvider(instance)` during boot step 4.

Core managers in Phase 9.7, Phase 9.8, and Phase 9.9 require **zero source code modifications**.

---

## 30. Architectural Decision Records (ADR)

- **ADR-9.9-1: Internal Responsibility Split in ProviderManager**: Decomposed `ProviderManager` into Registry, CapabilityNegotiator, Selector, LifecycleManager, HealthManager, CircuitBreakerEngine, SessionManager, and Vault to respect SRP while providing a unified external façade.
- **ADR-9.9-2: CredentialVault Exclusive Ownership**: Secrets are isolated in `CredentialVault` to prevent API keys from leaking into worker logs, trace dumps, or provider state.
- **ADR-9.9-3: Explicit Factory Registration over Global Side-Effects**: Prohibited auto-registration via top-level module imports to guarantee deterministic load order across Node and Vite runtimes.
- **ADR-9.9-4: Dedicated ProviderSessionManager**: Decoupled driver runtime session state from health metrics to isolate context resource lifecycles.
- **ADR-9.9-5: Decoupled CircuitBreakerEngine**: Separated health metric collecting (`ProviderHealthManager`) from state machine state transition rules (`CircuitBreakerEngine`).
- **ADR-9.9-6: Capability Negotiation Stage**: Added deterministic capability matching prior to selector weighted scoring to eliminate invalid routing attempts.
- **ADR-9.9-7: Optional WARMING_UP Lifecycle State**: Introduced intermediate FSM state for asynchronous driver preloading without breaking existing lifecycle contracts.

---

## 31. Future Package Layout

```
packages/
├── @aether/provider-runtime        # Core managers, contracts, FSM, vault, sessions
├── @aether/provider-groq           # Groq Cloud AI Adapter
├── @aether/provider-nvidia         # NVIDIA NIM Cloud AI Adapter
├── @aether/provider-openai         # OpenAI Cloud AI Adapter
├── @aether/provider-anthropic      # Anthropic Cloud AI Adapter
├── @aether/provider-playwright     # Playwright Browser Adapter
├── @aether/provider-electron       # Electron Desktop Adapter
├── @aether/provider-filesystem     # Node FS OS Adapter
├── @aether/provider-mcp            # MCP Client Adapter
└── @aether/provider-ollama         # Ollama Local AI Adapter
```

---

## 32. Production Freeze Rules

Phase 9.9 is frozen ONLY when:
1. Every milestone passes TypeScript (`tsc -b`) with 0 errors.
2. Vitest runs pass with 100% success rate.
3. 100% audit approval achieved across all production audit vectors.
4. Zero architectural drift from frozen EDD v1.1.
5. Public API and configuration objects are deeply frozen via `deepFreeze()`.
6. Zero dead code, zero unused imports, zero circular imports.

---

## 33. Final Architecture Verdict

# **APPROVED FOR IMPLEMENTATION (VERSION 1.1)**

The Phase 9.9 Production Engineering Design Document (EDD v1.1) is frozen and approved as the single authoritative source of truth for implementation, testing, auditing, and release freeze.
