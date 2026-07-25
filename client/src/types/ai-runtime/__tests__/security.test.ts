import { describe, it, expect } from "vitest";
import { PrivacyMode, ModelTier } from "../types";
import { ConfigurationError } from "../errors";
import {
  TrustLevel,
  PayloadSensitivity,
  createSecurityPolicy,
  createSecurityDescriptor,
  validateSecurityPolicy,
} from "../security";

describe("Phase 9.4 Component 5: Runtime Security Contracts (security.ts)", () => {
  describe("Enum Integrity & Trust Hierarchy", () => {
    it("should define numeric TrustLevels in ascending order of privilege", () => {
      expect(TrustLevel.RESTRICTED).toBe(0);
      expect(TrustLevel.STANDARD).toBe(1);
      expect(TrustLevel.ELEVATED).toBe(2);
      expect(TrustLevel.SYSTEM_TRUSTED).toBe(3);

      expect(TrustLevel.RESTRICTED).toBeLessThan(TrustLevel.STANDARD);
      expect(TrustLevel.STANDARD).toBeLessThan(TrustLevel.ELEVATED);
      expect(TrustLevel.ELEVATED).toBeLessThan(TrustLevel.SYSTEM_TRUSTED);
    });

    it("should define standard PayloadSensitivity levels", () => {
      expect(PayloadSensitivity.PUBLIC).toBe("PUBLIC");
      expect(PayloadSensitivity.INTERNAL).toBe("INTERNAL");
      expect(PayloadSensitivity.CONFIDENTIAL).toBe("CONFIDENTIAL");
      expect(PayloadSensitivity.RESTRICTED_PII).toBe("RESTRICTED_PII");
    });
  });

  describe("SecurityPolicy Factory & Invariant Checks", () => {
    it("should create a valid SecurityPolicy with default parameters", () => {
      const policy = createSecurityPolicy();

      expect(policy.privacyMode).toBe(PrivacyMode.STANDARD);
      expect(policy.minTrustLevel).toBe(TrustLevel.STANDARD);
      expect(policy.maxPayloadSensitivity).toBe(PayloadSensitivity.CONFIDENTIAL);
      expect(policy.allowCloudTransmission).toBe(true);
      expect(policy.requireFieldEncryption).toBe(false);
      expect(policy.enforceRoleIsolation).toBe(true);
      expect(Object.isFrozen(policy)).toBe(true);
    });

    it("should default allowCloudTransmission to false when privacyMode is LOCAL_ONLY", () => {
      const policy = createSecurityPolicy({
        privacyMode: PrivacyMode.LOCAL_ONLY,
      });

      expect(policy.privacyMode).toBe(PrivacyMode.LOCAL_ONLY);
      expect(policy.allowCloudTransmission).toBe(false);
    });

    it("should throw ConfigurationError if privacyMode is LOCAL_ONLY but allowCloudTransmission is true", () => {
      expect(() => {
        createSecurityPolicy({
          privacyMode: PrivacyMode.LOCAL_ONLY,
          allowCloudTransmission: true,
        });
      }).toThrow(ConfigurationError);

      try {
        createSecurityPolicy({
          privacyMode: PrivacyMode.LOCAL_ONLY,
          allowCloudTransmission: true,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("InvalidPrivacyPolicyConflict");
      }
    });
  });

  describe("SecurityDescriptor Factory & Computed Flags", () => {
    it("should create SecurityDescriptor and compute isLocalOnly=false for standard policy", () => {
      const descriptor = createSecurityDescriptor();

      expect(descriptor.trustLevel).toBe(TrustLevel.STANDARD);
      expect(descriptor.sensitivity).toBe(PayloadSensitivity.CONFIDENTIAL);
      expect(descriptor.isLocalOnly).toBe(false);
      expect(Object.isFrozen(descriptor)).toBe(true);
    });

    it("should compute isLocalOnly=true when policy privacyMode is LOCAL_ONLY", () => {
      const policy = createSecurityPolicy({ privacyMode: PrivacyMode.LOCAL_ONLY });
      const descriptor = createSecurityDescriptor({ policy });

      expect(descriptor.isLocalOnly).toBe(true);
    });
  });

  describe("Policy Validation Function (validateSecurityPolicy)", () => {
    it("should permit cloud model dispatch when privacy mode is STANDARD", () => {
      const descriptor = createSecurityDescriptor();
      const result = validateSecurityPolicy(descriptor, ModelTier.STANDARD);

      expect(result.isAllowed).toBe(true);
      expect(result.violationReason).toBeUndefined();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("should reject cloud model dispatch when isLocalOnly is true", () => {
      const policy = createSecurityPolicy({ privacyMode: PrivacyMode.LOCAL_ONLY });
      const descriptor = createSecurityDescriptor({ policy });

      const result = validateSecurityPolicy(descriptor, ModelTier.STANDARD);

      expect(result.isAllowed).toBe(false);
      expect(result.violatedRule).toBe("LocalPrivacyEnforcement");
      expect(result.violationReason).toContain("Cloud dispatch is prohibited");
    });

    it("should permit local model dispatch when isLocalOnly is true", () => {
      const policy = createSecurityPolicy({ privacyMode: PrivacyMode.LOCAL_ONLY });
      const descriptor = createSecurityDescriptor({ policy });

      const result = validateSecurityPolicy(descriptor, ModelTier.LOCAL);

      expect(result.isAllowed).toBe(true);
      expect(result.violationReason).toBeUndefined();
    });

    it("should return invalid validation result when descriptor is null", () => {
      const result = validateSecurityPolicy(null as never, ModelTier.STANDARD);

      expect(result.isAllowed).toBe(false);
      expect(result.violatedRule).toBe("InvalidSecurityDescriptor");
    });
  });
});
