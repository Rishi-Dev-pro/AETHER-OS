/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Lifecycle Controller (`lifecycle-controller.test.ts`)
 *
 * @file lifecycle-controller.test.ts
 * @description Unit tests for LifecycleController state machine, legal/illegal transitions,
 * terminal states, and state transition history tracking.
 *
 * @module @aether/action-execution/tests/lifecycle-controller
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { LifecycleController } from "../lifecycle-controller";
import { IllegalStateTransitionError } from "../engine-errors";
import { ExecutionStateError } from "../errors";

describe("LifecycleController FSM", () => {
  let controller: LifecycleController;

  beforeEach(() => {
    controller = new LifecycleController("CREATED");
  });

  it("initializes with CREATED state by default", () => {
    expect(controller.currentState()).toBe("CREATED");
    expect(controller.getHistory()).toEqual(["CREATED"]);
    expect(controller.isTerminal()).toBe(false);
  });

  it("supports initializing with custom state", () => {
    const customController = new LifecycleController("READY");
    expect(customController.currentState()).toBe("READY");
    expect(customController.getHistory()).toEqual(["READY"]);
  });

  it("allows legal state transitions in order: CREATED -> VALIDATED -> READY -> RUNNING -> COMPLETED", () => {
    expect(controller.transition("VALIDATED")).toBe("VALIDATED");
    expect(controller.transition("READY")).toBe("READY");
    expect(controller.transition("RUNNING")).toBe("RUNNING");
    expect(controller.transition("COMPLETED")).toBe("COMPLETED");

    expect(controller.currentState()).toBe("COMPLETED");
    expect(controller.isTerminal()).toBe(true);
    expect(controller.getHistory()).toEqual(["CREATED", "VALIDATED", "READY", "RUNNING", "COMPLETED"]);
  });

  it("allows WAITING cycle from RUNNING state", () => {
    controller.transition("VALIDATED");
    controller.transition("READY");
    controller.transition("RUNNING");

    expect(controller.transition("WAITING")).toBe("WAITING");
    expect(controller.transition("RUNNING")).toBe("RUNNING");
    expect(controller.transition("COMPLETED")).toBe("COMPLETED");
  });

  it("throws IllegalStateTransitionError and ExecutionStateError on illegal transition", () => {
    expect(() => controller.transition("RUNNING")).toThrow(IllegalStateTransitionError);
    expect(() => controller.transition("COMPLETED")).toThrow(ExecutionStateError);
  });

  it("rejects transitions out of terminal states", () => {
    controller.transition("VALIDATED");
    controller.transition("READY");
    controller.transition("RUNNING");
    controller.transition("FAILED");

    expect(controller.isTerminal()).toBe(true);
    expect(() => controller.transition("RUNNING")).toThrow(IllegalStateTransitionError);
    expect(() => controller.transition("CREATED")).toThrow(IllegalStateTransitionError);
  });

  it("allows re-initializing after reaching a terminal state", () => {
    controller.transition("VALIDATED");
    controller.transition("READY");
    controller.transition("RUNNING");
    controller.transition("ABORTED");

    expect(controller.isTerminal()).toBe(true);
    controller.initialize("CREATED");
    expect(controller.currentState()).toBe("CREATED");
    expect(controller.isTerminal()).toBe(false);
    expect(controller.getHistory()).toEqual(["CREATED"]);
  });

  it("correctly evaluates assertTransition", () => {
    expect(controller.assertTransition("CREATED", "VALIDATED")).toBe(true);
    expect(controller.assertTransition("CREATED", "RUNNING")).toBe(false);
    expect(controller.assertTransition("RUNNING", "COMPLETED")).toBe(true);
    expect(controller.assertTransition("COMPLETED", "RUNNING")).toBe(false);
  });
});
