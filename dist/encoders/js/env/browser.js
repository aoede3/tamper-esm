var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// encoders/js/env/browser.ts
var BitsyLite = class _BitsyLite {
  static {
    __name(this, "BitsyLite");
  }
  length;
  bytes;
  constructor(size) {
    this.length = size;
    this.bytes = new Uint8Array(Math.ceil(size / 8));
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
    const next = new Uint8Array(Math.ceil(size / 8));
    next.set(this.bytes);
    this.bytes = next;
    this.length = size;
  }
  slice(begin, end) {
    const length = Math.max(0, end - begin);
    const result = new _BitsyLite(length);
    if (begin % 8 === 0 && length % 8 === 0) {
      const beginByte2 = begin / 8;
      const numBytes = length / 8;
      result.bytes.set(this.bytes.subarray(beginByte2, beginByte2 + numBytes));
      return result;
    }
    const beginByte = begin / 8 | 0;
    const beginBitOffset = begin % 8;
    const endByte = (end - 1) / 8 | 0;
    const numSourceBytes = endByte - beginByte + 1;
    if (beginBitOffset === 0) {
      const bytesToCopy = Math.ceil(length / 8);
      result.bytes.set(this.bytes.subarray(beginByte, beginByte + bytesToCopy));
    } else {
      const shift = beginBitOffset;
      for (let i = 0; i < numSourceBytes - 1; i += 1) {
        const currentByte = this.bytes[beginByte + i];
        const nextByte = this.bytes[beginByte + i + 1];
        result.bytes[i] = (currentByte << shift | nextByte >> 8 - shift) & 255;
      }
      if (numSourceBytes > 0) {
        const lastSourceByte = this.bytes[beginByte + numSourceBytes - 1];
        const resultByteIndex = numSourceBytes - 1;
        if (resultByteIndex < result.bytes.length) {
          result.bytes[resultByteIndex] = lastSourceByte << shift & 255;
        }
      }
    }
    return result;
  }
  getBuffer() {
    return this.bytes;
  }
};
function toBase64(bytes) {
  if (!bytes || !bytes.length) return void 0;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 32768;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }
  throw new Error("No base64 encoder available.");
}
__name(toBase64, "toBase64");
var browser_default = {
  createBuffer(length) {
    return new Uint8Array(length);
  },
  writeUInt32BE(buffer, value, offset) {
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    view.setUint32(offset, value, false);
  },
  writeUInt8(buffer, value, offset) {
    buffer[offset] = value & 255;
  },
  concatBuffers(chunks) {
    let total = 0;
    chunks.forEach((chunk) => {
      total += chunk.length;
    });
    const out = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      out.set(chunk, offset);
      offset += chunk.length;
    });
    return out;
  },
  toBase64,
  createBitset(size) {
    return new BitsyLite(size);
  }
};

export { browser_default as default };
//# sourceMappingURL=browser.js.map
//# sourceMappingURL=browser.js.map