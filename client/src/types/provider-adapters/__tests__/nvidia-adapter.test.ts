/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: NVIDIA NIM Adapter (`nvidia-adapter.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { NVIDIAAdapter } from "../nvidia-adapter";
import { ProviderVendor } from "../enums";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 NVIDIA NIM Adapter Unit Tests", () => {
  it("should initialize NVIDIAAdapter with correct vendor, capabilities, and provider config", () => {
    const adapter = new NVIDIAAdapter("nvidia-key-777");

    expect(adapter.identity.adapterId).toBe("nvidia-adapter");
    expect(adapter.identity.vendor).toBe(ProviderVendor.NVIDIA);
    expect(adapter.providerConfig.endpointConfig.baseUrl).toBe("https://integrate.api.nvidia.com/v1");
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("should serialize TranslationRequest into NVIDIA wire format", () => {
    const adapter = new NVIDIAAdapter();
    const req = translateRequest({
      modelId: "meta/llama-3.3-70b-instruct",
      context: {
        conversationId: "conv-nv",
        messages: [{ id: "m1", role: "user", content: "NVIDIA NIM prompt", timestamp: 1000 }],
      },
    });

    const serialized = adapter.serializeRequest(req);

    expect(serialized["model"]).toBe("meta/llama-3.3-70b-instruct");
    expect(Object.isFrozen(serialized)).toBe(true);
  });
});
