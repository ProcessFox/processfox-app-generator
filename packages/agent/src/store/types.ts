import type { AppManifest } from '@processfox/core';

/** Metadata about a stored app (without the manifest bodies). */
export interface StoredApp {
  id: string;
  name: string;
  latestVersion: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Persistence for app specs with immutable versioning. Each save creates a new
 * version; old versions are never mutated. The file-backed implementation works
 * today; a Prisma/Postgres implementation can satisfy the same interface in M5.
 */
export interface SpecStore {
  /** Create a new app from a manifest; returns its id and version (1). */
  createApp(manifest: AppManifest, name?: string): Promise<{ id: string; version: number }>;
  /** Append a new immutable version to an existing app. */
  addVersion(id: string, manifest: AppManifest): Promise<{ id: string; version: number }>;
  /** List all apps (metadata only). */
  listApps(): Promise<StoredApp[]>;
  /** Get one app's metadata + the list of available version numbers. */
  getApp(id: string): Promise<{ app: StoredApp; versions: number[] } | null>;
  /** Load a specific manifest version. */
  getVersion(id: string, version: number): Promise<AppManifest | null>;
}

export class AppNotFoundError extends Error {
  constructor(id: string) {
    super(`App "${id}" not found`);
    this.name = 'AppNotFoundError';
  }
}
