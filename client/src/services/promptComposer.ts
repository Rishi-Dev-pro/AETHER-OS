import type { PromptDocument, PromptProfile } from "../types/prompt";

class PromptComposer {
  /**
   * Compiles the collected context blocks and templates into an internal PromptDocument.
   */
  compose(
    profile: PromptProfile,
    contextBlocks: Map<string, string>,
    userRequest: string,
    snapshotId: string,
    intentId: string
  ): PromptDocument {
    // Calculate total character length for token estimation heuristics
    let totalLength = profile.systemInstructions.length + userRequest.length;
    for (const block of contextBlocks.values()) {
      totalLength += block.length;
    }

    // 1 token ≈ 4 characters of English text
    const estimatedTokens = Math.ceil(totalLength / 4);

    return {
      systemInstructions: profile.systemInstructions,
      contextBlocks: new Map(contextBlocks), // Clone to preserve immutability
      userRequest,
      estimatedTokens,
      metadata: {
        snapshotId,
        intentId,
      },
    };
  }
}

export const promptComposer = new PromptComposer();
