/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Action Protocol & Socket Bus Test Suite
 *
 * @file actionProtocol.test.js
 * @description Verifies request validation, CommandManager lifecycle, timeout handling,
 * and Socket.IO action dispatching.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  validateActionRequest,
  createActionResult,
  VALID_ACTION_TYPES,
} from "../actionProtocol.js";
import { commandManager, CommandManager } from "../commandManager.js";
import { registerSocketEvents } from "../../socket/socketEvents.js";

describe("Milestone 2: Action Protocol Validation", () => {
  it("should validate a complete, well-formed action request", () => {
    const raw = {
      actionId: "test_act_001",
      type: "open_app",
      target: "vscode",
      params: { extra: true },
      source: "intent",
      timestamp: 123456789,
    };

    const res = validateActionRequest(raw);
    assert.equal(res.isValid, true);
    assert.equal(res.request.actionId, "test_act_001");
    assert.equal(res.request.type, "open_app");
    assert.equal(res.request.target, "vscode");
    assert.equal(res.request.params.target, "vscode");
    assert.equal(res.request.params.extra, true);
    assert.equal(res.request.source, "intent");
    assert.equal(res.request.timestamp, 123456789);
  });

  it("should auto-generate actionId if omitted", () => {
    const res = validateActionRequest({ type: "get_system_info" });
    assert.equal(res.isValid, true);
    assert.ok(res.request.actionId.startsWith("act_"));
    assert.equal(res.request.type, "get_system_info");
    assert.equal(res.request.source, "unknown");
    assert.ok(typeof res.request.timestamp === "number");
  });

  it("should reject invalid, null, or empty payloads", () => {
    assert.equal(validateActionRequest(null).isValid, false);
    assert.equal(validateActionRequest(undefined).isValid, false);
    assert.equal(validateActionRequest("string").isValid, false);
    assert.equal(validateActionRequest([]).isValid, false);
    assert.equal(validateActionRequest({}).isValid, false);
  });

  it("should reject unsupported action types", () => {
    const res = validateActionRequest({ type: "format_c_drive" });
    assert.equal(res.isValid, false);
    assert.match(res.error, /Unsupported action type/i);
  });

  it("should support all defined VALID_ACTION_TYPES", () => {
    for (const actionType of VALID_ACTION_TYPES) {
      const res = validateActionRequest({ type: actionType });
      assert.equal(res.isValid, true, `Type '${actionType}' should be valid`);
    }
  });

  it("should format standardized action results via createActionResult", () => {
    const res = createActionResult({
      actionId: "act_test",
      type: "adjust_volume",
      success: true,
      message: "Volume adjusted",
      durationMs: 42,
      data: { level: 60 },
    });

    assert.equal(res.actionId, "act_test");
    assert.equal(res.type, "adjust_volume");
    assert.equal(res.success, true);
    assert.equal(res.message, "Volume adjusted");
    assert.equal(res.durationMs, 42);
    assert.deepEqual(res.data, { level: 60 });
    assert.ok(typeof res.timestamp === "number");
  });
});

describe("Milestone 2: CommandManager Execution Lifecycle", () => {
  it("should execute valid actions and return structured results", async () => {
    const result = await commandManager.handleAction({
      actionId: "act_sys_test",
      type: "get_system_info",
      source: "manual_ui",
    });

    assert.equal(result.actionId, "act_sys_test");
    assert.equal(result.type, "get_system_info");
    assert.equal(result.success, true);
    assert.ok(result.durationMs >= 0);
    assert.ok(result.data.cpus > 0);
  });

  it("should return failure for invalid action requests", async () => {
    const result = await commandManager.handleAction({
      type: "invalid_action_name",
    });

    assert.equal(result.success, false);
    assert.match(result.error, /Unsupported action type/);
  });

  it("should enforce action execution timeout", async () => {
    const customMgr = new CommandManager();

    const slowExecutor = () => new Promise((resolve) => setTimeout(resolve, 150));

    const result = await customMgr.handleAction(
      {
        actionId: "act_timeout_test",
        type: "get_system_info",
      },
      { timeoutMs: 20, executor: slowExecutor }
    );

    assert.equal(result.actionId, "act_timeout_test");
    assert.equal(result.success, false);
    assert.match(result.message, /timed out/i);
  });

  it("should support legacy voice commands", async () => {
    const clickRes = await commandManager.handleCommand("please click the button");
    assert.equal(clickRes.success, true);
    assert.equal(clickRes.type, "click_target");

    const unknownRes = await commandManager.handleCommand("do some unknown thing");
    assert.equal(unknownRes.success, false);
  });
});

describe("Milestone 2: Socket.IO Action Protocol Bridge", () => {
  it("should dispatch os:action_request and emit os:action_result with ack callback", async () => {
    class MockSocket extends EventEmitter {
      constructor() {
        super();
        this.id = "mock-socket-001";
        this.emitted = [];
      }
      emit(event, ...args) {
        this.emitted.push({ event, data: args[0] });
        return super.emit(event, ...args);
      }
    }

    const mockIo = {
      engine: { clientsCount: 1 },
      emit: () => {},
    };

    const mockSocket = new MockSocket();
    registerSocketEvents(mockIo, mockSocket);

    // Prepare action request with ack callback
    const requestPayload = {
      actionId: "socket_req_123",
      type: "get_system_info",
      source: "intent",
    };

    let ackResult = null;
    const ackCallback = (res) => {
      ackResult = res;
    };

    // Emit os:action_request on socket
    mockSocket.emit("os:action_request", requestPayload, ackCallback);

    // Wait microtask tick for async handler
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify callback was called with valid action result
    assert.ok(ackResult, "Ack callback should have been invoked");
    assert.equal(ackResult.actionId, "socket_req_123");
    assert.equal(ackResult.type, "get_system_info");
    assert.equal(ackResult.success, true);

    // Verify os:action_result was emitted on socket
    const actionResultEvent = mockSocket.emitted.find(
      (e) => e.event === "os:action_result"
    );
    assert.ok(actionResultEvent, "os:action_result event should have been emitted");
    assert.equal(actionResultEvent.data.actionId, "socket_req_123");
    assert.equal(actionResultEvent.data.success, true);
  });
});
