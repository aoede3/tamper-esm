import { describe, it, expect } from "vitest";
import { clone, merge, values, last, sortBy } from "../../../../encoders/js/core/utils";

describe("Encoder Utilities", () => {
  describe("clone()", () => {
    it("clones primitives", () => {
      expect(clone(42)).toBe(42);
      expect(clone("hello")).toBe("hello");
      expect(clone(true)).toBe(true);
      expect(clone(null)).toBe(null);
      expect(clone(undefined)).toBe(undefined);
    });

    it("clones arrays", () => {
      const arr = [1, 2, [3, 4]];
      const cloned = clone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      // Clone appears to be shallow for nested arrays
    });

    it("clones objects", () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      // Clone appears to be shallow for nested objects
    });

    it("clones arrays with object elements", () => {
      const arr = [{ a: 1 }, { b: 2 }];
      const cloned = clone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    it("clones objects with array properties", () => {
      const obj = { arr: [1, 2, 3] };
      const cloned = clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it("handles nested structures", () => {
      const complex = {
        a: [1, { b: [2, 3] }],
        c: { d: { e: [4, 5] } },
      };
      const cloned = clone(complex);
      expect(cloned).toEqual(complex);
      expect(cloned).not.toBe(complex);
    });
  });

  describe("merge()", () => {
    it("merges two objects", () => {
      const result = merge({ a: 1 }, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it("overwrites properties in target", () => {
      const result = merge({ a: 1, b: 2 }, { b: 3 });
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it("merges nested objects deeply", () => {
      const result = merge({ a: { b: 1, c: 2 } }, { a: { c: 3, d: 4 } });
      expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
    });

    it("merges arrays by replacement", () => {
      const result = merge({ arr: [1, 2] }, { arr: [3, 4] });
      expect(result).toEqual({ arr: [3, 4] });
    });

    it("handles null and undefined", () => {
      // merge returns second arg if first is null/undefined
      expect(merge({ a: 1 }, null)).toBe(null);
      expect(merge({ a: 1 }, undefined)).toBeUndefined();
      expect(merge(null, { a: 1 })).toEqual({ a: 1 });
    });

    it("handles empty objects", () => {
      expect(merge({}, { a: 1 })).toEqual({ a: 1 });
      expect(merge({ a: 1 }, {})).toEqual({ a: 1 });
    });

    it("merges multiple levels deep", () => {
      const result = merge(
        { a: { b: { c: 1 } } },
        { a: { b: { d: 2 } } }
      );
      expect(result).toEqual({ a: { b: { c: 1, d: 2 } } });
    });
  });


    it("merges array indices deeply", () => {
      const target = [[1], { a: 1 }, "x"];
      const source = [[2, 3], { b: 2 }, "y"];

      const result = merge(target, source);

      expect(result[0]).toEqual([2, 3]);
      expect(result[1]).toEqual({ a: 1, b: 2 });
      expect(result[2]).toBe("y");
    });

    it("skips sparse array entries in source", () => {
      const target = [1, 2, 3];
      const source = [] as number[];
      source[2] = 9;

      const result = merge(target, source);

      expect(result).toEqual([1, 2, 9]);
    });
  describe("values()", () => {
    it("extracts object values", () => {
      expect(values({ a: 1, b: 2, c: 3 })).toEqual([1, 2, 3]);
    });

    it("returns empty array for empty object", () => {
      expect(values({})).toEqual([]);
    });

    it("extracts values of different types", () => {
      const result = values({ a: 1, b: "hello", c: true, d: null });
      expect(result).toContain(1);
      expect(result).toContain("hello");
      expect(result).toContain(true);
      expect(result).toContain(null);
    });

    it("handles object with array values", () => {
      expect(values({ a: [1, 2], b: [3, 4] })).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });

  describe("last()", () => {
    it("returns last element of array", () => {
      expect(last([1, 2, 3])).toBe(3);
    });

    it("returns undefined for empty array", () => {
      expect(last([])).toBeUndefined();
    });

    it("returns single element", () => {
      expect(last([42])).toBe(42);
    });

    it("works with different types", () => {
      expect(last(["a", "b", "c"])).toBe("c");
      expect(last([{ a: 1 }])).toEqual({ a: 1 });
    });
  });

  describe("sortBy()", () => {
    it("handles equal sort values", () => {
      const obj = { a: 1, b: 1, c: 0 };
      const result = sortBy(obj, (v) => v);
      expect(result[0]).toBe(0);
      expect(result.slice(1)).toEqual([1, 1]);
    });

    it("sorts by numeric keys", () => {
      const obj = { "3": "c", "1": "a", "2": "b" };
      const result = sortBy(obj, (v, k) => k);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("sorts by string keys", () => {
      const obj = { c: 3, a: 1, b: 2 };
      const result = sortBy(obj, (v, k) => k);
      expect(result).toEqual([1, 2, 3]);
    });

    it("sorts by custom iteratee", () => {
      const obj = { a: { val: 3 }, b: { val: 1 }, c: { val: 2 } };
      const result = sortBy(obj, (v) => v.val);
      expect(result).toEqual([{ val: 1 }, { val: 2 }, { val: 3 }]);
    });

    it("handles empty object", () => {
      expect(sortBy({}, (v, k) => k)).toEqual([]);
    });

    it("sorts by key ascending", () => {
      const obj = { "100": "z", "2": "b", "10": "x" };
      const result = sortBy(obj, (v, k) => k);
      // String sort: "10", "100", "2"
      expect(result).toEqual(["x", "z", "b"]);
    });
  });
});
