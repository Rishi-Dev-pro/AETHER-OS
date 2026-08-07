/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 1 Component: Runtime Bootstrap Pipeline (`runtime-bootstrap.ts`)
 *
 * @file runtime-bootstrap.ts
 * @description Application startup orchestration connecting Phase 9.9 and Phase 9.10 subsystems into a READY runtime.
 *
 * @module @aether/runtime/runtime-bootstrap
 * @version 1.0.1
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 1 FIX PACK
 */

import { ProviderManager, CredentialVault } from "../types/provider-runtime";
import { AdapterManager } from "../types/provider-adapters/adapter-manager";
import { UnifiedAdapterRuntime } from "../types/provider-adapters/unified-adapter-runtime";
import { OpenAIAdapter } from "../types/provider-adapters/openai-adapter";
import { GroqAdapter } from "../types/provider-adapters/groq-adapter";
import { NVIDIAAdapter } from "../types/provider-adapters/nvidia-adapter";
import { OllamaAdapter } from "../types/provider-adapters/ollama-adapter";
import type { RuntimeConfiguration } from "../types/provider-adapters/runtime-types";

import { validateEnvironment } from "./runtime-environment";
import { bootstrapCredentials } from "./credential-bootstrap";
import { createDiagnostics } from "./runtime-diagnostics";
import { setStatus, RuntimeStatus, resetStatus } from "./runtime-status";
import { setRuntimeInstance, getRuntime, type RuntimeInstance } from "./runtime-singleton";
import { RuntimeBootstrapError, RuntimeSingletonError } from "./runtime-errors";

/**
 * Bootstraps all Phase 9.9 and Phase 9.10 subsystems in strict required order,
 * registers credentials into CredentialVault, initializes runtime state, and produces singleton container.
 *
 * Execution sequence MUST be:
 * 1. Environment Validation
 * 2. Shared CredentialVault Creation & Environment Credential Registration
 * 3. ProviderManager Creation (injected with shared CredentialVault)
 * 4. AdapterManager Creation & Concrete Adapter Registration
 * 5. UnifiedAdapterRuntime Creation & Initialization
 * 6. Transition to READY Status
 * 7. Diagnostics Generation
 * 8. Set Singleton Instance Container
 *
 * @param config Optional RuntimeConfiguration override options.
 * @param customEnv Optional environment variable overrides for testing.
 * @returns Deeply frozen RuntimeInstance object.
 * @throws RuntimeBootstrapError if bootstrap sequence fails at any stage.
 * @throws RuntimeSingletonError if an active runtime instance container already exists.
 */
export async function bootstrapRuntime(
  config?: Partial<RuntimeConfiguration>,
  customEnv?: Record<string, string | undefined>
): Promise<Readonly<RuntimeInstance>> {
  try {
    // Stage 0: Transition status to INITIALIZING
    resetStatus();
    setStatus(RuntimeStatus.INITIALIZING);

    // Stage 1: Environment Validation
    const environmentReport = validateEnvironment(customEnv);

    // Stage 2: Create Shared CredentialVault & Register Environment Credentials
    const vault = new CredentialVault();
    bootstrapCredentials(vault, customEnv);

    // Stage 3: Create ProviderManager injected with Shared CredentialVault
    const providerManager = new ProviderManager(undefined, vault);

    // Stage 4: Create AdapterManager & Register Concrete Adapters
    const adapterManager = new AdapterManager();
    const autoRegister = config?.autoRegisterDefaultAdapters ?? true;

    if (autoRegister) {
      adapterManager.registerAdapter(new OpenAIAdapter());
      adapterManager.registerAdapter(new GroqAdapter());
      adapterManager.registerAdapter(new NVIDIAAdapter());
      adapterManager.registerAdapter(new OllamaAdapter());
    }

    // Stage 5: Create & Initialize UnifiedAdapterRuntime with Shared Vault and ProviderManager
    const runtime = new UnifiedAdapterRuntime(adapterManager, vault, providerManager);
    await runtime.initialize();

    if (config?.autoFreeze) {
      runtime.freeze();
    }

    // Stage 6: Transition to READY status
    setStatus(RuntimeStatus.READY);

    // Stage 7: Generate Diagnostics
    const diagnosticsReport = createDiagnostics(runtime, environmentReport);

    // Stage 8: Set Singleton Instance Container
    const instance: RuntimeInstance = {
      runtime,
      vault,
      providerManager,
      adapterManager,
      environmentReport,
      diagnosticsReport,
    };

    setRuntimeInstance(instance);
    return getRuntime();
  } catch (err: any) {
    if (err instanceof RuntimeSingletonError) {
      throw err;
    }
    try {
      setStatus(RuntimeStatus.FAILED);
    } catch {
      // Ignore transition errors during failure handling
    }
    if (err instanceof RuntimeBootstrapError) {
      throw err;
    }
    throw new RuntimeBootstrapError(`Runtime bootstrap failed: ${err.message}`, {
      originalError: err.message,
    });
  }
}
