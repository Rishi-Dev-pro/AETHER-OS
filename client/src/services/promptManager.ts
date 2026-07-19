import { useIntentStore } from "../store/intentStore";
import { useCognitiveStore } from "../store/cognitiveStore";
import { usePromptStore } from "../store/promptStore";
import { promptBuilderOrchestrator } from "./promptBuilderOrchestrator";
import { promptProfiler } from "./promptProfiler";
import type { IntentResult } from "../types/intent";

class PromptManager {
  private unsubscribe: (() => void) | null = null;
  private isInitialized = false;
  private lastIntentId: string | null = null;

  /**
   * Initializes PromptManager by subscribing to Intent Store updates.
   */
  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.lastIntentId = null;

    this.unsubscribe = useIntentStore.subscribe((state) => {
      const intent = state.latestIntent;
      if (intent && intent.intentId !== this.lastIntentId) {
        this.lastIntentId = intent.intentId;
        this.processIntent(intent);
      }
    });
  }

  /**
   * Cleans up subscription hooks.
   */
  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isInitialized = false;
    this.lastIntentId = null;
  }

  private processIntent(intent: IntentResult): void {
    const cognitiveState = useCognitiveStore.getState();
    const context = cognitiveState.latestContext;

    if (!context) {
      console.warn("[PromptManager] Cannot build prompt: No StructuredContext available.");
      return;
    }

    try {
      usePromptStore.getState().setCompileStatus("compiling");

      // Execute orchestrator compilation
      const promptPkg = promptBuilderOrchestrator.build(context, intent);

      // Publish Compiled PromptPackage
      usePromptStore.getState().setPromptPackage(promptPkg);

      // Check if compilation failed (validation warning/diagnostics fallback generated)
      const isDiagnostics = promptPkg.activeContext.includes("<diagnostics>");
      if (isDiagnostics) {
        console.error("Compilation Failed");
      }

      this.logDebugReport(intent, promptPkg, !isDiagnostics);
    } catch (error) {
      console.error("[PromptManager] Error building prompt:", error);
      usePromptStore.getState().setCompileStatus("error");
    }
  }

  /**
   * Formats and prints a detailed PromptBuilder Debug Report to the browser console.
   */
  private logDebugReport(
    intent: IntentResult,
    promptPkg: any,
    isSuccess: boolean
  ): void {
    // Only execute console log reports in development mode
    if (!import.meta.env.DEV) {
      return;
    }

    const profile = promptProfiler.profile(intent);
    const isDiagnostics = promptPkg.activeContext.includes("<diagnostics>");
    
    const statusText = isSuccess ? "SUCCESS" : "FAILURE";
    const diagnosticsAlert = isDiagnostics ? "\n*** DIAGNOSTICS PACKAGE GENERATED ***\n" : "";

    const providerList = profile.requiredProviders
      .map(p => {
        const name = p.replace("aether:provider:", "");
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        return `✓ ${formattedName}`;
      })
      .join("\n");

    console.log(`
=============================================================
AETHER OS
Prompt Builder Debug
=============================================================

Compilation Status
${statusText}
${diagnosticsAlert}
-------------------------------------------------------------
Intent
${intent.intent}

-------------------------------------------------------------
Prompt Profile
${profile.id}

-------------------------------------------------------------
Estimated Tokens
${promptPkg.metadata.tokenCount}

-------------------------------------------------------------
Providers Used
${providerList}

-------------------------------------------------------------
System Instructions
${promptPkg.systemInstructions}

-------------------------------------------------------------
Active Context
${promptPkg.activeContext}

-------------------------------------------------------------
User Request
${promptPkg.userRequest}

-------------------------------------------------------------
Metadata
`, promptPkg.metadata, `
-------------------------------------------------------------
PromptPackage
`, promptPkg, `
=============================================================
`);
  }
}

export const promptManager = new PromptManager();
