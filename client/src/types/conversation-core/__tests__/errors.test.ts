import { describe, it, expect } from "vitest";
import {
  ConversationError,
  ConversationValidationError,
  ConversationStateError,
  SessionError,
  ContextError,
  isConversationError,
} from "../errors";

describe("Phase 9.5 Component 2: Conversation Error Taxonomy (errors.ts)", () => {
  describe("Base ConversationError & Subclass Hierarchy", () => {
    it("ConversationValidationError should instantiate cleanly and inherit from ConversationError", () => {
      const err = new ConversationValidationError({
        subCode: "InvalidMessagePayload",
        message: "Message payload is malformed.",
        details: { field: "text" },
      });

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ConversationError);
      expect(err).toBeInstanceOf(ConversationValidationError);
      expect(err.name).toBe("ConversationValidationError");
      expect(err.code).toBe("CONVERSATION_VALIDATION_ERROR");
      expect(err.subCode).toBe("InvalidMessagePayload");
      expect(err.message).toBe("Message payload is malformed.");
      expect(err.publicMessage).toBe("Conversation validation failed due to malformed parameters.");
      expect(err.isRetryable).toBe(false);
      expect(err.timestamp).toBeGreaterThan(0);
      expect(err.details).toEqual({ field: "text" });
      expect(Object.isFrozen(err.details)).toBe(true);
    });

    it("ConversationStateError should instantiate cleanly", () => {
      const err = new ConversationStateError({
        subCode: "IllegalStateTransition",
        message: "Cannot transition from CLOSED to ACTIVE.",
      });

      expect(err).toBeInstanceOf(ConversationStateError);
      expect(err.code).toBe("CONVERSATION_STATE_ERROR");
      expect(err.subCode).toBe("IllegalStateTransition");
    });

    it("SessionError and ContextError should instantiate cleanly", () => {
      const sessErr = new SessionError({ subCode: "SessionExpired", message: "Session 123 expired." });
      const ctxErr = new ContextError({ subCode: "TokenOverflow", message: "Token limit exceeded." });

      expect(sessErr.code).toBe("SESSION_ERROR");
      expect(ctxErr.code).toBe("CONTEXT_ERROR");
    });
  });

  describe("Diagnostic & Public JSON Serialization", () => {
    it("toDiagnosticJSON should return clean frozen internal diagnostic payload", () => {
      const cause = new Error("Underlying cause");
      const err = new ConversationValidationError({
        subCode: "MalformedSchema",
        message: "Internal schema parsing failed.",
        cause,
      });

      const diag = err.toDiagnosticJSON();

      expect(diag.name).toBe("ConversationValidationError");
      expect(diag.code).toBe("CONVERSATION_VALIDATION_ERROR");
      expect(diag.subCode).toBe("MalformedSchema");
      expect(diag.cause).toEqual({ name: "Error", message: "Underlying cause" });
      expect(Object.isFrozen(diag)).toBe(true);
    });

    it("toPublicJSON should return sanitized client-safe payload without stack trace", () => {
      const err = new SessionError({
        subCode: "UnauthorizedSession",
        message: "Internal secret vault key failed",
        publicMessage: "Session authorization failed.",
      });

      const pub = err.toPublicJSON();

      expect(pub.code).toBe("SESSION_ERROR");
      expect(pub.subCode).toBe("UnauthorizedSession");
      expect(pub.message).toBe("Session authorization failed.");
      expect(pub).not.toHaveProperty("stack");
      expect(pub).not.toHaveProperty("details");
      expect(Object.isFrozen(pub)).toBe(true);
    });
  });

  describe("Type Guard Utility (isConversationError)", () => {
    it("should return true for ConversationError instances and false for other errors", () => {
      const convErr = new ConversationValidationError({ subCode: "Test", message: "Test" });
      const standardErr = new Error("Standard error");

      expect(isConversationError(convErr)).toBe(true);
      expect(isConversationError(standardErr)).toBe(false);
      expect(isConversationError(null)).toBe(false);
      expect(isConversationError({ message: "fake error" })).toBe(false);
    });
  });
});
