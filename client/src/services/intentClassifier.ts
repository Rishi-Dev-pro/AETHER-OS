import type { StructuredContext } from "../types/cognitive";
import { intentConfig } from "../config/intentConfig";

interface CompiledRule {
  intent: string;
  category: string;
  domain: string;
  compiledPatterns: RegExp[];
  keywords: string[];
}

export interface ClassifierResult {
  intent: string;
  category: string;
  domain: string;
  confidence: number;
  needsClarification: boolean;
}

class IntentClassifier {
  private compiledRules: CompiledRule[];

  constructor() {
    // Compile regex patterns once during initialization to maximize performance
    this.compiledRules = intentConfig.rules.map(rule => ({
      intent: rule.intent,
      category: rule.category,
      domain: rule.domain,
      compiledPatterns: rule.patterns.map(patternStr => new RegExp(patternStr, "i")),
      keywords: rule.keywords.map(kw => kw.toLowerCase()),
    }));
  }

  /**
   * Classifies the intent of the user from the StructuredContext.
   */
  classify(context: StructuredContext): ClassifierResult {
    const rawText = context.voice?.transcript || "";
    const normalizedText = this.normalizeText(rawText);
    return this.performClassification(normalizedText);
  }

  private performClassification(normalizedText: string): ClassifierResult {
    const thresholds = intentConfig.confidenceThresholds;

    // Handle empty context/text gracefully
    if (!normalizedText) {
      return this.unknownFallback();
    }

    // Step 2: Deterministic Rules / Exact Matching
    for (const rule of this.compiledRules) {
      if (rule.keywords.includes(normalizedText)) {
        return {
          intent: rule.intent,
          category: rule.category,
          domain: rule.domain,
          confidence: thresholds.high,
          needsClarification: false,
        };
      }
    }

    // Step 3: Regex Pattern Matching
    for (const rule of this.compiledRules) {
      for (const regex of rule.compiledPatterns) {
        if (regex.test(normalizedText)) {
          return {
            intent: rule.intent,
            category: rule.category,
            domain: rule.domain,
            confidence: thresholds.high,
            needsClarification: false,
          };
        }
      }
    }

    // Step 4: Keyword Similarity Matching
    const queryWords = normalizedText.split(/\s+/).filter(Boolean);
    let bestMatch: { rule: CompiledRule; score: number } | null = null;

    for (const rule of this.compiledRules) {
      let matchedCount = 0;
      for (const kw of rule.keywords) {
        if (queryWords.includes(kw)) {
          matchedCount++;
        }
      }

      if (matchedCount > 0) {
        // Simple similarity score: matching words ratio
        const score = matchedCount / Math.max(queryWords.length, 1);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { rule, score };
        }
      }
    }

    if (bestMatch && bestMatch.score >= intentConfig.keywordThreshold) {
      const confidence = thresholds.medium;
      return {
        intent: bestMatch.rule.intent,
        category: bestMatch.rule.category,
        domain: bestMatch.rule.domain,
        confidence,
        needsClarification: confidence < thresholds.clarification,
      };
    }

    // Step 5: Unknown Intent Fallback
    return this.unknownFallback();
  }

  /**
   * Normalizes input text (lowercased, stripped punctuation and spacing).
   */
  private normalizeText(text: string): string {
    const punctuationRegex = new RegExp("[.,/#!$%^&*;:{}=\\-_`~()?]", "g");
    let normalized = text
      .toLowerCase()
      .replace(punctuationRegex, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Strip common verbal prefixes, suffixes, and filler words
    const prefixFillers = /^(?:please|could you|can you|would you|hey aether|aether|please do|could you please|can you please)\s+/i;
    const suffixFillers = /\s+(?:please|thank you|thanks|aether|hey aether)$/i;

    let previous = "";
    while (normalized !== previous) {
      previous = normalized;
      normalized = normalized.replace(prefixFillers, "").replace(suffixFillers, "").trim();
    }

    return normalized;
  }

  /**
   * Returns default fallback result for unknown intents.
   */
  private unknownFallback(): ClassifierResult {
    const thresholds = intentConfig.confidenceThresholds;
    return {
      intent: "UNKNOWN",
      category: "UTILITY",
      domain: "SYSTEM",
      confidence: thresholds.low,
      needsClarification: true, // Needs clarification since confidence is below threshold
    };
  }
}

export const intentClassifier = new IntentClassifier();
