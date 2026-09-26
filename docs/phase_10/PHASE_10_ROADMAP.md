# Phase 10: AI Desktop Task Automation — Master Roadmap

> **System**: AETHER-OS Multimodal Spatial Platform  
> **Phase**: Phase 10 — AI Desktop Task Automation & Native OS Control  
> **Status**: In Progress (Milestone Planning & Documentation)  
> **Target OS**: Windows 10/11 (with cross-platform abstraction interfaces)  
> **Initiation Date**: September 26, 2026  

---

## 1. Executive Summary & Vision

With **Phase 9.11 (AI Runtime Integration Layer)** certified and 100% operational with Groq Cloud LPU streaming and Web Speech TTS, **Phase 10: AI Desktop Task Automation** bridges AETHER-OS from an in-browser spatial HUD to a true ambient desktop operating assistant.

Phase 10 empowers AETHER-OS to execute native desktop actions on behalf of the user through both:
1. **Deterministic Instant Execution (Sub-millisecond)**: Direct voice/chat commands (*"Open VS Code"*, *"Mute volume"*, *"Search YouTube for lo-fi"*) detected via regex/keyword rules.
2. **Cognitive LLM Action Planning**: Complex multi-step reasoning (*"Hey Aether, open VS Code and look up the React 19 migration guide in Chrome"*) parsed via structured tool calls.

---

## 2. Milestone Architecture

