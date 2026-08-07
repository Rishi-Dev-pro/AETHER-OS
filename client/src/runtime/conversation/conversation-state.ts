/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Conversation State (`conversation-state.ts`)
 *
 * @file conversation-state.ts
 * @description In-memory, deeply frozen runtime state container managing conversation messages, system prompt, and active providers.
 *
 * @module @aether/runtime/conversation/conversation-state
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import type {
  ConversationMessage,
  ConversationRole,
  ConversationStateSnapshot,
} from "./conversation-types";
import { ConversationStateError } from "./conversation-errors";

/**
 * Helper to deeply freeze objects recursively.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

/**
 * In-memory conversation state container.
 */
export class ConversationState {
  private readonly conversationId: string;
  private systemPrompt: string;
  private activeProvider: string;
  private activeModel: string;
  private messages: ConversationMessage[] = [];
  private readonly createdAt: number;
  private updatedAt: number;
  private messageCounter = 0;

  constructor(
    conversationId?: string,
    systemPrompt: string = "You are AETHER OS, a powerful AI operating system assistant.",
    activeProvider: string = "groq-provider",
    activeModel: string = "llama-3.3-70b-versatile"
  ) {
    this.conversationId = conversationId ?? `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.systemPrompt = systemPrompt;
    this.activeProvider = activeProvider;
    this.activeModel = activeModel;
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }

  public getConversationId(): string {
    return this.conversationId;
  }

  public getSystemPrompt(): string {
    return this.systemPrompt;
  }

  public setSystemPrompt(prompt: string): void {
    if (typeof prompt !== "string") {
      throw new ConversationStateError("System prompt must be a string.");
    }
    this.systemPrompt = prompt;
    this.updatedAt = Date.now();
  }

  public getActiveProvider(): string {
    return this.activeProvider;
  }

  public getActiveModel(): string {
    return this.activeModel;
  }

  public setProviderAndModel(providerId: string, modelId: string): void {
    if (!providerId || !modelId) {
      throw new ConversationStateError("providerId and modelId must be non-empty strings.");
    }
    this.activeProvider = providerId;
    this.activeModel = modelId;
    this.updatedAt = Date.now();
  }

  public appendMessage(
    role: ConversationRole,
    content: string,
    metadata?: Record<string, unknown>
  ): Readonly<ConversationMessage> {
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new ConversationStateError("Message content cannot be empty.");
    }

    this.messageCounter++;
    const message: ConversationMessage = {
      id: `msg_${this.messageCounter}_${Date.now()}`,
      role,
      content: content.trim(),
      timestamp: Date.now(),
      ...(metadata ? { metadata } : {}),
    };

    this.messages.push(message);
    this.updatedAt = message.timestamp;
    return deepFreeze({ ...message });
  }

  public appendUserMessage(
    content: string,
    metadata?: Record<string, unknown>
  ): Readonly<ConversationMessage> {
    return this.appendMessage("user", content, metadata);
  }

  public appendAssistantMessage(
    content: string,
    metadata?: Record<string, unknown>
  ): Readonly<ConversationMessage> {
    return this.appendMessage("assistant", content, metadata);
  }

  public appendSystemMessage(content: string): Readonly<ConversationMessage> {
    return this.appendMessage("system", content);
  }

  public getMessages(): ReadonlyArray<ConversationMessage> {
    return Object.freeze([...this.messages]);
  }

  public clearConversation(): void {
    this.messages = [];
    this.updatedAt = Date.now();
  }

  public createSnapshot(): Readonly<ConversationStateSnapshot> {
    const snapshot: ConversationStateSnapshot = {
      conversationId: this.conversationId,
      systemPrompt: this.systemPrompt,
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      messages: this.messages.map((m) => ({ ...m })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    return deepFreeze(snapshot);
  }
}
