import Anthropic from '@anthropic-ai/sdk';
import type { LlmBlock, LlmMessage, ModelCaller, ModelRequest } from './loop.js';

export interface AnthropicCallerOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Real ModelCaller backed by the Anthropic SDK. Kept thin: it adapts our
 * provider-agnostic ModelRequest to `messages.create` and maps the response
 * back to LlmTurn. The raw assistant content is preserved for verbatim replay.
 */
export function createAnthropicCaller(options: AnthropicCallerOptions = {}): ModelCaller {
  const client = new Anthropic({ apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY });
  const model = options.model ?? 'claude-opus-4-8';
  const maxTokens = options.maxTokens ?? 8000;

  return async (req: ModelRequest) => {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: req.system,
      tools: req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      })),
      messages: req.messages as Anthropic.MessageParam[],
    });

    const blocks: LlmBlock[] = [];
    for (const block of response.content) {
      if (block.type === 'text') blocks.push({ type: 'text', text: block.text });
      else if (block.type === 'tool_use') {
        blocks.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input });
      }
    }

    return { blocks, raw: response.content, stopReason: response.stop_reason ?? '' };
  };
}

export type { LlmMessage };
