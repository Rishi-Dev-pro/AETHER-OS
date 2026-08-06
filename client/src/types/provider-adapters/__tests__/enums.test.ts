/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Canonical Enums (`enums.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  ProviderAdapterType,
  AdapterStatus,
  AdapterCapability,
  ModelCapability,
  StreamingMode,
  AuthenticationType,
  AdapterPriority,
  RequestType,
  ResponseType,
  ModelFamily,
  ProviderVendor,
} from "../enums";

describe("Phase 9.10 Provider Adapter Enums", () => {
  it("should ensure all enums use string literal values and contain no numeric values", () => {
    const enumModules = [
      ProviderAdapterType,
      AdapterStatus,
      AdapterCapability,
      ModelCapability,
      StreamingMode,
      AuthenticationType,
      AdapterPriority,
      RequestType,
      ResponseType,
      ModelFamily,
      ProviderVendor,
    ];

    for (const enumObj of enumModules) {
      const values = Object.values(enumObj);
      expect(values.length).toBeGreaterThan(0);
      for (const val of values) {
        expect(typeof val).toBe("string");
        expect(typeof val).not.toBe("number");
      }
    }
  });

  it("should contain expected enum members for ProviderAdapterType", () => {
    expect(ProviderAdapterType.OPENAI).toBe("OPENAI");
    expect(ProviderAdapterType.NVIDIA).toBe("NVIDIA");
    expect(ProviderAdapterType.GROQ).toBe("GROQ");
    expect(ProviderAdapterType.OLLAMA).toBe("OLLAMA");
    expect(ProviderAdapterType.ANTHROPIC).toBe("ANTHROPIC");
    expect(ProviderAdapterType.GEMINI).toBe("GEMINI");
    expect(ProviderAdapterType.CUSTOM).toBe("CUSTOM");
  });

  it("should contain expected enum members for AdapterStatus", () => {
    expect(AdapterStatus.UNINITIALIZED).toBe("UNINITIALIZED");
    expect(AdapterStatus.INITIALIZING).toBe("INITIALIZING");
    expect(AdapterStatus.READY).toBe("READY");
    expect(AdapterStatus.DEGRADED).toBe("DEGRADED");
    expect(AdapterStatus.FAULTED).toBe("FAULTED");
    expect(AdapterStatus.DISPOSED).toBe("DISPOSED");
  });

  it("should contain expected enum members for AdapterCapability", () => {
    expect(AdapterCapability.TEXT_GENERATION).toBe("TEXT_GENERATION");
    expect(AdapterCapability.STREAMING).toBe("STREAMING");
    expect(AdapterCapability.VISION).toBe("VISION");
    expect(AdapterCapability.EMBEDDING).toBe("EMBEDDING");
    expect(AdapterCapability.SPEECH).toBe("SPEECH");
    expect(AdapterCapability.IMAGE_GENERATION).toBe("IMAGE_GENERATION");
    expect(AdapterCapability.TOOL_CALLING).toBe("TOOL_CALLING");
    expect(AdapterCapability.REASONING).toBe("REASONING");
    expect(AdapterCapability.JSON_MODE).toBe("JSON_MODE");
    expect(AdapterCapability.STRUCTURED_OUTPUT).toBe("STRUCTURED_OUTPUT");
    expect(AdapterCapability.FUNCTION_CALLING).toBe("FUNCTION_CALLING");
  });

  it("should contain expected enum members for StreamingMode and AuthType", () => {
    expect(StreamingMode.SERVER_SENT_EVENTS).toBe("SERVER_SENT_EVENTS");
    expect(AuthenticationType.API_KEY).toBe("API_KEY");
    expect(AdapterPriority.HIGH).toBe("HIGH");
    expect(RequestType.TEXT).toBe("TEXT");
    expect(ResponseType.STREAM_CHUNK).toBe("STREAM_CHUNK");
    expect(ModelFamily.GPT).toBe("GPT");
    expect(ProviderVendor.OPENAI).toBe("OPENAI");
  });
});
