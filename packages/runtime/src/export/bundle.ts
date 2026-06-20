// The export logic is framework-agnostic and lives in @processfox/core so the
// backend can use it too. Re-exported here for the runtime's local imports.
export { MANIFEST_PLACEHOLDER, serializeManifest, injectManifest } from '@processfox/core';
