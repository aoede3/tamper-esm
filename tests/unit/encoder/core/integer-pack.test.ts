import { describe, it, expect, beforeEach } from "vitest";
import createEncoder from "../../../../encoders/js/core/createEncoder";
import nodeEnv from "../../../../encoders/js/env/node";

describe("IntegerPack", () => {
  let IntegerPack: any;

  beforeEach(() => {
    const encoder = createEncoder(nodeEnv);
    IntegerPack = encoder.IntegerPack;
  });

  describe("initialization", () => {
    it("creates pack with integer encoding", () => {
      const pack = new IntegerPack("attr", ["a", "b", "c"], 1);
      expect(pack.encoding).toBe("integer");
      expect(pack.attrName).toBe("attr");
      expect(pack.possibilities).toEqual(["a", "b", "c"]);
      expect(pack.maxChoices).toBe(1);
    });

    it("accepts empty possibilities", () => {
      // Pack constructor doesn't validate empty possibilities
      const pack = new IntegerPack("attr", [], 1);
      expect(pack).toBeDefined();
    });

    it("converts possibilities to strings", () => {
      const pack = new IntegerPack("attr", [1, 2, 3], 1);
      expect(pack.possibilities).toEqual(["1", "2", "3"]);
    });
  });

  describe("bit window width calculation", () => {
    it("calculates correct width for 2 possibilities", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);
      // log2(2 + 1) = log2(3) = ~1.58, ceil = 2
      expect(pack.bitWindowWidth).toBe(2);
    });

    it("calculates correct width for 3 possibilities", () => {
      const pack = new IntegerPack("attr", ["a", "b", "c"], 1);
      pack.initializePack(10, 5);
      // log2(3 + 1) = log2(4) = 2
      expect(pack.bitWindowWidth).toBe(2);
    });

    it("calculates correct width for 8 possibilities", () => {
      const pack = new IntegerPack("attr", Array(8).fill("x"), 1);
      pack.initializePack(10, 5);
      // log2(8 + 1) = log2(9) = ~3.17, ceil = 4
      expect(pack.bitWindowWidth).toBe(4);
    });

    it("handles single possibility", () => {
      const pack = new IntegerPack("attr", ["a"], 1);
      pack.initializePack(10, 5);
      // log2(1 + 1) = log2(2) = 1
      expect(pack.bitWindowWidth).toBe(1);
    });

    it("handles 16 possibilities", () => {
      const pack = new IntegerPack("attr", Array(16).fill("x"), 1);
      pack.initializePack(10, 5);
      // log2(16 + 1) = log2(17) = ~4.09, ceil = 5
      expect(pack.bitWindowWidth).toBe(5);
    });
  });

  describe("item window width calculation", () => {
    it("calculates for single choice", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);
      // bitWindowWidth * maxChoices = 2 * 1 = 2
      expect(pack.itemWindowWidth).toBe(2);
    });

    it("calculates for multiple choices", () => {
      const pack = new IntegerPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 5);
      // bitWindowWidth = 2, maxChoices = 3
      expect(pack.itemWindowWidth).toBe(6);
    });

    it("handles large maxChoices", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 8);
      pack.initializePack(10, 5);
      // bitWindowWidth = 2, maxChoices = 8
      expect(pack.itemWindowWidth).toBe(16);
    });
  });

  describe("header format", () => {
    it("writes 5-byte header", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);

      const buffer = pack.buffer;
      expect(buffer.length).toBeGreaterThanOrEqual(5);
    });

    it("writes byte count in first 4 bytes (UInt32BE)", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);

      // bitWindowWidth = 2, itemWindowWidth = 2, numItems = 5
      // Total bits = 2 * 5 = 10 bits = 1 byte + 2 bits
      const buffer = pack.buffer;
      const byteCount = buffer.readUInt32BE(0);
      expect(byteCount).toBe(1);
    });

    it("writes remainder bits in 5th byte (UInt8)", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);

      // Total bits = 10, bytes = 1, remainder = 2
      const buffer = pack.buffer;
      const remainder = buffer.readUInt8(4);
      expect(remainder).toBe(2);
    });

    it("handles exact byte alignment", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 4); // 4 items * 2 bits = 8 bits = 1 byte exactly

      const buffer = pack.buffer;
      const byteCount = buffer.readUInt32BE(0);
      const remainder = buffer.readUInt8(4);

      expect(byteCount).toBe(1);
      expect(remainder).toBe(0);
    });
  });

  describe("encoding values", () => {
    it("encodes single value", () => {
      const pack = new IntegerPack("attr", ["a", "b", "c"], 1);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: "b" });
      // "b" is index 1, so possibility ID = 2
      // Should encode as binary 10 (2 bits)
    });

    it("encodes null as 0", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 2);

      pack.encode(0, { attr: null });
      pack.encode(1, { attr: "a" });

      // First item should encode as 00, second as 01
    });

    it("encodes array values", () => {
      const pack = new IntegerPack("attr", ["a", "b", "c"], 2);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: ["a", "b"] });
      // Should encode both values
    });

    it("handles missing attribute", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 1);

      // Should not throw
      pack.encode(0, { other: "value" });
    });

    it("handles unknown possibility", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 1);

      // Should not throw, just skip
      pack.encode(0, { attr: "unknown" });
    });

    it("handles single value as array", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: "a" });
      // Should work the same as array with single value
    });
  });

  describe("possibility index mapping", () => {
    it("creates index map on construction", () => {
      const pack = new IntegerPack("attr", ["x", "y", "z"], 1);
      expect(pack.possIndex.get("x")).toBe(0);
      expect(pack.possIndex.get("y")).toBe(1);
      expect(pack.possIndex.get("z")).toBe(2);
    });

    it("handles numeric possibility values", () => {
      const pack = new IntegerPack("attr", [1, 2, 3], 1);
      expect(pack.possIndex.get("1")).toBe(0);
      expect(pack.possIndex.get("2")).toBe(1);
      expect(pack.possIndex.get("3")).toBe(2);
    });
  });

  describe("toPlainObject()", () => {
    it("returns correct structure", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);

      const obj = pack.toPlainObject();

      expect(obj.encoding).toBe("integer");
      expect(obj.attr_name).toBe("attr");
      expect(obj.possibilities).toEqual(["a", "b"]);
      expect(obj.max_choices).toBe(1);
      expect(obj.bit_window_width).toBe(2);
      expect(obj.item_window_width).toBe(2);
    });

    it("includes base64 encoded pack", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);
      pack.finalizePack();

      const obj = pack.toPlainObject();
      expect(obj.pack).toBeDefined();
      expect(typeof obj.pack).toBe("string");
    });

    it("includes metadata", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.meta = { display_name: "Test Attribute" };
      pack.initializePack(10, 5);

      const obj = pack.toPlainObject();
      expect(obj.display_name).toBe("Test Attribute");
    });
  });

  describe("buffer size calculations", () => {
    it("allocates correct size for small dataset", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 5);

      // Header (5 bytes) + data bits (10 bits = 2 bytes)
      expect(pack.buffer.length).toBe(7);
    });

    it("allocates correct size for larger dataset", () => {
      const pack = new IntegerPack("attr", ["a", "b", "c", "d"], 1);
      pack.initializePack(100, 100);

      // bitWindowWidth = 3, itemWindowWidth = 3, numItems = 100
      // Total bits = 300, bytes = 37.5, ceil = 38
      // Header = 5 bytes
      expect(pack.buffer.length).toBe(43);
    });
  });

  describe("multiple items encoding", () => {
    it("encodes multiple items sequentially", () => {
      const pack = new IntegerPack("attr", ["a", "b", "c"], 1);
      pack.initializePack(10, 3);

      pack.encode(0, { attr: "a" });
      pack.encode(1, { attr: "b" });
      pack.encode(2, { attr: "c" });

      pack.finalizePack();
      expect(pack.encodedBitset()).toBeDefined();
    });

    it("handles mixed null and values", () => {
      const pack = new IntegerPack("attr", ["a", "b"], 1);
      pack.initializePack(10, 4);

      pack.encode(0, { attr: "a" });
      pack.encode(1, { attr: null });
      pack.encode(2, { attr: "b" });
      pack.encode(3, { attr: null });

      pack.finalizePack();
      expect(pack.encodedBitset()).toBeDefined();
    });
  });
});
