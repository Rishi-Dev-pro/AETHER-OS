import { describe, it, expect } from "vitest";
import type { PromptPackage } from "../../prompt";
import { PriorityTier, ModelTier, PrivacyMode } from "../types";
import { ConfigurationError } from "../errors";
import { createAIRequest, deepFreeze } from "../ai-request";

describe("Phase 9.4 Component 3: Canonical AIRequest Envelope (ai-request.ts)", () => {
  const mockPromptPackage: PromptPackage = {
    systemInstructions: "You are AETHER OS AI assistant.",
    activeContext: "<context><system>online</system></context>",
    userRequest: "Summarize active windows.",
    metadata: {
      snapshotId: "snap_9901",
      intentId: "intent_4402",
      tokenCount: 150,
      latencyMs: 12,
    },
  };

  describe("Successful AIRequest Creation & Defaults", () => {
    it("should create a valid AIRequest with default options and metadata", () => {
      const request = createAIRequest({
        requestId: "req_test_001",
        promptPackage: mockPromptPackage,
      });

      expect(request.metadata.requestId).toBe("req_test_001");
      expect(request.metadata.timestamp).toBeGreaterThan(0);
      expect(request.metadata.priorityTier).toBe(PriorityTier.USER_INTERACTIVE);
      expect(request.metadata.modelTier).toBe(ModelTier.STANDARD);
      expect(request.metadata.privacyMode).toBe(PrivacyMode.STANDARD);
      expect(request.metadata.correlationContext.snapshotId).toBe("snap_9901");
      expect(request.metadata.correlationContext.intentId).toBe("intent_4402");

      expect(request.promptPackage.systemInstructions).toBe("You are AETHER OS AI assistant.");
      expect(request.promptPackage.userRequest).toBe("Summarize active windows.");

      expect(request.options.stream).toBe(false);
    });

    it("should accept explicit custom priority, model tier, privacy mode, and generation options", () => {
      const request = createAIRequest({
        requestId: "req_test_002",
        promptPackage: mockPromptPackage,
        priorityTier: PriorityTier.SYSTEM_CRITICAL,
        modelTier: ModelTier.REASONING,
        privacyMode: PrivacyMode.LOCAL_ONLY,
        options: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
          stream: true,
          stopSequences: ["\nUser:", "END"],
        },
      });

      expect(request.metadata.priorityTier).toBe(PriorityTier.SYSTEM_CRITICAL);
      expect(request.metadata.modelTier).toBe(ModelTier.REASONING);
      expect(request.metadata.privacyMode).toBe(PrivacyMode.LOCAL_ONLY);

      expect(request.options.temperature).toBe(0.7);
      expect(request.options.maxTokens).toBe(2048);
      expect(request.options.topP).toBe(0.9);
      expect(request.options.stream).toBe(true);
      expect(request.options.stopSequences).toEqual(["\nUser:", "END"]);
    });
  });

  describe("Deep Freeze & Immutability Guarantees", () => {
    it("deepFreeze utility should recursively freeze nested objects", () => {
      const obj = { a: 1, b: { c: [1, 2, 3] } };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.b)).toBe(true);
      expect(Object.isFrozen(frozen.b.c)).toBe(true);
    });

    it("should prevent mutation of top-level request properties at runtime", () => {
      const request = createAIRequest({
        requestId: "req_test_003",
        promptPackage: mockPromptPackage,
      });

      expect(Object.isFrozen(request)).toBe(true);
      expect(() => {
        // @ts-expect-error mutating frozen object
        request.metadata = {} as never;
      }).toThrow();
    });

    it("should prevent mutation of nested metadata and options properties at runtime", () => {
      const request = createAIRequest({
        requestId: "req_test_004",
        promptPackage: mockPromptPackage,
        options: {
          stopSequences: ["STOP"],
        },
      });

      expect(Object.isFrozen(request.metadata)).toBe(true);
      expect(Object.isFrozen(request.options)).toBe(true);
      expect(Object.isFrozen(request.promptPackage)).toBe(true);

      expect(() => {
        // @ts-expect-error mutating frozen nested property
        request.metadata.requestId = "hacked_id";
      }).toThrow();

      expect(() => {
        // @ts-expect-error mutating frozen options property
        (request.options.stopSequences as string[])[0] = "MUTATED";
      }).toThrow();
    });
  });

  describe("Invariant Validation & Fail-Fast Errors", () => {
    it("should throw ConfigurationError if requestId is missing or empty", () => {
      expect(() => {
        createAIRequest({
          requestId: "   ",
          promptPackage: mockPromptPackage,
        });
      }).toThrow(ConfigurationError);

      try {
        createAIRequest({
          requestId: "",
          promptPackage: mockPromptPackage,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        const configErr = err as ConfigurationError;
        expect(configErr.subCode).toBe("InvalidRequestId");
      }
    });

    it("should throw ConfigurationError if promptPackage is missing or malformed", () => {
      try {
        createAIRequest({
          requestId: "req_005",
          promptPackage: null as never,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("MissingPromptPackage");
      }

      try {
        createAIRequest({
          requestId: "req_006",
          promptPackage: { systemInstructions: 123 } as never,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("MalformedPromptPackage");
      }
    });

    it("should throw ConfigurationError if temperature is out of bounds [0.0, 2.0]", () => {
      expect(() => {
        createAIRequest({
          requestId: "req_007",
          promptPackage: mockPromptPackage,
          options: { temperature: 2.5 },
        });
      }).toThrow("Temperature option must be a number between 0.0 and 2.0");

      expect(() => {
        createAIRequest({
          requestId: "req_008",
          promptPackage: mockPromptPackage,
          options: { temperature: -0.1 },
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError if maxTokens is not a positive integer", () => {
      expect(() => {
        createAIRequest({
          requestId: "req_009",
          promptPackage: mockPromptPackage,
          options: { maxTokens: 0 },
        });
      }).toThrow("MaxTokens option must be a positive integer");

      expect(() => {
        createAIRequest({
          requestId: "req_010",
          promptPackage: mockPromptPackage,
          options: { maxTokens: 100.5 },
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError if topP is out of bounds [0.0, 1.0]", () => {
      expect(() => {
        createAIRequest({
          requestId: "req_011",
          promptPackage: mockPromptPackage,
          options: { topP: 1.5 },
        });
      }).toThrow("TopP option must be a number between 0.0 and 1.0");
    });
  });
});
