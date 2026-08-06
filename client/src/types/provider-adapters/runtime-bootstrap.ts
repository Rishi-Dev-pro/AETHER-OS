/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 6 Component: Runtime Bootstrap (`runtime-bootstrap.ts`)
 *
 * @file runtime-bootstrap.ts
 * @description Bootstrap utility initializing and wiring up all Phase 9.9 and Phase 9.10 subsystems
 * into a production-ready UnifiedAdapterRuntime instance.
 *
 * @module @aether/provider-adapters/runtime-bootstrap
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import { ProviderManager, CredentialVault } from "../provider-runtime";
import { AdapterManager } from "./adapter-manager";
import { UnifiedAdapterRuntime } from "./unified-adapter-runtime";
import { OpenAIAdapter } from "./openai-adapter";
import { GroqAdapter } from "./groq-adapter";
import { NVIDIAAdapter } from "./nvidia-adapter";
import { OllamaAdapter } from "./ollama-adapter";
import type { RuntimeConfiguration } from "./runtime-types";

/**
 * Bootstraps every Phase 9.9 and Phase 9.10 component and registers default concrete provider adapters.
 *
 * @param config Optional RuntimeConfiguration options.
 * @returns Frozen container object containing initialized runtime and subsystems.
 */
export function bootstrapRuntime(config?: Partial<RuntimeConfiguration>): Readonly<{
  runtime: UnifiedAdapterRuntime;
  vault: CredentialVault;
  adapterManager: AdapterManager;
  providerManager: ProviderManager;
}> {
  const vault = new CredentialVault();
  const adapterManager = new AdapterManager();
  const providerManager = new ProviderManager();

  const autoRegister = config?.autoRegisterDefaultAdapters ?? true;

  if (autoRegister) {
    adapterManager.registerAdapter(new OpenAIAdapter());
    adapterManager.registerAdapter(new GroqAdapter());
    adapterManager.registerAdapter(new NVIDIAAdapter());
    adapterManager.registerAdapter(new OllamaAdapter());
  }

  const runtime = new UnifiedAdapterRuntime(adapterManager, vault, providerManager);

  if (config?.autoFreeze) {
    runtime.freeze();
  }

  return Object.freeze({
    runtime,
    vault,
    adapterManager,
    providerManager,
  });
}
