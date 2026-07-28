import { describe, it, expect, beforeEach } from "vitest";
import { MessageRole, ConversationStatus, TurnStatus, createConversation } from "../types";
import { SessionError, ConversationStateError } from "../errors";
import { canTransition, validateTransition, evaluateTransition } from "../conversation-fsm";
import {
  createSession,
  getSession,
  archiveSession,
  closeSession,
  resetSessionStore,
} from "../session-manager";
import {
  createOrGetConversation,
  getConversation,
  beginTurn,
  appendAssistantMessage,
  appendToolMessage,
  prepareContext,
  completeTurn,
  resetConversationStore,
} from "../turn-orchestrator";

describe("Phase 9.5 Conversation Core End-to-End Integration Suite (conversation-core.integration.test.ts)", () => {
  beforeEach(() => {
    resetSessionStore();
    resetConversationStore();
  });

  it("Scenario 1: Standard Full Lifecycle Flow (Session → Conv → Turn → Canonicalize → FSM → Context → Complete → IDLE)", () => {
    const sessionId = "sess_integ_001";
    const convId = "conv_integ_001";

    // 1. Create Session
    const session = createSession({
      sessionId,
      activeConversationId: convId,
    });
    expect(session.sessionId).toBe(sessionId);
    expect(Object.isFrozen(session)).toBe(true);

    // 2. Initialize Conversation with System Instructions
    const conv = createOrGetConversation(convId, sessionId, "System instructions: Be a helpful assistant.");
    expect(conv.status).toBe(ConversationStatus.CREATED);
    expect(conv.turns.length).toBe(1);
    expect(conv.turns[0].userMessage?.role).toBe(MessageRole.SYSTEM);
    expect(Object.isFrozen(conv)).toBe(true);

    // 3. Begin Turn 2 (User message)
    const { turn: turn2, conversation: convWaiting } = beginTurn(convId, "What is the capital of France?");
    expect(turn2.turnIndex).toBe(2);
    expect(turn2.userMessage?.text).toBe("What is the capital of France?");
    expect(turn2.userMessage?.role).toBe(MessageRole.USER);
    expect(turn2.status).toBe(TurnStatus.PROCESSING);

    // FSM Status check: CREATED -> ACTIVE -> WAITING
    expect(convWaiting.status).toBe(ConversationStatus.WAITING);

    // 4. Append Assistant Message
    const { turn: turn2Updated } = appendAssistantMessage(convId, turn2.turnId, "The capital of France is Paris.");
    expect(turn2Updated.assistantMessage?.text).toBe("The capital of France is Paris.");
    expect(turn2Updated.assistantMessage?.role).toBe(MessageRole.ASSISTANT);
    expect(turn2Updated.status).toBe(TurnStatus.COMPLETED);

    // 5. Prepare Context Snapshot (ContextTrimmer Integration)
    const snapshot = prepareContext(convId, 2000, { reserveOutputTokens: 200 });
    expect(snapshot.conversationId).toBe(convId);
    expect(snapshot.systemMessage.text).toBe("System instructions: Be a helpful assistant.");
    expect(snapshot.activeMessages.length).toBe(2); // User + Assistant messages
    expect(snapshot.totalTokenEstimate).toBeGreaterThan(0);
    expect(Object.isFrozen(snapshot)).toBe(true);

    // 6. Complete Turn
    const { turn: turn2Finished, conversation: convIdle } = completeTurn(convId, turn2.turnId);
    expect(turn2Finished.status).toBe(TurnStatus.COMPLETED);

    // FSM Status check: WAITING -> ACTIVE -> IDLE
    expect(convIdle.status).toBe(ConversationStatus.IDLE);
    expect(Object.isFrozen(convIdle)).toBe(true);
  });

  it("Scenario 2: Assistant Tool Request & Tool Response Pair Preservation (Rule 3 Verification)", () => {
    const sessionId = "sess_integ_002";
    const convId = "conv_integ_002";

    createSession({ sessionId, activeConversationId: convId });
    createOrGetConversation(convId, sessionId, "System tool instructions");

    // Begin turn requiring tool execution
    const { turn: turn2 } = beginTurn(convId, "Fetch system stats");

    // Assistant requests tool execution
    const toolCall = { id: "call_stats_1", name: "get_stats", arguments: { target: "cpu" } };
    const { turn: turn2ToolReq } = appendAssistantMessage(convId, turn2.turnId, "Fetching CPU stats...", [toolCall]);
    expect(turn2ToolReq.status).toBe(TurnStatus.AWAITING_TOOL);

    // Append Tool Response
    const { turn: turn2ToolResp } = appendToolMessage(convId, turn2.turnId, "call_stats_1", '{"cpu_usage": "15%"}');
    expect(turn2ToolResp.toolMessages?.length).toBe(1);
    expect(turn2ToolResp.toolMessages![0].role).toBe(MessageRole.TOOL);

    // Complete Turn
    completeTurn(convId, turn2.turnId);

    // Append a second turn to test context window trimming
    const { turn: turn3 } = beginTurn(convId, "Summarize CPU stats");
    appendAssistantMessage(convId, turn3.turnId, "CPU stats are normal at 15%.");
    completeTurn(convId, turn3.turnId);

    // Prepare context with tight budget
    const snapshot = prepareContext(convId, 300, { reserveOutputTokens: 20 });

    // Verify Rule 3 Tool Pair Integrity
    const hasToolReq = snapshot.activeMessages.some((m) => m.role === MessageRole.ASSISTANT && m.toolCalls?.some((tc) => tc.id === "call_stats_1"));
    const hasToolResp = snapshot.activeMessages.some((m) => m.role === MessageRole.TOOL && m.toolCallId === "call_stats_1");

    expect(hasToolReq).toBe(hasToolResp); // Both kept or both trimmed together
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("Scenario 3: Token Budget Overflow & Sliding Window Trimming (Rules 1 & 2 Verification)", () => {
    const sessionId = "sess_integ_003";
    const convId = "conv_integ_003";

    createSession({ sessionId, activeConversationId: convId });
    createOrGetConversation(convId, sessionId, "Core System Directive: Preserve Safety Policy.");

    // Generate 6 dialogue turns
    for (let i = 1; i <= 6; i++) {
      const { turn } = beginTurn(convId, `User turn ${i} long prompt content `.repeat(6));
      appendAssistantMessage(convId, turn.turnId, `Assistant turn ${i} long completion response `.repeat(6));
      completeTurn(convId, turn.turnId);
    }

    const fullConv = getConversation(convId);
    expect(fullConv.turns.length).toBe(7); // 1 System + 6 Dialogue turns

    // Prepare context with budget that forces intermediate turns to trim
    const snapshot = prepareContext(convId, 380, {
      reserveOutputTokens: 20,
      protectedRecentTurns: 2, // Protect turns 5 & 6
    });

    // Rule 1 Verification: SYSTEM message is preserved
    expect(snapshot.systemMessage.role).toBe(MessageRole.SYSTEM);
    expect(snapshot.systemMessage.text).toBe("Core System Directive: Preserve Safety Policy.");

    // Rule 2 Verification: Protected recent turns (5 & 6) are present
    const activeTexts = snapshot.activeMessages.map((m) => m.text);
    expect(activeTexts.some((t) => t.includes("User turn 6"))).toBe(true);
    expect(activeTexts.some((t) => t.includes("User turn 5"))).toBe(true);

    // Rule 4 Verification: Intermediate turns trimmed
    expect(snapshot.trimmedCount).toBeGreaterThan(0);
    expect(snapshot.totalTokenEstimate).toBeLessThanOrEqual(360);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("Scenario 4: Session & Conversation Archival (Lifecycle Protection)", () => {
    const sessionId = "sess_integ_004";
    const convId = "conv_integ_004";

    createSession({ sessionId, activeConversationId: convId });
    createOrGetConversation(convId, sessionId, "System instructions");

    // Complete Turn 1
    const { turn: turn2 } = beginTurn(convId, "Archival test prompt");
    appendAssistantMessage(convId, turn2.turnId, "Archival test response");
    completeTurn(convId, turn2.turnId);

    // Archive Session
    const archivedSession = archiveSession(sessionId);
    expect(archivedSession.metadata.isArchived).toBe(true);

    // Archive Conversation
    const conv = getConversation(convId);

    // Transition FSM state -> ARCHIVED
    const fsmResult = evaluateTransition(conv.status, ConversationStatus.ARCHIVED, "User requested archival");
    expect(fsmResult.newStatus).toBe(ConversationStatus.ARCHIVED);

    // Attempting to transition from ARCHIVED to illegal states
    expect(() => {
      validateTransition(ConversationStatus.ARCHIVED, ConversationStatus.WAITING);
    }).toThrow(ConversationStateError);
  });

  it("Scenario 5: Conversation Closure & Terminal State Protection", () => {
    const sessionId = "sess_integ_005";
    const convId = "conv_integ_005";

    createSession({ sessionId, activeConversationId: convId });
    createOrGetConversation(convId, sessionId, "System instructions");

    // Close Session
    const closedSession = closeSession(sessionId);
    expect(closedSession.metadata.isClosed).toBe(true);

    // Verify session store lookup fails for closed session
    expect(() => getSession(sessionId)).toThrow(SessionError);

    // Verify illegal FSM transition from CLOSED state throws ConversationStateError
    expect(() => {
      validateTransition(ConversationStatus.CLOSED, ConversationStatus.ACTIVE);
    }).toThrow(ConversationStateError);
  });

  it("Scenario 6: Multi-Session & Multi-Conversation Concurrency Isolation", () => {
    const sess1 = createSession({ sessionId: "sess_A", activeConversationId: "conv_A" });
    const sess2 = createSession({ sessionId: "sess_B", activeConversationId: "conv_B" });

    createOrGetConversation("conv_A", "sess_A", "System A instructions");
    createOrGetConversation("conv_B", "sess_B", "System B instructions");

    // Begin turn in Conv A
    const { turn: turnA } = beginTurn("conv_A", "Prompt for A");
    appendAssistantMessage("conv_A", turnA.turnId, "Response for A");
    completeTurn("conv_A", turnA.turnId);

    // Begin turn in Conv B
    const { turn: turnB } = beginTurn("conv_B", "Prompt for B");
    appendAssistantMessage("conv_B", turnB.turnId, "Response for B");
    completeTurn("conv_B", turnB.turnId);

    const convA = getConversation("conv_A");
    const convB = getConversation("conv_B");

    expect(convA.sessionId).toBe("sess_A");
    expect(convB.sessionId).toBe("sess_B");

    expect(convA.turns[0].userMessage?.text).toBe("System A instructions");
    expect(convB.turns[0].userMessage?.text).toBe("System B instructions");

    expect(sess1.sessionId).toBe("sess_A");
    expect(sess2.sessionId).toBe("sess_B");

    expect(Object.isFrozen(convA)).toBe(true);
    expect(Object.isFrozen(convB)).toBe(true);
  });
});
