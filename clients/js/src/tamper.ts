import type { AttributePack, ExistencePack, JsonObject, PackData } from "./types.ts";

const hasAtob = typeof globalThis.atob === "function";

function decodeBase64(encoded: string): string {
  if (hasAtob) {
    return globalThis.atob(encoded);
  }
  return (globalThis as { Buffer: typeof Buffer }).Buffer.from(encoded, "base64").toString("binary");
}

function clone(obj: JsonObject): JsonObject {
  return Object.assign({}, obj);
}

function extend(target: JsonObject, source: JsonObject): JsonObject {
  return Object.assign(target, source);
}

export const Tamper = {
  biterate(encoded: string) {
    const binary = decodeBase64(encoded);
    let byteIndex = 0;
    let bitIndex = 0;

    const bitsRemaining = () => binary.length * 8 - (byteIndex * 8 + bitIndex);
    const hasBits = (count: number): boolean => bitsRemaining() >= count;

    const readBit = (): number => {
      if (!hasBits(1)) {
        throw new Error("Improperly formatted bit array");
      }
      const byte = binary.charCodeAt(byteIndex);
      const bit = (byte >> (7 - bitIndex)) & 1;
      bitIndex += 1;
      if (bitIndex === 8) {
        bitIndex = 0;
        byteIndex += 1;
      }
      return bit;
    };

    const readBits = (count: number): number[] => {
      if (!hasBits(count)) {
        throw new Error("Improperly formatted bit array");
      }
      const bits = new Array<number>(count);
      for (let i = 0; i < count; i += 1) {
        bits[i] = readBit();
      }
      return bits;
    };

    const readNumber = (count: number): number => {
      if (!hasBits(count)) {
        throw new Error("Improperly formatted bit array");
      }
      let num = 0;
      for (let i = 0; i < count; i += 1) {
        num = (num << 1) | readBit();
      }
      return num;
    };

    const readChunk = (count: number): number[] => readBits(count);

    return {
      readBit,
      readBits,
      readNumber,
      readChunk,
      hasBits,
    };
  },

  unpackExistence(element: ExistencePack, defaultAttrs: JsonObject = {}): JsonObject[] {
    const reader = Tamper.biterate(element.pack);
    const output = [];
    let counter = 0;

    const consumeCC = (): number => reader.readNumber(8);

    const consumeNum = (n: number) => reader.readNumber(n);

    const consumeChunk = (bytes: number, bits: number) => {
      const numBits = bytes * 8 + bits;
      const chunk = reader.readChunk(numBits);
      let i = 0;

      while (i < numBits) {
        if (chunk[i]) {
          const attrs = clone(defaultAttrs);
          output.push(extend(attrs, { guid: counter }));
        }
        counter += 1;
        i += 1;
      }
    };

    // Process control codes iteratively to avoid stack overflow
    while (reader.hasBits(8)) {
      const cc = consumeCC();
      if (cc === 0) {
        const bytesToConsume = consumeNum(32);
        const bitsToConsume = consumeNum(8);
        consumeChunk(bytesToConsume, bitsToConsume);
        if (bitsToConsume > 0) {
          reader.readBits(8 - bitsToConsume);
        }
      } else if (cc === 1) {
        const numToSkip = consumeNum(32);
        counter += numToSkip;
      } else if (cc === 2) {
        const numToRun = consumeNum(32);
        for (let i = 0; i < numToRun; i += 1) {
          const attrs = clone(defaultAttrs);
          output.push(extend(attrs, { guid: counter }));
          counter += 1;
        }
      } else {
        throw new Error(`Unrecognised control code: ${cc}`);
      }
    }

    return output;
  },

  unpackIntegerEncoding(element: AttributePack, numItems: number) {
    const reader = Tamper.biterate(element.pack);
    const bitWindowWidth = element.bit_window_width;
    const itemWindowWidth = element.item_window_width;
    const itemChunks = itemWindowWidth / bitWindowWidth;

    const bytesToConsume = reader.readNumber(32);
    const bitsToConsume = reader.readNumber(8);
    let remainingBits = bytesToConsume * 8 + bitsToConsume;

    const readBit = (): number => {
      if (remainingBits <= 0) {
        throw new Error("Improperly formatted bit array");
      }
      remainingBits -= 1;
      return reader.readBit();
    };

    const readNumber = (count: number): number => {
      let num = 0;
      for (let i = 0; i < count; i += 1) {
        num = (num << 1) | readBit();
      }
      return num;
    };

    const getPossibility = (i: number): string | null =>
      i === 0 ? null : element.possibilities[i - 1];
    const output: Array<string | string[] | null> = new Array(numItems);

    if (itemChunks > 1) {
      for (let i = 0; i < numItems; i += 1) {
        output[i] = [];
      }
    }

    for (let i = 0; i < numItems; i += 1) {
      for (let j = 0; j < itemChunks; j += 1) {
        const possibilityId = readNumber(bitWindowWidth);
        const result = getPossibility(possibilityId);
        if (itemChunks === 1) {
          output[i] = result;
        } else if (result) {
          (output[i] as string[]).push(result);
        }
      }
    }

    return output;
  },

  unpackBitmapEncoding(element: AttributePack): string[][] {
    const reader = Tamper.biterate(element.pack);
    const itemWindowWidth = element.item_window_width;
    const bytesToConsume = reader.readNumber(32);
    const bitsToConsume = reader.readNumber(8);
    let remainingBits = bytesToConsume * 8 + bitsToConsume;
    const chunks = remainingBits / itemWindowWidth;

    const readBit = (): number => {
      if (remainingBits <= 0) {
        throw new Error("Improperly formatted bit array");
      }
      remainingBits -= 1;
      return reader.readBit();
    };

    const output: string[][] = new Array(chunks);
    for (let i = 0; i < chunks; i += 1) {
      output[i] = [];
    }

    for (let i = 0; i < chunks; i += 1) {
      for (let j = 0; j < itemWindowWidth; j += 1) {
        if (readBit() === 1) {
          output[i].push(element.possibilities[j]);
        }
      }
    }

    return output;
  },

  unpackData(data: PackData, defaultAttrs: JsonObject = {}) {
    if (data.existence) {
      const exists = Tamper.unpackExistence(data.existence, defaultAttrs);

      for (const attr of data.attributes || []) {
        let attrArray;
        switch (attr.encoding) {
          case "bitmap":
            attrArray = Tamper.unpackBitmapEncoding(attr);
            break;
          case "integer":
            attrArray = Tamper.unpackIntegerEncoding(attr, exists.length);
            break;
          default:
            continue;
        }

        exists.forEach((seed, i) => {
          (seed as JsonObject)[attr.attr_name] = attrArray[i] as unknown;
        });
      }

      return exists;
    }

    return (data.collection || []).map((item) =>
      extend(clone(defaultAttrs), item),
    );
  },
};

export function createTamper() {
  return Tamper;
}

export default createTamper;
