class Bitsy {
  constructor(size) {
    this.length = size;
    this.bytes = Buffer.alloc(Math.ceil(size / 8));
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
    const next = Buffer.alloc(Math.ceil(size / 8));
    this.bytes.copy(next);
    this.bytes = next;
    this.length = size;
  }

  slice(begin, end) {
    const length = Math.max(0, end - begin);
    const result = new Bitsy(length);
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

export default function createBitsy(size) {
  return new Bitsy(size);
}
