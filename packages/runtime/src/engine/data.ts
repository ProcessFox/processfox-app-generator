/**
 * Concrete runtime data shapes that flow along ports. The PortType in
 * @processfox/core names the *kind*; these are the actual values the engine
 * threads between module `run` functions.
 */

/** Carried by a `table` port: rows with an explicit column order. */
export interface TableValue {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

/** Carried by a `recordList` port: rows without column metadata. */
export type RecordListValue = Array<Record<string, unknown>>;

/** One generated file (e.g. a rendered .docx). */
export interface GeneratedFile {
  filename: string;
  data: Uint8Array;
}

/** Carried by a `binary` port: one or more generated files. */
export interface BinaryValue {
  files: GeneratedFile[];
}
