import { describe, it, expect } from "vitest";
import { ConversationStatus } from "../types";
import { ConversationStateError } from "../errors";
import {
  canTransition,
  validateTransition,
  evaluateTransition,
} from "../conversation-fsm";

describe("Phase 9.5 Component 4: Conversation Lifecycle FSM (conversation-fsm.ts)", () => {
  describe("FSM State Transition Rule Matrix (canTransition)", () => {
    it("should permit legal state transitions", () => {
      // CREATED → ACTIVE, CLOSED
      expect(canTransition(ConversationStatus.CREATED, ConversationStatus.ACTIVE)).toBe(true);
      expect(canTransition(ConversationStatus.CREATED, ConversationStatus.CLOSED)).toBe(true);

      // ACTIVE → WAITING, IDLE, ARCHIVED, CLOSED
      expect(canTransition(ConversationStatus.ACTIVE, ConversationStatus.WAITING)).toBe(true);
      expect(canTransition(ConversationStatus.ACTIVE, ConversationStatus.IDLE)).toBe(true);
      expect(canTransition(ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED)).toBe(true);
      expect(canTransition(ConversationStatus.ACTIVE, ConversationStatus.CLOSED)).toBe(true);

      // WAITING → ACTIVE, WAITING (self-loop for tool execution), IDLE, CLOSED
      expect(canTransition(ConversationStatus.WAITING, ConversationStatus.ACTIVE)).toBe(true);
      expect(canTransition(ConversationStatus.WAITING, ConversationStatus.WAITING)).toBe(true);
      expect(canTransition(ConversationStatus.WAITING, ConversationStatus.IDLE)).toBe(true);
      expect(canTransition(ConversationStatus.WAITING, ConversationStatus.CLOSED)).toBe(true);

      // IDLE → ACTIVE, ARCHIVED, CLOSED
      expect(canTransition(ConversationStatus.IDLE, ConversationStatus.ACTIVE)).toBe(true);
      expect(canTransition(ConversationStatus.IDLE, ConversationStatus.ARCHIVED)).toBe(true);
      expect(canTransition(ConversationStatus.IDLE, ConversationStatus.CLOSED)).toBe(true);

      // ARCHIVED → ACTIVE, CLOSED
      expect(canTransition(ConversationStatus.ARCHIVED, ConversationStatus.ACTIVE)).toBe(true);
      expect(canTransition(ConversationStatus.ARCHIVED, ConversationStatus.CLOSED)).toBe(true);
    });

    it("should reject illegal state transitions", () => {
      // CREATED cannot jump directly to WAITING, IDLE, or ARCHIVED
      expect(canTransition(ConversationStatus.CREATED, ConversationStatus.WAITING)).toBe(false);
      expect(canTransition(ConversationStatus.CREATED, ConversationStatus.IDLE)).toBe(false);
      expect(canTransition(ConversationStatus.CREATED, ConversationStatus.ARCHIVED)).toBe(false);

      // CLOSED is terminal — zero outgoing transitions allowed
      expect(canTransition(ConversationStatus.CLOSED, ConversationStatus.CREATED)).toBe(false);
      expect(canTransition(ConversationStatus.CLOSED, ConversationStatus.ACTIVE)).toBe(false);
      expect(canTransition(ConversationStatus.CLOSED, ConversationStatus.WAITING)).toBe(false);
      expect(canTransition(ConversationStatus.CLOSED, ConversationStatus.IDLE)).toBe(false);
      expect(canTransition(ConversationStatus.CLOSED, ConversationStatus.ARCHIVED)).toBe(false);
    });
  });

  describe("Transition Validation & Error Enforcement (validateTransition)", () => {
    it("should pass silently for valid state transitions", () => {
      expect(() => {
        validateTransition(ConversationStatus.ACTIVE, ConversationStatus.WAITING);
      }).not.toThrow();
    });

    it("should throw ConversationStateError for illegal state transitions", () => {
      expect(() => {
        validateTransition(ConversationStatus.CLOSED, ConversationStatus.ACTIVE);
      }).toThrow(ConversationStateError);

      try {
        validateTransition(ConversationStatus.CLOSED, ConversationStatus.ACTIVE);
      } catch (err) {
        expect(err).toBeInstanceOf(ConversationStateError);
        expect((err as ConversationStateError).subCode).toBe("IllegalStateTransition");
        expect((err as ConversationStateError).message).toContain("Illegal conversation lifecycle transition");
      }
    });

    it("should throw ConversationStateError for invalid status strings", () => {
      expect(() => {
        validateTransition("INVALID_STATUS" as ConversationStatus, ConversationStatus.ACTIVE);
      }).toThrow("Invalid source ConversationStatus");
    });
  });

  describe("FSM Evaluation & Audit Event Generation (evaluateTransition)", () => {
    it("evaluateTransition should execute valid transition and return immutable FsmResult", () => {
      const result = evaluateTransition(
        ConversationStatus.ACTIVE,
        ConversationStatus.WAITING,
        "Dispatched request to AI Runtime"
      );

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(ConversationStatus.WAITING);
      expect(result.transitionEvent.fromStatus).toBe(ConversationStatus.ACTIVE);
      expect(result.transitionEvent.toStatus).toBe(ConversationStatus.WAITING);
      expect(result.transitionEvent.triggerReason).toBe("Dispatched request to AI Runtime");
      expect(result.transitionEvent.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.transitionEvent)).toBe(true);
    });

    it("evaluateTransition should fail-fast by throwing ConversationStateError on illegal transition", () => {
      expect(() => {
        evaluateTransition(ConversationStatus.CREATED, ConversationStatus.IDLE);
      }).toThrow(ConversationStateError);
    });
  });
});
