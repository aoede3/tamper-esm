import { describe, it, expect } from "vitest";
import createEncoder from "../../encoders/js/core/createEncoder";
import nodeEnv from "../../encoders/js/env/node";
import { createTamper } from "../../clients/js/src/tamper";

describe("Error Handling and Edge Cases", () => {
  const encoder = createEncoder(nodeEnv);
  const tamper = createTamper();

  describe("ExistencePack GUID validation", () => {
    it("throws on unsorted GUIDs", () => {
      const { ExistencePack } = encoder;
      const pack = new ExistencePack();

      pack.encode(10);

      expect(() => pack.encode(5)).toThrow(/not sorted by GUID/);
    });

    it("throws on duplicate GUIDs", () => {
      const { ExistencePack } = encoder;
      const pack = new ExistencePack();

      pack.encode(5);

      expect(() => pack.encode(5)).toThrow(/not sorted by GUID/);
    });

    it("accepts ascending GUIDs", () => {
      const { ExistencePack } = encoder;
      const pack = new ExistencePack();

      expect(() => {
        pack.encode(1);
        pack.encode(5);
        pack.encode(10);
      }).not.toThrow();
    });
  });

  describe("Pack validation", () => {
    it("accepts empty possibilities", () => {
      const { IntegerPack } = encoder;

      // Pack constructor doesn't validate empty possibilities
      const pack = new IntegerPack("attr", [], 1);
      expect(pack).toBeDefined();
    });

    it("throws for missing attr name in PackSet.addAttribute", () => {
      const packSet = encoder.createPackSet();

      expect(() =>
        packSet.addAttribute({
          possibilities: ["a", "b"],
          maxChoices: 1,
        })
      ).toThrow(/attrName is required/);
    });

    it("throws for missing possibilities in PackSet.addAttribute", () => {
      const packSet = encoder.createPackSet();

      expect(() =>
        packSet.addAttribute({
          attrName: "test",
          maxChoices: 1,
        })
      ).toThrow(/possibilities is required/);
    });

    it("throws for missing maxChoices in PackSet.addAttribute", () => {
      const packSet = encoder.createPackSet();

      expect(() =>
        packSet.addAttribute({
          attrName: "test",
          possibilities: ["a", "b"],
        })
      ).toThrow(/maxChoices is required/);
    });
  });

  describe("PackSet.buildPack validation", () => {
    it("throws for missing numItems", () => {
      const packSet = encoder.createPackSet();

      expect(() => packSet.buildPack({ maxGuid: 10 }, [])).toThrow(
        /numItems/
      );
    });

    it("throws for missing maxGuid", () => {
      const packSet = encoder.createPackSet();

      expect(() => packSet.buildPack({ numItems: 5 }, [])).toThrow(/maxGuid/);
    });
  });

  describe("Empty and null data", () => {
    it("handles empty dataset", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      // Empty dataset requires explicit maxGuid and numItems
      expect(() =>
        packSet.pack([], { maxGuid: 0, numItems: 0 })
      ).not.toThrow();
    });

    it("handles items with null attribute values", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 0, attr: null },
          { id: 1, attr: "a" },
        ])
      ).not.toThrow();
    });

    it("handles items with missing attributes", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 0 }, // Missing 'attr'
          { id: 1, attr: "a" },
        ])
      ).not.toThrow();
    });

    it("handles empty arrays for bitmap attributes", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "tags",
        possibilities: ["a", "b", "c"],
        maxChoices: 3,
      });

      expect(() =>
        packSet.pack([
          { id: 0, tags: [] },
          { id: 1, tags: ["a"] },
        ])
      ).not.toThrow();
    });
  });

  describe("Unknown values", () => {
    it("handles unknown possibility gracefully", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 0, attr: "unknown" },
          { id: 1, attr: "a" },
        ])
      ).not.toThrow();
    });

    it("handles mixed known and unknown values in bitmap", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "tags",
        possibilities: ["a", "b", "c"],
        maxChoices: 3,
      });

      expect(() =>
        packSet.pack([{ id: 0, tags: ["a", "unknown", "b"] }])
      ).not.toThrow();
    });
  });

  describe("Decoder error handling", () => {
    it("handles invalid control code", () => {
      // Create pack with invalid control code
      const buffer = Buffer.from([0x03, 0x00, 0x00, 0x00, 0x00]); // 0x03 is invalid
      const base64 = buffer.toString("base64");

      const packData = {
        existence: {
          encoding: "existence",
          pack: base64,
        },
        attributes: [],
      };

      expect(() => tamper.unpackData(packData)).toThrow(
        /Unrecognised control code/
      );
    });

    it("handles malformed pack data", () => {
      const packData = {
        existence: {
          encoding: "existence",
          pack: "invalid-base64!!!",
        },
        attributes: [],
      };

      // Should handle gracefully or throw appropriate error
      expect(() => tamper.unpackData(packData)).toThrow();
    });

    it("handles empty pack data", () => {
      const packData = {
        attributes: [],
      };

      // Should handle missing existence pack
      const result = tamper.unpackData(packData);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Boundary values", () => {
    it("handles single item dataset", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      expect(() => packSet.pack([{ id: 0, attr: "a" }])).not.toThrow();
    });

    it("handles GUID = 0", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 0, attr: "a" },
          { id: 1, attr: "b" },
        ])
      ).not.toThrow();
    });

    it("handles large GUID values", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 1000000, attr: "a" },
          { id: 2000000, attr: "b" },
        ])
      ).not.toThrow();
    });

    it("handles single possibility", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: ["only"],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 0, attr: "only" },
          { id: 1, attr: "only" },
        ])
      ).not.toThrow();
    });

    it("handles maxChoices = 0", () => {
      const packSet = encoder.createPackSet();
      const pack = packSet.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 0,
      });

      expect(pack).toBeDefined();
    });
  });

  describe("Type conversion", () => {
    it("converts non-string possibility values", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "attr",
        possibilities: [1, 2, 3],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 0, attr: 1 },
          { id: 1, attr: 2 },
        ])
      ).not.toThrow();
    });

    it("handles boolean possibilities", () => {
      const packSet = encoder.createPackSet();
      packSet.addAttribute({
        attrName: "flag",
        possibilities: [true, false],
        maxChoices: 1,
      });

      expect(() =>
        packSet.pack([
          { id: 0, flag: true },
          { id: 1, flag: false },
        ])
      ).not.toThrow();
    });
  });

  describe("ExistencePack controlCode errors", () => {
    it("throws for unknown control command", () => {
      const { ExistencePack } = encoder;
      const pack = new ExistencePack();

      expect(() => pack.controlCode("invalid" as any, 0)).toThrow(
        /Unknown control command/
      );
    });
  });

  describe("BufferedAttribute validation", () => {
    it("throws for missing attr_name and attrName", () => {
      const packSet = encoder.createPackSet();

      expect(() =>
        packSet.addBufferedAttribute({
          display_name: "Test",
        })
      ).toThrow(/attrName or attr_name is required/);
    });

    it("accepts attr_name (snake_case)", () => {
      const packSet = encoder.createPackSet();

      expect(() =>
        packSet.addBufferedAttribute({
          attr_name: "test",
        })
      ).not.toThrow();
    });

    it("accepts attrName (camelCase)", () => {
      const packSet = encoder.createPackSet();

      expect(() =>
        packSet.addBufferedAttribute({
          attrName: "test",
        })
      ).not.toThrow();
    });
  });
});
