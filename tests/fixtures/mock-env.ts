/**
 * Environment mocking utilities for cross-environment testing
 */

import { vi } from "vitest";

/**
 * Mock browser environment APIs
 */
export function mockBrowserEnv() {
  // Mock btoa
  if (!global.btoa) {
    global.btoa = vi.fn((str: string) => {
      if (typeof Buffer !== "undefined") {
        return Buffer.from(str, "binary").toString("base64");
      }
      throw new Error("No base64 encoder available");
    });
  }

  // Mock atob
  if (!global.atob) {
    global.atob = vi.fn((str: string) => {
      if (typeof Buffer !== "undefined") {
        return Buffer.from(str, "base64").toString("binary");
      }
      throw new Error("No base64 decoder available");
    });
  }

  return () => {
    // Cleanup if needed
  };
}

/**
 * Mock absence of browser APIs to test fallbacks
 */
export function mockNoBrowserAPIs() {
  const originalAtob = (global as any).atob;
  const originalBtoa = (global as any).btoa;

  delete (global as any).atob;
  delete (global as any).btoa;

  return () => {
    if (originalAtob) (global as any).atob = originalAtob;
    if (originalBtoa) (global as any).btoa = originalBtoa;
  };
}

/**
 * Create a spy environment for tracking calls
 */
export function createSpyEnv() {
  return {
    createBuffer: vi.fn((length: number) => Buffer.alloc(length)),
    writeUInt32BE: vi.fn((buffer: any, value: number, offset: number) =>
      buffer.writeUInt32BE(value, offset),
    ),
    writeUInt8: vi.fn((buffer: any, value: number, offset: number) =>
      buffer.writeUInt8(value, offset),
    ),
    concatBuffers: vi.fn((chunks: any[]) => Buffer.concat(chunks)),
    toBase64: vi.fn((buffer: any) => buffer.toString("base64")),
    createBitset: vi.fn((size: number) => {
      // Return a mock bitset
      return {
        length: size,
        bytes: Buffer.alloc(Math.ceil(size / 8)),
        set: vi.fn(),
        setSize: vi.fn(),
        slice: vi.fn(),
        getBuffer: vi.fn(() => Buffer.alloc(1)),
      };
    }),
  };
}

/**
 * Helper to verify base64 encoding/decoding
 */
export function verifyBase64Roundtrip(data: Uint8Array): boolean {
  const base64 = Buffer.from(data).toString("base64");
  const decoded = Buffer.from(base64, "base64");
  return (
    decoded.length === data.length &&
    decoded.every((byte, i) => byte === data[i])
  );
}
