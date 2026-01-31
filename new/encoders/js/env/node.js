import createBitsy from "../../../vendor/bitsy/index.js";

export default {
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
  },
};
