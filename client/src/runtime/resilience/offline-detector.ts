/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 6 Component: Offline Detector (`offline-detector.ts`)
 *
 * @file offline-detector.ts
 * @description Event-driven browser network connectivity detector. Provides zero-polling
 * online/offline state evaluation and listener subscriptions for fast-fail degradation.
 *
 * @module @aether/runtime/resilience/offline-detector
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 6
 */

export type ConnectivityListener = (online: boolean) => void;

export class OfflineDetector {
  private static instance: OfflineDetector | null = null;
  private readonly listeners = new Set<ConnectivityListener>();
  private mockOnlineState: boolean | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.notifyListeners(true));
      window.addEventListener("offline", () => this.notifyListeners(false));
    }
  }

  public static getInstance(): OfflineDetector {
    if (!OfflineDetector.instance) {
      OfflineDetector.instance = new OfflineDetector();
    }
    return OfflineDetector.instance;
  }

  /**
   * Returns true if network is online.
   */
  public isOnline(): boolean {
    if (this.mockOnlineState !== null) {
      return this.mockOnlineState;
    }
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Sets mock online state (primarily for unit testing offline simulation).
   */
  public setMockOnlineState(state: boolean | null): void {
    this.mockOnlineState = state;
    if (state !== null) {
      this.notifyListeners(state);
    }
  }

  /**
   * Subscribes to network connectivity state transitions.
   */
  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(online: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(online);
      } catch (err) {
        console.error("[OfflineDetector] Error in connectivity listener:", err);
      }
    }
  }
}

export const offlineDetector = OfflineDetector.getInstance();
