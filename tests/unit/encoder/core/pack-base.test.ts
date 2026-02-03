import { describe, it, expect, beforeEach } from "vitest";
import createEncoder from "../../../../encoders/js/core/createEncoder";
import nodeEnv from "../../../../encoders/js/env/node";

describe("Pack (base class)", () => {
  let Pack: any;

  beforeEach(() => {
    const encoder = createEncoder(nodeEnv);
    Pack = encoder.Pack;
  });

  describe("base class methods", () => {
    it("finalizePack() does nothing by default", () => {
      const pack = new Pack("test", ["a", "b"], 1);
      // Should not throw
      expect(() => pack.finalizePack()).not.toThrow();
    });

    it("initializePack() does nothing by default", () => {
      const pack = new Pack("test", ["a", "b"], 1);
      // Should not throw
      expect(() => pack.initializePack(100, 50)).not.toThrow();
    });

    it("encode() does nothing by default", () => {
      const pack = new Pack("test", ["a", "b"], 1);
      // Should not throw
      expect(() => pack.encode(0, { test: "a" })).not.toThrow();
    });
  });

  describe("encodedBitset()", () => {
    it("returns undefined when buffer is null", () => {
      const pack = new Pack("test", ["a", "b"], 1);
      expect(pack.encodedBitset()).toBeUndefined();
    });

    it("returns undefined when buffer is empty", () => {
      const pack = new Pack("test", ["a", "b"], 1);
      pack.buffer = nodeEnv.createBuffer(0);
      expect(pack.encodedBitset()).toBeUndefined();
    });
  });
});
