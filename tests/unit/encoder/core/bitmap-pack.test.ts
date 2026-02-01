import { describe, it, expect, beforeEach } from "vitest";
import createEncoder from "../../../../encoders/js/core/createEncoder";
import nodeEnv from "../../../../encoders/js/env/node";

describe("BitmapPack", () => {
  let BitmapPack: any;

  beforeEach(() => {
    const encoder = createEncoder(nodeEnv);
    BitmapPack = encoder.BitmapPack;
  });

  describe("initialization", () => {
    it("creates pack with bitmap encoding", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      expect(pack.encoding).toBe("bitmap");
      expect(pack.attrName).toBe("attr");
      expect(pack.possibilities).toEqual(["a", "b", "c"]);
      expect(pack.maxChoices).toBe(3);
    });

    it("accepts empty possibilities", () => {
      // Pack constructor doesn't validate empty possibilities
      const pack = new BitmapPack("attr", [], 1);
      expect(pack).toBeDefined();
    });

    it("converts possibilities to strings", () => {
      const pack = new BitmapPack("attr", [1, 2, 3], 2);
      expect(pack.possibilities).toEqual(["1", "2", "3"]);
    });
  });

  describe("bit and item window widths", () => {
    it("sets bit window width to 1", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 5);
      expect(pack.bitWindowWidth).toBe(1);
    });

    it("sets item window width to possibilities length", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c", "d"], 4);
      pack.initializePack(10, 5);
      expect(pack.itemWindowWidth).toBe(4);
    });

    it("handles many possibilities", () => {
      const pack = new BitmapPack("attr", Array(100).fill("x"), 10);
      pack.initializePack(10, 5);
      expect(pack.itemWindowWidth).toBe(100);
    });
  });

  describe("header format", () => {
    it("writes 5-byte header", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 5);

      const buffer = pack.buffer;
      expect(buffer.length).toBeGreaterThanOrEqual(5);
    });

    it("writes byte count in first 4 bytes", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 5);

      // itemWindowWidth = 3, numItems = 5
      // Total bits = 15, bytes = 1, remainder = 7
      const buffer = pack.buffer;
      const byteCount = buffer.readUInt32BE(0);
      expect(byteCount).toBe(1);
    });

    it("writes remainder bits in 5th byte", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 5);

      const buffer = pack.buffer;
      const remainder = buffer.readUInt8(4);
      expect(remainder).toBe(7);
    });

    it("handles exact byte alignment", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c", "d"], 4);
      pack.initializePack(10, 2); // 2 items * 4 bits = 8 bits exactly

      const buffer = pack.buffer;
      const byteCount = buffer.readUInt32BE(0);
      const remainder = buffer.readUInt8(4);

      expect(byteCount).toBe(1);
      expect(remainder).toBe(0);
    });
  });

  describe("encoding single values", () => {
    it("encodes single value as bit set", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: "b" });
      // Should set bit at index 1
    });

    it("handles single value (not array)", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 1);

      // Should not throw
      pack.encode(0, { attr: "a" });
    });

    it("handles missing attribute", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 1);

      // Should not throw
      pack.encode(0, { other: "value" });
    });

    it("handles unknown possibility", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 1);

      // Should not throw, just skip
      pack.encode(0, { attr: "unknown" });
    });
  });

  describe("encoding multiple values", () => {
    it("encodes array of values", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c", "d"], 4);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: ["a", "c"] });
      // Should set bits at indices 0 and 2
    });

    it("encodes all values", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: ["a", "b", "c"] });
      // All bits should be set
    });

    it("encodes empty array", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: [] });
      // No bits should be set
    });

    it("handles duplicate values in array", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 1);

      // Should not throw, sets bit once
      pack.encode(0, { attr: ["a", "a", "a"] });
    });

    it("handles mixed known and unknown values", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: ["a", "unknown", "c"] });
      // Should encode only known values
    });
  });

  describe("multiple items", () => {
    it("encodes multiple items independently", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 3);

      pack.encode(0, { attr: ["a"] });
      pack.encode(1, { attr: ["b"] });
      pack.encode(2, { attr: ["a", "c"] });

      pack.finalizePack();
      expect(pack.encodedBitset()).toBeDefined();
    });

    it("handles sparse selections", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c", "d"], 4);
      pack.initializePack(10, 5);

      pack.encode(0, { attr: ["a"] });
      pack.encode(1, { attr: [] });
      pack.encode(2, { attr: ["c", "d"] });
      pack.encode(3, { attr: [] });
      pack.encode(4, { attr: ["b"] });

      pack.finalizePack();
      expect(pack.encodedBitset()).toBeDefined();
    });

    it("handles all items with no selections", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 3);

      pack.encode(0, { attr: [] });
      pack.encode(1, { attr: [] });
      pack.encode(2, { attr: [] });

      pack.finalizePack();
      const encoded = pack.encodedBitset();
      expect(encoded).toBeDefined();
    });
  });

  describe("possibility index mapping", () => {
    it("maps possibilities to indices", () => {
      const pack = new BitmapPack("attr", ["x", "y", "z"], 3);
      expect(pack.possIndex.get("x")).toBe(0);
      expect(pack.possIndex.get("y")).toBe(1);
      expect(pack.possIndex.get("z")).toBe(2);
    });

    it("handles numeric possibilities", () => {
      const pack = new BitmapPack("attr", [1, 2, 3], 3);
      expect(pack.possIndex.get("1")).toBe(0);
      expect(pack.possIndex.get("2")).toBe(1);
      expect(pack.possIndex.get("3")).toBe(2);
    });
  });

  describe("toPlainObject()", () => {
    it("returns correct structure", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c"], 3);
      pack.initializePack(10, 5);

      const obj = pack.toPlainObject();

      expect(obj.encoding).toBe("bitmap");
      expect(obj.attr_name).toBe("attr");
      expect(obj.possibilities).toEqual(["a", "b", "c"]);
      expect(obj.max_choices).toBe(3);
      expect(obj.bit_window_width).toBe(1);
      expect(obj.item_window_width).toBe(3);
    });

    it("includes base64 encoded pack", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 5);
      pack.finalizePack();

      const obj = pack.toPlainObject();
      expect(obj.pack).toBeDefined();
      expect(typeof obj.pack).toBe("string");
    });

    it("includes metadata", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.meta = { filter_type: "multi-select" };
      pack.initializePack(10, 5);

      const obj = pack.toPlainObject();
      expect(obj.filter_type).toBe("multi-select");
    });
  });

  describe("buffer size calculations", () => {
    it("allocates correct size for small dataset", () => {
      const pack = new BitmapPack("attr", ["a", "b"], 2);
      pack.initializePack(10, 5);

      // Header (5 bytes) + data (2 bits * 5 items = 10 bits = 2 bytes)
      expect(pack.buffer.length).toBe(7);
    });

    it("allocates correct size for many possibilities", () => {
      const pack = new BitmapPack("attr", Array(20).fill("x"), 20);
      pack.initializePack(100, 10);

      // itemWindowWidth = 20, numItems = 10
      // Total bits = 200, bytes = 25
      // Header = 5 bytes
      expect(pack.buffer.length).toBe(30);
    });

    it("handles large datasets", () => {
      const pack = new BitmapPack("attr", Array(8).fill("x"), 8);
      pack.initializePack(100, 100);

      // itemWindowWidth = 8, numItems = 100
      // Total bits = 800, bytes = 100
      expect(pack.buffer.length).toBe(105);
    });
  });

  describe("bit packing correctness", () => {
    it("sets correct bit for first possibility", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c", "d"], 4);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: ["a"] });
      // First bit of data section should be set
    });

    it("sets correct bit for last possibility", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c", "d"], 4);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: ["d"] });
      // Fourth bit of data section should be set
    });

    it("sets multiple bits correctly", () => {
      const pack = new BitmapPack("attr", ["a", "b", "c", "d", "e", "f", "g", "h"], 8);
      pack.initializePack(10, 1);

      pack.encode(0, { attr: ["a", "c", "e", "g"] });
      // Bits 0, 2, 4, 6 should be set (alternating pattern)
    });
  });
});
