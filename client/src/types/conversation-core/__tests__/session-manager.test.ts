import { describe, it, expect, beforeEach } from "vitest";
import { SessionError, ConversationValidationError } from "../errors";
import {
  createSession,
  getSession,
  updateSession,
  archiveSession,
  closeSession,
  validateSession,
  resetSessionStore,
} from "../session-manager";

describe("Phase 9.5 Component 6: Session Manager (session-manager.test.ts)", () => {
  beforeEach(() => {
    resetSessionStore();
  });

  describe("Session Creation & Retrieval", () => {
    it("should create a valid session and retrieve it cleanly", () => {
      const session = createSession({
        sessionId: "sess_101",
        activeConversationId: "conv_101",
        maxConcurrentConversations: 3,
      });

      expect(session.sessionId).toBe("sess_101");
      expect(session.activeConversationId).toBe("conv_101");
      expect(session.maxConcurrentConversations).toBe(3);
      expect(Object.isFrozen(session)).toBe(true);

      const retrieved = getSession("sess_101");
      expect(retrieved.sessionId).toBe("sess_101");
    });

    it("should throw SessionError when creating duplicate session", () => {
      createSession({ sessionId: "sess_dup", activeConversationId: "conv_1" });

      expect(() => {
        createSession({ sessionId: "sess_dup", activeConversationId: "conv_2" });
      }).toThrow(SessionError);

      try {
        createSession({ sessionId: "sess_dup", activeConversationId: "conv_2" });
      } catch (err) {
        expect(err).toBeInstanceOf(SessionError);
        expect((err as SessionError).subCode).toBe("DuplicateSession");
      }
    });

    it("should throw SessionError when retrieving non-existent session", () => {
      expect(() => {
        getSession("sess_unknown");
      }).toThrow("was not found");
    });
  });

  describe("Session Updates & Concurrency Limit Enforcement", () => {
    it("updateSession should return new immutable session with updated activeConversationId", () => {
      createSession({ sessionId: "sess_upd", activeConversationId: "conv_1" });

      const updated = updateSession("sess_upd", {
        activeConversationId: "conv_2",
        conversationIds: ["conv_1", "conv_2"],
      });

      expect(updated.activeConversationId).toBe("conv_2");
      expect(updated.conversationIds).toEqual(["conv_1", "conv_2"]);
      expect(Object.isFrozen(updated)).toBe(true);
    });

    it("should throw SessionError if concurrent conversation count exceeds maxConcurrentConversations", () => {
      createSession({
        sessionId: "sess_limit",
        activeConversationId: "c1",
        maxConcurrentConversations: 2,
      });

      expect(() => {
        updateSession("sess_limit", {
          conversationIds: ["c1", "c2", "c3"], // 3 exceeds limit of 2
        });
      }).toThrow(SessionError);
    });

    it("validateSession should assert non-exceeded concurrency bounds", () => {
      createSession({ sessionId: "sess_val", activeConversationId: "c1" });
      expect(() => validateSession("sess_val")).not.toThrow();
    });
  });

  describe("Session Archival & Closure Lifecycles", () => {
    it("archiveSession should set metadata isArchived: true", () => {
      createSession({ sessionId: "sess_arch", activeConversationId: "c1" });
      const archived = archiveSession("sess_arch");

      expect(archived.metadata.isArchived).toBe(true);
      expect(archived.metadata.archivedAt).toBeGreaterThan(0);
      expect(Object.isFrozen(archived)).toBe(true);
    });

    it("closeSession should remove session from store and mark metadata isClosed: true", () => {
      createSession({ sessionId: "sess_close", activeConversationId: "c1" });
      const closed = closeSession("sess_close");

      expect(closed.metadata.isClosed).toBe(true);

      // Retrieving closed session from store should now fail
      expect(() => getSession("sess_close")).toThrow(SessionError);
    });
  });
});
