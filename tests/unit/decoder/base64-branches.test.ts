import { describe, it, expect, vi } from 'vitest';

const loadTamper = async () => {
  vi.resetModules();
  return import('@/clients/js/src/tamper');
};

describe('Tamper base64 decoder selection', () => {
  it('uses atob when available', async () => {
    let called = 0;

    vi.stubGlobal('atob', (value: string) => {
      called += 1;
      return 'A';
    });

    try {
      const { createTamper } = await loadTamper();
      const reader = createTamper().biterate('QQ==');
      expect(called).toBe(1);
      expect(reader.hasBits(8)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses Buffer when atob is unavailable', async () => {
    vi.stubGlobal('atob', undefined as unknown as typeof globalThis.atob);

    try {
      const { createTamper } = await loadTamper();
      const reader = createTamper().biterate('QQ==');
      expect(reader.hasBits(8)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // Note: Testing "no base64 decoder" path is not possible in vitest/Node.js
  // because vitest internals depend on Buffer. The code IS reachable in real
  // browsers without atob/Buffer polyfill - covered by c8 ignore comment in source.
});
