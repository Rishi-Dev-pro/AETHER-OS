/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Execution Queue (`execution-queue.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ExecutionQueue } from "../execution-queue";
import { ExecutionQueueError } from "../conversation-errors";

describe("Phase 9.11 Milestone 2 Execution Queue Unit Tests", () => {
  it("should enforce FIFO ordering for async execution tasks", async () => {
    const queue = new ExecutionQueue();
    const executionOrder: number[] = [];

    const task1 = queue.enqueue("p1", "groq-provider", "model1", async () => {
      executionOrder.push(1);
      return "res1";
    });

    const task2 = queue.enqueue("p2", "groq-provider", "model1", async () => {
      executionOrder.push(2);
      return "res2";
    });

    const [r1, r2] = await Promise.all([task1, task2]);

    expect(r1).toBe("res1");
    expect(r2).toBe("res2");
    expect(executionOrder).toEqual([1, 2]);
  });

  it("should cancel queued items cleanly", async () => {
    const queue = new ExecutionQueue();

    let task1Started = false;
    const task1 = queue.enqueue("p1", "groq-provider", "model1", async () => {
      task1Started = true;
      await new Promise((res) => setTimeout(res, 50));
      return "res1";
    });

    const task2 = queue.enqueue("p2", "groq-provider", "model1", async () => {
      return "res2";
    });

    const snapshotBefore = queue.snapshot();
    expect(snapshotBefore.length).toBe(2);

    const cancelled = queue.cancel(snapshotBefore[1].id);
    expect(cancelled).toBe(true);

    await expect(task2).rejects.toThrow(ExecutionQueueError);
    const r1 = await task1;
    expect(r1).toBe("res1");
  });
});
