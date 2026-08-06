/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Factory Functions & Capabilities (`factories.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  ProviderAdapterType,
  AdapterStatus,
  AdapterCapability,
  ModelCapability,
  AdapterPriority,
  RequestType,
  ResponseType,
  ModelFamily,
  ProviderVendor,
} from "../enums";
import {
  InvalidAdapterError,
  InvalidRequestError,
  InvalidResponseError,
} from "../errors";
import {
  deepFreeze,
  createAdapterMetadata,
  createProviderModel,
  createCapabilityDeclaration,
  createProviderRequestMetadata,
  createProviderResponseMetadata,
  createUsageStatistics,
  createAdapterDescriptor,
} from "../factories";
import {
  supportsStreaming,
  supportsVision,
  supportsEmbeddings,
  supportsToolCalling,
  supportsImageGeneration,
  supportsSpeech,
  supportsReasoning,
  supportsJSONMode,
  supportsStructuredOutput,
  supportsFunctionCalling,
} from "../adapter-capabilities";

describe("Phase 9.10 Adapter Factories and Capability Assertions", () => {
  describe("deepFreeze()", () => {
    it("should recursively freeze nested objects and arrays", () => {
      const target = {
        name: "Adapter",
        details: {
          vendor: "OpenAI",
          tags: ["cloud", "fast"],
        },
      };

      const frozen = deepFreeze(target);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.details)).toBe(true);
      expect(Object.isFrozen(frozen.details.tags)).toBe(true);

      expect(() => {
        (frozen as any).name = "Mutated";
      }).toThrow();

      expect(() => {
        (frozen.details as any).vendor = "Mutated";
      }).toThrow();
    });

    it("should handle circular references without infinite recursion", () => {
      const obj: any = { name: "Circular" };
      obj.self = obj;

      const frozen = deepFreeze(obj);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen.self).toBe(frozen);
    });
  });

  describe("createAdapterMetadata()", () => {
    it("should construct deeply frozen adapter metadata", () => {
      const meta = createAdapterMetadata({
        identity: {
          adapterId: "groq-llama3",
          adapterType: ProviderAdapterType.GROQ,
          vendor: ProviderVendor.GROQ,
          version: "1.0.0",
        },
        displayName: "Groq Llama-3 Adapter",
        description: "Ultra-fast inference adapter",
      });

      expect(meta.identity.adapterId).toBe("groq-llama3");
      expect(meta.displayName).toBe("Groq Llama-3 Adapter");
      expect(meta.priority).toBe(AdapterPriority.NORMAL);
      expect(Object.isFrozen(meta)).toBe(true);
      expect(Object.isFrozen(meta.identity)).toBe(true);
    });

    it("should throw InvalidAdapterError when identity fields are invalid", () => {
      expect(() =>
        createAdapterMetadata({
          displayName: "No identity",
        })
      ).toThrow(InvalidAdapterError);

      expect(() =>
        createAdapterMetadata({
          identity: {
            adapterId: "",
            adapterType: ProviderAdapterType.GROQ,
            vendor: ProviderVendor.GROQ,
            version: "1.0.0",
          },
          displayName: "Invalid ID",
        })
      ).toThrow(InvalidAdapterError);
    });
  });

  describe("createProviderModel()", () => {
    it("should construct valid frozen ProviderModelDescriptor", () => {
      const model = createProviderModel({
        modelId: "llama-3-70b",
        modelName: "Llama 3 70B",
        family: ModelFamily.LLAMA,
        vendor: ProviderVendor.META,
        contextWindowTokens: 8192,
        maxOutputTokens: 2048,
        capabilities: [ModelCapability.TEXT, ModelCapability.TOOLS],
      });

      expect(model.modelId).toBe("llama-3-70b");
      expect(model.contextWindowTokens).toBe(8192);
      expect(Object.isFrozen(model)).toBe(true);
    });

    it("should throw InvalidAdapterError when tokens are invalid", () => {
      expect(() =>
        createProviderModel({
          modelId: "m1",
          modelName: "M1",
          contextWindowTokens: -1,
          maxOutputTokens: 100,
        })
      ).toThrow(InvalidAdapterError);
    });
  });

  describe("createCapabilityDeclaration() & Predicates", () => {
    it("should build capability matrix and resolve query predicates", () => {
      const caps = createCapabilityDeclaration([
        AdapterCapability.TEXT_GENERATION,
        AdapterCapability.STREAMING,
        AdapterCapability.VISION,
        AdapterCapability.TOOL_CALLING,
        AdapterCapability.JSON_MODE,
        AdapterCapability.REASONING,
      ]);

      expect(supportsStreaming(caps)).toBe(true);
      expect(supportsVision(caps)).toBe(true);
      expect(supportsEmbeddings(caps)).toBe(false);
      expect(supportsToolCalling(caps)).toBe(true);
      expect(supportsImageGeneration(caps)).toBe(false);
      expect(supportsSpeech(caps)).toBe(false);
      expect(supportsReasoning(caps)).toBe(true);
      expect(supportsJSONMode(caps)).toBe(true);
      expect(supportsStructuredOutput(caps)).toBe(false);
      expect(supportsFunctionCalling(caps)).toBe(false);
      expect(Object.isFrozen(caps)).toBe(true);
    });
  });

  describe("createProviderRequestMetadata()", () => {
    it("should construct valid frozen request metadata", () => {
      const req = createProviderRequestMetadata({
        requestId: "req-100",
        requestType: RequestType.VISION,
        timeoutMs: 15000,
      });

      expect(req.requestId).toBe("req-100");
      expect(req.requestType).toBe(RequestType.VISION);
      expect(req.timeoutMs).toBe(15000);
      expect(req.traceId).toBeDefined();
      expect(Object.isFrozen(req)).toBe(true);
    });

    it("should throw InvalidRequestError when requestId is missing", () => {
      expect(() => createProviderRequestMetadata({ requestId: "" })).toThrow(InvalidRequestError);
    });
  });

  describe("createProviderResponseMetadata()", () => {
    it("should construct valid response metadata", () => {
      const res = createProviderResponseMetadata({
        responseId: "res-200",
        requestId: "req-100",
        modelUsed: "gpt-4o",
        latencyMs: 150,
      });

      expect(res.responseId).toBe("res-200");
      expect(res.latencyMs).toBe(150);
      expect(Object.isFrozen(res)).toBe(true);
    });

    it("should throw InvalidResponseError on invalid fields", () => {
      expect(() =>
        createProviderResponseMetadata({
          responseId: "res-1",
          requestId: "",
          modelUsed: "gpt-4o",
        })
      ).toThrow(InvalidResponseError);
    });
  });

  describe("createUsageStatistics()", () => {
    it("should construct usage statistics and compute total tokens automatically", () => {
      const usage = createUsageStatistics({
        promptTokens: 50,
        completionTokens: 25,
      });

      expect(usage.promptTokens).toBe(50);
      expect(usage.completionTokens).toBe(25);
      expect(usage.totalTokens).toBe(75);
      expect(Object.isFrozen(usage)).toBe(true);
    });

    it("should throw InvalidResponseError when totalTokens is inconsistent", () => {
      expect(() =>
        createUsageStatistics({
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 10, // Invalid!
        })
      ).toThrow(InvalidResponseError);
    });
  });

  describe("createAdapterDescriptor()", () => {
    it("should create complete frozen descriptor", () => {
      const metadata = createAdapterMetadata({
        identity: {
          adapterId: "anthropic-claude",
          adapterType: ProviderAdapterType.ANTHROPIC,
          vendor: ProviderVendor.ANTHROPIC,
          version: "1.0.0",
        },
        displayName: "Anthropic Claude Adapter",
      });

      const model = createProviderModel({
        modelId: "claude-3-5-sonnet",
        modelName: "Claude 3.5 Sonnet",
        contextWindowTokens: 200000,
        maxOutputTokens: 8192,
      });

      const capabilities = createCapabilityDeclaration([AdapterCapability.TEXT_GENERATION]);

      const descriptor = createAdapterDescriptor({
        metadata,
        supportedModels: [model],
        defaultModelId: "claude-3-5-sonnet",
        capabilities,
      });

      expect(descriptor.defaultModelId).toBe("claude-3-5-sonnet");
      expect(descriptor.status).toBe(AdapterStatus.READY);
      expect(Object.isFrozen(descriptor)).toBe(true);
    });

    it("should throw InvalidAdapterError when defaultModelId is not in supportedModels", () => {
      const metadata = createAdapterMetadata({
        identity: {
          adapterId: "anthropic-claude",
          adapterType: ProviderAdapterType.ANTHROPIC,
          vendor: ProviderVendor.ANTHROPIC,
          version: "1.0.0",
        },
        displayName: "Anthropic Claude Adapter",
      });

      const model = createProviderModel({
        modelId: "claude-3-5-sonnet",
        modelName: "Claude 3.5 Sonnet",
        contextWindowTokens: 200000,
        maxOutputTokens: 8192,
      });

      const capabilities = createCapabilityDeclaration([AdapterCapability.TEXT_GENERATION]);

      expect(() =>
        createAdapterDescriptor({
          metadata,
          supportedModels: [model],
          defaultModelId: "non-existent-model",
          capabilities,
        })
      ).toThrow(InvalidAdapterError);
    });
  });
});
