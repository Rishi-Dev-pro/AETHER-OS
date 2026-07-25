import { describe, it, expect } from "vitest";
import { ErrorCategoryCode, type CorrelationContext } from "../types";
import {
  AIRuntimeError,
  TransientError,
  ConfigurationError,
  ContextBoundaryError,
  SafetyError,
  SystemError,
  isAIRuntimeError,
  isRetryableError,
} from "../errors";

describe("Phase 9.4 Component 2: Runtime Error Taxonomy (errors.ts)", () => {
  const mockCorrelation: CorrelationContext = {
    sessionId: "sess_1001",
    snapshotId: "snap_2002",
    intentId: "intent_3003",
  };

  describe("Inheritance & Category Code Assignments", () => {
    it("should instantiate TransientError with TRANSIENT_ERROR category and retryable=true", () => {
      const error = new TransientError({
        subCode: "RateLimitExceeded",
        message: "HTTP 429 Rate Limit Exceeded from provider",
        correlationContext: mockCorrelation,
      });

      expect(error).toBeInstanceOf(AIRuntimeError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(ErrorCategoryCode.TRANSIENT_ERROR);
      expect(error.subCode).toBe("RateLimitExceeded");
      expect(error.isRetryable).toBe(true);
      expect(error.publicMessage).toBe("The AI service is temporarily busy or unreachable. Retrying...");
      expect(error.correlationContext).toEqual(mockCorrelation);
    });

    it("should instantiate ConfigurationError with CONFIGURATION_ERROR category and retryable=false", () => {
      const error = new ConfigurationError({
        subCode: "InvalidApiKey",
        message: "API key is missing or invalid",
      });

      expect(error.code).toBe(ErrorCategoryCode.CONFIGURATION_ERROR);
      expect(error.isRetryable).toBe(false);
      expect(error.publicMessage).toBe("AI service configuration is invalid.");
    });

    it("should instantiate ContextBoundaryError with CONTEXT_BOUNDARY_ERROR category and retryable=false", () => {
      const error = new ContextBoundaryError({
        subCode: "ContextWindowExceeded",
        message: "Prompt tokens (128000) exceed maximum limit (8192)",
      });

      expect(error.code).toBe(ErrorCategoryCode.CONTEXT_BOUNDARY_ERROR);
      expect(error.isRetryable).toBe(false);
      expect(error.publicMessage).toBe("The prompt context exceeds model limit bounds.");
    });

    it("should instantiate SafetyError with SAFETY_ERROR category and retryable=false", () => {
      const error = new SafetyError({
        subCode: "ContentFilterBlock",
        message: "Provider safety policy flagged input string",
      });

      expect(error.code).toBe(ErrorCategoryCode.SAFETY_ERROR);
      expect(error.isRetryable).toBe(false);
      expect(error.publicMessage).toBe("The request was flagged by content safety policy.");
    });

    it("should instantiate SystemError with SYSTEM_ERROR category and retryable=false", () => {
      const error = new SystemError({
        subCode: "InvalidFsmTransition",
        message: "FSM invalid transition from CREATED to STREAMING",
      });

      expect(error.code).toBe(ErrorCategoryCode.SYSTEM_ERROR);
      expect(error.isRetryable).toBe(false);
      expect(error.publicMessage).toBe("An internal AI runtime system error occurred.");
    });
  });

  describe("Constructor Invariants & Validation", () => {
    it("should throw an error if internal message is empty or whitespace", () => {
      expect(() => {
        new TransientError({
          subCode: "EmptyMessage",
          message: "   ",
        });
      }).toThrow("AIRuntimeError requires a non-empty internal message.");
    });

    it("should throw an error if subCode is empty or whitespace", () => {
      expect(() => {
        new TransientError({
          subCode: "",
          message: "Valid internal message",
        });
      }).toThrow("AIRuntimeError requires a non-empty subCode.");
    });

    it("should allow overriding publicMessage with custom user-safe text", () => {
      const error = new TransientError({
        subCode: "GatewayTimeout",
        message: "HTTP 504 Gateway Timeout",
        publicMessage: "Custom safe message for UI display.",
      });

      expect(error.publicMessage).toBe("Custom safe message for UI display.");
    });

    it("should enforce runtime immutability on details metadata object", () => {
      const details = { targetModel: "gpt-4o", attempt: 2 };
      const error = new TransientError({
        subCode: "AttemptFailed",
        message: "Attempt failed",
        details,
      });

      expect(Object.isFrozen(error.details)).toBe(true);
      expect(() => {
        // @ts-expect-error mutating frozen object
        error.details.targetModel = "hacked";
      }).toThrow();
    });

    it("should correctly preserve underlying cause error", () => {
      const rawCause = new TypeError("Failed to fetch");
      const error = new TransientError({
        subCode: "FetchFailed",
        message: "Network request failed",
        cause: rawCause,
      });

      expect(error.cause).toBe(rawCause);
    });
  });

  describe("Serialization & Sanitization", () => {
    it("toDiagnosticJSON should include full internal telemetry and stack trace", () => {
      const cause = new Error("Socket disconnected");
      const error = new TransientError({
        subCode: "SocketReset",
        message: "Socket connection lost during payload transmission",
        details: { port: 443 },
        cause,
      });

      const json = error.toDiagnosticJSON();

      expect(json.name).toBe("TransientError");
      expect(json.code).toBe(ErrorCategoryCode.TRANSIENT_ERROR);
      expect(json.subCode).toBe("SocketReset");
      expect(json.message).toBe("Socket connection lost during payload transmission");
      expect(json.isRetryable).toBe(true);
      expect(json.details).toEqual({ port: 443 });
      expect(json.cause).toEqual({ name: "Error", message: "Socket disconnected" });
      expect(json.stack).toBeDefined();
      expect(Object.isFrozen(json)).toBe(true);
    });

    it("toPublicJSON should return strictly sanitized public metadata without internal stack or details", () => {
      const error = new ConfigurationError({
        subCode: "SecretKeyInvalid",
        message: "Internal key secret_sk_99928371 is invalid",
        publicMessage: "Authentication failed. Please verify credentials.",
      });

      const publicJson = error.toPublicJSON();

      expect(publicJson.code).toBe(ErrorCategoryCode.CONFIGURATION_ERROR);
      expect(publicJson.subCode).toBe("SecretKeyInvalid");
      expect(publicJson.message).toBe("Authentication failed. Please verify credentials.");
      expect(publicJson.timestamp).toBeGreaterThan(0);
      expect(publicJson).not.toHaveProperty("stack");
      expect(publicJson).not.toHaveProperty("details");
      expect(publicJson).not.toHaveProperty("cause");
      expect(Object.isFrozen(publicJson)).toBe(true);
    });
  });

  describe("Type Guards & Utilities", () => {
    it("isAIRuntimeError should correctly identify AIRuntimeError instances", () => {
      const runtimeErr = new SystemError({ subCode: "FsmErr", message: "FSM state error" });
      const standardErr = new Error("Generic error");
      const plainObj = { code: "SYSTEM_ERROR" };

      expect(isAIRuntimeError(runtimeErr)).toBe(true);
      expect(isAIRuntimeError(standardErr)).toBe(false);
      expect(isAIRuntimeError(plainObj)).toBe(false);
      expect(isAIRuntimeError(null)).toBe(false);
    });

    it("isRetryableError should return true only for retryable errors", () => {
      const transientErr = new TransientError({ subCode: "RateLimit", message: "429" });
      const configErr = new ConfigurationError({ subCode: "BadKey", message: "401" });
      const standardErr = new Error("Generic error");

      expect(isRetryableError(transientErr)).toBe(true);
      expect(isRetryableError(configErr)).toBe(false);
      expect(isRetryableError(standardErr)).toBe(false);
    });
  });
});
