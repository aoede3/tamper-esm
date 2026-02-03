import { describe, it, expect, beforeEach, vi } from "vitest";
import { Buffer as NodeBuffer } from "buffer";
import browserEnv from "@/encoders/js/env/browser";

describe("Browser Environment Adapter", () => {
  describe("createBuffer()", () => {
    it("creates Uint8Array of specified length", () => {
      const buffer = browserEnv.createBuffer(10);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBe(10);
    });

    it("creates empty buffer", () => {
      const buffer = browserEnv.createBuffer(0);
      expect(buffer.length).toBe(0);
    });

    it("creates large buffer", () => {
      const buffer = browserEnv.createBuffer(1000);
      expect(buffer.length).toBe(1000);
    });
  });

  describe("writeUInt32BE()", () => {
    it("writes 32-bit big-endian integer", () => {
      const buffer = browserEnv.createBuffer(4);
      browserEnv.writeUInt32BE(buffer, 0x12345678, 0);

      expect(buffer[0]).toBe(0x12);
      expect(buffer[1]).toBe(0x34);
      expect(buffer[2]).toBe(0x56);
      expect(buffer[3]).toBe(0x78);
    });

    it("writes at offset", () => {
      const buffer = browserEnv.createBuffer(8);
      browserEnv.writeUInt32BE(buffer, 0xaabbccdd, 4);

      expect(buffer[4]).toBe(0xaa);
      expect(buffer[5]).toBe(0xbb);
      expect(buffer[6]).toBe(0xcc);
      expect(buffer[7]).toBe(0xdd);
    });

    it("writes max value", () => {
      const buffer = browserEnv.createBuffer(4);
      browserEnv.writeUInt32BE(buffer, 0xffffffff, 0);

      expect(buffer[0]).toBe(0xff);
      expect(buffer[1]).toBe(0xff);
      expect(buffer[2]).toBe(0xff);
      expect(buffer[3]).toBe(0xff);
    });

    it("writes zero", () => {
      const buffer = browserEnv.createBuffer(4);
      browserEnv.writeUInt32BE(buffer, 0, 0);

      expect(buffer[0]).toBe(0);
      expect(buffer[1]).toBe(0);
      expect(buffer[2]).toBe(0);
      expect(buffer[3]).toBe(0);
    });
  });

  describe("writeUInt8()", () => {
    it("writes 8-bit integer", () => {
      const buffer = browserEnv.createBuffer(4);
      browserEnv.writeUInt8(buffer, 0x42, 0);

      expect(buffer[0]).toBe(0x42);
    });

    it("writes at offset", () => {
      const buffer = browserEnv.createBuffer(4);
      browserEnv.writeUInt8(buffer, 0xff, 3);

      expect(buffer[3]).toBe(0xff);
    });

    it("masks to 8 bits", () => {
      const buffer = browserEnv.createBuffer(4);
      browserEnv.writeUInt8(buffer, 0x1ff, 0);

      expect(buffer[0]).toBe(0xff);
    });
  });

  describe("concatBuffers()", () => {
    it("concatenates multiple buffers", () => {
      const b1 = new Uint8Array([1, 2]);
      const b2 = new Uint8Array([3, 4]);
      const b3 = new Uint8Array([5, 6]);

      const result = browserEnv.concatBuffers([b1, b2, b3]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it("handles empty array", () => {
      const result = browserEnv.concatBuffers([]);
      expect(result.length).toBe(0);
    });

    it("handles single buffer", () => {
      const b1 = new Uint8Array([1, 2, 3]);
      const result = browserEnv.concatBuffers([b1]);

      expect(result).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("handles empty buffers", () => {
      const b1 = new Uint8Array([]);
      const b2 = new Uint8Array([1, 2]);
      const b3 = new Uint8Array([]);

      const result = browserEnv.concatBuffers([b1, b2, b3]);

      expect(result).toEqual(new Uint8Array([1, 2]));
    });
  });

  describe("toBase64()", () => {
    it("encodes bytes to base64 using btoa when Buffer is unavailable", () => {
      const originalBuffer = (globalThis as { Buffer?: unknown }).Buffer;
      const originalBtoa = (globalThis as { btoa?: (value: string) => string }).btoa;

      try {
        (globalThis as { Buffer?: unknown }).Buffer = undefined;
        (globalThis as { btoa?: (value: string) => string }).btoa = (value: string) =>
          NodeBuffer.from(value, "binary").toString("base64");

        const bytes = new Uint8Array([72, 101, 108, 108, 111]);
        const result = browserEnv.toBase64(bytes);
        expect(result).toBe("SGVsbG8=");
      } finally {
        if (originalBuffer === undefined) {
          delete (globalThis as { Buffer?: unknown }).Buffer;
        } else {
          (globalThis as { Buffer?: unknown }).Buffer = originalBuffer;
        }
        if (originalBtoa === undefined) {
          delete (globalThis as { btoa?: (value: string) => string }).btoa;
        } else {
          (globalThis as { btoa?: (value: string) => string }).btoa = originalBtoa;
        }
      }
    });

    it("throws when no base64 encoder is available", () => {
      const originalBuffer = (globalThis as { Buffer?: unknown }).Buffer;
      const originalBtoa = (globalThis as { btoa?: (value: string) => string }).btoa;

      try {
        (globalThis as { Buffer?: unknown }).Buffer = undefined;
        delete (globalThis as { btoa?: (value: string) => string }).btoa;

        const bytes = new Uint8Array([1, 2, 3]);
        expect(() => browserEnv.toBase64(bytes)).toThrow(/No base64 encoder available/);
      } finally {
        if (originalBuffer === undefined) {
          delete (globalThis as { Buffer?: unknown }).Buffer;
        } else {
          (globalThis as { Buffer?: unknown }).Buffer = originalBuffer;
        }
        if (originalBtoa === undefined) {
          delete (globalThis as { btoa?: (value: string) => string }).btoa;
        } else {
          (globalThis as { btoa?: (value: string) => string }).btoa = originalBtoa;
        }
      }
    });

    it("encodes bytes to base64 using Buffer", () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = browserEnv.toBase64(bytes);

      expect(result).toBe("SGVsbG8=");
    });

    it("handles empty buffer", () => {
      const bytes = new Uint8Array([]);
      const result = browserEnv.toBase64(bytes);

      expect(result).toBeUndefined();
    });

    it("handles null/undefined", () => {
      expect(browserEnv.toBase64(null as any)).toBeUndefined();
      expect(browserEnv.toBase64(undefined as any)).toBeUndefined();
    });

    it("encodes large buffer in chunks", () => {
      const bytes = new Uint8Array(100000);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = i % 256;
      }

      const result = browserEnv.toBase64(bytes);
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });

  describe("BitsyLite", () => {
    describe("constructor", () => {
      it("creates bitset of specified size", () => {
        const bitset = browserEnv.createBitset(16);
        expect(bitset.length).toBe(16);
        expect(bitset.bytes.length).toBe(2); // 16 bits = 2 bytes
      });

      it("handles non-byte-aligned size", () => {
        const bitset = browserEnv.createBitset(10);
        expect(bitset.length).toBe(10);
        expect(bitset.bytes.length).toBe(2); // ceil(10/8) = 2
      });
    });

    describe("set()", () => {
      it("sets bit to 1", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.set(0, true);

        expect(bitset.bytes[0]).toBe(0x80); // 10000000
      });

      it("sets bit to 0", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.bytes[0] = 0xff;
        bitset.set(0, false);

        expect(bitset.bytes[0]).toBe(0x7f); // 01111111
      });

      it("sets multiple bits", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.set(0, true);
        bitset.set(2, true);
        bitset.set(4, true);
        bitset.set(6, true);

        expect(bitset.bytes[0]).toBe(0xaa); // 10101010
      });

      it("sets bits across byte boundary", () => {
        const bitset = browserEnv.createBitset(16);
        bitset.set(7, true);
        bitset.set(8, true);

        expect(bitset.bytes[0]).toBe(0x01); // 00000001
        expect(bitset.bytes[1]).toBe(0x80); // 10000000
      });
    });

    describe("setSize()", () => {
      it("expands bitset size", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.set(0, true);

        bitset.setSize(16);

        expect(bitset.length).toBe(16);
        expect(bitset.bytes.length).toBe(2);
        expect(bitset.bytes[0]).toBe(0x80); // Original bit preserved
      });

      it("preserves existing bits when expanding", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.bytes[0] = 0xaa;

        bitset.setSize(16);

        expect(bitset.bytes[0]).toBe(0xaa);
      });

      it("does nothing if new size is smaller", () => {
        const bitset = browserEnv.createBitset(16);
        bitset.bytes[0] = 0xff;

        bitset.setSize(8);

        expect(bitset.length).toBe(16); // Unchanged
        expect(bitset.bytes[0]).toBe(0xff);
      });

      it("does nothing if size is equal", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.bytes[0] = 0xff;

        bitset.setSize(8);

        expect(bitset.length).toBe(8);
        expect(bitset.bytes[0]).toBe(0xff);
      });
    });

    describe("slice()", () => {
      it("handles shifted slice within one byte", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.bytes[0] = 0b11110000;

        const sliced = bitset.slice(1, 8);

        expect(sliced.length).toBe(7);
        expect(sliced.bytes.length).toBe(1);
      });

      it("slices byte-aligned section", () => {
        const bitset = browserEnv.createBitset(16);
        bitset.bytes[0] = 0xaa;
        bitset.bytes[1] = 0xbb;

        const sliced = bitset.slice(0, 8);

        expect(sliced.length).toBe(8);
        expect(sliced.bytes[0]).toBe(0xaa);
      });

      it("slices with byte-aligned begin and length", () => {
        const bitset = browserEnv.createBitset(24);
        bitset.bytes[0] = 0x11;
        bitset.bytes[1] = 0x22;
        bitset.bytes[2] = 0x33;

        const sliced = bitset.slice(8, 16);

        expect(sliced.length).toBe(8);
        expect(sliced.bytes[0]).toBe(0x22);
      });

      it("slices non-aligned section with shifting", () => {
        const bitset = browserEnv.createBitset(16);
        bitset.bytes[0] = 0xff; // 11111111
        bitset.bytes[1] = 0x00; // 00000000

        const sliced = bitset.slice(4, 12); // Middle 8 bits

        expect(sliced.length).toBe(8);
        expect(sliced.bytes[0]).toBe(0xf0); // 11110000
      });

      it("handles slice with begin byte-aligned", () => {
        const bitset = browserEnv.createBitset(24);
        bitset.bytes[0] = 0x11;
        bitset.bytes[1] = 0x22;
        bitset.bytes[2] = 0x33;

        const sliced = bitset.slice(8, 20);

        expect(sliced.length).toBe(12);
        expect(sliced.bytes[0]).toBe(0x22);
      });

      it("handles empty slice", () => {
        const bitset = browserEnv.createBitset(16);
        const sliced = bitset.slice(5, 5);

        expect(sliced.length).toBe(0);
      });

      it("handles negative length (end < begin)", () => {
        const bitset = browserEnv.createBitset(16);
        const sliced = bitset.slice(10, 5);

        expect(sliced.length).toBe(0);
      });

      it("slices with bit shifting across multiple bytes", () => {
        const bitset = browserEnv.createBitset(32);
        bitset.bytes[0] = 0xaa; // 10101010
        bitset.bytes[1] = 0xbb; // 10111011
        bitset.bytes[2] = 0xcc; // 11001100

        const sliced = bitset.slice(4, 20);

        expect(sliced.length).toBe(16);
        // Should shift and combine bits correctly
        expect(sliced.bytes.length).toBe(2);
      });

      it("handles last byte in shifted slice", () => {
        const bitset = browserEnv.createBitset(24);
        bitset.bytes[0] = 0xff;
        bitset.bytes[1] = 0xff;
        bitset.bytes[2] = 0xff;

        const sliced = bitset.slice(4, 20);

        expect(sliced.length).toBe(16);
        expect(sliced.bytes.length).toBe(2);
      });
    });

    describe("getBuffer()", () => {
      it("returns underlying Uint8Array", () => {
        const bitset = browserEnv.createBitset(8);
        bitset.bytes[0] = 0x42;

        const buffer = bitset.getBuffer();

        expect(buffer).toBeInstanceOf(Uint8Array);
        expect(buffer[0]).toBe(0x42);
      });
    });
  });
});
