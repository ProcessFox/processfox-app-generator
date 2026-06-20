/**
 * @processfox/core — framework-agnostic foundation for ProcessFox.
 *
 * Exposes the module contract, the port type system, the app manifest shape, the
 * registry and the manifest validator. No DOM/React dependency: usable by the
 * backend KI agent and testable in plain Node.
 */

export * from './ports.js';
export * from './module.js';
export * from './theme.js';
export * from './manifest.js';
export * from './registry.js';
export * from './validator.js';
export * from './export.js';
export * from './modules/index.js';
