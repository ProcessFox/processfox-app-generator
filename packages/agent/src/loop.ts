import type { AppManifest, ModuleRegistry, ValidationError } from '@processfox/core';
import { GeneratorSession } from './session.js';
import { agentTools, dispatchTool, type AgentToolDef } from './tools.js';

// --- Provider-agnostic LLM surface (so the loop is testable with a mock) ---

export interface LlmToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}
export interface LlmText {
  type: 'text';
  text: string;
}
export type LlmBlock = LlmToolUse | LlmText;

export interface LlmTurn {
  /** Parsed blocks the loop reasons about. */
  blocks: LlmBlock[];
  /** Provider's original assistant content, replayed verbatim on the next turn. */
  raw: unknown;
  stopReason: string;
}

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: unknown;
}

export interface ModelRequest {
  system: string;
  messages: LlmMessage[];
  tools: AgentToolDef[];
}

/** A function that calls the model once and returns its turn. */
export type ModelCaller = (req: ModelRequest) => Promise<LlmTurn>;

export interface AgentResult {
  manifest: AppManifest | null;
  valid: boolean;
  errors: ValidationError[];
  /** Final assistant text (e.g. a short explanation of the built app). */
  finalText: string;
  steps: number;
}

/**
 * Progress events emitted as the loop runs, so the UI can show the agent
 * "thinking" live (streamed step-by-step, one model round-trip per step).
 */
export type AgentEvent =
  | { type: 'step'; step: number }
  | { type: 'text'; text: string } // model narration for this turn
  | { type: 'tool'; name: string; label: string } // a tool call started
  | { type: 'validation'; valid: boolean; errors: ValidationError[] }; // propose_app outcome

export interface SendOptions {
  maxSteps?: number;
  onEvent?: (event: AgentEvent) => void;
}

/** Human-readable German labels for the streamed tool steps. */
function toolLabel(name: string, input: unknown): string {
  switch (name) {
    case 'list_modules':
      return 'Module werden gelesen';
    case 'get_module_schema': {
      const id = (input as { moduleId?: unknown })?.moduleId;
      return typeof id === 'string' ? `Modul »${id}« wird geprüft` : 'Modul wird geprüft';
    }
    case 'propose_app':
      return 'App-Entwurf wird geprüft';
    default:
      return name;
  }
}

export const SYSTEM_PROMPT = `You are ProcessFox's app composer.

ProcessFox builds business apps by wiring together predefined modules — you do NOT write code. Given a user's request (in German or English), assemble a valid app manifest from existing modules.

Workflow:
1. Call list_modules to see what modules exist.
2. Call get_module_schema for each module you intend to use. Read its "usage" guidance and each config field's "description" — they tell you how to pick and fill the config. Follow them when configuring nodes.
3. Call propose_app with a complete manifest. It is validated immediately. If invalid, read the errors and call propose_app again with fixes. Repeat until valid.

Rules:
- Use only module ids that exist in the registry. Never invent modules, ports, or config fields.
- Connect an output port to an input port only when their types are compatible.
- Pin each node's moduleVersion to the version returned by get_module_schema.
- Wire the data flow so the user's goal is achieved end to end (a source → any needed transforms → an output).
- When config depends on the user's actual data (e.g. a field-mapping's source columns, a filter field, a DOCX template) and you don't know those values, make a sensible proposal and tell the user in plain language what to check or provide (which columns their file has, which template to upload). Don't silently invent column names as if they were certain.
- A follow-up message refines the app you already built: keep the existing modules and wiring unless the user asks to change them, and call propose_app with the updated manifest.
- Before each tool call, say in one short sentence (in the user's language) what you are about to do, so your progress is visible.
- When the manifest validates, briefly tell the user in one or two sentences what the app does. Do not restate the manifest.`;

/**
 * A single agent conversation: the message history and the GeneratorSession are
 * preserved across `send` calls, so a follow-up prompt refines the app built so
 * far (multi-turn editing). One-shot generation is just a single `send`.
 */
export class Conversation {
  readonly messages: LlmMessage[] = [];
  readonly session: GeneratorSession;

  constructor(registry: ModuleRegistry) {
    this.session = new GeneratorSession(registry);
  }

  /**
   * Runs the tool-use loop for one user turn: prompt -> (tool calls) -> validated
   * manifest. Stops when the model ends its turn without a tool call, or after
   * maxSteps. Emits progress via `onEvent` as it goes.
   */
  async send(prompt: string, callModel: ModelCaller, options: SendOptions = {}): Promise<AgentResult> {
    const maxSteps = options.maxSteps ?? 16;
    const onEvent = options.onEvent;
    const { session, messages } = this;

    messages.push({ role: 'user', content: prompt });
    let finalText = '';
    let steps = 0;

    while (steps < maxSteps) {
      steps++;
      onEvent?.({ type: 'step', step: steps });
      const turn = await callModel({ system: SYSTEM_PROMPT, messages, tools: agentTools });
      messages.push({ role: 'assistant', content: turn.raw });

      const toolUses = turn.blocks.filter((b): b is LlmToolUse => b.type === 'tool_use');
      const text = turn.blocks
        .filter((b): b is LlmText => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (text) {
        finalText = text;
        onEvent?.({ type: 'text', text });
      }

      if (toolUses.length === 0) break; // model is done talking

      const toolResults = toolUses.map((call) => {
        onEvent?.({ type: 'tool', name: call.name, label: toolLabel(call.name, call.input) });
        const { content, isError } = dispatchTool(session, call.name, call.input);
        if (call.name === 'propose_app' && content && typeof content === 'object') {
          const c = content as { valid?: boolean; errors?: ValidationError[] };
          if (typeof c.valid === 'boolean') {
            onEvent?.({ type: 'validation', valid: c.valid, errors: c.errors ?? [] });
          }
        }
        return {
          type: 'tool_result' as const,
          tool_use_id: call.id,
          content: JSON.stringify(content),
          is_error: isError,
        };
      });
      messages.push({ role: 'user', content: toolResults });
    }

    const manifest = session.lastValid;
    return {
      manifest,
      valid: manifest !== null,
      errors: manifest ? [] : session.lastProposed ? lastErrors(session) : [],
      finalText,
      steps,
    };
  }
}

/**
 * Runs the tool-use loop for a single prompt (one-shot). Thin wrapper over
 * {@link Conversation} for callers that don't need multi-turn state.
 */
export async function runAgent(
  prompt: string,
  registry: ModuleRegistry,
  callModel: ModelCaller,
  options: SendOptions = {},
): Promise<AgentResult> {
  return new Conversation(registry).send(prompt, callModel, options);
}

/** Re-validate the last proposed manifest to surface why it never became valid. */
function lastErrors(session: GeneratorSession): ValidationError[] {
  if (!session.lastProposed) return [];
  return session.propose(session.lastProposed).errors;
}
