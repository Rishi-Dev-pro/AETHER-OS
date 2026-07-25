/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 5: Runtime Security Contracts (`security.ts`)
 *
 * @file security.ts
 * @description Immutable security contracts, trust models, privacy policy descriptors,
 * and security validation interfaces for Phase 9.4 AI Runtime.
 *
 * @module @aether/ai-runtime/security
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT
 */

import { PrivacyMode, ModelTier } from "./types";
import { ConfigurationError } from "./errors";
import { deepFreeze } from "./ai-request";

// ============================================================================
// 1. SECURITY ENUMS & TRUST CLASSIFICATIONS
// ============================================================================

/**
 * Execution Trust Levels assigned to runtime callers and tasks.
 * Higher numerical values denote higher execution privileges.
 */
export enum TrustLevel {
  /** Untrusted or restricted third-party context (Level 0) */
  RESTRICTED = 0,
  /** Standard user interactive context (Level 1) */
  STANDARD = 1,
  /** Elevated system action or administrative context (Level 2) */
  ELEVATED = 2,
  /** Core OS Kernel and safety-critical execution context (Level 3) */
  SYSTEM_TRUSTED = 3,
}

/**
 * Data Sensitivity Classifications for payload inspection and transport routing.
 */
export enum PayloadSensitivity {
  /** Non-sensitive public data */
  PUBLIC = "PUBLIC",
  /** System-internal non-sensitive context */
  INTERNAL = "INTERNAL",
  /** Sensitive user data or context data */
  CONFIDENTIAL = "CONFIDENTIAL",
  /** Highly sensitive Personally Identifiable Information or credentials */
  RESTRICTED_PII = "RESTRICTED_PII",
}


// ============================================================================
// 2. DATA CONTRACT INTERFACES
// ============================================================================

/**
 * Immutable security policy envelope governing AI request execution boundaries.
 */
export interface SecurityPolicy {
  /** Active system privacy mode (STANDARD, ENCRYPTED, LOCAL_ONLY) */
  readonly privacyMode: PrivacyMode;
  /** Minimum trust level required for execution */
  readonly minTrustLevel: TrustLevel;
  /** Maximum payload sensitivity permitted for transmission */
  readonly maxPayloadSensitivity: PayloadSensitivity;
  /** Flag permitting or prohibiting cloud network dispatch */
  readonly allowCloudTransmission: boolean;
  /** Flag requiring field-level payload encryption */
  readonly requireFieldEncryption: boolean;
  /** Flag enforcing strict role boundary isolation against prompt injection */
  readonly enforceRoleIsolation: boolean;
}

/**
 * Immutable validation result produced when evaluating request compliance.
 */
