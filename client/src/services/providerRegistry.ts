import type { ContextProvider } from "../types/prompt";
import {
  VisionProvider,
  EnvironmentProvider,
  IntentProvider,
  ConversationProvider,
  MemoryProvider,
  OcrProvider,
  BrowserProvider,
} from "./promptProviders";

class ProviderRegistry {
  private providers: Map<string, ContextProvider> = new Map();
  private isLocked = false;

  /**
   * Registers a provider instance. Throws error if double registration occurs.
   */
  register(provider: ContextProvider): void {
    if (this.isLocked) {
      console.warn(`[ProviderRegistry] Registry is locked. Cannot register provider '${provider.id}' at runtime.`);
      return;
    }
    if (this.providers.has(provider.id)) {
      throw new Error(`[ProviderRegistry] Duplicate provider registration: '${provider.id}'`);
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Locks the registry to ensure read-only runtime access.
   */
  lock(): void {
    this.isLocked = true;
  }

  /**
   * Retrieves a registered context provider by lookup key.
   */
  get(id: string): ContextProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Retrieves all registered providers.
   */
  getAll(): ContextProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Resets registry state (primarily for testing purposes).
   */
  reset(): void {
    this.providers.clear();
    this.isLocked = false;
  }
}

export const providerRegistry = new ProviderRegistry();

// Boot-time static registration of default providers
providerRegistry.register(new IntentProvider());
providerRegistry.register(new ConversationProvider());
providerRegistry.register(new VisionProvider());
providerRegistry.register(new EnvironmentProvider());
providerRegistry.register(new MemoryProvider());
providerRegistry.register(new OcrProvider());
providerRegistry.register(new BrowserProvider());
providerRegistry.lock();
