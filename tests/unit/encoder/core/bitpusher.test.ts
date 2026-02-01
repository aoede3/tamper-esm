import { describe, it, expect, beforeEach } from "vitest";
import createEncoder from "../../../../encoders/js/core/createEncoder";
import nodeEnv from "../../../../encoders/js/env/node";

describe("Bitpusher", () => {
  let Bitpusher: any;

  beforeEach(() => {
    const encoder = createEncoder(nodeEnv);
    Bitpusher = encoder.Bitpusher;
  });

  describe("initialization", () => {
    it("starts with empty state", () => {
      const bp = new Bitpusher();
      expect(bp.length).toBe(0);
      expect(bp.capacity).toBe(8);
      expect(bp.isEmpty()).toBe(true);
    });
  });

  describe("push()", () => {
    it("pushes single bit (1)", () => {
      const bp = new Bitpusher();
      bp.push(1);
      expect(bp.length).toBe(1);
      expect(bp.isEmpty()).toBe(false);
    });

    it("pushes single bit (0)", () => {
      const bp = new Bitpusher();
      bp.push(0);
      expect(bp.length).toBe(1);
    });

    it("pushes boolean true as 1", () => {
      const bp = new Bitpusher();
      bp.push(true);
      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0x80); // 10000000
    });

    it("pushes boolean false as 0", () => {
      const bp = new Bitpusher();
      bp.push(false);
      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0x00);
    });

    it("pushes multiple bits correctly", () => {
      const bp = new Bitpusher();
      bp.push(1);
      bp.push(0);
      bp.push(1);
      bp.push(0);
      bp.push(1);
      bp.push(0);
      bp.push(1);
      bp.push(0);

      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0xaa); // 10101010
    });

    it("pushes all ones correctly", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 8; i++) bp.push(1);

      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0xff);
    });

    it("pushes all zeros correctly", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 8; i++) bp.push(0);

      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0x00);
    });
  });

  describe("capacity doubling", () => {
    it("doubles capacity when exceeded", () => {
      const bp = new Bitpusher();
      expect(bp.capacity).toBe(8);

      // Capacity doubles eagerly when length >= capacity
      for (let i = 0; i < 8; i++) bp.push(1);
      expect(bp.capacity).toBe(16); // Already doubled

      bp.push(1);
      expect(bp.capacity).toBe(16); // Still 16
    });

    it("continues doubling as needed", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 17; i++) bp.push(1);
      expect(bp.capacity).toBe(32);
    });

    it("maintains data when doubling", () => {
      const bp = new Bitpusher();
      // Push known pattern
      for (let i = 0; i < 8; i++) bp.push(1);
      const before = bp.getBuffer()[0];

      // Trigger doubling
      bp.push(1);

      // Original data should be preserved
      const after = bp.getBuffer()[0];
      expect(after).toBe(before);
    });
  });

  describe("pushMany()", () => {
    it("pushes multiple bits at once", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 5);
      expect(bp.length).toBe(5);
    });

    it("pushes many zeros", () => {
      const bp = new Bitpusher();
      bp.pushMany(0, 8);
      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0x00);
    });

    it("pushes many ones", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 8);
      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0xff);
    });

    it("handles zero count", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 0);
      expect(bp.length).toBe(0);
    });

    it("handles negative count", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, -5);
      expect(bp.length).toBe(0);
    });

    it("triggers capacity expansion", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 20);
      expect(bp.capacity).toBeGreaterThanOrEqual(20);
    });
  });

  describe("byte boundaries", () => {
    it("handles exactly 8 bits", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 8; i++) bp.push(1);

      expect(bp.length).toBe(8);
      expect(bp.getBuffer().length).toBe(1);
    });

    it("handles 9 bits (crosses boundary)", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 9; i++) bp.push(1);

      expect(bp.length).toBe(9);
      expect(bp.getBuffer().length).toBe(2);
      expect(bp.getBuffer()[0]).toBe(0xff);
      expect(bp.getBuffer()[1]).toBe(0x80);
    });

    it("handles 16 bits exactly", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 16; i++) bp.push(1);

      expect(bp.length).toBe(16);
      expect(bp.getBuffer().length).toBe(2);
    });

    it("handles odd bit counts", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 5; i++) bp.push(1);

      const buffer = bp.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0]).toBe(0xf8); // 11111000
    });
  });

  describe("slice()", () => {
    it("slices bits from beginning", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 16; i++) bp.push(i % 2);

      const sliced = bp.slice(0, 8);
      expect(sliced.length).toBe(8);
    });

    it("slices bits from middle", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 16; i++) bp.push(1);

      const sliced = bp.slice(4, 12);
      expect(sliced.length).toBe(8);
    });

    it("slices at byte boundary", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 16; i++) bp.push(1);

      const sliced = bp.slice(8, 16);
      expect(sliced.length).toBe(8);
      expect(sliced.getBuffer()[0]).toBe(0xff);
    });

    it("handles empty slice", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 8);

      const sliced = bp.slice(4, 4);
      expect(sliced.length).toBe(0);
    });

    it("handles end before begin", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 8);

      const sliced = bp.slice(6, 2);
      // Slice with end < begin creates negative length
      expect(sliced.length).toBeLessThan(0);
    });
  });

  describe("getBuffer()", () => {
    it("returns correct buffer size for full bytes", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 16);
      const buffer = bp.getBuffer();
      expect(buffer.length).toBe(2);
    });

    it("returns correct buffer for partial byte", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 5);
      const buffer = bp.getBuffer();
      expect(buffer.length).toBe(1);
    });

    it("returns empty buffer for empty bitpusher", () => {
      const bp = new Bitpusher();
      const buffer = bp.getBuffer();
      expect(buffer.length).toBe(0);
    });
  });

  describe("clear()", () => {
    it("resets to initial state", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 20);

      bp.clear();

      expect(bp.length).toBe(0);
      expect(bp.capacity).toBe(8);
      expect(bp.isEmpty()).toBe(true);
    });

    it("can push after clear", () => {
      const bp = new Bitpusher();
      bp.pushMany(1, 20);
      bp.clear();
      bp.push(1);

      expect(bp.length).toBe(1);
    });
  });

  describe("isEmpty()", () => {
    it("returns true for new bitpusher", () => {
      const bp = new Bitpusher();
      expect(bp.isEmpty()).toBe(true);
    });

    it("returns false after pushing", () => {
      const bp = new Bitpusher();
      bp.push(1);
      expect(bp.isEmpty()).toBe(false);
    });

    it("returns true after clear", () => {
      const bp = new Bitpusher();
      bp.push(1);
      bp.clear();
      expect(bp.isEmpty()).toBe(true);
    });
  });

  describe("complex patterns", () => {
    it("encodes alternating bit pattern correctly", () => {
      const bp = new Bitpusher();
      for (let i = 0; i < 16; i++) {
        bp.push(i % 2);
      }

      const buffer = bp.getBuffer();
      // Pattern 01010101 = 0x55 (starts with 0)
      expect(buffer[0]).toBe(0x55);
      expect(buffer[1]).toBe(0x55);
    });

    it("encodes checkerboard pattern", () => {
      const bp = new Bitpusher();
      bp.push(1);
      bp.push(1);
      bp.push(0);
      bp.push(0);
      bp.push(1);
      bp.push(1);
      bp.push(0);
      bp.push(0);

      const buffer = bp.getBuffer();
      expect(buffer[0]).toBe(0xcc); // 11001100
    });
  });
});
