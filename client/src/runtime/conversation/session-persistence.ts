/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 5 Component: Session Persistence Engine (`session-persistence.ts`)
 *
 * @file session-persistence.ts
 * @description Robust, non-blocking asynchronous storage adapter utilizing browser IndexedDB
 * with automatic graceful degradation to localStorage and in-memory map.
 * Enforces zero-credential sanitization and schema versioning.
 *
 * @module @aether/runtime/conversation/session-persistence
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 5
 */

import type {
  SessionData,
  SessionMetadata,
  SessionSnapshot,
  PersistenceConfiguration,
} from "./session-types";

const DB_NAME = "AetherSessionDB";
const DB_VERSION = 1;
const STORE_SESSIONS = "sessions";
const STORE_SNAPSHOTS = "snapshots";
const LOCAL_STORAGE_PREFIX = "aether_session_";
const LOCAL_STORAGE_SNAPSHOT_PREFIX = "aether_snapshot_";
const LOCAL_STORAGE_INDEX_KEY = "aether_sessions_index";

/**
 * Strips any potential credential leaks, API keys, or authorization tokens before persistence.
 */
export function sanitizeForPersistence<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForPersistence(item)) as unknown as T;
  }

  const forbiddenSubstrings = [
    "apikey",
    "secret",
    "authorization",
    "authheader",
    "bearer",
    "token",
    "password",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (forbiddenSubstrings.some((sub) => normalizedKey.includes(sub))) {
      continue;
    }
    sanitized[key] = sanitizeForPersistence(value);
  }

  return sanitized as T;
}

export class SessionPersistenceEngine {
  private db: IDBDatabase | null = null;
  private isIndexedDBAvailable = false;
  private isLocalStorageAvailable = false;
  private inMemorySessions = new Map<string, SessionData>();
  private inMemorySnapshots = new Map<string, SessionSnapshot>();
  private initialized = false;

  constructor(private readonly config: PersistenceConfiguration = {}) {}

