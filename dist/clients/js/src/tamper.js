var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// clients/js/src/tamper.ts
var hasAtob = typeof globalThis.atob === "function";
var hasBuffer = typeof globalThis.Buffer === "function";
function decodeBase64(encoded) {
  if (hasAtob) {
    return globalThis.atob(encoded);
  }
  if (hasBuffer) {
    return globalThis.Buffer.from(encoded, "base64").toString("binary");
  }
  throw new Error("No base64 decoder available (expected atob or Buffer).");
}
__name(decodeBase64, "decodeBase64");
function clone(obj) {
  return Object.assign({}, obj);
}
__name(clone, "clone");
function extend(target, source) {
  return Object.assign(target, source);
}
__name(extend, "extend");
var Tamper = {
  biterate(encoded) {
    const binary = decodeBase64(encoded);
    let byteIndex = 0;
    let bitIndex = 0;
    const bitsRemaining = /* @__PURE__ */ __name(() => binary.length * 8 - (byteIndex * 8 + bitIndex), "bitsRemaining");
    const hasBits = /* @__PURE__ */ __name((count) => bitsRemaining() >= count, "hasBits");
    const readBit = /* @__PURE__ */ __name(() => {
      if (!hasBits(1)) {
        throw new Error("Improperly formatted bit array");
      }
      const byte = binary.charCodeAt(byteIndex);
      const bit = byte >> 7 - bitIndex & 1;
      bitIndex += 1;
      if (bitIndex === 8) {
        bitIndex = 0;
        byteIndex += 1;
      }
      return bit;
    }, "readBit");
    const readBits = /* @__PURE__ */ __name((count) => {
      if (!hasBits(count)) {
        throw new Error("Improperly formatted bit array");
      }
      const bits = new Array(count);
      for (let i = 0; i < count; i += 1) {
        bits[i] = readBit();
      }
      return bits;
    }, "readBits");
    const readNumber = /* @__PURE__ */ __name((count) => {
      if (!hasBits(count)) {
        throw new Error("Improperly formatted bit array");
      }
      let num = 0;
      for (let i = 0; i < count; i += 1) {
        num = num << 1 | readBit();
      }
      return num;
    }, "readNumber");
    const readChunk = /* @__PURE__ */ __name((count) => readBits(count), "readChunk");
    return {
      readBit,
      readBits,
      readNumber,
      readChunk,
      hasBits
    };
  },
  unpackExistence(element, defaultAttrs = {}) {
    const reader = Tamper.biterate(element.pack);
    const output = [];
    let counter = 0;
    const consumeCC = /* @__PURE__ */ __name(() => reader.readNumber(8), "consumeCC");
    const consumeNum = /* @__PURE__ */ __name((n) => reader.readNumber(n), "consumeNum");
    const consumeChunk = /* @__PURE__ */ __name((bytes, bits) => {
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
    }, "consumeChunk");
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
  unpackIntegerEncoding(element, numItems) {
    const reader = Tamper.biterate(element.pack);
    const bitWindowWidth = element.bit_window_width;
    const itemWindowWidth = element.item_window_width;
    const itemChunks = itemWindowWidth / bitWindowWidth;
    const bytesToConsume = reader.readNumber(32);
    const bitsToConsume = reader.readNumber(8);
    let remainingBits = bytesToConsume * 8 + bitsToConsume;
    const readBit = /* @__PURE__ */ __name(() => {
      if (remainingBits <= 0) {
        throw new Error("Improperly formatted bit array");
      }
      remainingBits -= 1;
      return reader.readBit();
    }, "readBit");
    const readNumber = /* @__PURE__ */ __name((count) => {
      let num = 0;
      for (let i = 0; i < count; i += 1) {
        num = num << 1 | readBit();
      }
      return num;
    }, "readNumber");
    const getPossibility = /* @__PURE__ */ __name((i) => i === 0 ? null : element.possibilities[i - 1], "getPossibility");
    const output = new Array(numItems);
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
          output[i].push(result);
        }
      }
    }
    return output;
  },
  unpackBitmapEncoding(element) {
    const reader = Tamper.biterate(element.pack);
    const itemWindowWidth = element.item_window_width;
    const bytesToConsume = reader.readNumber(32);
    const bitsToConsume = reader.readNumber(8);
    let remainingBits = bytesToConsume * 8 + bitsToConsume;
    const chunks = remainingBits / itemWindowWidth;
    const readBit = /* @__PURE__ */ __name(() => {
      if (remainingBits <= 0) {
        throw new Error("Improperly formatted bit array");
      }
      remainingBits -= 1;
      return reader.readBit();
    }, "readBit");
    const output = new Array(chunks);
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
  unpackData(data, defaultAttrs = {}) {
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
          seed[attr.attr_name] = attrArray[i];
        });
      }
      return exists;
    }
    return (data.collection || []).map(
      (item) => extend(clone(defaultAttrs), item)
    );
  }
};
function createTamper() {
  return Tamper;
}
__name(createTamper, "createTamper");
var tamper_default = createTamper;

export { Tamper, createTamper, tamper_default as default };
//# sourceMappingURL=tamper.js.map
//# sourceMappingURL=tamper.js.map