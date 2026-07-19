import type { StructuredContext } from "../types/cognitive";
import type { IntentResult } from "../types/intent";
import type { PromptPackage } from "../types/prompt";
import { providerRegistry } from "./providerRegistry";
import { promptProfiler } from "./promptProfiler";
import { promptComposer } from "./promptComposer";
import { promptValidator } from "./promptValidator";

class PromptBuilderOrchestrator {
  /**
   * Coordinates the full execution flow of the prompt builder pipeline.
   */
  build(
    context: StructuredContext,
    intent: IntentResult,
    _config?: any
  ): PromptPackage {
    const startTime = performance.now();

    try {
      // 1. Profile Generation
      const profile = promptProfiler.profile(intent);

      // 2. Select and Execute Providers
      const contextBlocks = new Map<string, string>();
      for (const providerId of profile.requiredProviders) {
        const provider = providerRegistry.get(providerId);
        if (!provider) {
          console.warn(`[PromptBuilderOrchestrator] Provider '${providerId}' not found in registry. Skipping.`);
          continue;
        }

        try {
          // Isolated provider execution block
          const blockContent = provider.execute(context, intent);
          contextBlocks.set(providerId, blockContent);
        } catch (err: any) {
          console.error(`[PromptBuilderOrchestrator] Provider '${providerId}' failed:`, err);
          contextBlocks.set(
            providerId,
            `<provider_error id="${providerId}">Exception: ${err?.message || "unknown error"}</provider_error>`
          );
        }
      }

      // 3. Document Composition
      const userRequest = context.voice?.transcript || "";
      const document = promptComposer.compose(
        profile,
        contextBlocks,
        userRequest,
        context.snapshotId,
        intent.intentId
      );

      // 4. Document Validation & In-Place Pruning
      const validation = promptValidator.validate(document, profile);

      const endTime = performance.now();
      const latencyMs = endTime - startTime;

      if (!validation.isValid) {
        // Return diagnostics fallback package on validation failure
        return this.createDiagnosticsPackage(
          context,
          intent,
          validation.errors,
          latencyMs
        );
      }

      // 5. Serialize validated Context Blocks
      const activeContext = Array.from(document.contextBlocks.values()).join("\n\n");

      // 6. Return Immutable Prompt Package
      return {
        systemInstructions: document.systemInstructions,
        activeContext,
        userRequest: document.userRequest,
        metadata: {
          snapshotId: context.snapshotId,
          intentId: intent.intentId,
          tokenCount: document.estimatedTokens,
          latencyMs,
        },
      };

    } catch (err: any) {
      console.error("[PromptBuilderOrchestrator] Critical exception during assembly:", err);
      const endTime = performance.now();
      return this.createDiagnosticsPackage(
        context,
        intent,
        [`Critical orchestrator exception: ${err?.message || "unknown error"}`],
        endTime - startTime
      );
    }
  }

  /**
   * Constructs a fallback diagnostic PromptPackage when validation fails.
   */
  private createDiagnosticsPackage(
    context: StructuredContext,
    intent: IntentResult,
    errors: string[],
    latencyMs: number
  ): PromptPackage {
    const errorLog = errors.map(e => `    <error>${e}</error>`).join("\n");
    const activeContext = `<diagnostics>
  <status>validation_failure</status>
  <original_intent>${intent.intent}</original_intent>
  <snapshot_id>${context.snapshotId}</snapshot_id>
  <errors>
${errorLog}
  </errors>
</diagnostics>`;

    return {
      systemInstructions: "You are AetherOS, executing in diagnostic fallback mode due to a system context or validation error. Report the validation issues directly to the user.",
      activeContext,
      userRequest: context.voice?.transcript || "",
      metadata: {
        snapshotId: context.snapshotId,
        intentId: intent.intentId,
        tokenCount: Math.ceil(activeContext.length / 4),
        latencyMs,
      },
    };
  }
}

export const promptBuilderOrchestrator = new PromptBuilderOrchestrator();
