import { describe, it, expect } from "vitest";
import { createTamper } from "@/clients/js/src/tamper";

describe("Decoder Unpack Methods", () => {
  const tamper = createTamper();

  describe("unpackIntegerEncoding", () => {
    it("throws error when reading past buffer end", () => {
      // Create pack with insufficient data
      const truncatedPack = {
        encoding: "integer",
        attr_name: "test",
        possibilities: ["a", "b", "c"],
        max_choices: 1,
        bit_window_width: 2,
        item_window_width: 2,
        pack: Buffer.from([0, 0, 0, 0, 1]).toString("base64"), // Only 1 bit remaining
      };

      expect(() => tamper.unpackIntegerEncoding(truncatedPack, 10)).toThrow(
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
    it("throws error when reading past buffer end", () => {
      const truncatedPack = {
        encoding: "bitmap",
        attr_name: "test",
        possibilities: ["a", "b", "c"],
        max_choices: 3,
        bit_window_width: 1,
        item_window_width: 3,
        pack: Buffer.from([0, 0, 0, 0, 1]).toString("base64"), // Only 1 bit
      };

      expect(() => tamper.unpackBitmapEncoding(truncatedPack, 10)).toThrow(
        /Improperly formatted bit array/
      );
    });
  });

  describe("unpackData", () => {
    it("handles unknown encoding type", () => {
      const packData = {
        existence: {
          encoding: "existence",
          pack: Buffer.from([0x00, 0, 0, 0, 1, 1, 0x80]).toString("base64"),
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
