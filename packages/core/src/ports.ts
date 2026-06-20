/**
 * Port type system.
 *
 * Ports are the typed connection points between modules. The agent (and the
 * editor) may only wire an output port to an input port when the data types are
 * assignable. Keeping this list small and explicit is what lets us validate a
 * whole app at build time instead of discovering type mismatches at runtime.
 */

export const PORT_TYPES = [
  'table', // tabular data: ordered rows with named columns
  'recordList', // array of plain objects (rows without column metadata)
  'file', // a user-provided file (name + bytes + mime)
  'binary', // raw bytes produced by a module (e.g. a generated document)
  'text', // a plain string
  'json', // arbitrary structured JSON value
  'image', // an image (subtype of file, but semantically distinct)
] as const;

export type PortType = (typeof PORT_TYPES)[number];

export function isPortType(value: unknown): value is PortType {
  return typeof value === 'string' && (PORT_TYPES as readonly string[]).includes(value);
}

/**
 * A single connection point on a module.
 */
export interface Port {
  /** Stable id, unique within the module's input or output set. */
  id: string;
  /** Human-readable label shown in the editor. */
  label: string;
  /** The data type carried by this port. */
  type: PortType;
  /**
   * For input ports: whether a connection is mandatory for the app to be valid.
   * Ignored for output ports. Defaults to `true` when omitted.
   */
  required?: boolean;
}

/**
 * Allowed implicit coercions, keyed by source type. A source type is always
 * assignable to itself; this map adds the safe cross-type conversions.
 *
 * `table` <-> `recordList`: a table is rows-with-columns, a recordList is the
 * same rows without column metadata — convertible in both directions.
 * `image` -> `file`: an image is a kind of file.
 */
const COERCIONS: Partial<Record<PortType, readonly PortType[]>> = {
  table: ['recordList'],
  recordList: ['table'],
  image: ['file'],
};

/**
 * Whether a value of `from` can flow into a port expecting `to`.
 */
export function isAssignable(from: PortType, to: PortType): boolean {
  if (from === to) return true;
  return COERCIONS[from]?.includes(to) ?? false;
}
