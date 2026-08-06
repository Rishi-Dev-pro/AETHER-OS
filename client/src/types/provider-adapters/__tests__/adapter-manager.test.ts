/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Adapter Manager (`adapter-manager.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { AdapterManager } from "../adapter-manager";
import { OpenAIAdapter } from "../openai-adapter";
import { GroqAdapter } from "../groq-adapter";
import { NVIDIAAdapter } from "../nvidia-adapter";
import { OllamaAdapter } from "../ollama-adapter";
import { AdapterConfigurationError } from "../errors";

describe("Phase 9.10 Adapter Manager Unit Tests", () => {
  it("should register concrete adapters and list them deterministically", () => {
    const manager = new AdapterManager();
    const openai = new OpenAIAdapter();
    const groq = new GroqAdapter();
    const nvidia = new NVIDIAAdapter();
    const ollama = new OllamaAdapter();

    manager.registerAdapter(openai);
    manager.registerAdapter(groq);
    manager.registerAdapter(nvidia);
    manager.registerAdapter(ollama);

    const list = manager.listAdapters();
    expect(list.length).toBe(4);
    expect(list[0].identity.adapterId).toBe("groq-adapter");
    expect(list[1].identity.adapterId).toBe("nvidia-adapter");
    expect(list[2].identity.adapterId).toBe("ollama-adapter");
    expect(list[3].identity.adapterId).toBe("openai-adapter");
  });

  it("should validate and health check registered adapters", async () => {
    const manager = new AdapterManager();
    manager.registerAdapter(new OpenAIAdapter());

    const isHealthy = await manager.health("openai-adapter");
    expect(isHealthy).toBe(true);

    expect(() => manager.getAdapter("non-existent")).toThrow(AdapterConfigurationError);
  });
});
