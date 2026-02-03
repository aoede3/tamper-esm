import { describe, it, expect } from "vitest";
import { createTamper } from "@/clients/js/src/tamper";

describe("Decoder Unpack Methods", () => {
  const tamper = createTamper();

  describe("unpackIntegerEncoding", () => {
    it("throws error when remainingBits exhausted", () => {
      // Header claims only 1 bit (bytesToConsume=0, bitsToConsume=1)
      // But we request 10 items * 2 bits each = 20 bits needed
      // Buffer has enough bits, but header limit triggers remainingBits check
      // After 1st bit read: remainingBits=0, 2nd read throws
      const truncatedPack = {
        encoding: "integer",
        attr_name: "test",
        possibilities: ["a", "b", "c"],
        max_choices: 1,
        bit_window_width: 2,
        item_window_width: 2,
        pack: Buffer.from([0, 0, 0, 0, 1, 0xff]).toString("base64"),
      };

      expect(() => tamper.unpackIntegerEncoding(truncatedPack, 10)).toThrow(
        /Improperly formatted bit array/
      );
    });

    it("throws error when header declares zero bits", () => {
      const emptyPack = {
        encoding: "integer",
        attr_name: "test",
        possibilities: ["a"],
        max_choices: 1,
        bit_window_width: 1,
        item_window_width: 1,
        pack: Buffer.from([0, 0, 0, 0, 0]).toString("base64"),
      };

      expect(() => tamper.unpackIntegerEncoding(emptyPack, 1)).toThrow(
        /Improperly formatted bit array/
      );
    });

    it("unpacks multi-choice integer encoding", () => {
      // This hits the itemChunks > 1 path (line 162-166)
      const pack = {
        encoding: "integer",
        attr_name: "tags",
        possibilities: ["a", "b", "c"],
        max_choices: 2,
        bit_window_width: 2,
        item_window_width: 4, // 2 choices * 2 bits
        pack: Buffer.from([0, 0, 0, 1, 0, 0b01100000]).toString("base64"),
      };

      const result = tamper.unpackIntegerEncoding(pack, 2);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("unpackBitmapEncoding", () => {
    it("throws error when bits not divisible by itemWindowWidth", () => {
      // Header claims 7 bits, itemWindowWidth=3
      // chunks = 7/3 = 2.333 (non-integer)
      // new Array(2.333) throws "Invalid array length"
      const mismatchedPack = {
        encoding: "bitmap",
        attr_name: "test",
        possibilities: ["a", "b", "c"],
        max_choices: 3,
        bit_window_width: 1,
        item_window_width: 3,
        pack: Buffer.from([0, 0, 0, 0, 7, 0xff, 0xff]).toString("base64"),
      };

      expect(() => tamper.unpackBitmapEncoding(mismatchedPack)).toThrow(
        /Invalid array length/
      );
    });

    it("throws error when itemWindowWidth is fractional", () => {
      // Header claims 1 bit; fractional window causes more reads than remainingBits
      const fractionalPack = {
        encoding: "bitmap",
        attr_name: "test",
        possibilities: ["a", "b"],
        max_choices: 1,
        bit_window_width: 1,
        item_window_width: 0.5,
        pack: Buffer.from([0, 0, 0, 0, 1, 0x80]).toString("base64"),
      };

      expect(() => tamper.unpackBitmapEncoding(fractionalPack as any)).toThrow(
        /Improperly formatted bit array/
      );
    });

    it("returns empty array when header declares zero bits", () => {
      const emptyPack = {
        encoding: "bitmap",
        attr_name: "test",
        possibilities: ["a"],
        max_choices: 1,
        bit_window_width: 1,
        item_window_width: 1,
        pack: Buffer.from([0, 0, 0, 0, 0]).toString("base64"),
      };

      expect(tamper.unpackBitmapEncoding(emptyPack)).toEqual([]);
    });
  });

  describe("unpackData", () => {
    it("handles unknown encoding type", () => {
      // cc=2 (run) with count=1 creates 1 item
      const packData = {
        existence: {
          encoding: "existence",
          pack: Buffer.from([0x02, 0x00, 0x00, 0x00, 0x01]).toString("base64"),
        },
        attributes: [
          {
            encoding: "unknown-type" as any,
            attr_name: "test",
            possibilities: ["a"],
            max_choices: 1,
          },
        ],
      };

      const result = tamper.unpackData(packData);
      expect(result.length).toBe(1);
      expect(result[0].test).toBeUndefined(); // Unknown encoding skipped
    });

    it("handles missing attributes array", () => {
      // cc=2 (run) with count=1 creates 1 item
      const packData = {
        existence: {
          encoding: "existence",
          pack: Buffer.from([0x02, 0x00, 0x00, 0x00, 0x01]).toString("base64"),
        },
      };

      const result = tamper.unpackData(packData as any);
      expect(result.length).toBe(1);
    });

    it("falls back to collection when no existence pack", () => {
      const packData = {
        collection: [
          { id: 0, value: "a" },
          { id: 1, value: "b" },
        ],
        attributes: [],
      };

      const result = tamper.unpackData(packData);
      expect(result).toEqual([
        { id: 0, value: "a" },
        { id: 1, value: "b" },
      ]);
    });

    it("applies default attributes to collection items", () => {
      const packData = {
        collection: [{ id: 0 }, { id: 1 }],
        attributes: [],
        default_attrs: { status: "active" },
      };

      const result = tamper.unpackData(packData, { status: "active" });
      expect(result[0].status).toBe("active");
      expect(result[1].status).toBe("active");
    });
  });
});
