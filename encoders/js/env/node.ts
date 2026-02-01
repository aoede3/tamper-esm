import createBitsy from "../../../vendor/bitsy/index.js";

type BufferLike = Uint8Array;

export default {
  createBuffer(length: number): BufferLike {
    return Buffer.alloc(length);
  },
  writeUInt32BE(buffer: BufferLike, value: number, offset: number): void {
    buffer.writeUInt32BE(value, offset);
  },
  writeUInt8(buffer: BufferLike, value: number, offset: number): void {
    buffer.writeUInt8(value, offset);
  },
  concatBuffers(chunks: BufferLike[]): BufferLike {
    return Buffer.concat(chunks as unknown as Buffer[]);
  },
  toBase64(buffer: BufferLike): string {
    return Buffer.from(buffer).toString("base64");
  },
  createBitset(size: number) {
    return createBitsy(size);
  },
};
