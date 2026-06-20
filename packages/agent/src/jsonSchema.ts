import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';

/**
 * Converts a module's Zod config schema into a JSON Schema the agent can read.
 * Core stores config schemas as Zod (for runtime validation); the agent needs
 * the JSON-Schema view to understand what config a module expects.
 */
export function configJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'jsonSchema7' }) as Record<string, unknown>;
}
