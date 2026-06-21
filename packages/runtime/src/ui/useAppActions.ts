import { useState } from 'react';
import { saveAs } from 'file-saver';
import { injectManifest, type AppManifest } from '@processfox/core';

/**
 * Shared "save version" + "download standalone" actions for a manifest, used by
 * both the demo workbench and the generated-app workspace. Mechanics are locked;
 * these only persist/export the given (themed) manifest.
 */
export function useAppActions(manifest: AppManifest, themed: AppManifest) {
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * Client-side export: fetch the single-file player template served by the
   * frontend (/player.html), inject the current (themed) manifest, download it.
   * Fully in-browser — no backend involved.
   */
  async function downloadStandalone() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch('/player.html', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Player-Vorlage nicht erreichbar (HTTP ${res.status})`);
      const html = injectManifest(await res.text(), themed);
      const name = (manifest.name || 'app').replace(/[^\w.-]+/g, '_').slice(0, 60);
      saveAs(new Blob([html], { type: 'text/html;charset=utf-8' }), `${name}.html`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: manifest.name, manifest: themed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        version?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Serverfehler (HTTP ${res.status})`);
      setSaveStatus(`Gespeichert als ${data.id} · Version ${data.version}`);
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return { saving, saveStatus, save, exporting, exportError, downloadStandalone };
}
