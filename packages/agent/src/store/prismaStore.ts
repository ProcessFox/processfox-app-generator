import type { AppManifest } from '@processfox/core';
import { AppNotFoundError, type SpecStore, type StoredApp } from './types.js';

/**
 * Postgres-backed SpecStore (production). Implements the same interface as the
 * file store. To keep the default build free of a generated Prisma client, the
 * client is imported lazily via a runtime-resolved specifier and typed
 * structurally. At deploy time run `prisma generate` + `prisma migrate deploy`.
 */

interface AppRow {
  id: string;
  name: string;
  latestVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal structural view of the generated client (just what we call). */
interface PrismaLike {
  app: {
    create(args: { data: Record<string, unknown> }): Promise<AppRow>;
    findUnique(args: { where: { id: string } }): Promise<AppRow | null>;
    findMany(args?: { orderBy?: unknown }): Promise<AppRow[]>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<AppRow>;
  };
  appVersion: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    findUnique(args: {
      where: { appId_version: { appId: string; version: number } };
    }): Promise<{ manifest: unknown } | null>;
    findMany(args: {
      where: { appId: string };
      select: { version: true };
      orderBy: { version: 'asc' };
    }): Promise<Array<{ version: number }>>;
  };
}

function toStoredApp(row: AppRow): StoredApp {
  return {
    id: row.id,
    name: row.name,
    latestVersion: row.latestVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaSpecStore implements SpecStore {
  private clientPromise: Promise<PrismaLike> | null = null;

  private client(): Promise<PrismaLike> {
    if (!this.clientPromise) {
      // Non-literal specifier so tsc does not require the (generated) client at
      // build time; resolved at runtime in production after `prisma generate`.
      const specifier = '@prisma' + '/client';
      this.clientPromise = import(specifier).then(
        (mod: { PrismaClient: new () => PrismaLike }) => new mod.PrismaClient(),
      );
    }
    return this.clientPromise;
  }

  async createApp(manifest: AppManifest, name?: string): Promise<{ id: string; version: number }> {
    const prisma = await this.client();
    const app = await prisma.app.create({
      data: {
        name: name ?? manifest.name,
        latestVersion: 1,
        versions: { create: { version: 1, manifest } },
      },
    });
    return { id: app.id, version: 1 };
  }

  async addVersion(id: string, manifest: AppManifest): Promise<{ id: string; version: number }> {
    const prisma = await this.client();
    const app = await prisma.app.findUnique({ where: { id } });
    if (!app) throw new AppNotFoundError(id);
    const version = app.latestVersion + 1;
    await prisma.appVersion.create({ data: { appId: id, version, manifest } });
    await prisma.app.update({ where: { id }, data: { latestVersion: version } });
    return { id, version };
  }

  async listApps(): Promise<StoredApp[]> {
    const prisma = await this.client();
    const apps = await prisma.app.findMany({ orderBy: { updatedAt: 'desc' } });
    return apps.map(toStoredApp);
  }

  async getApp(id: string): Promise<{ app: StoredApp; versions: number[] } | null> {
    const prisma = await this.client();
    const app = await prisma.app.findUnique({ where: { id } });
    if (!app) return null;
    const rows = await prisma.appVersion.findMany({
      where: { appId: id },
      select: { version: true },
      orderBy: { version: 'asc' },
    });
    return { app: toStoredApp(app), versions: rows.map((r) => r.version) };
  }

  async getVersion(id: string, version: number): Promise<AppManifest | null> {
    const prisma = await this.client();
    const row = await prisma.appVersion.findUnique({
      where: { appId_version: { appId: id, version } },
    });
    return row ? (row.manifest as AppManifest) : null;
  }
}
