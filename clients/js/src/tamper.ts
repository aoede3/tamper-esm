type JsonObject = Record<string, unknown>;

const hasAtob = typeof globalThis.atob === "function";
const hasBuffer = typeof (globalThis as { Buffer?: typeof Buffer }).Buffer === "function";

function decodeBase64(encoded: string): string {
  if (hasAtob) {
    return globalThis.atob(encoded);
  }
  if (hasBuffer) {
    return (globalThis as { Buffer: typeof Buffer }).Buffer.from(encoded, "base64").toString("binary");
  }
  throw new Error("No base64 decoder available (expected atob or Buffer).");
}

function clone(obj: JsonObject): JsonObject {
  return Object.assign({}, obj);
}

function extend(target: JsonObject, source: JsonObject): JsonObject {
  return Object.assign(target, source);
}

type ExistencePack = {
  pack: string;
};

type AttributePack = {
  encoding: string;
  attr_name: string;
  possibilities: string[];
  pack: string;
  bit_window_width: number;
  item_window_width: number;
};

type PackData = {
  existence?: ExistencePack;
  attributes?: AttributePack[];
  collection?: JsonObject[];
};

export const Tamper = {
  biterate(encoded: string): number[] {
    const binary = decodeBase64(encoded);
    const length = binary.length;
    const output = [];
    let i = 0;

    while (i < length) {
      const b = binary.charCodeAt(i);
      let j = 0;
      while (j < 8) {
        output.push((b >> (7 - j)) & 1);
        j += 1;
      }
      i += 1;
    }

    return output;
  },

  unpackExistence(element: ExistencePack, defaultAttrs: JsonObject = {}): JsonObject[] {
    const bitArray = Tamper.biterate(element.pack);
    const output = [];
    let counter = 0;

    let cursor = 0;

    const consumeBits = (n: number, array: number[]) => {
      const end = cursor + n;
      if (end > array.length) throw new Error("Improperly formatted bit array");
      const slice = array.slice(cursor, end);
      cursor = end;
      return slice;
    };

    const consumeCC = (array: number[]): number => {
      const ccBits = consumeBits(8, array);
      return parseInt(ccBits.join(""), 2);
    };

    const consumeNum = (n: number, array: number[]) =>
      parseInt(consumeBits(n, array).join(""), 2);

    const consumeChunk = (bytes: number, bits: number, array: number[]) => {
      const numBits = bytes * 8 + bits;
      const chunk = consumeBits(numBits, array);
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

    const processBitArray = (array: number[]) => {
      if (cursor >= array.length) {
        return output;
      }

      const cc = consumeCC(array);
      if (cc === 0) {
        const bytesToConsume = consumeNum(32, array);
        const bitsToConsume = consumeNum(8, array);
        consumeChunk(bytesToConsume, bitsToConsume, array);
        if (bitsToConsume > 0) {
          consumeBits(8 - bitsToConsume, array);
        }
        return processBitArray(array);
      }
      if (cc === 1) {
        const numToSkip = consumeNum(32, array);
        counter += numToSkip;
        return processBitArray(array);
      }
      if (cc === 2) {
        const numToRun = consumeNum(32, array);
        for (let i = 0; i < numToRun; i += 1) {
          const attrs = clone(defaultAttrs);
          output.push(extend(attrs, { guid: counter }));
          counter += 1;
        }
        return processBitArray(array);
      }

      throw new Error(`Unrecognised control code: ${cc}`);
    };

    return processBitArray(bitArray);
  },

  unpackIntegerEncoding(element: AttributePack, numItems: number) {
    const consumeNum = (array: number[], n: number) =>
      parseInt(array.splice(0, n).join(""), 2);
    const bitArray = Tamper.biterate(element.pack);
    const bitWindowWidth = element.bit_window_width;
    const itemWindowWidth = element.item_window_width;
    const itemChunks = itemWindowWidth / bitWindowWidth;

    consumeNum(bitArray, 32);
    consumeNum(bitArray, 8);

    const getPossibility = (i: number): string | null =>
      i === 0 ? null : element.possibilities[i - 1];
    const output: Array<string | string[] | null> = [];

    for (let i = 0; i < numItems; i += 1) {
      const bitWindow = bitArray.slice(
        i * itemWindowWidth,
        i * itemWindowWidth + itemWindowWidth,
      );
      for (let j = 0; j < itemChunks; j += 1) {
        const choice = bitWindow.slice(
          j * bitWindowWidth,
          j * bitWindowWidth + bitWindowWidth,
        );
        const possibilityId = parseInt(choice.join(""), 2);
        if (!output[i]) output[i] = [];
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
    const consumeNum = (array: number[], n: number) =>
      parseInt(array.splice(0, n).join(""), 2);
    const bitArray = Tamper.biterate(element.pack);
    const itemWindowWidth = element.item_window_width;
    const chunks = bitArray.length / itemWindowWidth;

    consumeNum(bitArray, 32);
    consumeNum(bitArray, 8);

    const output: string[][] = [];

    for (let i = 0; i < chunks; i += 1) {
      const bitWindow = bitArray.slice(
        i * itemWindowWidth,
        i * itemWindowWidth + itemWindowWidth,
      );
      if (!output[i]) output[i] = [];
      for (let j = 0; j < itemWindowWidth; j += 1) {
        if (bitWindow[j] === 1) {
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
