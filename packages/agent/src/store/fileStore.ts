import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppManifest } from '@processfox/core';
import { AppNotFoundError, type SpecStore, type StoredApp } from './types.js';

/**
 * File-backed SpecStore. Layout:
 *   <dataDir>/<appId>/meta.json
 *   <dataDir>/<appId>/v1.json, v2.json, ...   (immutable manifest versions)
 */
export class FileSpecStore implements SpecStore {
  constructor(private readonly dataDir: string) {}

  private appDir(id: string): string {
    return join(this.dataDir, id);
  }

  private newId(): string {
    return `app_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  private async readMeta(id: string): Promise<StoredApp | null> {
    try {
      return JSON.parse(await readFile(join(this.appDir(id), 'meta.json'), 'utf8')) as StoredApp;
    } catch {
      return null;
    }
  }

  async createApp(manifest: AppManifest, name?: string): Promise<{ id: string; version: number }> {
    const id = this.newId();
    const now = new Date().toISOString();
    const meta: StoredApp = {
      id,
      name: name ?? manifest.name,
      latestVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    await mkdir(this.appDir(id), { recursive: true });
    await writeFile(join(this.appDir(id), 'v1.json'), JSON.stringify(manifest, null, 2));
    await writeFile(join(this.appDir(id), 'meta.json'), JSON.stringify(meta, null, 2));
    return { id, version: 1 };
  }

  async addVersion(id: string, manifest: AppManifest): Promise<{ id: string; version: number }> {
    const meta = await this.readMeta(id);
    if (!meta) throw new AppNotFoundError(id);
    const version = meta.latestVersion + 1;
    await writeFile(join(this.appDir(id), `v${version}.json`), JSON.stringify(manifest, null, 2));
    const updated: StoredApp = { ...meta, latestVersion: version, updatedAt: new Date().toISOString() };
    await writeFile(join(this.appDir(id), 'meta.json'), JSON.stringify(updated, null, 2));
    return { id, version };
  }

  async listApps(): Promise<StoredApp[]> {
    let entries: string[];
    try {
      entries = await readdir(this.dataDir);
    } catch {
      return [];
    }
    const apps: StoredApp[] = [];
    for (const entry of entries) {
      const meta = await this.readMeta(entry);
      if (meta) apps.push(meta);
    }
    return apps.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getApp(id: string): Promise<{ app: StoredApp; versions: number[] } | null> {
    const meta = await this.readMeta(id);
    if (!meta) return null;
    const files = await readdir(this.appDir(id));
    const versions = files
      .map((f) => /^v(\d+)\.json$/.exec(f)?.[1])
      .filter((v): v is string => v !== undefined)
      .map(Number)
      .sort((a, b) => a - b);
    return { app: meta, versions };
  }

  async getVersion(id: string, version: number): Promise<AppManifest | null> {
    try {
      const raw = await readFile(join(this.appDir(id), `v${version}.json`), 'utf8');
      return JSON.parse(raw) as AppManifest;
    } catch {
      return null;
    }
  }
}
