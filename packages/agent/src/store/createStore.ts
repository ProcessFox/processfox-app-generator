import { FileSpecStore } from './fileStore.js';
import { PrismaSpecStore } from './prismaStore.js';
import type { SpecStore } from './types.js';

/**
 * Pick the persistence backend from the environment:
 * - DATABASE_URL set  -> Postgres via Prisma (production)
 * - otherwise         -> file store under PROCESSFOX_DATA_DIR (default, dev/V1)
 */
export function createStore(): SpecStore {
  if (process.env.DATABASE_URL) return new PrismaSpecStore();
  return new FileSpecStore(process.env.PROCESSFOX_DATA_DIR ?? '.processfox-data');
}
