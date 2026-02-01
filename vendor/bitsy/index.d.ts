export interface Bitset {
  length: number;
  bytes: Buffer;
  set(index: number, value: boolean): void;
  setSize(size: number): void;
  slice(begin: number, end: number): Bitset;
  getBuffer(): Buffer;
}

export default function createBitsy(size: number): Bitset;
