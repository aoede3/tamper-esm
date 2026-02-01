import setBit from "./setBit.ts";
import { clone, merge, values, last, sortBy } from "./utils.ts";

type BufferLike = Uint8Array;

type Bitset = {
  length: number;
  set(index: number, value: boolean): void;
  setSize(size: number): void;
  slice(begin: number, end: number): Bitset;
  getBuffer(): BufferLike;
};

type EncoderEnv = {
  createBuffer(length: number): BufferLike;
  writeUInt32BE(buffer: BufferLike, value: number, offset: number): void;
  writeUInt8(buffer: BufferLike, value: number, offset: number): void;
  concatBuffers(chunks: BufferLike[]): BufferLike;
  toBase64(buffer: BufferLike): string;
  createBitset(size: number): Bitset;
};

const log2Cache = new Map<number, number>();

function log2(x: number): number {
  if (log2Cache.has(x)) {
    return log2Cache.get(x)!;
  }
  const result = Math.log(x) / Math.LN2;
  log2Cache.set(x, result);
  return result;
}

export default function createEncoder(env: EncoderEnv) {
  type DataItem = Record<string, unknown>;
  type AttributeOpts = {
    attrName: string;
    possibilities: unknown[];
    maxChoices: number;
    [key: string]: unknown;
  };
  type BufferedAttrOpts = {
    attr_name?: string;
    attrName?: string;
    [key: string]: unknown;
  };

  class Bitpusher {
    bitset: Bitset;
    length: number;

    constructor() {
      this.clear();
    }

    push(bit: number | boolean) {
      const index = this.length;
      if (bit) {
        this.bitset.set(index, true);
      }

      this.length += 1;
      if (this.bitset.length <= this.length) {
        this.bitset.setSize(this.bitset.length * 2);
      }
    }

    pushMany(bit: number | boolean, howMany: number) {
      if (howMany <= 0) return;
      while (howMany--) this.push(bit);
    }

    clear(): void {
      this.bitset = env.createBitset(8);
      this.length = 0;
    }

    slice(begin: number, end: number) {
      const bitpusher = new Bitpusher();
      bitpusher.bitset = this.bitset.slice(begin, end);
      bitpusher.length = end - begin;
      return bitpusher;
    }

    getBuffer(): BufferLike {
      return this.bitset.slice(0, this.length).getBuffer();
    }

    isEmpty(): boolean {
      return this.length === 0;
    }
  }

  class Pack {
    possibilities: string[];
    attrName: string;
    maxChoices: number;
    meta: Record<string, unknown>;
    possIndex: Map<string, number>;
    encoding: string | null;
    bitWindowWidth: number | null;
    itemWindowWidth: number | null;
    buffer: BufferLike | null;
    maxGuid: number;
    baseOffset: number;
    numItems: number;

    constructor(
      attrName: string,
      possibilities: unknown[],
      maxChoices: number,
    ) {
      if (!possibilities)
        throw new Error(`Possibilities are empty for ${attrName}`);

      this.possibilities = possibilities.map((a) => `${a}`);
      this.possIndex = new Map();
      this.possibilities.forEach((value, index) => {
        this.possIndex.set(value, index);
      });
      this.attrName = attrName;
      this.maxChoices = maxChoices;
      this.meta = {};

      this.encoding = null;
      this.bitWindowWidth = null;
      this.itemWindowWidth = null;
      this.buffer = null;
      this.maxGuid = 0;
      this.baseOffset = 0;
      this.numItems = 0;
    }

    toPlainObject() {
      const output = {
        encoding: this.encoding,
        attr_name: this.attrName,
        possibilities: this.possibilities,
        pack: this.encodedBitset(),
        item_window_width: this.itemWindowWidth,
        bit_window_width: this.bitWindowWidth,
        max_choices: this.maxChoices,
        max_guid: this.maxGuid ?? 0,
      };

      return merge(output, this.meta);
    }

    finalizePack() {}

    initializePack(_maxGuid: number, _numItems: number): void {}

    encode(_idx: number, _data: Record<string, unknown>): void {}

    encodedBitset(): string | undefined {
      if (this.buffer && this.buffer.length) {
        return env.toBase64(this.buffer);
      }
      return undefined;
    }
  }

  class IntegerPack extends Pack {
    static HEADER_OCTETS = 5;
    constructor(
      attrName: string,
      possibilities: unknown[],
      maxChoices: number,
    ) {
      super(attrName, possibilities, maxChoices);
      this.encoding = "integer";
    }

    encode(idx: number, data: Record<string, unknown>) {
      let choices = data[this.attrName] as unknown;
      if (!Array.isArray(choices)) choices = [choices];

      for (let i = 0; i < this.maxChoices; i += 1) {
        const choiceOffset =
          this.itemWindowWidth * idx + this.bitWindowWidth * i;
        const value = choices[i];

        const possibilityIndex = this.possIndex.get(`${value}`);
        if (possibilityIndex === undefined) continue;

        const possibilityId = possibilityIndex + 1;
        const bitOffset = this.baseOffset + choiceOffset;

        for (let bitPos = 0; bitPos < this.bitWindowWidth; bitPos += 1) {
          const bitValue =
            (possibilityId >> (this.bitWindowWidth - 1 - bitPos)) & 1;
          setBit(this.buffer, bitOffset + bitPos, bitValue === 1);
        }
      }
    }

    initializePack(maxGuid: number, numItems: number) {
      this.baseOffset = IntegerPack.HEADER_OCTETS * 8;

      this.bitWindowWidth = Math.ceil(log2(this.possibilities.length + 1)) || 1;
      this.itemWindowWidth = this.bitWindowWidth * this.maxChoices;

      const bits = this.itemWindowWidth * numItems + this.baseOffset;
      const octets = Math.ceil(bits / 8);
      this.numItems = numItems;
      this.buffer = env.createBuffer(octets);

      const dataLength = this.itemWindowWidth * numItems;
      const byteLength = (dataLength / 8) | 0;
      const remainingBits = dataLength % 8;

      env.writeUInt32BE(this.buffer, byteLength, 0);
      env.writeUInt8(this.buffer, remainingBits, 4);
    }
  }

  class BitmapPack extends Pack {
    static HEADER_OCTETS = 5;
    constructor(
      attrName: string,
      possibilities: unknown[],
      maxChoices: number,
    ) {
      super(attrName, possibilities, maxChoices);
      this.encoding = "bitmap";
    }

    encode(idx: number, data: Record<string, unknown>) {
      let choices = data[this.attrName] as unknown;
      if (!Array.isArray(choices)) choices = [choices];

      const itemOffset = idx * this.itemWindowWidth;

      (choices as unknown[]).forEach((choice) => {
        const choiceOffset = this.possIndex.get(`${choice}`);
        if (choiceOffset !== undefined) {
          setBit(
            this.buffer,
            this.baseOffset + itemOffset + choiceOffset,
            true,
          );
        }
      });
    }

    initializePack(maxGuid: number, numItems: number) {
      this.baseOffset = BitmapPack.HEADER_OCTETS * 8;
      this.bitWindowWidth = 1;
      this.itemWindowWidth = this.possibilities.length;

      const bits = this.itemWindowWidth * numItems + this.baseOffset;
      const octets = Math.ceil(bits / 8);

      this.buffer = env.createBuffer(octets);

      const dataLength = this.itemWindowWidth * numItems;
      const byteLength = (dataLength / 8) | 0;
      const remainingBits = dataLength % 8;

      env.writeUInt32BE(this.buffer, byteLength, 0);
      env.writeUInt8(this.buffer, remainingBits, 4);
    }
  }

  class ExistencePack extends Pack {
    static KEEP = 0x00;
    static SKIP = 0x01;
    static RUN = 0x02;
    lastGuid: number;
    runCounter: number;
    bitpusher: Bitpusher;
    outputBuffers: BufferLike[];
    output?: unknown;

    constructor() {
      super("existence", ["existence"], 1);
      this.encoding = "existence";
      this.lastGuid = 0;
      this.runCounter = 0;
      this.bitpusher = new Bitpusher();
      this.outputBuffers = [];
    }

    initializePack(_maxGuid: number, _numItems: number): void {}

    encode(guid: number) {
      let guidDiff = guid - this.lastGuid;

      if (this.bitpusher.isEmpty() && !this.output && guid > 0) {
        guidDiff += 1;
      }

      if (guidDiff === 1 || guid === 0) {
        this.bitpusher.push(1);
        this.runCounter += 1;
      } else if (guidDiff <= 0) {
        throw new Error(
          `Error: data was not sorted by GUID (got ${this.lastGuid}, then ${guid})!`,
        );
      } else if (guidDiff > 40) {
        this.dumpKeep(this.bitpusher, this.runCounter);

        this.outputBuffers.push(this.controlCode("skip", guidDiff - 1));

        this.bitpusher.clear();
        this.bitpusher.push(1);
        this.runCounter = 1;
      } else {
        if (this.runCounter > 40) {
          this.dumpKeep(this.bitpusher, this.runCounter);
          this.bitpusher.clear();
          this.runCounter = 0;
        }

        this.bitpusher.pushMany(0, guidDiff - 1);
        this.bitpusher.push(1);
        this.runCounter = 1;
      }

      this.lastGuid = guid;
    }

    finalizePack(): void {
      this.dumpKeep(this.bitpusher, this.runCounter);
      this.buffer = env.concatBuffers(this.outputBuffers);
    }

    toPlainObject(): Record<string, unknown> {
      return {
        attr_name: "existence",
        display_name: "",
        max_choices: 0,
        possibilities: null,
        filter_type: "",
        display_type: "",
        encoding: this.encoding,
        pack: this.encodedBitset(),
        bit_window_width: 0,
        item_window_width: 0,
        max_guid: this.maxGuid ?? 0,
      };
    }

    dumpKeep(bitpusher: Bitpusher, runLen: number) {
      if (runLen >= 40) {
        const length = bitpusher.length - runLen;
        this.dumpKeep(bitpusher.slice(0, length), 0);
        this.outputBuffers.push(this.controlCode("run", runLen));
      } else if (bitpusher.length > 0) {
        this.outputBuffers.push(this.controlCode("keep", bitpusher.length));
        this.outputBuffers.push(bitpusher.getBuffer());
      }
    }

    controlCode(cmd: "keep" | "skip" | "run", offset = 0): BufferLike {
      let buffer: BufferLike;

      switch (cmd) {
        case "keep": {
          const bytesToKeep = Math.floor(offset / 8);
          const remainingBits = offset % 8;

          buffer = env.createBuffer(6);
          env.writeUInt8(buffer, ExistencePack.KEEP, 0);
          env.writeUInt32BE(buffer, bytesToKeep, 1);
          env.writeUInt8(buffer, remainingBits, 5);
          break;
        }
        case "skip":
          buffer = env.createBuffer(5);
          env.writeUInt8(buffer, ExistencePack.SKIP, 0);
          env.writeUInt32BE(buffer, offset, 1);
          break;
        case "run":
          buffer = env.createBuffer(5);
          env.writeUInt8(buffer, ExistencePack.RUN, 0);
          env.writeUInt32BE(buffer, offset, 1);
          break;
        default:
          throw new Error(`Unknown control command: ${cmd}!`);
      }

      return buffer;
    }
  }

  class PackSet {
    static DEFAULT_GUID_ATTR = "id";
    meta: Record<string, unknown>;
    existencePack: ExistencePack;
    attrPacks: Record<string, Pack>;
    bufferedAttrs: Record<string, Record<string, unknown>>;

    constructor(opts: Record<string, unknown> = {}) {
      this.meta = {};
      this.existencePack = new ExistencePack();
      this.attrPacks = {};
      this.bufferedAttrs = {};
      this.meta = opts;
    }

    addAttribute(opts: AttributeOpts) {
      ["attrName", "possibilities", "maxChoices"].forEach((requiredOpt) => {
        if (opts[requiredOpt] === undefined) {
          throw new Error(
            `${requiredOpt} is required when adding an attribute!`,
          );
        }
      });

      const localOpts = clone(opts) as AttributeOpts;
      const name = localOpts.attrName;
      delete localOpts.attrName;

      const possibilities = localOpts.possibilities;
      delete localOpts.possibilities;

      const maxChoices = localOpts.maxChoices;
      delete localOpts.maxChoices;

      const pack = createPack(
        name as string,
        possibilities as unknown[],
        maxChoices as number,
      );
      pack.meta = localOpts;

      this.attrPacks[name] = pack;

      return pack;
    }

    addBufferedAttribute(opts: BufferedAttrOpts) {
      const localOpts = clone(opts) as BufferedAttrOpts;
      const attrName = (localOpts.attrName ?? localOpts.attr_name) as string;
      if (attrName === undefined) {
        throw new Error(
          "attrName or attr_name is required when adding a buffered attribute!",
        );
      }

      delete localOpts.attrName;
      delete localOpts.attr_name;

      this.bufferedAttrs[attrName] = merge({ attrName }, localOpts);
    }

    attributes() {
      return Object.keys(this.attrPacks);
    }

    packFor(attr: string) {
      return this.attrPacks[attr];
    }

    pack(data: DataItem[], opts: Record<string, unknown> = {}) {
      const localOpts = (clone(opts) || {}) as Record<string, unknown>;

      if (localOpts.guidAttr == null) {
        localOpts.guidAttr = PackSet.DEFAULT_GUID_ATTR;
      }
      const guidAttr = localOpts.guidAttr as string;
      if (localOpts.maxGuid == null) {
        localOpts.maxGuid = (last(data) as DataItem)[guidAttr];
      }
      if (localOpts.numItems == null) {
        localOpts.numItems = data.length;
      }

      this.buildPack(localOpts, data);
    }

    buildPack(opts: Record<string, unknown> = {}, items: DataItem[]) {
      ["numItems", "maxGuid"].forEach((requiredOpt) => {
        if (opts[requiredOpt] === undefined) {
          throw new Error(
            `You must specify ${requiredOpt} to start building a pack!`,
          );
        }
      });

      const existencePack = this.existencePack;
      const numItems = opts.numItems as number;
      const maxGuid = opts.maxGuid as number;
      const guidAttr = (opts.guidAttr as string) || PackSet.DEFAULT_GUID_ATTR;
      const packs = values(this.attrPacks) as Pack[];

      existencePack.initializePack(maxGuid, numItems);
      existencePack.maxGuid = 0;
      packs.forEach((pack) => pack.initializePack(maxGuid, numItems));
      packs.forEach((pack) => {
        pack.maxGuid = 0;
      });

      let idx = 0;

      items.forEach((item) => {
        const guid = item[guidAttr] as number;

        existencePack.encode(guid);

        packs.forEach((pack) => {
          pack.encode(idx, item);
        });

        idx += 1;
      });

      existencePack.finalizePack();
      packs.forEach((pack) => pack.finalizePack());
    }

    buildUnorderedPack(opts: Record<string, unknown>, items: DataItem[]) {
      const guidAttr = (opts.guidAttr as string) || "id";
      const data: Record<string, DataItem> = {};

      items.forEach((item) => {
        const guid = item[guidAttr] as string | number;
        data[String(guid)] = item;
      });

      const sortedData = sortBy(data, (d, key) => key) as DataItem[];
      this.pack(sortedData, opts);
    }

    toPlainObject(opts: Record<string, unknown> = {}) {
      const attributes = values(this.attrPacks).map((pack) => pack.toPlainObject());
      const buffered = values(this.bufferedAttrs) as Record<string, unknown>[];

      const output = {
        existence: this.existencePack.toPlainObject(),
        attributes: attributes.concat(buffered),
      };

      return merge(output, this.meta);
    }

    toJSON(): string {
      return JSON.stringify(this.toPlainObject());
    }
  }

  function createPack(
    attrName: string,
    possibilities: unknown[],
    maxChoices: number,
  ) {
    let PackConstructor;

    if (maxChoices * log2(possibilities.length) < possibilities.length) {
      PackConstructor = IntegerPack;
    } else {
      PackConstructor = BitmapPack;
    }

    return new PackConstructor(attrName, possibilities, maxChoices);
  }

  function createPackSet(): PackSet {
    return new PackSet();
  }

  return {
    Bitpusher,
    createPackSet,
    PackSet,
    createPack,
    Pack,
    IntegerPack,
    BitmapPack,
    ExistencePack,
  };
}
