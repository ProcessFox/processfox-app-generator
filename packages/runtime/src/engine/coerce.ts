/**
 * Value coercion along an edge. Mirrors the type-level `isAssignable` rules in
 * @processfox/core, but operates on the concrete runtime values. The validator
 * has already proven the edge is assignable, so an unexpected pair here is a
 * programming error, not user input.
 */

import type { PortType } from '@processfox/core';
import type { TableValue, RecordListValue } from './data.js';

export function coerce(value: unknown, from: PortType, to: PortType): unknown {
  if (from === to) return value;

  if (from === 'table' && to === 'recordList') {
    return (value as TableValue).rows;
  }

  if (from === 'recordList' && to === 'table') {
    const rows = value as RecordListValue;
    const columns: string[] = [];
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!columns.includes(key)) columns.push(key);
      }
    }
    return { columns, rows } satisfies TableValue;
  }

  if (from === 'image' && to === 'file') return value;

  throw new Error(`No runtime coercion from "${from}" to "${to}"`);
}
