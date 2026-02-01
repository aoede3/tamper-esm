class BitsyLite {
  length: number;
  bytes: Uint8Array;

  constructor(size: number) {
    this.length = size;
    this.bytes = new Uint8Array(Math.ceil(size / 8));
  }

  set(index: number, value: boolean) {
    const byteIndex = (index / 8) | 0;
    const bitOffset = 7 - (index % 8);
    const mask = 1 << bitOffset;
    if (value) {
      this.bytes[byteIndex] |= mask;
    } else {
      this.bytes[byteIndex] &= ~mask;
    }
  }

  setSize(size: number) {
    if (size <= this.length) return;
    const next = new Uint8Array(Math.ceil(size / 8));
    next.set(this.bytes);
    this.bytes = next;
    this.length = size;
  }

  slice(begin: number, end: number) {
    const length = Math.max(0, end - begin);
    const result = new BitsyLite(length);

    // Fast path: byte-aligned slice
    if (begin % 8 === 0 && length % 8 === 0) {
      const beginByte = begin / 8;
      const numBytes = length / 8;
      result.bytes.set(this.bytes.subarray(beginByte, beginByte + numBytes));
      return result;
    }

    // Optimized path: copy aligned bytes with bit shifting
    const beginByte = (begin / 8) | 0;
    const beginBitOffset = begin % 8;
    const endByte = ((end - 1) / 8) | 0;
    const numSourceBytes = endByte - beginByte + 1;

    if (beginBitOffset === 0) {
      // Begin is byte-aligned, just copy bytes
      const bytesToCopy = Math.ceil(length / 8);
      result.bytes.set(this.bytes.subarray(beginByte, beginByte + bytesToCopy));
    } else {
      // Need to shift bits
      const shift = beginBitOffset;
      for (let i = 0; i < numSourceBytes - 1; i += 1) {
        const currentByte = this.bytes[beginByte + i];
        const nextByte = this.bytes[beginByte + i + 1];
        result.bytes[i] = ((currentByte << shift) | (nextByte >> (8 - shift))) & 0xff;
      }
      // Handle last byte
      if (numSourceBytes > 0) {
        const lastSourceByte = this.bytes[beginByte + numSourceBytes - 1];
        const resultByteIndex = numSourceBytes - 1;
        if (resultByteIndex < result.bytes.length) {
          result.bytes[resultByteIndex] = (lastSourceByte << shift) & 0xff;
        }
      }
    }

    return result;
  }

  getBuffer(): Uint8Array {
    return this.bytes;
  }
}

function toBase64(bytes: Uint8Array): string | undefined {
  if (!bytes || !bytes.length) return undefined;

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  throw new Error("No base64 encoder available.");
}

export default {
  createBuffer(length: number): Uint8Array {
    return new Uint8Array(length);
  },
  writeUInt32BE(buffer: Uint8Array, value: number, offset: number): void {
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    view.setUint32(offset, value, false);
  },
  writeUInt8(buffer: Uint8Array, value: number, offset: number): void {
    buffer[offset] = value & 0xff;
  },
  concatBuffers(chunks: Uint8Array[]): Uint8Array {
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
  createBitset(size: number) {
    return new BitsyLite(size);
  },
};
