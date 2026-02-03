import { describe, it, expect } from "vitest";
import { createTamper } from "@/clients/js/src/tamper";

describe("Biterate - Bit Stream Reading", () => {
  const Tamper = createTamper();

  describe("base64 decoding", () => {
    it("decodes base64 string", () => {
      // "Hello" in base64: SGVsbG8=
      const reader = Tamper.biterate("SGVsbG8=");
      expect(reader).toBeDefined();
    });

    it("handles empty string", () => {
      const reader = Tamper.biterate("");
      expect(reader.hasBits(1)).toBe(false);
    });

    it("handles single byte", () => {
      // Single byte 0xFF
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);
      expect(reader.hasBits(8)).toBe(true);
    });

    it("handles multiple bytes", () => {
      const base64 = Buffer.from([0xaa, 0xbb, 0xcc]).toString("base64");
      const reader = Tamper.biterate(base64);
      expect(reader.hasBits(24)).toBe(true);
    });
  });

  describe("readBit()", () => {
    it("reads single bit (1)", () => {
      // 0x80 = 10000000
      const base64 = Buffer.from([0x80]).toString("base64");
      const reader = Tamper.biterate(base64);
      expect(reader.readBit()).toBe(1);
    });

    it("reads single bit (0)", () => {
      // 0x00 = 00000000
      const base64 = Buffer.from([0x00]).toString("base64");
      const reader = Tamper.biterate(base64);
      expect(reader.readBit()).toBe(0);
    });

    it("reads multiple bits sequentially", () => {
      // 0xAA = 10101010
      const base64 = Buffer.from([0xaa]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readBit()).toBe(1);
      expect(reader.readBit()).toBe(0);
      expect(reader.readBit()).toBe(1);
      expect(reader.readBit()).toBe(0);
      expect(reader.readBit()).toBe(1);
      expect(reader.readBit()).toBe(0);
      expect(reader.readBit()).toBe(1);
      expect(reader.readBit()).toBe(0);
    });

    it("reads all ones", () => {
      // 0xFF = 11111111
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      for (let i = 0; i < 8; i++) {
        expect(reader.readBit()).toBe(1);
      }
    });

    it("reads all zeros", () => {
      // 0x00 = 00000000
      const base64 = Buffer.from([0x00]).toString("base64");
      const reader = Tamper.biterate(base64);

      for (let i = 0; i < 8; i++) {
        expect(reader.readBit()).toBe(0);
      }
    });
  });

  describe("byte boundary handling", () => {
    it("crosses byte boundary correctly", () => {
      // 0xFF 0x00 = 11111111 00000000
      const base64 = Buffer.from([0xff, 0x00]).toString("base64");
      const reader = Tamper.biterate(base64);

      // Read first 8 bits (all 1s)
      for (let i = 0; i < 8; i++) {
        expect(reader.readBit()).toBe(1);
      }

      // Read next 8 bits (all 0s)
      for (let i = 0; i < 8; i++) {
        expect(reader.readBit()).toBe(0);
      }
    });

    it("handles bit reads across boundary", () => {
      // 0xF0 0x0F = 11110000 00001111
      const base64 = Buffer.from([0xf0, 0x0f]).toString("base64");
      const reader = Tamper.biterate(base64);

      // Read 4 ones
      for (let i = 0; i < 4; i++) expect(reader.readBit()).toBe(1);
      // Read 4 zeros
      for (let i = 0; i < 4; i++) expect(reader.readBit()).toBe(0);
      // Cross boundary
      // Read 4 zeros
      for (let i = 0; i < 4; i++) expect(reader.readBit()).toBe(0);
      // Read 4 ones
      for (let i = 0; i < 4; i++) expect(reader.readBit()).toBe(1);
    });
  });

  describe("readBits()", () => {
    it("reads multiple bits as array", () => {
      // 0xAA = 10101010
      const base64 = Buffer.from([0xaa]).toString("base64");
      const reader = Tamper.biterate(base64);

      const bits = reader.readBits(4);
      expect(bits).toEqual([1, 0, 1, 0]);
    });

    it("reads 8 bits", () => {
      // 0xFF = 11111111
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      const bits = reader.readBits(8);
      expect(bits).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it("reads across byte boundary", () => {
      // 0xF0 0x0F
      const base64 = Buffer.from([0xf0, 0x0f]).toString("base64");
      const reader = Tamper.biterate(base64);

      const bits = reader.readBits(12);
      expect(bits).toEqual([1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("reads zero bits", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      const bits = reader.readBits(0);
      expect(bits).toEqual([]);
    });
  });

  describe("readNumber()", () => {
    it("reads 1-bit number", () => {
      // 0x80 = 10000000
      const base64 = Buffer.from([0x80]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(1)).toBe(1);
    });

    it("reads 2-bit number", () => {
      // 0xC0 = 11000000
      const base64 = Buffer.from([0xc0]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(2)).toBe(3); // 11 = 3
    });

    it("reads 4-bit number", () => {
      // 0xF0 = 11110000
      const base64 = Buffer.from([0xf0]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(4)).toBe(15); // 1111 = 15
    });

    it("reads 8-bit number", () => {
      // 0xAA = 10101010
      const base64 = Buffer.from([0xaa]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(8)).toBe(170); // 10101010 = 170
    });

    it("reads 32-bit number", () => {
      // 0x7F 0xFF 0xFF 0xFF (max positive 32-bit signed int)
      const base64 = Buffer.from([0x7f, 0xff, 0xff, 0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(32)).toBe(2147483647); // Max signed 32-bit int
    });

    it("reads 32-bit number with sign bit", () => {
      // 0xFF 0xFF 0xFF 0xFF (all bits set)
      // JavaScript bitwise ops return signed 32-bit, so this becomes -1
      const base64 = Buffer.from([0xff, 0xff, 0xff, 0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(32)).toBe(-1);
    });

    it("reads number across byte boundary", () => {
      // 0xF0 0x0F = 11110000 00001111
      const base64 = Buffer.from([0xf0, 0x0f]).toString("base64");
      const reader = Tamper.biterate(base64);

      // Skip first 4 bits
      reader.readBits(4);

      // Read 8 bits across boundary: 0000 0000
      expect(reader.readNumber(8)).toBe(0);
    });

    it("handles zero-bit read", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(0)).toBe(0);
    });
  });

  describe("readChunk()", () => {
    it("reads chunk of bits", () => {
      const base64 = Buffer.from([0xaa, 0xbb]).toString("base64");
      const reader = Tamper.biterate(base64);

      const chunk = reader.readChunk(8);
      expect(chunk.length).toBeGreaterThan(0);
    });

    it("returns empty for zero bits", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      const chunk = reader.readChunk(0);
      expect(chunk.length).toBe(0);
    });
  });

  describe("hasBits()", () => {
    it("returns true when bits available", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.hasBits(8)).toBe(true);
    });

    it("returns false when insufficient bits", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.hasBits(16)).toBe(false);
    });

    it("updates after reading bits", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.hasBits(8)).toBe(true);
      reader.readBits(8);
      expect(reader.hasBits(1)).toBe(false);
    });

    it("handles partial byte reads", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      reader.readBits(5);
      expect(reader.hasBits(3)).toBe(true);
      expect(reader.hasBits(4)).toBe(false);
    });
  });

  describe("bit masking correctness", () => {
    it("extracts MSB correctly", () => {
      // 0x80 = 10000000
      const base64 = Buffer.from([0x80]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readBit()).toBe(1);
      for (let i = 0; i < 7; i++) {
        expect(reader.readBit()).toBe(0);
      }
    });

    it("extracts LSB correctly", () => {
      // 0x01 = 00000001
      const base64 = Buffer.from([0x01]).toString("base64");
      const reader = Tamper.biterate(base64);

      for (let i = 0; i < 7; i++) {
        expect(reader.readBit()).toBe(0);
      }
      expect(reader.readBit()).toBe(1);
    });

    it("handles alternating bits", () => {
      // 0xAA = 10101010
      const base64 = Buffer.from([0xaa]).toString("base64");
      const reader = Tamper.biterate(base64);

      for (let i = 0; i < 8; i++) {
        expect(reader.readBit()).toBe(i % 2 === 0 ? 1 : 0);
      }
    });
  });

  describe("multi-byte patterns", () => {
    it("reads sequential bytes correctly", () => {
      const base64 = Buffer.from([0x01, 0x02, 0x03]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(8)).toBe(1);
      expect(reader.readNumber(8)).toBe(2);
      expect(reader.readNumber(8)).toBe(3);
    });

    it("handles complex pattern", () => {
      // Pattern: 11110000 10101010 00001111
      const base64 = Buffer.from([0xf0, 0xaa, 0x0f]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(reader.readNumber(4)).toBe(15); // 1111
      expect(reader.readNumber(4)).toBe(0); // 0000
      expect(reader.readNumber(8)).toBe(170); // 10101010
      expect(reader.readNumber(8)).toBe(15); // 00001111
    });
  });

  describe("error conditions", () => {
    it("throws when readBit exceeds available bits", () => {
      const reader = Tamper.biterate("");
      expect(() => reader.readBit()).toThrow(/Improperly formatted bit array/);
    });

    it("throws when readBits exceeds available bits", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      expect(() => reader.readBits(16)).toThrow(/Improperly formatted bit array/);
    });

    it("throws when readNumber exceeds available bits", () => {
      const reader = Tamper.biterate("");
      expect(() => reader.readNumber(1)).toThrow(/Improperly formatted bit array/);
    });

    it("handles reading past buffer end", () => {
      const base64 = Buffer.from([0xff]).toString("base64");
      const reader = Tamper.biterate(base64);

      reader.readBits(8);
      // Attempting to read more should fail gracefully
      expect(reader.hasBits(1)).toBe(false);
    });

    it("handles empty buffer", () => {
      const reader = Tamper.biterate("");
      expect(reader.hasBits(1)).toBe(false);
    });
  });
});
