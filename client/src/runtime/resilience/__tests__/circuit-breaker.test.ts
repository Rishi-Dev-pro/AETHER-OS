import { describe, it, expect } from "vitest";
import { CircuitBreakerEngine } from "../../../types/provider-runtime/circuit-breaker-engine";
import { CircuitBreakerState } from "../../../types/provider-runtime/enums";

describe("Phase 9.11 Milestone 6: Circuit Breaker FSM & Isolation Verification", () => {
  it("transitions from CLOSED to OPEN after consecutive failure threshold is exceeded", () => {
    const cb = new CircuitBreakerEngine();
    cb.configureProvider("groq-adapter", {
      failureThreshold: 3,
      successThreshold: 2,
      cooldownPeriodMs: 1000,
    });

    expect(cb.getState("groq-adapter")).toBe(CircuitBreakerState.CLOSED);
    expect(cb.canExecute("groq-adapter")).toBe(true);

    cb.recordFailure("groq-adapter");
    expect(cb.getState("groq-adapter")).toBe(CircuitBreakerState.CLOSED);

    cb.recordFailure("groq-adapter");
    expect(cb.getState("groq-adapter")).toBe(CircuitBreakerState.CLOSED);

    cb.recordFailure("groq-adapter");
    expect(cb.getState("groq-adapter")).toBe(CircuitBreakerState.OPEN);
    expect(cb.canExecute("groq-adapter")).toBe(false);
  });

  it("strictly isolates circuit breaker state between different providers", () => {
    const cb = new CircuitBreakerEngine();
    cb.configureProvider("groq-adapter", { failureThreshold: 2, successThreshold: 1, cooldownPeriodMs: 1000 });
    cb.configureProvider("nvidia-adapter", { failureThreshold: 2, successThreshold: 1, cooldownPeriodMs: 1000 });

    cb.recordFailure("groq-adapter");
    cb.recordFailure("groq-adapter");

    // Groq is OPEN, but NVIDIA must remain CLOSED
    expect(cb.getState("groq-adapter")).toBe(CircuitBreakerState.OPEN);
    expect(cb.canExecute("groq-adapter")).toBe(false);

    expect(cb.getState("nvidia-adapter")).toBe(CircuitBreakerState.CLOSED);
    expect(cb.canExecute("nvidia-adapter")).toBe(true);
  });

  it("transitions from OPEN to HALF_OPEN after cooldown period passes, and CLOSES on success threshold", () => {
    const cb = new CircuitBreakerEngine();
    const cooldownPeriodMs = 500;
    cb.configureProvider("groq-adapter", {
      failureThreshold: 2,
      successThreshold: 2,
      cooldownPeriodMs,
    });

    const t0 = 10000;
    cb.recordFailure("groq-adapter", t0);
    cb.recordFailure("groq-adapter", t0);
    expect(cb.getState("groq-adapter", t0)).toBe(CircuitBreakerState.OPEN);

    // Cooldown not yet elapsed
    expect(cb.canExecute("groq-adapter", t0 + 200)).toBe(false);

    // Cooldown elapsed -> transitions to HALF_OPEN on canExecute probe
    const t1 = t0 + 600;
    expect(cb.canExecute("groq-adapter", t1)).toBe(true);
    expect(cb.getState("groq-adapter", t1)).toBe(CircuitBreakerState.HALF_OPEN);

    // First trial probe success
    cb.recordSuccess("groq-adapter", t1 + 10);
    expect(cb.getState("groq-adapter", t1 + 10)).toBe(CircuitBreakerState.HALF_OPEN);

    // Second trial probe success -> CLOSES circuit
    cb.recordSuccess("groq-adapter", t1 + 20);
    expect(cb.getState("groq-adapter", t1 + 20)).toBe(CircuitBreakerState.CLOSED);
    expect(cb.canExecute("groq-adapter", t1 + 30)).toBe(true);
  });
});
