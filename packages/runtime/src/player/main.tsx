import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { type AppManifest } from '@processfox/core';
import { StandalonePlayer } from './StandalonePlayer.js';
import { MANIFEST_PLACEHOLDER } from '../export/bundle.js';
import { referenceManifest } from '../manifest/reference.js';
import '../index.css';

/**
 * Boots the standalone player. The manifest is read from an inlined
 * <script id="processfox-manifest"> tag (filled at export time). In dev — or in
 * the un-exported template — the placeholder is still present, so we fall back
 * to the reference manifest.
 */
function loadManifest(): AppManifest {
  const el = document.getElementById('processfox-manifest');
  const text = el?.textContent?.trim();
  if (text && text !== MANIFEST_PLACEHOLDER) {
    try {
      return JSON.parse(text) as AppManifest;
    } catch {
      // fall through to the dev fallback
    }
  }
  return referenceManifest();
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <StandalonePlayer manifest={loadManifest()} />
  </StrictMode>,
);
