/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Runtime Events (`runtime-events.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { RuntimeEvents } from "../runtime-events";
import type { ExecutionStartedEvent } from "../conversation-types";

describe("Phase 9.11 Milestone 2 Runtime Events Unit Tests", () => {
  it("should subscribe, emit, and record runtime events", () => {
    const events = new RuntimeEvents();
    const receivedEvents: string[] = [];

    const subId = events.subscribe("ExecutionStarted", (evt: ExecutionStartedEvent) => {
      receivedEvents.push(evt.prompt);
    });

    events.emit({
      eventId: "e1",
      type: "ExecutionStarted",
      conversationId: "c1",
      executionId: "ex1",
      prompt: "Hello World",
      timestamp: Date.now(),
    });

    expect(receivedEvents).toEqual(["Hello World"]);
    expect(events.createSnapshot().length).toBe(1);

    events.unsubscribe(subId);

    events.emit({
      eventId: "e2",
      type: "ExecutionStarted",
      conversationId: "c1",
      executionId: "ex2",
      prompt: "Second Prompt",
      timestamp: Date.now(),
    });

    expect(receivedEvents.length).toBe(1);
    expect(events.createSnapshot().length).toBe(2);
  });
});
