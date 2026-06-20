import { describe, it, expect } from 'vitest';
import { MANIFEST_SCHEMA_VERSION, type AppManifest } from '@processfox/core';
import { injectManifest, serializeManifest, MANIFEST_PLACEHOLDER } from '../src/export/bundle.js';

const manifest: AppManifest = {
  id: 'app_x',
  name: 'Export-Test',
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  nodes: [{ instanceId: 'u', moduleId: 'xlsx-upload', moduleVersion: '1.0.0', config: {} }],
  edges: [],
  theme: { accent: '#2563eb' },
};

const template = `<html><body><script id="processfox-manifest" type="application/json">${MANIFEST_PLACEHOLDER}</script></body></html>`;

describe('static export', () => {
  it('injects a manifest that parses back to the original', () => {
    const html = injectManifest(template, manifest);
    const json = html.match(/application\/json">(.*?)<\/script>/s)![1]!;
    expect(JSON.parse(json)).toEqual(manifest);
  });

  it('escapes "<" so an embedded </script> cannot break out', () => {
    const evil: AppManifest = { ...manifest, name: 'pwn</script><script>alert(1)</script>' };
    const serialized = serializeManifest(evil);
    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c');
    // still valid JSON, round-trips to the original string
    expect((JSON.parse(serialized) as AppManifest).name).toBe(evil.name);
  });

  it('throws when the template lacks the placeholder', () => {
    expect(() => injectManifest('<html></html>', manifest)).toThrow(/placeholder/);
  });
});
