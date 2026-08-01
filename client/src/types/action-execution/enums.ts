/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component 1: Canonical Domain Enums (`enums.ts`)
 *
 * @file enums.ts
 * @description Pure canonical enumerations for state management, lifecycle tracking,
 * boundary validation, failure reasons, permission scoping, and execution capabilities.
 *
 * @module @aether/action-execution/enums
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

/**
 * Terminal and runtime execution status classifications for plan and step execution.
 */
export enum ExecutionStatus {
  UNINITIALIZED = "UNINITIALIZED",
  VALIDATING_PLAN = "VALIDATING_PLAN",
  VERIFYING_PRECONDITIONS = "VERIFYING_PRECONDITIONS",
  STAGE_EXECUTING = "STAGE_EXECUTING",
  VERIFYING_POSTCONDITIONS = "VERIFYING_POSTCONDITIONS",
  COMPLETED = "COMPLETED",
  PARTIAL_SUCCESS = "PARTIAL_SUCCESS",
  FAILED = "FAILED",
  ROLLED_BACK = "ROLLED_BACK",
  ABORTED = "ABORTED",
  BOUNDARY_VIOLATION = "BOUNDARY_VIOLATION",
}

/**
 * High-level engine state machine states.
 */
export enum ExecutionState {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  FAULTED = "FAULTED",
  TERMINATED = "TERMINATED",
}

/**
 * Execution Boundary Validation status codes emitted by ExecutionBoundaryValidator.
 */
export enum BoundaryValidationStatus {
  VALID = "VALID",
  INVALID_STRUCTURE = "INVALID_STRUCTURE",
  INVALID_SCHEMA = "INVALID_SCHEMA",
  EXPIRED = "EXPIRED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNAPPROVED = "UNAPPROVED",
  VERSION_MISMATCH = "VERSION_MISMATCH",
  CAPABILITY_MISMATCH = "CAPABILITY_MISMATCH",
  LIFECYCLE_MISMATCH = "LIFECYCLE_MISMATCH",
}

/**
 * Standardized categorization for plan or step execution failures.
 */
export enum ExecutionFailureReason {
  PRECONDITION_FAILED = "PRECONDITION_FAILED",
  POSTCONDITION_FAILED = "POSTCONDITION_FAILED",
  STEP_TIMEOUT = "STEP_TIMEOUT",
  STEP_EXECUTION_ERROR = "STEP_EXECUTION_ERROR",
  BOUNDARY_VALIDATION_FAILED = "BOUNDARY_VALIDATION_FAILED",
  DEPENDENCY_FAILED = "DEPENDENCY_FAILED",
  REGISTRY_LOOKUP_FAILED = "REGISTRY_LOOKUP_FAILED",
  RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",
  PANIC = "PANIC",
}

/**
 * Security and access permission scopes governing tool dispatch capabilities.
 */
export enum PermissionScope {
  BROWSER_AUTOMATION = "BROWSER_AUTOMATION",
  DESKTOP_AUTOMATION = "DESKTOP_AUTOMATION",
  FILE_SYSTEM_READ = "FILE_SYSTEM_READ",
  FILE_SYSTEM_WRITE = "FILE_SYSTEM_WRITE",
  NETWORK_ACCESS = "NETWORK_ACCESS",
  MCP_INVOCATION = "MCP_INVOCATION",
  SYSTEM_COMMAND = "SYSTEM_COMMAND",
  PLUGIN_EXECUTION = "PLUGIN_EXECUTION",
}

/**
 * Specific fine-grained operational capabilities assigned to tool execution units.
 */
export enum ExecutionCapability {
  CAN_CLICK = "CAN_CLICK",
  CAN_TYPE = "CAN_TYPE",
  CAN_NAVIGATE = "CAN_NAVIGATE",
  CAN_READ_FILE = "CAN_READ_FILE",
  CAN_WRITE_FILE = "CAN_WRITE_FILE",
  CAN_EXECUTE_CLI = "CAN_EXECUTE_CLI",
  CAN_CALL_API = "CAN_CALL_API",
  CAN_INVOKE_MCP = "CAN_INVOKE_MCP",
}

/**
 * Strictness policy for step prerequisites within a topological execution plan.
 */
export enum DependencyPolicy {
  STRICT = "STRICT",
  OPTIONAL = "OPTIONAL",
}

/**
 * Operational domain categories for registered execution unit adapters.
 */
export enum ExecutionUnitType {
  BROWSER = "BROWSER",
  DESKTOP = "DESKTOP",
  MCP = "MCP",
  PLUGIN = "PLUGIN",
  API = "API",
  LOCAL_OS = "LOCAL_OS",
}

/**
 * Granular lifecycle state transitions tracked within the Execution Engine FSM.
 */
export enum ExecutionLifecycleState {
  CREATED = "CREATED",
  INITIALIZED = "INITIALIZED",
  VALIDATING = "VALIDATING",
  PRECONDITION_CHECK = "PRECONDITION_CHECK",
  DISPATCHING = "DISPATCHING",
  POSTCONDITION_CHECK = "POSTCONDITION_CHECK",
  FINALIZING = "FINALIZING",
  TERMINATED = "TERMINATED",
}
