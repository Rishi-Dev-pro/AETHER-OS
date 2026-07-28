import { describe, it, expect } from "vitest";
import { CircuitState } from "../types";
import { ConfigurationError } from "../errors";
import {
  createCircuitBreakerConfig,
  createInitialSnapshot,
  evaluateCircuitState,
  shouldAllowRequest,
  recordSuccess,
  recordFailure,
  createTransition,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "../circuit-breaker";

describe("Phase 9.4 Component 9: Circuit Breaker Engine (circuit-breaker.ts)", () => {
  describe("CircuitBreakerConfig Factory & Invariant Enforcement", () => {
    it("should create valid CircuitBreakerConfig with defaults", () => {
      const config = createCircuitBreakerConfig();

      expect(config.failureThreshold).toBe(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold);
      expect(config.recoveryTimeoutMs).toBe(DEFAULT_CIRCUIT_BREAKER_CONFIG.recoveryTimeoutMs);
      expect(config.halfOpenMaxProbes).toBe(DEFAULT_CIRCUIT_BREAKER_CONFIG.halfOpenMaxProbes);
      expect(config.monitoringWindowMs).toBe(DEFAULT_CIRCUIT_BREAKER_CONFIG.monitoringWindowMs);
      expect(Object.isFrozen(config)).toBe(true);
    });

    it("should accept custom overrides", () => {
      const config = createCircuitBreakerConfig({
        failureThreshold: 3,
        recoveryTimeoutMs: 15000,
        halfOpenMaxProbes: 2,
        monitoringWindowMs: 30000,
      });

      expect(config.failureThreshold).toBe(3);
      expect(config.recoveryTimeoutMs).toBe(15000);
      expect(config.halfOpenMaxProbes).toBe(2);
      expect(config.monitoringWindowMs).toBe(30000);
    });

    it("should throw ConfigurationError for non-positive or non-integer failureThreshold", () => {
      expect(() => {
        createCircuitBreakerConfig({ failureThreshold: 0 });
      }).toThrow(ConfigurationError);

      expect(() => {
        createCircuitBreakerConfig({ failureThreshold: -2 });
      }).toThrow(ConfigurationError);

      expect(() => {
        createCircuitBreakerConfig({ failureThreshold: 2.5 });
      }).toThrow("failureThreshold must be a positive integer.");
    });

    it("should throw ConfigurationError for invalid recoveryTimeoutMs or monitoringWindowMs", () => {
      expect(() => {
        createCircuitBreakerConfig({ recoveryTimeoutMs: 0 });
      }).toThrow(ConfigurationError);

      expect(() => {
        createCircuitBreakerConfig({ monitoringWindowMs: -500 });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for invalid halfOpenMaxProbes", () => {
      expect(() => {
        createCircuitBreakerConfig({ halfOpenMaxProbes: 0 });
      }).toThrow("halfOpenMaxProbes must be a positive integer.");
    });
  });

  describe("Initial Snapshot Factory", () => {
    it("should create a clean initial snapshot in CLOSED state", () => {
      const snapshot = createInitialSnapshot();

      expect(snapshot.state).toBe(CircuitState.CLOSED);
      expect(snapshot.consecutiveFailures).toBe(0);
      expect(snapshot.lastFailureTimestamp).toBe(0);
      expect(snapshot.lastSuccessTimestamp).toBe(0);
      expect(snapshot.totalTrips).toBe(0);
      expect(snapshot.activeProbes).toBe(0);
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe("Circuit State Transitions & Evaluation Logic", () => {
    const config = createCircuitBreakerConfig({
      failureThreshold: 3,
      recoveryTimeoutMs: 10000,
    });

    it("evaluateCircuitState should remain CLOSED when failures < threshold", () => {
      let snapshot = createInitialSnapshot();
      snapshot = recordFailure(snapshot, config);
      snapshot = recordFailure(snapshot, config);

      expect(snapshot.consecutiveFailures).toBe(2);
      expect(evaluateCircuitState(snapshot, config)).toBe(CircuitState.CLOSED);
    });

    it("evaluateCircuitState should transition CLOSED → OPEN when failures >= threshold", () => {
      let snapshot = createInitialSnapshot();
      snapshot = recordFailure(snapshot, config);
      snapshot = recordFailure(snapshot, config);
      snapshot = recordFailure(snapshot, config); // 3rd failure = threshold

      expect(snapshot.state).toBe(CircuitState.OPEN);
      expect(snapshot.consecutiveFailures).toBe(3);
      expect(snapshot.totalTrips).toBe(1);
    });

    it("evaluateCircuitState should remain OPEN while within recoveryTimeoutMs", () => {
      let snapshot = createInitialSnapshot();
      for (let i = 0; i < 3; i++) {
        snapshot = recordFailure(snapshot, config);
      }
      const failureTime = snapshot.lastFailureTimestamp;

      // 5 seconds later (< 10000ms threshold)
      expect(evaluateCircuitState(snapshot, config, failureTime + 5000)).toBe(CircuitState.OPEN);
    });

    it("evaluateCircuitState should transition OPEN → HALF_OPEN after recoveryTimeoutMs", () => {
      let snapshot = createInitialSnapshot();
      for (let i = 0; i < 3; i++) {
        snapshot = recordFailure(snapshot, config);
      }
      const failureTime = snapshot.lastFailureTimestamp;

      // 10.001 seconds later (>= 10000ms threshold)
      expect(evaluateCircuitState(snapshot, config, failureTime + 10001)).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe("Request Gate Check (shouldAllowRequest)", () => {
    const config = createCircuitBreakerConfig({
      failureThreshold: 2,
      recoveryTimeoutMs: 5000,
      halfOpenMaxProbes: 1,
    });

    it("should allow requests in CLOSED state", () => {
      const snapshot = createInitialSnapshot();
      expect(shouldAllowRequest(snapshot, config)).toBe(true);
    });

    it("should reject requests in OPEN state before timeout", () => {
      let snapshot = createInitialSnapshot();
      snapshot = recordFailure(snapshot, config);
      snapshot = recordFailure(snapshot, config); // Trips to OPEN

      expect(snapshot.state).toBe(CircuitState.OPEN);
      expect(shouldAllowRequest(snapshot, config, snapshot.lastFailureTimestamp + 1000)).toBe(false);
    });

    it("should allow single probe request in HALF_OPEN state when activeProbes < maxProbes", () => {
      let snapshot = createInitialSnapshot();
      snapshot = recordFailure(snapshot, config);
      snapshot = recordFailure(snapshot, config); // OPEN

      const probeTime = snapshot.lastFailureTimestamp + 6000; // >= 5000ms timeout -> HALF_OPEN
      expect(shouldAllowRequest(snapshot, config, probeTime)).toBe(true);
    });

    it("should reject subsequent probe requests in HALF_OPEN if activeProbes >= maxProbes", () => {
      const halfOpenSnapshot = {
        ...createInitialSnapshot(),
        state: CircuitState.HALF_OPEN,
        activeProbes: 1, // At ceiling
      };

      expect(shouldAllowRequest(halfOpenSnapshot, config)).toBe(false);
    });
  });

  describe("State Mutation via Success and Failure Recording", () => {
    const config = createCircuitBreakerConfig({ failureThreshold: 2 });

    it("recordSuccess should reset consecutive failures to 0 and transition HALF_OPEN → CLOSED", () => {
      const halfOpenSnapshot = {
        ...createInitialSnapshot(),
        state: CircuitState.HALF_OPEN,
        consecutiveFailures: 2,
        activeProbes: 1,
      };

      const newSnapshot = recordSuccess(halfOpenSnapshot);

      expect(newSnapshot.state).toBe(CircuitState.CLOSED);
      expect(newSnapshot.consecutiveFailures).toBe(0);
      expect(newSnapshot.activeProbes).toBe(0);
      expect(newSnapshot.lastSuccessTimestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(newSnapshot)).toBe(true);
    });

    it("recordFailure in HALF_OPEN state should immediately trip back to OPEN", () => {
      const halfOpenSnapshot = {
        ...createInitialSnapshot(),
        state: CircuitState.HALF_OPEN,
        consecutiveFailures: 2,
        totalTrips: 1,
        activeProbes: 1,
      };

      const newSnapshot = recordFailure(halfOpenSnapshot, config);

      expect(newSnapshot.state).toBe(CircuitState.OPEN);
      expect(newSnapshot.consecutiveFailures).toBe(3);
      expect(newSnapshot.totalTrips).toBe(2);
      expect(newSnapshot.activeProbes).toBe(0);
      expect(Object.isFrozen(newSnapshot)).toBe(true);
    });
  });

  describe("CircuitBreakerTransition Model", () => {
    it("should create a valid immutable transition event", () => {
      const transition = createTransition(CircuitState.CLOSED, CircuitState.OPEN, "Failure threshold exceeded (5/5)");

      expect(transition.fromState).toBe(CircuitState.CLOSED);
      expect(transition.toState).toBe(CircuitState.OPEN);
      expect(transition.reason).toBe("Failure threshold exceeded (5/5)");
      expect(transition.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(transition)).toBe(true);
    });
  });
});
