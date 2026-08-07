/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Integration Tests & Replay Determinism: Runtime Bootstrap (`runtime-bootstrap.integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { bootstrapRuntime, createSnapshot, resetRuntime, RuntimeStatus } from "../index";

describe("Phase 9.11 Milestone 1 Runtime Bootstrap Integration & Replay Determinism", () => {
  it("should execute 100 replay runs of bootstrapRuntime producing bit-for-bit identical frozen snapshots", async () => {
    const customEnv = {
      GROQ_API_KEY: "gsk_replay_groq_key_fixed",
      NVIDIA_API_KEY: "nvapi-replay_nvidia_key_fixed",
    };

    let firstSnapshotJson = "";

    for (let run = 0; run < 100; run++) {
      resetRuntime();

      const instance = await bootstrapRuntime(
        { autoRegisterDefaultAdapters: true, autoFreeze: true },
        customEnv
      );

      expect(instance.diagnosticsReport.summary.status).toBe(RuntimeStatus.READY);
      const snapshot = createSnapshot(instance.adapterManager.listAdapters().length);

      const normalizedSnapshot = {
        status: snapshot.status,
        activeAdaptersCount: snapshot.activeAdaptersCount,
        groqCredentialRegistered: instance.vault.hasCredential("groq-credential-id"),
        nvidiaCredentialRegistered: instance.vault.hasCredential("nvidia-credential-id"),
        openaiCredentialRegistered: instance.vault.hasCredential("openai-credential-id"),
      };

      const currentJson = JSON.stringify(normalizedSnapshot);

      if (run === 0) {
        firstSnapshotJson = currentJson;
      } else {
        expect(currentJson).toBe(firstSnapshotJson);
      }
    }
  });
});
