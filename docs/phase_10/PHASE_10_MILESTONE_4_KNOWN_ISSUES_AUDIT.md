# Phase 10 — Milestone 4 Post-Commit Issue Audit & Remediation Plan

> **Audit Date:** September 26, 2026  
> **Commit Hash:** `1f221318f75a398c21e9c347a55f27d541340914`  
> **Commit Title:** `feat(automation): implement Milestone 4 - LLM tool calling and conversational actions`  
> **Status:** ✅ RESOLVED  
> **Remediation Completed:** September 26, 2026

---

## Executive Summary

While all 825 existing tests and 21 new unit tests passed in Vitest, a full project TypeScript compilation (`npm run build` / `tsc -b`) initially failed with 3 blocking compiler errors, accompanied by 4 functional/protocol edge cases. All 7 identified issues have now been fully resolved, verified with 0 TypeScript/Vite compiler errors, and validated with 826/826 passing Vitest unit tests.

---

## Issue Matrix

| ID | Issue | Severity | Target File(s) | Status |
|:---|:---|:---:|:---|:---:|
| **ISSUE-01** | TypeScript Build Failure: `StreamingChunk` Property Omission | 🚨 CRITICAL | `client/src/runtime/conversation/execution-coordinator.ts` | ✅ RESOLVED |
| **ISSUE-02** | TypeScript Build Failure: `ConversationRole` Incompatibility with `FrontendMessage` | 🚨 CRITICAL | `client/src/runtime/frontend/conversation-store.ts`, `runtime-bridge.ts`, `runtime-events.ts` | ✅ RESOLVED |
| **ISSUE-03** | Streaming Mode Ignores Tool Calling | ⚠️ HIGH | `client/src/runtime/conversation/execution-coordinator.ts` | ✅ RESOLVED |
| **ISSUE-04** | Context Pruning Invariant Violation: Tool Call Orphanage (HTTP 400 Risk) | ⚠️ HIGH | `client/src/runtime/conversation/execution-coordinator.ts` | ✅ RESOLVED |
| **ISSUE-05** | Conversation Widget Renders Raw Tool JSON as AI Message | ⚠️ MEDIUM | `client/src/components/widgets/ConversationWidget.tsx` | ✅ RESOLVED |
| **ISSUE-06** | Max Tool Turns Expiry Leaves Turn Unanswered | ⚠️ MEDIUM | `client/src/runtime/conversation/execution-coordinator.ts` | ✅ RESOLVED |
| **ISSUE-07** | Dead Code: Unused `getDesktopAutomationInstructions` Method | ℹ️ LOW | `client/src/services/promptManager.ts`, `promptProfiler.ts`, `desktop-tools.ts` | ✅ RESOLVED |

---

## Detailed Issue Analysis & Remediation Recipes

### 🚨 ISSUE-01: TypeScript Build Failure — Missing `StreamingChunk` Properties

- **Affected File:** `client/src/runtime/conversation/execution-coordinator.ts` (lines 650–695)
- **Error:**
  ```text
  src/runtime/conversation/execution-coordinator.ts(691,11): error TS2739: Type '{ deltaContent?: string | undefined; deltaReasoning?: string | undefined; finishReason?: "length" | "error" | "stop" | "tool_calls" | "content_filter" | undefined; }' is missing the following properties from type 'StreamingChunk': chunkId, requestId, index, timestamp
  ```
- **Root Cause:**
  When replacing `(this.runtime as any).executeStreaming(...)`, an inline object type was declared that omitted required domain fields of `StreamingChunk` (`chunkId`, `requestId`, `index`, `timestamp`). When emitting `ExecutionChunkReceivedEvent` with `chunk`, TypeScript rejected it.
- **Remediation Recipe:**
  1. Import `StreamingChunk` from `../streaming/streaming-contracts`.
  2. Type `runtimeStreaming.executeStreaming` as returning `AsyncIterable<StreamingChunk>`.
  ```typescript
  import type { StreamingChunk } from "../streaming/streaming-contracts";

  const runtimeStreaming = this.runtime as unknown as {
    executeStreaming?: (
      adapterId: string,
      req: TranslationRequest,
      options?: unknown,
      signal?: AbortSignal
    ) => AsyncIterable<StreamingChunk>;
  };
  ```

---

### 🚨 ISSUE-02: TypeScript Build Failure — `ConversationRole` Incompatible with `FrontendMessage`

- **Affected Files:**
  - `client/src/runtime/frontend/conversation-store.ts` (lines 20–36)
  - `client/src/runtime/frontend/runtime-bridge.ts` (line 83)
  - `client/src/runtime/frontend/runtime-events.ts` (line 37)
- **Errors:**
  ```text
  src/runtime/frontend/runtime-bridge.ts(83,9): error TS2322: Type 'ConversationRole' is not assignable to type '"system" | "user" | "assistant"'. Type '"tool"' is not assignable.
  src/runtime/frontend/runtime-events.ts(37,11): error TS2322: Type 'ConversationRole' is not assignable to type '"system" | "user" | "assistant"'. Type '"tool"' is not assignable.
  ```
- **Root Cause:**
  `ConversationRole` in `conversation-types.ts` was expanded to `"system" | "user" | "assistant" | "tool"`, but `FrontendMessage` in `conversation-store.ts` was left restricted to `"system" | "user" | "assistant"`.
