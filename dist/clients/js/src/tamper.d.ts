type JsonObject = Record<string, unknown>;
type ExistencePack = {
    pack: string;
};
type AttributePack = {
    encoding: string;
    attr_name: string;
    possibilities: string[];
    pack: string;
    bit_window_width: number;
    item_window_width: number;
};
type PackData = {
    existence?: ExistencePack;
    attributes?: AttributePack[];
    collection?: JsonObject[];
};

declare const Tamper: {
    biterate(encoded: string): {
        readBit: () => number;
        readBits: (count: number) => number[];
        readNumber: (count: number) => number;
        readChunk: (count: number) => number[];
        hasBits: (count: number) => boolean;
    };
    unpackExistence(element: ExistencePack, defaultAttrs?: JsonObject): JsonObject[];
    unpackIntegerEncoding(element: AttributePack, numItems: number): (string | string[])[];
    unpackBitmapEncoding(element: AttributePack): string[][];
    unpackData(data: PackData, defaultAttrs?: JsonObject): JsonObject[];
};
declare function createTamper(): {
    biterate(encoded: string): {
        readBit: () => number;
        readBits: (count: number) => number[];
        readNumber: (count: number) => number;
        readChunk: (count: number) => number[];
        hasBits: (count: number) => boolean;
    };
    unpackExistence(element: ExistencePack, defaultAttrs?: JsonObject): JsonObject[];
    unpackIntegerEncoding(element: AttributePack, numItems: number): (string | string[])[];
    unpackBitmapEncoding(element: AttributePack): string[][];
    unpackData(data: PackData, defaultAttrs?: JsonObject): JsonObject[];
};

export { Tamper, createTamper, createTamper as default };
