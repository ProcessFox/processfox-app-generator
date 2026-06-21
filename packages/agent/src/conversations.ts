import { randomUUID } from 'node:crypto';
import type { ModuleRegistry } from '@processfox/core';
import { Conversation } from './loop.js';

/**
 * In-memory store of active agent conversations, keyed by id. Intentionally
 * ephemeral (V1): conversations hold the live message history + GeneratorSession
 * so follow-up prompts can refine the app being built. App *persistence* remains
 * the file store (saved manifest versions); only the editing session is in memory.
 *
 * A FIFO cap bounds memory if many conversations are started and never finished.
 */
export class ConversationStore {
  private readonly map = new Map<string, Conversation>();

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly maxConversations = 200,
  ) {}

  /** Start a new conversation and return its id plus the Conversation. */
  create(): { id: string; conversation: Conversation } {
    const id = `conv_${randomUUID()}`;
    const conversation = new Conversation(this.registry);
    this.map.set(id, conversation);
    this.evictOldest();
    return { id, conversation };
  }

  get(id: string): Conversation | undefined {
    return this.map.get(id);
  }

  /** Resolve an existing conversation by id, or create a fresh one. */
  resolve(id?: string): { id: string; conversation: Conversation } {
    if (id) {
      const existing = this.map.get(id);
      if (existing) return { id, conversation: existing };
    }
    return this.create();
  }

  private evictOldest(): void {
    while (this.map.size > this.maxConversations) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
}
