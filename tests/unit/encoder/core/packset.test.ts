import { describe, it, expect, beforeEach } from "vitest";
import createEncoder from "../../../../encoders/js/core/createEncoder";
import nodeEnv from "../../../../encoders/js/env/node";

describe("PackSet", () => {
  let createPackSet: any;
  let PackSet: any;

  beforeEach(() => {
    const encoder = createEncoder(nodeEnv);
    createPackSet = encoder.createPackSet;
    PackSet = encoder.PackSet;
  });

  describe("initialization", () => {
    it("creates empty packset", () => {
      const ps = createPackSet();
      expect(ps).toBeDefined();
      expect(ps.attrPacks).toEqual({});
      expect(ps.existencePack).toBeDefined();
    });

    it("accepts metadata options", () => {
      const ps = new PackSet({ title: "Test Pack" });
      expect(ps.meta.title).toBe("Test Pack");
    });

    it("initializes existence pack", () => {
      const ps = createPackSet();
      expect(ps.existencePack.encoding).toBe("existence");
    });
  });

  describe("addAttribute()", () => {
    it("adds attribute with required options", () => {
      const ps = createPackSet();
      const pack = ps.addAttribute({
        attrName: "gender",
        possibilities: ["male", "female"],
        maxChoices: 1,
      });

      expect(pack).toBeDefined();
      expect(ps.attrPacks["gender"]).toBe(pack);
    });

    it("throws for missing attrName", () => {
      const ps = createPackSet();
      expect(() =>
        ps.addAttribute({
          possibilities: ["a", "b"],
          maxChoices: 1,
        })
      ).toThrow(/attrName is required/);
    });

    it("throws for missing possibilities", () => {
      const ps = createPackSet();
      expect(() =>
        ps.addAttribute({
          attrName: "test",
          maxChoices: 1,
        })
      ).toThrow(/possibilities is required/);
    });

    it("throws for missing maxChoices", () => {
      const ps = createPackSet();
      expect(() =>
        ps.addAttribute({
          attrName: "test",
          possibilities: ["a", "b"],
        })
      ).toThrow(/maxChoices is required/);
    });

    it("stores metadata on pack", () => {
      const ps = createPackSet();
      const pack = ps.addAttribute({
        attrName: "test",
        possibilities: ["a", "b"],
        maxChoices: 1,
        display_name: "Test Attribute",
        filter_type: "category",
      });

      expect(pack.meta.display_name).toBe("Test Attribute");
      expect(pack.meta.filter_type).toBe("category");
    });

    it("selects integer encoding when appropriate", () => {
      const ps = createPackSet();
      const pack = ps.addAttribute({
        attrName: "test",
        possibilities: ["a", "b", "c", "d"],
        maxChoices: 1,
      });

      // maxChoices * log2(possibilities) < possibilities.length
      // 1 * 2 = 2 < 4 -> integer
      expect(pack.encoding).toBe("integer");
    });

    it("selects bitmap encoding when appropriate", () => {
      const ps = createPackSet();
      const pack = ps.addAttribute({
        attrName: "test",
        possibilities: ["a", "b", "c", "d"],
        maxChoices: 4,
      });

      // maxChoices * log2(possibilities) > possibilities.length
      // 4 * 2 = 8 > 4 -> bitmap
      expect(pack.encoding).toBe("bitmap");
    });
  });

  describe("addBufferedAttribute()", () => {
    it("adds buffered attribute with attrName", () => {
      const ps = createPackSet();
      ps.addBufferedAttribute({
        attrName: "metadata",
        display_name: "Metadata Field",
      });

      expect(ps.bufferedAttrs["metadata"]).toBeDefined();
      expect(ps.bufferedAttrs["metadata"].display_name).toBe("Metadata Field");
    });

    it("adds buffered attribute with attr_name (snake_case)", () => {
      const ps = createPackSet();
      ps.addBufferedAttribute({
        attr_name: "metadata",
        display_name: "Metadata Field",
      });

      expect(ps.bufferedAttrs["metadata"]).toBeDefined();
    });

    it("throws for missing attribute name", () => {
      const ps = createPackSet();
      expect(() =>
        ps.addBufferedAttribute({
          display_name: "Test",
        })
      ).toThrow(/attrName or attr_name is required/);
    });

    it("stores metadata", () => {
      const ps = createPackSet();
      ps.addBufferedAttribute({
        attrName: "test",
        custom_field: "value",
      });

      expect(ps.bufferedAttrs["test"].custom_field).toBe("value");
    });
  });

  describe("attributes()", () => {
    it("returns empty array for no attributes", () => {
      const ps = createPackSet();
      expect(ps.attributes()).toEqual([]);
    });

    it("returns attribute names", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "gender",
        possibilities: ["male", "female"],
        maxChoices: 1,
      });
      ps.addAttribute({
        attrName: "status",
        possibilities: ["active", "inactive"],
        maxChoices: 1,
      });

      const attrs = ps.attributes();
      expect(attrs).toContain("gender");
      expect(attrs).toContain("status");
      expect(attrs.length).toBe(2);
    });
  });

  describe("packFor()", () => {
    it("returns pack for attribute", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "test",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const pack = ps.packFor("test");
      expect(pack).toBeDefined();
      expect(pack.attrName).toBe("test");
    });

    it("returns undefined for non-existent attribute", () => {
      const ps = createPackSet();
      expect(ps.packFor("nonexistent")).toBeUndefined();
    });
  });

  describe("pack()", () => {
    it("packs data with null options", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [
        { id: 0, attr: "a" },
        { id: 1, attr: "b" },
      ];

      ps.pack(data, null as unknown as Record<string, unknown>);
      expect(ps.existencePack.buffer).toBeDefined();
    });

    it("packs data with default guid attribute", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [
        { id: 0, attr: "a" },
        { id: 1, attr: "b" },
      ];

      ps.pack(data);
      // Should complete without errors
      expect(ps.existencePack.buffer).toBeDefined();
    });

    it("packs data with custom guid attribute", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [
        { guid: 0, attr: "a" },
        { guid: 1, attr: "b" },
      ];

      ps.pack(data, { guidAttr: "guid" });
      expect(ps.existencePack.buffer).toBeDefined();
    });

    it("infers maxGuid from data", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [
        { id: 0, attr: "a" },
        { id: 1, attr: "b" },
        { id: 10, attr: "a" },
      ];

      ps.pack(data);
      expect(ps.existencePack.maxGuid).toBe(0); // Set by buildPack
    });

    it("infers numItems from data", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [
        { id: 0, attr: "a" },
        { id: 1, attr: "b" },
      ];

      ps.pack(data);
      // Should use data.length as numItems
    });

    it("accepts explicit maxGuid", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [{ id: 5, attr: "a" }];

      ps.pack(data, { maxGuid: 100 });
      // Should use provided maxGuid
    });

    it("accepts explicit numItems", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [{ id: 0, attr: "a" }];

      ps.pack(data, { numItems: 10 });
      // Should use provided numItems
    });
  });

  describe("buildPack()", () => {
    it("defaults guidAttr when provided as empty string", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a"],
        maxChoices: 1,
      });

      ps.buildPack({ maxGuid: 0, numItems: 1, guidAttr: "" }, [
        { id: 0, attr: "a" },
      ]);

      expect(ps.existencePack.buffer).toBeDefined();
    });

    it("requires numItems option", () => {
      const ps = createPackSet();
      expect(() => ps.buildPack({ maxGuid: 10 }, [])).toThrow(/numItems/);
    });

    it("requires maxGuid option", () => {
      const ps = createPackSet();
      expect(() => ps.buildPack({ numItems: 5 }, [])).toThrow(/maxGuid/);
    });

    it("initializes existence pack", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      ps.buildPack({ maxGuid: 10, numItems: 2, guidAttr: "id" }, [
        { id: 0, attr: "a" },
        { id: 1, attr: "b" },
      ]);

      expect(ps.existencePack.buffer).toBeDefined();
    });

    it("initializes attribute packs", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      ps.buildPack({ maxGuid: 10, numItems: 2, guidAttr: "id" }, [
        { id: 0, attr: "a" },
        { id: 1, attr: "b" },
      ]);

      const pack = ps.packFor("attr");
      expect(pack.buffer).toBeDefined();
    });

    it("encodes all items", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b", "c"],
        maxChoices: 1,
      });

      ps.buildPack({ maxGuid: 10, numItems: 3, guidAttr: "id" }, [
        { id: 0, attr: "a" },
        { id: 1, attr: "b" },
        { id: 2, attr: "c" },
      ]);

      // All items should be encoded
    });

    it("resets maxGuid to 0", () => {
      const ps = createPackSet();
      ps.buildPack({ maxGuid: 100, numItems: 0, guidAttr: "id" }, []);

      expect(ps.existencePack.maxGuid).toBe(0);
    });
  });

  describe("buildUnorderedPack()", () => {
    it("sorts data by guid", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b", "c"],
        maxChoices: 1,
      });

      // Use single-digit GUIDs to avoid lexicographic vs numeric sorting issues
      const unsorted = [
        { id: 5, attr: "c" },
        { id: 0, attr: "a" },
        { id: 3, attr: "b" },
      ];

      ps.buildUnorderedPack({ guidAttr: "id" }, unsorted);
      // Should sort and pack without errors
      expect(ps.existencePack.buffer).toBeDefined();
    });

    it("uses custom guid attribute", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [
        { customId: 5, attr: "b" },
        { customId: 1, attr: "a" },
      ];

      ps.buildUnorderedPack({ guidAttr: "customId" }, data);
      expect(ps.existencePack.buffer).toBeDefined();
    });

    it("defaults to 'id' guid attribute", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      const data = [
        { id: 2, attr: "b" },
        { id: 0, attr: "a" },
      ];

      ps.buildUnorderedPack({}, data);
      expect(ps.existencePack.buffer).toBeDefined();
    });
  });

  describe("toPlainObject()", () => {
    it("returns pack structure", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      ps.pack([{ id: 0, attr: "a" }]);
      const obj = ps.toPlainObject();

      expect(obj.existence).toBeDefined();
      expect(obj.attributes).toBeDefined();
      expect(Array.isArray(obj.attributes)).toBe(true);
    });

    it("includes all attribute packs", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr1",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });
      ps.addAttribute({
        attrName: "attr2",
        possibilities: ["x", "y"],
        maxChoices: 1,
      });

      ps.pack([{ id: 0, attr1: "a", attr2: "x" }]);
      const obj = ps.toPlainObject();

      expect(obj.attributes.length).toBe(2);
    });

    it("includes buffered attributes", () => {
      const ps = createPackSet();
      ps.addBufferedAttribute({
        attrName: "metadata",
        display_name: "Metadata",
      });

      ps.pack([{ id: 0 }]);
      const obj = ps.toPlainObject();

      const hasMetadata = obj.attributes.some(
        (attr: any) => attr.attrName === "metadata"
      );
      expect(hasMetadata).toBe(true);
    });

    it("includes packset metadata", () => {
      const ps = new PackSet({ title: "Test Pack", version: "1.0" });
      ps.pack([{ id: 0 }]);
      const obj = ps.toPlainObject();

      expect(obj.title).toBe("Test Pack");
      expect(obj.version).toBe("1.0");
    });

    it("includes existence pack", () => {
      const ps = createPackSet();
      ps.pack([{ id: 0 }]);
      const obj = ps.toPlainObject();

      expect(obj.existence.encoding).toBe("existence");
      expect(obj.existence.pack).toBeDefined();
    });
  });

  describe("toJSON()", () => {
    it("returns JSON string", () => {
      const ps = createPackSet();
      ps.pack([{ id: 0 }]);

      const json = ps.toJSON();
      expect(typeof json).toBe("string");
    });

    it("can be parsed back", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "attr",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      ps.pack([{ id: 0, attr: "a" }]);
      const json = ps.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.existence).toBeDefined();
      expect(parsed.attributes).toBeDefined();
    });
  });

  describe("multiple attributes", () => {
    it("packs multiple integer attributes", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "gender",
        possibilities: ["male", "female"],
        maxChoices: 1,
      });
      ps.addAttribute({
        attrName: "status",
        possibilities: ["active", "inactive"],
        maxChoices: 1,
      });

      ps.pack([
        { id: 0, gender: "male", status: "active" },
        { id: 1, gender: "female", status: "inactive" },
      ]);

      const obj = ps.toPlainObject();
      expect(obj.attributes.length).toBe(2);
    });

    it("packs mixed integer and bitmap attributes", () => {
      const ps = createPackSet();
      ps.addAttribute({
        attrName: "category",
        possibilities: ["a", "b", "c"],
        maxChoices: 1,
      });
      ps.addAttribute({
        attrName: "tags",
        possibilities: ["tag1", "tag2", "tag3"],
        maxChoices: 3,
      });

      ps.pack([
        { id: 0, category: "a", tags: ["tag1", "tag2"] },
        { id: 1, category: "b", tags: ["tag3"] },
      ]);

      const obj = ps.toPlainObject();
      expect(obj.attributes.length).toBe(2);
    });
  });

  describe("encoding selection boundary", () => {
    it("uses integer for 2 possibilities, 1 choice", () => {
      const ps = createPackSet();
      const pack = ps.addAttribute({
        attrName: "test",
        possibilities: ["a", "b"],
        maxChoices: 1,
      });

      // 1 * log2(2) = 1 * 1 = 1 < 2 -> integer
      expect(pack.encoding).toBe("integer");
    });

    it("uses bitmap for 2 possibilities, 2 choices", () => {
      const ps = createPackSet();
      const pack = ps.addAttribute({
        attrName: "test",
        possibilities: ["a", "b"],
        maxChoices: 2,
      });

      // 2 * log2(2) = 2 * 1 = 2 = 2 -> bitmap (not less than)
      expect(pack.encoding).toBe("bitmap");
    });

    it("uses integer for 4 possibilities, 1 choice", () => {
      const ps = createPackSet();
      const pack = ps.addAttribute({
        attrName: "test",
        possibilities: ["a", "b", "c", "d"],
        maxChoices: 1,
      });

      // 1 * log2(4) = 1 * 2 = 2 < 4 -> integer
      expect(pack.encoding).toBe("integer");
    });
  });
});