To guarantee zero hallucinations, strict safety, and reliable single-turn implementations, Phase 10 is segmented into 6 modular, goal-based milestones:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PHASE 10 MILESTONE MATRIX                                │
├─────┬────────────────────────────────────────────┬─────────────┬─────────────────────┤
│ ID  │ Milestone Name                             │ Layer       │ Scope & Deliverable │
├─────┼────────────────────────────────────────────┼─────────────┼─────────────────────┤
│ M1  │ Windows Native Execution & Security Sandbox│ Server (OS) │ App launcher, web   │
│     │                                            │             │ search, volume, lock│
├─────┼────────────────────────────────────────────┼─────────────┼─────────────────────┤
│ M2  │ Socket.IO Action Protocol & Telemetry Bus  │ Server/IPC  │ Bidirectional event │
│     │                                            │             │ schemas & routing   │
├─────┼────────────────────────────────────────────┼─────────────┼─────────────────────┤
│ M3  │ Frontend Action Dispatcher & Intent Routing│ Client/Core │ Fast-path action    │
│     │                                            │             │ routing from speech │
├─────┼────────────────────────────────────────────┼─────────────┼─────────────────────┤
│ M4  │ LLM Tool Calling & Conversational Actions  │ AI Runtime  │ Tool schema, parser,│
│     │                                            │             │ turn feedback + TTS │
├─────┼────────────────────────────────────────────┼─────────────┼─────────────────────┤
│ M5  │ HUD Visual Action Feedback & DevTools Tab  │ Frontend UI │ Visual cards, toast,│
│     │                                            │             │ DevTools inspector  │
├─────┼────────────────────────────────────────────┼─────────────┼─────────────────────┤
│ M6  │ End-to-End Integration & Quality Freeze    │ Full Stack  │ Live Windows tests, │
│     │                                            │             │ Vitest test suites  │
└─────┴────────────────────────────────────────────┴─────────────┴─────────────────────┘
```

---

## 3. Detailed Milestone Breakdown

### Milestone 1: Windows Native Execution & Security Sandbox
- **Target Files**:
  - `server/src/automation/desktopActions.js`
  - `server/src/automation/appRegistry.js`
  - `server/src/automation/securityValidator.js`
  - `server/src/automation/systemControls.js`
- **Key Capabilities**:
  - **App Registry**: Mappings for canonical app names and aliases (`vscode` / `code`, `chrome`, `spotify`, `notepad`, `calc`, `terminal` / `wt`, `explorer`, `settings`, `discord`, `slack`).
  - **Web & Search Navigator**: Protocol URLs and search engines (Google, YouTube, GitHub, StackOverflow).
  - **System Utilities**: Volume controls (PowerShell sound API), lock workstation (`rundll32.exe user32.dll,LockWorkStation`), and screenshot capture.
  - **Security Sandbox**: Strict validation blocking arbitrary shell commands, argument injection, and dangerous shell metacharacters (`;`, `&`, `|`, `>`, `<`, backticks).
- **Verification Gate**: Node test script demonstrating app launch, search launch, volume control, and injection rejection.

---

### Milestone 2: Socket.IO Action Protocol & Telemetry Bus
- **Target Files**:
  - `server/src/socket/socketEvents.js`
  - `server/src/automation/commandManager.js`
  - `server/src/automation/actionProtocol.js`
- **Key Capabilities**:
  - Bidirectional Socket.IO events:
    - `os:action_request`: Inbound action payload (`{ actionId, type, target, params }`).
    - `os:action_result`: Outbound execution report (`{ actionId, success, message, durationMs, error }`).
    - `os:action_progress`: Optional intermediate stage updates for multi-step tasks.
  - Concurrency management and execution timeouts (5s default timeout per action).
- **Verification Gate**: Socket client test script verifying handshake, request dispatch, and result reception.

---

### Milestone 3: Frontend Action Dispatcher & Fast-Path Intent Routing
- **Target Files**:
  - `client/src/services/desktopActionDispatcher.ts`
  - `client/src/services/intentManager.ts`
  - `client/src/store/actionStore.ts`
- **Key Capabilities**:
  - `desktopActionDispatcher`: Singleton managing socket communication, request tracking, timeouts, and state synchronization.
  - Fast-Path Intent Routing: When `intentManager` detects an `OPEN`, `CLOSE`, `NAVIGATE`, `SEARCH`, `VOLUME_UP`, `VOLUME_DOWN`, `MUTE`, or `LOCK_SCREEN` intent from speech or text input, it immediately triggers `desktopActionDispatcher` without waiting for LLM roundtrips.
  - Spoken Confirmation: Synthesize immediate voice feedback via `speech-runtime.ts` (*"Opening Visual Studio Code"*, *"Muting volume"*).
- **Verification Gate**: Vitest test verifying intent classification triggers action dispatch and updates store.

---

### Milestone 4: LLM Tool Calling & Conversational Actions
- **Target Files**:
  - `client/src/runtime/tools/desktop-tools.ts`
  - `client/src/runtime/conversation/execution-coordinator.ts`
  - `client/src/services/promptManager.ts`
- **Key Capabilities**:
  - Standard JSON Schema tool definitions for desktop operations (`open_application`, `search_web`, `open_url`, `adjust_volume`, `lock_workstation`, `get_system_info`).
  - System prompt augmentation instructing the model when and how to invoke desktop tools.
  - Response Parser: Detects structured tool invocations from the streaming LLM response, executes them via `desktopActionDispatcher`, and seamlessly streams the conversational summary to the user.
- **Verification Gate**: Unit tests mocking LLM tool call generation and validating automated execution.

---

### Milestone 5: HUD Visual Action Feedback & DevTools Action Tab
- **Target Files**:
  - `client/src/components/hud/ActionNotificationPill.tsx`
  - `client/src/components/widgets/ThoughtWidget.tsx`
  - `client/src/components/devtools/ActionInspectorTab.tsx`
  - `client/src/components/devtools/RuntimeDevTools.tsx`
- **Key Capabilities**:
  - Sleek cyber-glassmorphic HUD notification banner when an action starts and finishes.
  - DevTools tab 12: Action Inspector displaying live log of executed actions, target applications, latencies, and execution outcomes.
- **Verification Gate**: UI visual review and zero regression on existing HUD layout.

---

### Milestone 6: End-to-End Integration, Regression Testing & Production Freeze
- **Target Files**:
  - `client/src/__tests__/phase10-e2e.test.ts`
  - `docs/phase_10/PHASE_10_PROGRESS_TRACKER.md`
  - `docs/SESSION_PROGRESS_REPORT.md`
- **Key Capabilities**:
  - Complete regression test suite (`vitest run` and `tsc -b`).
  - Real-world validation on Windows: Opening applications, searching YouTube/Google, adjusting volume, locking screen.
  - Production freeze certification documentation.
- **Verification Gate**: 100% test pass rate with 0 TypeScript errors.
