interface Bitset {
  length: number;
  bytes: Buffer;
  set(index: number, value: boolean): void;
  setSize(size: number): void;
  slice(begin: number, end: number): Bitset;
  getBuffer(): Buffer;
}

type BufferLike = Uint8Array;
declare const _default: {
    createBuffer(length: number): BufferLike;
    writeUInt32BE(buffer: BufferLike, value: number, offset: number): void;
    writeUInt8(buffer: BufferLike, value: number, offset: number): void;
    concatBuffers(chunks: BufferLike[]): BufferLike;
    toBase64(buffer: BufferLike): string;
    createBitset(size: number): Bitset;
};

export { _default as default };
