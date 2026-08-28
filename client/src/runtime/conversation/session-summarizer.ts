/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 5 Component: Conversation Summarizer (`session-summarizer.ts`)
 *
 * @file session-summarizer.ts
 * @description Deterministic turn summarization engine. Compresses older conversation turns
 * into compact, high-signal summary context blocks when context pressure exceeds limits,
 * preserving system prompt and recent turns while keeping canonical history intact.
 *
 * @module @aether/runtime/conversation/session-summarizer
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 5
 */

import type { ConversationTurn } from "./conversation-types";

export interface SummarizerOptions {
  readonly maxTurnsToSummarize?: number;
  readonly protectedRecentTurns?: number;
  readonly maxSummaryChars?: number;
}

export interface SummaryResult {
  readonly summary: string;
  readonly summarizedTurnCount: number;
  readonly generatedAt: number;
}

/**
 * Deterministically summarizes older conversation turns into a clean context block.
 *
 * @param turns - Chronological list of conversation turns.
 * @param existingSummary - Optional previous summary to build upon.
 * @param options - Summarization configuration.
 */
export function summarizeTurns(
  turns: ReadonlyArray<ConversationTurn>,
  existingSummary?: string,
  options: SummarizerOptions = {}
): SummaryResult {
  if (!turns || turns.length === 0) {
    return {
      summary: existingSummary || "",
      summarizedTurnCount: 0,
      generatedAt: Date.now(),
    };
  }

  const protectedRecent = options.protectedRecentTurns ?? 3;
  const maxTurns = options.maxTurnsToSummarize ?? 10;
  const maxChars = options.maxSummaryChars ?? 1200;

  // Only summarize turns that are older than the protected recent window
  const eligibleTurns = turns.slice(0, Math.max(0, turns.length - protectedRecent));
  if (eligibleTurns.length === 0) {
    return {
      summary: existingSummary || "",
      summarizedTurnCount: 0,
      generatedAt: Date.now(),
    };
  }

  const targetTurns = eligibleTurns.slice(-maxTurns);
  const turnSummaries: string[] = [];

  for (const turn of targetTurns) {
    const userText = turn.userMessage.content.trim();
    const assistantText = turn.assistantMessage?.content.trim() || "";

    if (userText) {
      const truncatedUser = userText.length > 100 ? `${userText.slice(0, 97)}...` : userText;
      const truncatedAssistant =
        assistantText.length > 140 ? `${assistantText.slice(0, 137)}...` : assistantText;

      turnSummaries.push(`- User queried: "${truncatedUser}" -> AETHER response: "${truncatedAssistant}"`);
    }
  }

  let combined = "";
  if (existingSummary && existingSummary.trim()) {
    combined += `Previous Summary: ${existingSummary.trim()}\n\n`;
  }
  combined += `Key Recent Discussion:\n${turnSummaries.join("\n")}`;

  if (combined.length > maxChars) {
    combined = `${combined.slice(0, maxChars - 3)}...`;
  }

  return {
    summary: combined,
    summarizedTurnCount: targetTurns.length,
    generatedAt: Date.now(),
  };
}

/**
 * Checks if a session has exceeded the context pressure threshold to trigger summarization.
 */
export function shouldSummarizeSession(
  turnCount: number,
  tokenCount: number,
  thresholdTurns = 8,
  thresholdTokens = 4000
): boolean {
  return turnCount >= thresholdTurns || tokenCount >= thresholdTokens;
}
