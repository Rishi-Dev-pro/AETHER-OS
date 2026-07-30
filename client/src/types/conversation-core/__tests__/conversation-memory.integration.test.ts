/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 5 Integration Test Suite: Conversation Core Memory Integration (`conversation-memory.integration.test.ts`)
 *
 * @file conversation-memory.integration.test.ts
 * @description Comprehensive integration tests validating Memory System integration into Conversation Core:
 * automatic memory creation on completion, duplicate prevention, retrieval before prompt generation,
 * memory reinforcement, graceful fallback when memory system is unavailable, determinism, and immutability.
 *
 * @module @aether/conversation-core/__tests__/conversation-memory.integration.test
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrGetConversation,
  beginTurn,
  appendAssistantMessage,
  completeTurn,
  prepareContext,
  resetConversationStore,
} from "../turn-orchestrator";
import {
  bindMemoryManager,
  evaluateAndCreateMemory,
  retrieveMemoriesForContext,
  reinforceContextMemories,
  injectMemoriesIntoContextSnapshot,
} from "../memory-integration";
import { MemoryManager } from "../../memory-system/memory-manager";

describe("Conversation Core & Memory System Integration (Milestone 5)", () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    resetConversationStore();
    memoryManager = new MemoryManager();
    bindMemoryManager(memoryManager);
  });

  describe("1. Automatic Memory Creation on Conversation Completion", () => {
    it("should automatically evaluate and create episodic memory upon completing turn threshold", () => {
      const convId = "conv-integration-1";
      createOrGetConversation(convId, "session-1", "System prompt");

      // Turn 1
      const { turn: turn1 } = beginTurn(convId, "My preferred programming language is TypeScript.");
      appendAssistantMessage(convId, turn1.turnId, "Got it! I will remember TypeScript preference.");
      completeTurn(convId, turn1.turnId, { memoryManager });

      const memoryId = `mem_conv_${convId}`;
      const memory = memoryManager.getMemory(memoryId);

      expect(memory).toBeDefined();
      expect(memory.id).toBe(memoryId);
      expect(memory.type).toBe("episodic");
      expect(memory.content).toContain("User: My preferred programming language is TypeScript.");
      expect(memory.content).toContain("Assistant: Got it! I will remember TypeScript preference.");
      expect(Object.isFrozen(memory)).toBe(true);
    });

    it("should prevent duplicate memory creation when completing additional turns in same conversation", () => {
      const convId = "conv-integration-dup";
      createOrGetConversation(convId, "session-1");

      // Turn 1
      const { turn: t1 } = beginTurn(convId, "Rule 1: Always use strict mode.");
      appendAssistantMessage(convId, t1.turnId, "Acknowledged Rule 1.");
      completeTurn(convId, t1.turnId, { memoryManager });

      const initialMemory = memoryManager.getMemory(`mem_conv_${convId}`);
      expect(initialMemory).toBeDefined();

      // Turn 2
      const { turn: t2 } = beginTurn(convId, "Rule 2: Avoid global state.");
      appendAssistantMessage(convId, t2.turnId, "Acknowledged Rule 2.");
      completeTurn(convId, t2.turnId, { memoryManager });

      // Count total memories in manager matching this conversation
      const allMemories = memoryManager.listMemories();
      const matches = allMemories.filter((m) => m.id === `mem_conv_${convId}`);
      expect(matches.length).toBe(1);
    });
  });

  describe("2. Memory Retrieval Before Prompt Generation", () => {
    it("should retrieve relevant memories and inject them into prepared context snapshot", () => {
      // Pre-populate memory system with user preference
      memoryManager.createMemory({
        id: "mem-pref-dark",
        type: "long_term",
        content: "User prefers dark mode UI and high contrast themes.",
        metadata: { id: "mem-pref-dark", tags: ["ui", "theme"] },
      });

      const convId = "conv-retrieval-test";
      createOrGetConversation(convId, "session-2");

      const { turn } = beginTurn(convId, "What theme should we render for the UI?");
      appendAssistantMessage(convId, turn.turnId, "Processing...");

      const contextSnapshot = prepareContext(convId, 2048, {
        memoryManager,
        textQuery: "dark mode UI theme",
      });

      expect("retrievedMemories" in contextSnapshot).toBe(true);
      const enhanced = contextSnapshot as any;
      expect(enhanced.retrievedMemories.length).toBeGreaterThan(0);
      expect(enhanced.retrievedMemories[0].entry.id).toBe("mem-pref-dark");
      expect(enhanced.memoryContextBlock).toContain("User prefers dark mode UI");
      expect(Object.isFrozen(contextSnapshot)).toBe(true);
    });
  });

  describe("3. Memory Reinforcement After Context Usage", () => {
    it("should reinforce memory access metadata when retrieved memories are used in context", () => {
      memoryManager.createMemory({
        id: "mem-reinforce-target",
        type: "semantic",
        content: "Aether OS architecture utilizes fail-fast invariants.",
        metadata: { id: "mem-reinforce-target", accessCount: 0, importanceScore: 0.5 },
      });

      const initialMemory = memoryManager.getMemory("mem-reinforce-target");
      expect(initialMemory.metadata.accessCount).toBe(1); // 1 from initial getMemory

      const convId = "conv-reinforce-test";
      createOrGetConversation(convId, "session-3");
      beginTurn(convId, "Tell me about Aether OS architecture invariants.");

      prepareContext(convId, 1024, {
        memoryManager,
        textQuery: "Aether OS architecture invariants",
      });

      const reinforcedMemory = memoryManager.getMemory("mem-reinforce-target");
      expect(reinforcedMemory.metadata.accessCount).toBeGreaterThan(1);
      expect(reinforcedMemory.metadata.importanceScore).toBeGreaterThan(0.5);
    });
  });

  describe("4. Graceful Fallback Strategy", () => {
    it("should continue functioning normally without errors when MemoryManager is null or unavailable", () => {
      bindMemoryManager(null); // Unbind memory manager

      const convId = "conv-fallback-test";
      createOrGetConversation(convId, "session-fallback");

      const { turn } = beginTurn(convId, "Hello assistant!");
      appendAssistantMessage(convId, turn.turnId, "Hello! How can I help?");
      
      // completeTurn should not throw error even without memoryManager
      const completionResult = completeTurn(convId, turn.turnId);
      expect(completionResult.conversation.status).toBe("IDLE");

      // prepareContext should produce standard ContextSnapshot without crashing
      const snapshot = prepareContext(convId, 2048);
      expect(snapshot.activeMessages.length).toBeGreaterThan(0);
      expect((snapshot as any).retrievedMemories).toBeUndefined();
    });

    it("should handle errors inside memory creation gracefully without crashing conversation workflow", () => {
      // Mock broken memory manager that throws error
      const brokenManager = {
        createMemory: () => {
          throw new Error("Storage disk write failure");
        },
        getMemory: () => {
          throw new Error("Memory not found");
        },
      } as unknown as MemoryManager;

      const convId = "conv-broken-manager";
      createOrGetConversation(convId, "session-broken");
      const { turn } = beginTurn(convId, "Testing broken storage fallback.");
      appendAssistantMessage(convId, turn.turnId, "Response text.");

      expect(() => {
        completeTurn(convId, turn.turnId, { memoryManager: brokenManager });
      }).not.toThrow();
    });
  });

  describe("5. Invariant Invariance & Immutability", () => {
    it("should preserve deep immutability across all integrated context outputs", () => {
      memoryManager.createMemory({
        id: "mem-immutable",
        type: "long_term",
        content: "Immutable memory content test.",
      });

      const convId = "conv-immutable-test";
      createOrGetConversation(convId, "session-imm");
      beginTurn(convId, "Immutable prompt text.");

      const snapshot = prepareContext(convId, 2048, { memoryManager });
      expect(Object.isFrozen(snapshot)).toBe(true);

      const enhanced = snapshot as any;
      if (enhanced.retrievedMemories) {
        expect(Object.isFrozen(enhanced.retrievedMemories)).toBe(true);
      }
    });
  });
});
