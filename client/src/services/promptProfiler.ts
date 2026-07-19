import type { IntentResult } from "../types/intent";
import type { PromptProfile } from "../types/prompt";

class PromptProfiler {
  /**
   * Evaluates the classified intent to construct the PromptProfile blueprint.
   */
  profile(intent: IntentResult): PromptProfile {
    // Determine profile categorization
    const category = intent.category?.toUpperCase() || "UTILITY";

    if (category === "INTERACTION") {
      return {
        id: "INTERACTION",
        requiredProviders: [
          "aether:provider:intent",
          "aether:provider:conversation",
          "aether:provider:vision",
          "aether:provider:environment",
        ],
        maxOutputTokens: 2048,
        fallbackStrategy: "fallback_conversation",
        systemInstructions: "You are the AetherOS central nervous assistant. Your goal is to guide the user in local tasks, visual feedback, and automation controls. Respond using the requested parameters. Analyze focus coordinates and expressions to provide intelligent visual suggestions.",
      };
    }

    if (category === "CONVERSATION") {
      return {
        id: "CONVERSATION",
        requiredProviders: [
          "aether:provider:intent",
          "aether:provider:conversation",
          "aether:provider:environment",
        ],
        maxOutputTokens: 1024,
        fallbackStrategy: "fallback_conversation",
        systemInstructions: "You are the AetherOS central nervous assistant. Respond using friendly, conversational, and direct guidance. Assist the user with system settings, shortcuts, or voice clarification.",
      };
    }

    // Default UTILITY / Fallback Profile
    return {
      id: "FALLBACK",
      requiredProviders: [
        "aether:provider:intent",
        "aether:provider:conversation",
      ],
      maxOutputTokens: 512,
      fallbackStrategy: "fallback_conversation",
      systemInstructions: "You are AetherOS. The intent category is utility or fallback. Help clarify user command details safely.",
    };
  }
}

export const promptProfiler = new PromptProfiler();
