import { describe, it, expect } from "vitest";
import createEncoder from "@/encoders/js/core/createEncoder";
import { createPackSet } from "@/encoders/js/index";
import nodeEnv from "@/encoders/js/env/node";

describe("Encoder Index (Entry Point)", () => {
  describe("createEncoder()", () => {
    it("creates encoder with node environment", () => {
      const encoder = createEncoder(nodeEnv);

      expect(encoder).toBeDefined();
      expect(encoder.createPackSet).toBeDefined();
      expect(typeof encoder.createPackSet).toBe("function");
    });

    it("returns encoder with all classes", () => {
      const encoder = createEncoder(nodeEnv);

      expect(encoder.ExistencePack).toBeDefined();
      expect(encoder.IntegerPack).toBeDefined();
      expect(encoder.BitmapPack).toBeDefined();
      expect(encoder.Bitpusher).toBeDefined();
      expect(encoder.PackSet).toBeDefined();
    });
  });

  describe("createPackSet()", () => {
    it("creates PackSet instance with node environment", () => {
      const packSet = createPackSet(nodeEnv);

      expect(packSet).toBeDefined();
      expect(packSet.addAttribute).toBeDefined();
      expect(typeof packSet.addAttribute).toBe("function");
    });

    it("creates functional PackSet that can pack data", () => {
      const packSet = createPackSet(nodeEnv);

      packSet.addAttribute({
        attrName: "test",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      packSet.pack([{ id: 0, test: "a" }]);

      const result = packSet.toPlainObject();
      expect(result.existence).toBeDefined();
      expect(result.attributes.length).toBe(1);
    });
  });
});
