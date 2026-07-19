import { useCognitiveStore } from "../store/cognitiveStore";
import { useIntentStore } from "../store/intentStore";
import { intentClassifier } from "./intentClassifier";
import { entityExtractor } from "./entityExtractor";
import { IntentTriggerPolicy } from "./intentTriggerPolicy";
import type { StructuredContext } from "../types/cognitive";
import type { IntentResult } from "../types/intent";

class IntentManager {
  private unsubscribe: (() => void) | null = null;
  private isInitialized = false;
  private lastSnapshotId: string | null = null;
  private lastTranscript: string | null = null;
  private lastIsFinal: boolean = false;

  /**
   * Initializes the IntentManager by subscribing to Cognitive Store context updates.
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.lastSnapshotId = null;
    this.lastTranscript = null;
    this.lastIsFinal = false;

    // Subscribe to cognitive store changes
    this.unsubscribe = useCognitiveStore.subscribe((state) => {
      const context = state.latestContext;
      if (context && context.snapshotId !== this.lastSnapshotId) {
        this.lastSnapshotId = context.snapshotId;
        this.processContext(context);
      }
    });
  }

  /**
   * Cleans up subscription to avoid memory leaks.
   */
  shutdown() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isInitialized = false;
    this.lastSnapshotId = null;
    this.lastTranscript = null;
    this.lastIsFinal = false;
  }

  private processContext(context: StructuredContext) {
    if (!IntentTriggerPolicy.isActionable(context)) {
      return;
    }

    const currentTranscript = context.voice?.transcript ?? "";
    const currentIsFinal = context.voice?.isFinal ?? false;

    // Deduplicate processing: skip redundant ticks with identical voice text/flags
    if (
      currentTranscript === this.lastTranscript &&
      currentIsFinal === this.lastIsFinal
    ) {
      return;
    }

    this.lastTranscript = currentTranscript;
    this.lastIsFinal = currentIsFinal;

    try {
      // Set status to classifying
      useIntentStore.getState().setClassificationStatus("classifying");

      // Execute pipeline
      const result = this.executePipeline(context);

      // Publish IntentResult
      useIntentStore.getState().setIntentResult(result);
    } catch (error) {
      console.error("[IntentManager] Error processing context:", error);
      useIntentStore.getState().setClassificationStatus("error");
    }
  }

  /**
   * Invokes components to construct the final IntentResult.
   */
  private executePipeline(context: StructuredContext): IntentResult {
    // 1. Classification
    const classification = intentClassifier.classify(context);

    // 2. Entity Extraction
    const entities = entityExtractor.extract(context, classification.intent);

    // 3. Build parameter map
    const parameters = entityExtractor.buildParameters(entities);

    // Generate unique intentId and timestamp
    const intentId = "intent_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
    const timestamp = Date.now();

    return {
      intentId,
      timestamp,
      category: classification.category,
      domain: classification.domain,
      intent: classification.intent,
      confidence: classification.confidence,
      entities,
      parameters,
      needsClarification: classification.needsClarification,
    };
  }
}

export const intentManager = new IntentManager();