export interface SecurityValidationResult {
  /** True if execution is permitted under active security policy */
  readonly isAllowed: boolean;
  /** Human-readable explanation if policy violation occurred */
  readonly violationReason?: string;
  /** Specific rule or policy identifier that was violated */
  readonly violatedRule?: string;
  /** Evaluation timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Immutable security descriptor attached to request contexts during execution routing.
 */
export interface SecurityDescriptor {
  /** Active security policy contract */
  readonly policy: SecurityPolicy;
  /** Evaluated trust level of the request caller */
  readonly trustLevel: TrustLevel;
  /** Evaluated payload sensitivity classification */
  readonly sensitivity: PayloadSensitivity;
  /** Calculated boolean flag indicating mandatory local offline execution */
  readonly isLocalOnly: boolean;
}


// ============================================================================
// 3. FACTORIES & VALIDATOR UTILITIES
// ============================================================================

/**
 * Parameters passed to createSecurityPolicy factory function.
 */
export interface CreateSecurityPolicyParams {
  readonly privacyMode?: PrivacyMode;
  readonly minTrustLevel?: TrustLevel;
  readonly maxPayloadSensitivity?: PayloadSensitivity;
  readonly allowCloudTransmission?: boolean;
  readonly requireFieldEncryption?: boolean;
  readonly enforceRoleIsolation?: boolean;
}

/**
 * Factory function creating an immutable SecurityPolicy object.
 * Applies default security parameters and enforces runtime deep freeze.
 */
export function createSecurityPolicy(params: CreateSecurityPolicyParams = {}): Readonly<SecurityPolicy> {
  const privacyMode = params.privacyMode ?? PrivacyMode.STANDARD;
  const minTrustLevel = params.minTrustLevel ?? TrustLevel.STANDARD;
  const maxPayloadSensitivity = params.maxPayloadSensitivity ?? PayloadSensitivity.CONFIDENTIAL;

  // Derive allowCloudTransmission based on privacy mode if omitted
  const allowCloudTransmission = params.allowCloudTransmission ?? (privacyMode !== PrivacyMode.LOCAL_ONLY);

  // If PrivacyMode is LOCAL_ONLY, allowCloudTransmission MUST be false
  if (privacyMode === PrivacyMode.LOCAL_ONLY && allowCloudTransmission === true) {
    throw new ConfigurationError({
      subCode: "InvalidPrivacyPolicyConflict",
      message: "SecurityPolicy conflict: allowCloudTransmission cannot be true when privacyMode is LOCAL_ONLY.",
    });
  }

  const rawPolicy: SecurityPolicy = {
    privacyMode,
    minTrustLevel,
    maxPayloadSensitivity,
    allowCloudTransmission,
    requireFieldEncryption: params.requireFieldEncryption ?? false,
    enforceRoleIsolation: params.enforceRoleIsolation ?? true,
  };

  return deepFreeze(rawPolicy);
}

/**
 * Parameters passed to createSecurityDescriptor factory function.
 */
export interface CreateSecurityDescriptorParams {
  readonly policy?: SecurityPolicy;
  readonly trustLevel?: TrustLevel;
  readonly sensitivity?: PayloadSensitivity;
}

/**
 * Factory function creating an immutable SecurityDescriptor object.
 * Automatically computes `isLocalOnly` boundary flag and enforces runtime deep freeze.
 */
export function createSecurityDescriptor(params: CreateSecurityDescriptorParams = {}): Readonly<SecurityDescriptor> {
  const policy = params.policy ?? createSecurityPolicy();
  const trustLevel = params.trustLevel ?? TrustLevel.STANDARD;
  const sensitivity = params.sensitivity ?? PayloadSensitivity.CONFIDENTIAL;

  // Compute isLocalOnly boundary flag
  const isLocalOnly = policy.privacyMode === PrivacyMode.LOCAL_ONLY || !policy.allowCloudTransmission;

  const rawDescriptor: SecurityDescriptor = {
    policy,
    trustLevel,
    sensitivity,
    isLocalOnly,
  };

  return deepFreeze(rawDescriptor);
}

/**
 * Pure evaluation function validating if a target model tier satisfies a SecurityDescriptor.
 * Returns a clean immutable SecurityValidationResult object.
 */
export function validateSecurityPolicy(
  descriptor: SecurityDescriptor,
  targetModelTier: ModelTier
): Readonly<SecurityValidationResult> {
  if (!descriptor) {
    return deepFreeze({
      isAllowed: false,
      violationReason: "Null or undefined SecurityDescriptor provided for validation.",
      violatedRule: "InvalidSecurityDescriptor",
      timestamp: Date.now(),
    });
  }

  // Rule 1: Local Privacy Enforcement
  if (descriptor.isLocalOnly && targetModelTier !== ModelTier.LOCAL) {
    return deepFreeze({
      isAllowed: false,
      violationReason: `Target model tier '${targetModelTier}' violates local privacy policy. Cloud dispatch is prohibited.`,
      violatedRule: "LocalPrivacyEnforcement",
      timestamp: Date.now(),
    });
  }

  // Rule 2: PrivacyMode LOCAL_ONLY check
  if (descriptor.policy.privacyMode === PrivacyMode.LOCAL_ONLY && targetModelTier !== ModelTier.LOCAL) {
    return deepFreeze({
      isAllowed: false,
      violationReason: "PrivacyMode is set to LOCAL_ONLY; execution requires ModelTier.LOCAL.",
      violatedRule: "PrivacyModeLocalOnly",
      timestamp: Date.now(),
    });
  }

  // All checks passed
  return deepFreeze({
    isAllowed: true,
    timestamp: Date.now(),
  });
}
