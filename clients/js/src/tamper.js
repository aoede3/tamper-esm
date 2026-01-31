const hasAtob = typeof globalThis.atob === "function";
const hasBuffer = typeof globalThis.Buffer === "function";

function decodeBase64(encoded) {
  if (hasAtob) {
    return globalThis.atob(encoded);
  }
  if (hasBuffer) {
    return globalThis.Buffer.from(encoded, "base64").toString("binary");
  }
  throw new Error("No base64 decoder available (expected atob or Buffer).");
}

function clone(obj) {
  return Object.assign({}, obj);
}

function extend(target, source) {
  return Object.assign(target, source);
}

export const Tamper = {
  biterate(encoded) {
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

  unpackExistence(element, defaultAttrs = {}) {
    const bitArray = Tamper.biterate(element.pack);
    const output = [];
    let counter = 0;

    const consumeCC = (array) => {
      if (array.length < 2) throw new Error("Improperly formatted bit array");
      let cc = array.splice(0, 8);
      cc = parseInt(cc.join(""), 2);
      return cc;
    };

    const consumeNum = (n, array) => parseInt(array.splice(0, n).join(""), 2);

    const consumeChunk = (bytes, bits, array) => {
      const numBits = bytes * 8 + bits;
      const chunk = array.splice(0, numBits);
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

    const processBitArray = (array) => {
      if (array.length === 0) {
        return output;
      }

      const cc = consumeCC(array);
      if (cc === 0) {
        const bytesToConsume = consumeNum(32, array);
        const bitsToConsume = consumeNum(8, array);
        consumeChunk(bytesToConsume, bitsToConsume, array);
        if (bitsToConsume > 0) {
          array.splice(0, 8 - bitsToConsume);
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

  unpackIntegerEncoding(element, numItems) {
    const consumeNum = (array, n) => parseInt(array.splice(0, n).join(""), 2);
    const bitArray = Tamper.biterate(element.pack);
    const bitWindowWidth = element.bit_window_width;
    const itemWindowWidth = element.item_window_width;
    const itemChunks = itemWindowWidth / bitWindowWidth;

    consumeNum(bitArray, 32);
    consumeNum(bitArray, 8);

    const getPossibility = (i) =>
      i === 0 ? null : element.possibilities[i - 1];
    const output = [];

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
          output[i].push(result);
        }
      }
    }

    return output;
  },

  unpackBitmapEncoding(element) {
    const consumeNum = (array, n) => parseInt(array.splice(0, n).join(""), 2);
    const bitArray = Tamper.biterate(element.pack);
    const itemWindowWidth = element.item_window_width;
    const chunks = bitArray.length / itemWindowWidth;

    consumeNum(bitArray, 32);
    consumeNum(bitArray, 8);

    const output = [];

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

  unpackData(data, defaultAttrs = {}) {
    if (data.existence) {
      const exists = Tamper.unpackExistence(data.existence, defaultAttrs);

      for (const attr of data.attributes) {
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
          seed[attr.attr_name] = attrArray[i];
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
