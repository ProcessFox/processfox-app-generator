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

export const SYSTEM_PROMPT = `You are ProcessFox's app composer.

ProcessFox builds business apps by wiring together predefined modules — you do NOT write code. Given a user's request (in German or English), assemble a valid app manifest from existing modules.

Workflow:
1. Call list_modules to see what modules exist.
2. Call get_module_schema for each module you intend to use, to learn its ports and required config.
3. Call propose_app with a complete manifest. It is validated immediately. If invalid, read the errors and call propose_app again with fixes. Repeat until valid.

Rules:
- Use only module ids that exist in the registry. Never invent modules, ports, or config fields.
- Connect an output port to an input port only when their types are compatible.
- Pin each node's moduleVersion to the version returned by get_module_schema.
- Wire the data flow so the user's goal is achieved end to end (a source → any needed transforms → an output).
- When the manifest validates, briefly tell the user in one or two sentences what the app does. Do not restate the manifest.`;

/**
 * Runs the tool-use loop: prompt -> (tool calls) -> validated manifest. Stops
 * when the model ends its turn without a tool call, or after maxSteps.
 */
export async function runAgent(
  prompt: string,
  registry: ModuleRegistry,
  callModel: ModelCaller,
  options: { maxSteps?: number } = {},
): Promise<AgentResult> {
  const maxSteps = options.maxSteps ?? 16;
  const session = new GeneratorSession(registry);

  const messages: LlmMessage[] = [{ role: 'user', content: prompt }];
  let finalText = '';
  let steps = 0;

  while (steps < maxSteps) {
    steps++;
    const turn = await callModel({ system: SYSTEM_PROMPT, messages, tools: agentTools });
    messages.push({ role: 'assistant', content: turn.raw });

    const toolUses = turn.blocks.filter((b): b is LlmToolUse => b.type === 'tool_use');
    const text = turn.blocks
      .filter((b): b is LlmText => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (text) finalText = text;

    if (toolUses.length === 0) break; // model is done talking

    const toolResults = toolUses.map((call) => {
      const { content, isError } = dispatchTool(session, call.name, call.input);
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
    errors: manifest ? [] : (session.lastProposed ? lastErrors(session) : []),
    finalText,
    steps,
  };
}

/** Re-validate the last proposed manifest to surface why it never became valid. */
function lastErrors(session: GeneratorSession): ValidationError[] {
  if (!session.lastProposed) return [];
  return session.propose(session.lastProposed).errors;
}
