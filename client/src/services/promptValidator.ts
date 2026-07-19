import type { PromptDocument, PromptProfile } from "../types/prompt";
import { providerRegistry } from "./providerRegistry";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  prunedCount: number;
}

class PromptValidator {
  /**
   * Validates the structure and limits of the PromptDocument.
   * Modifies the document context blocks by applying priority-based pruning if token budget is exceeded.
   */
  validate(document: PromptDocument, profile: PromptProfile): ValidationResult {
    const errors: string[] = [];
    let prunedCount = 0;

    // 1. Structural Checks
    if (!document.systemInstructions || !document.systemInstructions.trim()) {
      errors.push("Missing mandatory systemInstructions.");
    }
    if (!document.userRequest || !document.userRequest.trim()) {
      errors.push("Missing mandatory userRequest.");
    }

    // 2. Placeholder Detection
    const placeholderRegex = /\{\{[a-zA-Z0-9_.-]+\}\}/g;
    if (placeholderRegex.test(document.systemInstructions)) {
      errors.push("Unresolved template placeholders detected in systemInstructions.");
    }
    for (const [key, block] of document.contextBlocks.entries()) {
      if (placeholderRegex.test(block)) {
        errors.push(`Unresolved template placeholders detected in context block '${key}'.`);
      }
    }

    // 3. Dynamic Priority-based Token Budget Pruning
    const maxBudget = profile.maxOutputTokens || 1024;
    let currentTokens = this.recalculateTokens(document);

    if (currentTokens > maxBudget) {
      // Retrieve and sort context block keys by provider priority (4 = Low, 1 = Critical)
      const prunableKeys = Array.from(document.contextBlocks.keys()).sort((a, b) => {
        const priorityA = providerRegistry.get(a)?.priority ?? 3; // Default to Medium (3)
        const priorityB = providerRegistry.get(b)?.priority ?? 3;
        return priorityB - priorityA; // Descending (Low priority first)
      });

      for (const key of prunableKeys) {
        const provider = providerRegistry.get(key);
        // Never prune Critical (Priority 1) sections
        if (provider && provider.priority === 1) {
          continue;
        }

        // Delete the block and increment pruned count
        document.contextBlocks.delete(key);
        prunedCount++;

        // Recalculate
        currentTokens = this.recalculateTokens(document);
        if (currentTokens <= maxBudget) {
          break;
        }
      }
    }

    document.estimatedTokens = currentTokens;

    // 4. Post-Pruning Budget Verification
    if (currentTokens > maxBudget) {
      errors.push(`Token size (${currentTokens}) exceeds max allowed budget (${maxBudget}) even after pruning all prunable context blocks.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      prunedCount,
    };
  }

  /**
   * Recalculates the estimated token count of a PromptDocument.
   */
  private recalculateTokens(document: PromptDocument): number {
    let totalLength = document.systemInstructions.length + document.userRequest.length;
    for (const block of document.contextBlocks.values()) {
      totalLength += block.length;
    }
    return Math.ceil(totalLength / 4);
  }
}

export const promptValidator = new PromptValidator();
