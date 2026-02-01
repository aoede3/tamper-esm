declare class BitsyLite {
    length: number;
    bytes: Uint8Array;
    constructor(size: number);
    set(index: number, value: boolean): void;
    setSize(size: number): void;
    slice(begin: number, end: number): BitsyLite;
    getBuffer(): Uint8Array;
}
declare function toBase64(bytes: Uint8Array): string | undefined;
declare const _default: {
    createBuffer(length: number): Uint8Array;
    writeUInt32BE(buffer: Uint8Array, value: number, offset: number): void;
    writeUInt8(buffer: Uint8Array, value: number, offset: number): void;
    concatBuffers(chunks: Uint8Array[]): Uint8Array;
    toBase64: typeof toBase64;
    createBitset(size: number): BitsyLite;
};

export { _default as default };
