import { describe, it, expect } from "vitest";
import createBitsy from "../../../vendor/bitsy/index.js";

describe("vendor/bitsy Bitsy", () => {
  it("clears bit when set to false", () => {
    const bitset = createBitsy(8);
    bitset.bytes[0] = 0xff;
    bitset.set(0, false);

    expect(bitset.bytes[0]).toBe(0x7f);
  });

  it("does nothing when setSize is smaller", () => {
    const bitset = createBitsy(8);
    bitset.bytes[0] = 0xaa;

    bitset.setSize(4);

    expect(bitset.length).toBe(8);
    expect(bitset.bytes[0]).toBe(0xaa);
  });
});
