import type { AppManifest } from './manifest.js';

/**
 * Static single-file export (pure, framework-agnostic — lives in core so both the
 * runtime and the backend export endpoint can use it).
 *
 * The player is built once into a single self-contained HTML file (all JS/CSS
 * inlined) with a placeholder manifest tag. Exporting a specific app = injecting
 * that app's manifest into the template. The result is one .html the end user
 * opens locally (file://) — no server, no rebuild.
 */

export const MANIFEST_PLACEHOLDER = '__PROCESSFOX_MANIFEST__';

// U+2028 / U+2029 are valid in JSON but break inline <script> JS parsing.
// Constructed via char codes so there are no raw separator chars in source.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

// Targets the manifest <script> tag specifically. The placeholder string also
// appears inside the inlined JS bundle, so we must not blindly replace the first
// occurrence — we replace the contents of the manifest tag by its id.
const MANIFEST_TAG = /(<script id="processfox-manifest"[^>]*>)([\s\S]*?)(<\/script>)/;

/**
 * Serialize a manifest for safe embedding inside a
 * `<script type="application/json">` tag: escape `<` (prevents `</script>`
 * breaking out) and the line/paragraph separators. Still valid JSON.
 */
export function serializeManifest(manifest: AppManifest): string {
  return JSON.stringify(manifest)
    .replace(/</g, '\\u003c')
    .split(LINE_SEPARATOR)
    .join('\\u2028')
    .split(PARAGRAPH_SEPARATOR)
    .join('\\u2029');
}

/**
 * Inject a manifest into the prebuilt single-file player template, returning the
 * final self-contained HTML for one exported app.
 */
export function injectManifest(template: string, manifest: AppManifest): string {
  if (!MANIFEST_TAG.test(template)) {
    throw new Error('Player template is missing the #processfox-manifest placeholder tag');
  }
  const serialized = serializeManifest(manifest);
  // Function replacement avoids `$&`/`$1` special handling in the replacement.
  return template.replace(
    MANIFEST_TAG,
    (_match, open: string, _content, close: string) => `${open}${serialized}${close}`,
  );
}
