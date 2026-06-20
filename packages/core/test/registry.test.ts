import { describe, it, expect } from 'vitest';
import { ModuleRegistry, builtinModules, xlsxUpload } from '../src/index.js';

describe('ModuleRegistry', () => {
  it('registers and retrieves built-in modules', () => {
    const reg = new ModuleRegistry(builtinModules);
    expect(reg.has('xlsx-upload')).toBe(true);
    expect(reg.get('docx-template')?.category).toBe('output');
    expect(reg.list()).toHaveLength(builtinModules.length);
  });

  it('throws on duplicate registration', () => {
    const reg = new ModuleRegistry([xlsxUpload]);
    expect(() => reg.register(xlsxUpload)).toThrow(/already registered/);
  });

  it('getOrThrow throws for unknown id', () => {
    const reg = new ModuleRegistry();
    expect(() => reg.getOrThrow('nope')).toThrow(/Unknown module/);
  });

  it('catalog exposes only the agent-facing fields', () => {
    const reg = new ModuleRegistry(builtinModules);
    const entry = reg.catalog().find((m) => m.id === 'xlsx-upload')!;
    expect(Object.keys(entry).sort()).toEqual(
      ['category', 'description', 'id', 'title', 'version'].sort(),
    );
  });
});