- **Remediation Recipe:**
  1. Update `FrontendMessage` in `conversation-store.ts` to accept `ConversationRole` (or `"system" | "user" | "assistant" | "tool"`).
  2. Optionally add `toolCallId?: string` and `name?: string` fields to `FrontendMessage` to preserve execution context in the UI store.
  ```typescript
  import type { ConversationRole } from "../conversation/conversation-types";

  export interface FrontendMessage {
    readonly id: string;
    readonly role: ConversationRole;
    readonly content: string;
    readonly timestamp: number;
    readonly toolCallId?: string;
    readonly name?: string;
    ...
  }
  ```

---

### ⚠️ ISSUE-03: Streaming Mode Ignores Tool Calling

- **Affected File:** `client/src/runtime/conversation/execution-coordinator.ts` (lines 632–750)
- **Problem:**
  `prepareRequestContext` automatically includes desktop tools (`getDesktopToolDefinitions()`) on all requests. When `executeStreaming` runs, the LLM may respond with streaming tool calls (`deltaToolCall` / `finishReason: "tool_calls"`). However, `executeStreaming` only processes `deltaContent` and `deltaReasoning`. It discards `deltaToolCall`, does not execute the tool, and terminates with an incomplete response.
- **Remediation Recipe:**
  - **Option A (Quick Guard):** In `executeStreaming`, disable tools explicitly during streaming requests (`tools: []` or `tools: undefined`) so the model responds conversationally without tool calling in streaming mode until full streaming tool recursion is implemented.
  - **Option B (Full Feature):** Accumulate `deltaToolCall` chunks, parse the completed tool call on `finishReason: "tool_calls"`, dispatch `executeDesktopTool`, and stream the final answer.

---

### ⚠️ ISSUE-04: Context Pruning Invariant Violation — Tool Call Orphanage

- **Affected File:** `client/src/runtime/conversation/execution-coordinator.ts` (lines 145–158)
- **Problem:**
  OpenAI-compatible APIs (OpenAI, Groq, NVIDIA) enforce a strict wire sequence rule:
  > *A message with `role: "tool"` must immediately follow an `assistant` message containing a `tool_calls` item with the matching `id`.*
  
  The current sliding window pruning logic executes:
  ```typescript
  while (totalEstimated > availableInputBudget && activeMessages.length > protectedCount) {
    const removed = activeMessages.shift();
  }
  ```
  If `activeMessages.shift()` removes an assistant message that initiated a tool call but leaves the subsequent `tool` message at the beginning of the context, Groq/OpenAI will reject the API request with:
  `HTTP 400: Invalid message sequence: 'tool' message must follow an 'assistant' message with 'tool_calls'`.
- **Remediation Recipe:**
  1. Make pruning turn-aware: prune messages in complete atomic conversational turn units rather than raw individual messages.
  2. Add a post-pruning sanity pass: ensure the first non-system message is never `role: "tool"`. If a tool message is at the top, drop orphaned tool messages until reaching a valid user or assistant turn boundary.

---

### ⚠️ ISSUE-05: Conversation Widget Renders Raw Tool JSON as AI Message

- **Affected File:** `client/src/components/widgets/ConversationWidget.tsx` (lines 311–355)
- **Problem:**
  In `ConversationWidget.tsx`, any message with `msg.role !== "user"` is styled and labeled as an AI assistant message (`AETHER ...`). Tool execution result messages (`role: "tool"`) contain raw JSON strings like:
  ```json
  {"success":true,"action":"open_app","message":"Application 'chrome' launched successfully"}
  ```
  This causes raw backend JSON blobs to appear in chat bubbles attributed to AETHER.
- **Remediation Recipe:**
  Filter out `role === "tool"` from regular chat bubbles (or render them as discrete tool execution badges/pills) until Milestone 5's dedicated HUD Action Feedback system is connected.

---

### ⚠️ ISSUE-06: Max Tool Turns Expiry Leaves Turn Unanswered

- **Affected File:** `client/src/runtime/conversation/execution-coordinator.ts` (lines 261–425)
- **Problem:**
  When `turnCount` reaches `MAX_TOOL_TURNS` (3), the loop condition `turnCount < MAX_TOOL_TURNS` terminates immediately after executing the tool calls. The LLM is never called to formulate a final user-facing summary of what happened, leaving `assistantMessage` on the turn as the intermediate tool-call prompt.
- **Remediation Recipe:**
  If the loop terminates because `turnCount >= MAX_TOOL_TURNS` and the last message in state is a `tool` message, perform one final translation request with `tools: []` to force the model to provide a conversational wrap-up for the user.

---

### ℹ️ ISSUE-07: Dead Code in `PromptManager`

- **Affected File:** `client/src/services/promptManager.ts` (lines 46–62)
- **Problem:**
  `getDesktopAutomationInstructions()` was added to `PromptManager`, but is never invoked or exported anywhere in the project.
- **Remediation Recipe:**
  Either integrate `getDesktopAutomationInstructions()` into `promptBuilderOrchestrator` / `promptProfiler`, or remove it if redundant.

---

## Action Plan Checklist for Remediation Session

- [x] **Step 1:** Fix `StreamingChunk` type definition in `execution-coordinator.ts`.
- [x] **Step 2:** Update `FrontendMessage` in `conversation-store.ts` to include `ConversationRole`.
- [x] **Step 3:** Run `npm run build` and ensure TypeScript and Vite build with **0 errors**.
- [x] **Step 4:** Implement tool-message atomic protection in `prepareRequestContext` pruning.
- [x] **Step 5:** Handle streaming tool call guard / fallback.
- [x] **Step 6:** Style/filter `tool` messages in `ConversationWidget.tsx`.
- [x] **Step 7:** Run `npx vitest run` to ensure all 825+ tests remain green.
