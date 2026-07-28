/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Internal Utility: Shared Deep Freeze Helper
 *
 * @file internal/deep-freeze.ts
 * @description Single canonical implementation of the recursive deep freeze utility
 * used across all Phase 9.4 AI Runtime modules to enforce runtime immutability.
 *
 * @module @aether/ai-runtime/internal/deep-freeze
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT
 */

// ============================================================================
// RECURSIVE DEEP FREEZE
// ============================================================================

/**
 * Recursively freezes an object and all nested properties to guarantee runtime immutability.
 * Handles objects, arrays, and nested structures. Skips already-frozen references to
 * prevent redundant traversal and circular reference loops.
 *
 * @template T - The type of the object to freeze.
 * @param obj - The object to recursively freeze.
 * @returns The same object, deeply frozen and typed as Readonly<T>.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Freeze array elements or object properties
  Object.freeze(obj);

  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function") &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  });

  return obj as Readonly<T>;
}
