class BitsyLite {
  constructor(size) {
    this.length = size;
    this.bytes = new Uint8Array(Math.ceil(size / 8));
  }

  set(index, value) {
    const byteIndex = (index / 8) | 0;
    const bitOffset = 7 - (index % 8);
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
    const result = new BitsyLite(length);
    for (let i = 0; i < length; i += 1) {
      const sourceIndex = begin + i;
      const byteIndex = (sourceIndex / 8) | 0;
      const bitOffset = 7 - (sourceIndex % 8);
      const mask = 1 << bitOffset;
      const value = (this.bytes[byteIndex] & mask) !== 0;
      if (value) result.set(i, true);
    }
    return result;
  }

  getBuffer() {
    return this.bytes;
  }
}

function toBase64(bytes) {
  if (!bytes || !bytes.length) return undefined;

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  if (typeof btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  throw new Error('No base64 encoder available.');
}

export default {
  createBuffer(length) {
    return new Uint8Array(length);
  },
  writeUInt32BE(buffer, value, offset) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    view.setUint32(offset, value, false);
  },
  writeUInt8(buffer, value, offset) {
    buffer[offset] = value & 0xff;
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
