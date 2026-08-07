/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 6 & 7 Component: Runtime Bootstrap (`runtime-bootstrap.ts`)
 *
 * @file runtime-bootstrap.ts
 * @description Bootstrap utility initializing and wiring up all Phase 9.9 and Phase 9.10 subsystems
 * into a production-ready UnifiedAdapterRuntime instance, including secure environment credential loading.
 *
 * @module @aether/provider-adapters/runtime-bootstrap
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 7
 */

import { ProviderManager, CredentialVault } from "../provider-runtime";
import { AdapterManager } from "./adapter-manager";
import { UnifiedAdapterRuntime } from "./unified-adapter-runtime";
import { OpenAIAdapter } from "./openai-adapter";
import { GroqAdapter } from "./groq-adapter";
import { NVIDIAAdapter } from "./nvidia-adapter";
import { OllamaAdapter } from "./ollama-adapter";
import type { RuntimeConfiguration } from "./runtime-types";
import { bootstrapCredentials } from "../../runtime/credential-bootstrap";

/**
 * Bootstraps every Phase 9.9 and Phase 9.10 component, registers default concrete provider adapters,
 * and securely loads environment credentials into CredentialVault.
 *
 * @param config Optional RuntimeConfiguration options.
 * @param customEnv Optional custom environment dictionary for credential bootstrap.
 * @returns Frozen container object containing initialized runtime and subsystems.
 */
export function bootstrapRuntime(
  config?: Partial<RuntimeConfiguration>,
  customEnv?: Record<string, string | undefined>
): Readonly<{
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

  // Load environment credentials into vault
  bootstrapCredentials(vault, customEnv);

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