  /**
   * Initializes storage backend with fallback detection.
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    this.isLocalStorageAvailable = this.checkLocalStorage();
    this.isIndexedDBAvailable = await this.checkIndexedDB();

    if (this.isIndexedDBAvailable) {
      try {
        this.db = await this.openDatabase();
      } catch (err) {
        console.warn("[SessionPersistence] IndexedDB failed to open, falling back:", err);
        this.isIndexedDBAvailable = false;
      }
    }

    this.initialized = true;
  }

  private checkLocalStorage(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const testKey = "__aether_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private checkIndexedDB(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (typeof window === "undefined" || !window.indexedDB) {
          return resolve(false);
        }
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName || DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: "metadata.sessionId" });
          sessionStore.createIndex("updatedAt", "metadata.updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "snapshotId" });
          snapshotStore.createIndex("sessionId", "sessionId", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Saves a session asynchronously.
   */
  public async saveSession(session: SessionData): Promise<void> {
    if (!this.initialized) await this.init();

    const sanitizedSession = sanitizeForPersistence(session);

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise<void>((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORE_SESSIONS, "readwrite");
          const store = tx.objectStore(STORE_SESSIONS);
          const req = store.put(sanitizedSession);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (err) {
          // Graceful fallback to memory/localStorage
          this.saveToLocalStorageOrMemory(sanitizedSession);
          resolve();
        }
      });
    }

    this.saveToLocalStorageOrMemory(sanitizedSession);
  }

  private saveToLocalStorageOrMemory(session: SessionData): void {
    const sessionId = session.metadata.sessionId;
    this.inMemorySessions.set(sessionId, session);

    if (this.isLocalStorageAvailable) {
      try {
        const serialized = JSON.stringify(session);
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${sessionId}`, serialized);
        this.updateLocalStorageIndex(sessionId, session.metadata);
      } catch (err) {
        console.warn("[SessionPersistence] localStorage write failed:", err);
      }
    }
  }

  private updateLocalStorageIndex(sessionId: string, metadata: SessionMetadata): void {
    try {
      const rawIndex = localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
      const index: Record<string, SessionMetadata> = rawIndex ? JSON.parse(rawIndex) : {};
      index[sessionId] = metadata;
      localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(index));
    } catch {
      // Ignore index failure
    }
  }

  /**
   * Loads a session by ID.
   */
  public async loadSession(sessionId: string): Promise<SessionData | null> {
    if (!this.initialized) await this.init();

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise<SessionData | null>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_SESSIONS, "readonly");
          const store = tx.objectStore(STORE_SESSIONS);
          const req = store.get(sessionId);
          req.onsuccess = () => resolve(req.result ? (req.result as SessionData) : null);
          req.onerror = () => resolve(this.loadFromLocalStorageOrMemory(sessionId));
        } catch {
          resolve(this.loadFromLocalStorageOrMemory(sessionId));
        }
      });
    }

    return this.loadFromLocalStorageOrMemory(sessionId);
  }

  private loadFromLocalStorageOrMemory(sessionId: string): SessionData | null {
    if (this.inMemorySessions.has(sessionId)) {
      return this.inMemorySessions.get(sessionId)!;
    }

    if (this.isLocalStorageAvailable) {
      try {
        const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${sessionId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as SessionData;
          this.inMemorySessions.set(sessionId, parsed);
          return parsed;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Lists all persisted session metadata ordered by newest updated.
   */
  public async listSessions(): Promise<ReadonlyArray<SessionMetadata>> {
    if (!this.initialized) await this.init();

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise<ReadonlyArray<SessionMetadata>>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_SESSIONS, "readonly");
          const store = tx.objectStore(STORE_SESSIONS);
          const req = store.getAll();
          req.onsuccess = () => {
            const results = (req.result as SessionData[]) || [];
            const metaList = results
              .map((s) => s.metadata)
              .filter(Boolean)
              .sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(Object.freeze(metaList));
          };
          req.onerror = () => resolve(this.listFromLocalStorageOrMemory());
        } catch {
          resolve(this.listFromLocalStorageOrMemory());
        }
      });
    }

    return this.listFromLocalStorageOrMemory();
  }

  private listFromLocalStorageOrMemory(): ReadonlyArray<SessionMetadata> {
    const list: SessionMetadata[] = [];
    const seenIds = new Set<string>();

    for (const s of this.inMemorySessions.values()) {
      list.push(s.metadata);
      seenIds.add(s.metadata.sessionId);
    }

    if (this.isLocalStorageAvailable) {
      try {
        const rawIndex = localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
        if (rawIndex) {
          const index = JSON.parse(rawIndex) as Record<string, SessionMetadata>;
          for (const [id, meta] of Object.entries(index)) {
            if (!seenIds.has(id)) {
              list.push(meta);
              seenIds.add(id);
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    list.sort((a, b) => b.updatedAt - a.updatedAt);
    return Object.freeze(list);
  }

  /**
   * Deletes a session and its associated storage.
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.initialized) await this.init();

    this.inMemorySessions.delete(sessionId);

    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${sessionId}`);
        const rawIndex = localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
        if (rawIndex) {
          const index = JSON.parse(rawIndex);
          delete index[sessionId];
          localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(index));
        }
      } catch {}
    }

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise<boolean>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_SESSIONS, "readwrite");
          const store = tx.objectStore(STORE_SESSIONS);
          const req = store.delete(sessionId);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }

    return true;
  }

  /**
   * Saves a named session snapshot.
   */
  public async saveSnapshot(snapshot: SessionSnapshot): Promise<void> {
    if (!this.initialized) await this.init();

    const sanitized = sanitizeForPersistence(snapshot);
    this.inMemorySnapshots.set(snapshot.snapshotId, sanitized);

    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem(
          `${LOCAL_STORAGE_SNAPSHOT_PREFIX}${snapshot.snapshotId}`,
          JSON.stringify(sanitized)
        );
      } catch {}
    }

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise<void>((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORE_SNAPSHOTS, "readwrite");
          const store = tx.objectStore(STORE_SNAPSHOTS);
          const req = store.put(sanitized);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch {
          resolve();
        }
      });
    }
  }

  /**
   * Loads a snapshot by snapshotId.
   */
  public async loadSnapshot(snapshotId: string): Promise<SessionSnapshot | null> {
    if (!this.initialized) await this.init();

    if (this.inMemorySnapshots.has(snapshotId)) {
      return this.inMemorySnapshots.get(snapshotId)!;
    }

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise<SessionSnapshot | null>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_SNAPSHOTS, "readonly");
          const store = tx.objectStore(STORE_SNAPSHOTS);
          const req = store.get(snapshotId);
          req.onsuccess = () => resolve(req.result ? (req.result as SessionSnapshot) : null);
          req.onerror = () => resolve(this.loadSnapshotFromLocalStorage(snapshotId));
        } catch {
          resolve(this.loadSnapshotFromLocalStorage(snapshotId));
        }
      });
    }

    return this.loadSnapshotFromLocalStorage(snapshotId);
  }

  private loadSnapshotFromLocalStorage(snapshotId: string): SessionSnapshot | null {
    if (this.isLocalStorageAvailable) {
      try {
        const raw = localStorage.getItem(`${LOCAL_STORAGE_SNAPSHOT_PREFIX}${snapshotId}`);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  /**
   * Lists snapshots, optionally filtered by sessionId.
   */
  public async listSnapshots(sessionId?: string): Promise<ReadonlyArray<SessionSnapshot>> {
    if (!this.initialized) await this.init();

    let list: SessionSnapshot[] = [];

    if (this.isIndexedDBAvailable && this.db) {
      list = await new Promise<SessionSnapshot[]>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_SNAPSHOTS, "readonly");
          const store = tx.objectStore(STORE_SNAPSHOTS);
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result as SessionSnapshot[]) || []);
          req.onerror = () => resolve(Array.from(this.inMemorySnapshots.values()));
        } catch {
          resolve(Array.from(this.inMemorySnapshots.values()));
        }
      });
    } else {
      list = Array.from(this.inMemorySnapshots.values());
    }

    if (sessionId) {
      list = list.filter((s) => s.sessionId === sessionId);
    }

    list.sort((a, b) => b.createdAt - a.createdAt);
    return Object.freeze(list);
  }

  /**
   * Deletes a snapshot by ID.
   */
  public async deleteSnapshot(snapshotId: string): Promise<boolean> {
    if (!this.initialized) await this.init();

    this.inMemorySnapshots.delete(snapshotId);

    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem(`${LOCAL_STORAGE_SNAPSHOT_PREFIX}${snapshotId}`);
      } catch {}
    }

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise<boolean>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_SNAPSHOTS, "readwrite");
          const store = tx.objectStore(STORE_SNAPSHOTS);
          const req = store.delete(snapshotId);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }

    return true;
  }

  /**
   * Clears all persisted sessions and snapshots (for testing / reset).
   */
  public async clearAll(): Promise<void> {
    this.inMemorySessions.clear();
    this.inMemorySnapshots.clear();

    if (this.isLocalStorageAvailable) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith(LOCAL_STORAGE_PREFIX) || k.startsWith(LOCAL_STORAGE_SNAPSHOT_PREFIX) || k === LOCAL_STORAGE_INDEX_KEY)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }

    if (this.isIndexedDBAvailable && this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction([STORE_SESSIONS, STORE_SNAPSHOTS], "readwrite");
          tx.objectStore(STORE_SESSIONS).clear();
          tx.objectStore(STORE_SNAPSHOTS).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }
}

export const sessionPersistence = new SessionPersistenceEngine();
