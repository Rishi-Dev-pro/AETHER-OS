/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 1 Test Suite: Error Hierarchy & Serialization (`errors.test.ts`)
 *
 * @file __tests__/errors.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  AetherMemoryError,
  MemoryNotFoundError,
  InvalidMemoryQueryError,
  MemoryStorageError,
  MemoryIndexError,
  ImmutableMutationError,
  MemoryValidationError,
  isAetherMemoryError,
} from "../index";

describe("Phase 9.6 Milestone 1 — Memory System Error Hierarchy", () => {
  it("enforces inheritance from AetherMemoryError and base Error class", () => {
    const err = new MemoryNotFoundError("Memory ID 'm-123' not found.");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AetherMemoryError);
    expect(err).toBeInstanceOf(MemoryNotFoundError);
    expect(isAetherMemoryError(err)).toBe(true);
    expect(err.code).toBe("MEMORY_NOT_FOUND");
    expect(err.isRetryable).toBe(false);
  });

  it("instantiates all derived error classes with correct defaults", () => {
    const queryErr = new InvalidMemoryQueryError("Query limit must be positive.");
    expect(queryErr.code).toBe("INVALID_MEMORY_QUERY");

    const storageErr = new MemoryStorageError("Disk write failed.", true);
    expect(storageErr.code).toBe("MEMORY_STORAGE_ERROR");
    expect(storageErr.isRetryable).toBe(true);

    const indexErr = new MemoryIndexError("Vector index corrupted.");
    expect(indexErr.code).toBe("MEMORY_INDEX_ERROR");

    const mutationErr = new ImmutableMutationError("Attempted write to frozen MemoryEntry.");
    expect(mutationErr.code).toBe("IMMUTABLE_MUTATION_ERROR");

    const validationErr = new MemoryValidationError("Invalid score threshold.");
    expect(validationErr.code).toBe("MEMORY_VALIDATION_ERROR");
  });

  it("provides complete, deep-frozen diagnostic JSON payloads", () => {
    const causeErr = new Error("Underlying IO connection reset");
    const err = new MemoryStorageError("Failed to update index", false, { path: "/data/mem" }, causeErr);

    const diag = err.toDiagnosticJSON();

    expect(diag["name"]).toBe("MemoryStorageError");
    expect(diag["code"]).toBe("MEMORY_STORAGE_ERROR");
    expect(diag["message"]).toBe("Failed to update index");
    expect(diag["isRetryable"]).toBe(false);
    expect(diag["details"]).toEqual({ path: "/data/mem" });
    expect(diag["cause"]).toEqual({
      name: "Error",
      message: "Underlying IO connection reset",
    });
    expect(Object.isFrozen(diag)).toBe(true);
  });

  it("provides sanitized public JSON payloads for user/UI emission", () => {
    const err = new MemoryNotFoundError("Internal secret memory 0x9923 unavailable.");
    const pub = err.toPublicJSON();

    expect(pub["code"]).toBe("MEMORY_NOT_FOUND");
    expect(pub["message"]).toBe("The requested memory entry or collection could not be found.");
    expect(pub["timestamp"]).toBeTypeOf("number");
    expect(pub["stack"]).toBeUndefined();
    expect(pub["details"]).toBeUndefined();
    expect(Object.isFrozen(pub)).toBe(true);
  });

  it("validates base class invariant check on empty message/code", () => {
    class InvalidSubclass extends AetherMemoryError {
      constructor() {
        super({ code: "", message: "" });
      }
    }

    expect(() => new InvalidSubclass()).toThrow();
  });
});
