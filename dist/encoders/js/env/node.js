var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// vendor/bitsy/index.js
var Bitsy = class _Bitsy {
  static {
    __name(this, "Bitsy");
  }
  constructor(size) {
    this.length = size;
    this.bytes = Buffer.alloc(Math.ceil(size / 8));
  }
  set(index, value) {
    const byteIndex = index / 8 | 0;
    const bitOffset = 7 - index % 8;
    const mask = 1 << bitOffset;
    if (value) {
      this.bytes[byteIndex] |= mask;
    } else {
      this.bytes[byteIndex] &= ~mask;
    }
  }
  setSize(size) {
    if (size <= this.length) return;
    const next = Buffer.alloc(Math.ceil(size / 8));
    this.bytes.copy(next);
    this.bytes = next;
    this.length = size;
  }
  slice(begin, end) {
    const length = Math.max(0, end - begin);
    const result = new _Bitsy(length);
    for (let i = 0; i < length; i += 1) {
      const sourceIndex = begin + i;
      const byteIndex = sourceIndex / 8 | 0;
      const bitOffset = 7 - sourceIndex % 8;
      const mask = 1 << bitOffset;
      const value = (this.bytes[byteIndex] & mask) !== 0;
      if (value) result.set(i, true);
    }
    return result;
  }
  getBuffer() {
    return this.bytes;
  }
};
function createBitsy(size) {
  return new Bitsy(size);
}
__name(createBitsy, "createBitsy");

// encoders/js/env/node.ts
var node_default = {
  createBuffer(length) {
    return Buffer.alloc(length);
  },
  writeUInt32BE(buffer, value, offset) {
    buffer.writeUInt32BE(value, offset);
  },
  writeUInt8(buffer, value, offset) {
    buffer.writeUInt8(value, offset);
  },
  concatBuffers(chunks) {
    return Buffer.concat(chunks);
  },
  toBase64(buffer) {
    return Buffer.from(buffer).toString("base64");
  },
  createBitset(size) {
    return createBitsy(size);
  }
};

export { node_default as default };
//# sourceMappingURL=node.js.map
//# sourceMappingURL=node.js.map