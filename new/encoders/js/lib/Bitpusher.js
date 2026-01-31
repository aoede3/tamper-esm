import createBitsy from 'bitsy';

export default class Bitpusher {
  constructor() {
    this.clear();
  }

  push(bit) {
    const index = this.length;
    if (bit) {
      this.bitset.set(index, true);
    }

    this.length += 1;
    if (this.bitset.length <= this.length) {
      this.bitset.setSize(this.bitset.length * 2);
    }
  }

  pushMany(bit, howMany) {
    if (howMany <= 0) return;
    while (howMany--) this.push(bit);
  }

  clear() {
    this.bitset = createBitsy(8);
    this.length = 0;
  }

  slice(begin, end) {
    const bitpusher = new Bitpusher();
    bitpusher.bitset = this.bitset.slice(begin, end);
    bitpusher.length = end;
    return bitpusher;
  }

  getBuffer() {
    return this.bitset.slice(0, this.length).getBuffer();
  }

  isEmpty() {
    return this.length === 0;
  }
}
