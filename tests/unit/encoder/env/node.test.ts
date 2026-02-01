import { describe, it, expect } from "vitest";
import nodeEnv from "@/encoders/js/env/node";
import Bitsy from "@/vendor/bitsy";

describe("Node Environment Adapter", () => {
  describe("createBuffer()", () => {
    it("creates Buffer of specified length", () => {
      const buffer = nodeEnv.createBuffer(10);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(10);
    });

    it("creates empty buffer", () => {
      const buffer = nodeEnv.createBuffer(0);
      expect(buffer.length).toBe(0);
    });
  });

  describe("writeUInt32BE()", () => {
    it("writes 32-bit big-endian integer", () => {
      const buffer = nodeEnv.createBuffer(4);
      nodeEnv.writeUInt32BE(buffer, 0x12345678, 0);

      expect(buffer.readUInt32BE(0)).toBe(0x12345678);
    });

    it("writes at offset", () => {
      const buffer = nodeEnv.createBuffer(8);
      nodeEnv.writeUInt32BE(buffer, 0xaabbccdd, 4);

      expect(buffer.readUInt32BE(4)).toBe(0xaabbccdd);
    });
  });

  describe("writeUInt8()", () => {
    it("writes 8-bit integer", () => {
      const buffer = nodeEnv.createBuffer(4);
      nodeEnv.writeUInt8(buffer, 0x42, 0);

      expect(buffer[0]).toBe(0x42);
    });

    it("writes at offset", () => {
      const buffer = nodeEnv.createBuffer(4);
      nodeEnv.writeUInt8(buffer, 0xff, 3);

      expect(buffer[3]).toBe(0xff);
    });
  });

  describe("concatBuffers()", () => {
    it("concatenates multiple buffers", () => {
      const b1 = Buffer.from([1, 2]);
      const b2 = Buffer.from([3, 4]);
      const b3 = Buffer.from([5, 6]);

      const result = nodeEnv.concatBuffers([b1, b2, b3]);

      expect(result).toEqual(Buffer.from([1, 2, 3, 4, 5, 6]));
    });

    it("handles empty array", () => {
      const result = nodeEnv.concatBuffers([]);
      expect(result.length).toBe(0);
    });
  });

  describe("toBase64()", () => {
    it("encodes buffer to base64", () => {
      const buffer = Buffer.from("Hello");
      const result = nodeEnv.toBase64(buffer);

      expect(result).toBe("SGVsbG8=");
    });

    it("handles empty buffer", () => {
      const buffer = Buffer.from([]);
      const result = nodeEnv.toBase64(buffer);

      expect(result).toBe("");
    });
  });

  describe("createBitset()", () => {
    it("creates Bitsy instance", () => {
      const bitset = nodeEnv.createBitset(16);
      expect(bitset.length).toBe(16);
      expect(bitset.getBuffer).toBeDefined();
    });

    it("creates bitset with correct size", () => {
      const bitset = nodeEnv.createBitset(24);
      expect(bitset.length).toBe(24);
      expect(bitset.getBuffer().length).toBe(3); // 24 bits = 3 bytes
    });
  });
});
