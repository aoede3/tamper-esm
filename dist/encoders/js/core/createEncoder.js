var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// encoders/js/core/utils.ts
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
__name(isPlainObject, "isPlainObject");
function clone(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.slice();
  return Object.assign({}, obj);
}
__name(clone, "clone");
function values(obj) {
  return Object.keys(obj).map((key) => obj[key]);
}
__name(values, "values");
function last(arr) {
  return arr && arr.length ? arr[arr.length - 1] : void 0;
}
__name(last, "last");
function sortBy(obj, iteratee) {
  const entries = Object.keys(obj).map((key) => {
    const value = obj[key];
    return [key, value, iteratee(value, key)];
  });
  entries.sort((a, b) => {
    const av = a[2];
    const bv = b[2];
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return entries.map((entry) => entry[1]);
}
__name(sortBy, "sortBy");
function merge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    const max = Math.max(target.length, source.length);
    for (let i = 0; i < max; i += 1) {
      if (!(i in source)) continue;
      const sourceVal = source[i];
      const targetVal = target[i];
      if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
        target[i] = merge(targetVal.slice(), sourceVal);
      } else if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
        target[i] = merge(Object.assign({}, targetVal), sourceVal);
      } else {
        target[i] = sourceVal;
      }
    }
    return target;
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceVal = source[key];
      const targetVal = target[key];
      if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
        target[key] = merge(targetVal.slice(), sourceVal);
      } else if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
        target[key] = merge(Object.assign({}, targetVal), sourceVal);
      } else {
        target[key] = sourceVal;
      }
    });
    return target;
  }
  return source;
}
__name(merge, "merge");

// encoders/js/core/createEncoder.ts
var log2Cache = /* @__PURE__ */ new Map();
function log2(x) {
  if (log2Cache.has(x)) {
    return log2Cache.get(x);
  }
  const result = Math.log(x) / Math.LN2;
  log2Cache.set(x, result);
  return result;
}
__name(log2, "log2");
function toStringKey(value) {
  return typeof value === "string" ? value : String(value);
}
__name(toStringKey, "toStringKey");
function createEncoder(env) {
  class Bitpusher {
    static {
      __name(this, "Bitpusher");
    }
    bitset;
    length;
    capacity;
    constructor() {
      this.clear();
    }
    push(bit) {
      const index = this.length;
      if (bit) {
        this.bitset.set(index, true);
      }
      this.length += 1;
      if (this.length >= this.capacity) {
        this.capacity = this.capacity * 2;
        this.bitset.setSize(this.capacity);
      }
    }
    pushMany(bit, howMany) {
      if (howMany <= 0) return;
      while (howMany--) this.push(bit);
    }
    clear() {
      this.bitset = env.createBitset(8);
      this.length = 0;
      this.capacity = 8;
    }
    slice(begin, end) {
      const bitpusher = new Bitpusher();
      bitpusher.bitset = this.bitset.slice(begin, end);
      bitpusher.length = end - begin;
      return bitpusher;
    }
    getBuffer() {
      return this.bitset.slice(0, this.length).getBuffer();
    }
    isEmpty() {
      return this.length === 0;
    }
  }
  class Pack {
    static {
      __name(this, "Pack");
    }
    possibilities;
    attrName;
    maxChoices;
    meta;
    possIndex;
    encoding;
    bitWindowWidth;
    itemWindowWidth;
    buffer;
    maxGuid;
    baseOffset;
    numItems;
    constructor(attrName, possibilities, maxChoices) {
      if (!possibilities)
        throw new Error(`Possibilities are empty for ${attrName}`);
      this.possibilities = possibilities.map((a) => `${a}`);
      this.possIndex = /* @__PURE__ */ new Map();
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
        max_guid: this.maxGuid ?? 0
      };
      return merge(output, this.meta);
    }
    finalizePack() {
    }
    initializePack(_maxGuid, _numItems) {
    }
    encode(_idx, _data) {
    }
    encodedBitset() {
      if (this.buffer && this.buffer.length) {
        return env.toBase64(this.buffer);
      }
      return void 0;
    }
  }
  class IntegerPack extends Pack {
    static {
      __name(this, "IntegerPack");
    }
    static HEADER_OCTETS = 5;
    constructor(attrName, possibilities, maxChoices) {
      super(attrName, possibilities, maxChoices);
      this.encoding = "integer";
    }
    encode(idx, data) {
      let choices = data[this.attrName];
      if (!Array.isArray(choices)) choices = [choices];
      for (let i = 0; i < this.maxChoices; i += 1) {
        const choiceOffset = this.itemWindowWidth * idx + this.bitWindowWidth * i;
        const value = choices[i];
        const possibilityIndex = this.possIndex.get(toStringKey(value));
        if (possibilityIndex === void 0) continue;
        const possibilityId = possibilityIndex + 1;
        const bitOffset = this.baseOffset + choiceOffset;
        for (let bitPos = 0; bitPos < this.bitWindowWidth; bitPos += 1) {
          const bitValue = possibilityId >> this.bitWindowWidth - 1 - bitPos & 1;
          const offset = bitOffset + bitPos;
          const octetIndex = offset / 8 | 0;
          const mask = 1 << 7 - offset % 8;
          if (bitValue) {
            this.buffer[octetIndex] |= mask;
          } else {
            this.buffer[octetIndex] &= ~mask;
          }
        }
      }
    }
    initializePack(maxGuid, numItems) {
      this.baseOffset = IntegerPack.HEADER_OCTETS * 8;
      this.bitWindowWidth = Math.ceil(log2(this.possibilities.length + 1)) || 1;
      this.itemWindowWidth = this.bitWindowWidth * this.maxChoices;
      const bits = this.itemWindowWidth * numItems + this.baseOffset;
      const octets = Math.ceil(bits / 8);
      this.numItems = numItems;
      this.buffer = env.createBuffer(octets);
      const dataLength = this.itemWindowWidth * numItems;
      const byteLength = dataLength / 8 | 0;
      const remainingBits = dataLength % 8;
      env.writeUInt32BE(this.buffer, byteLength, 0);
      env.writeUInt8(this.buffer, remainingBits, 4);
    }
  }
  class BitmapPack extends Pack {
    static {
      __name(this, "BitmapPack");
    }
    static HEADER_OCTETS = 5;
    constructor(attrName, possibilities, maxChoices) {
      super(attrName, possibilities, maxChoices);
      this.encoding = "bitmap";
    }
    encode(idx, data) {
      let choices = data[this.attrName];
      if (!Array.isArray(choices)) choices = [choices];
      const itemOffset = idx * this.itemWindowWidth;
      choices.forEach((choice) => {
        const choiceOffset = this.possIndex.get(toStringKey(choice));
        if (choiceOffset !== void 0) {
          const offset = this.baseOffset + itemOffset + choiceOffset;
          const octetIndex = offset / 8 | 0;
          const mask = 1 << 7 - offset % 8;
          this.buffer[octetIndex] |= mask;
        }
      });
    }
    initializePack(maxGuid, numItems) {
      this.baseOffset = BitmapPack.HEADER_OCTETS * 8;
      this.bitWindowWidth = 1;
      this.itemWindowWidth = this.possibilities.length;
      const bits = this.itemWindowWidth * numItems + this.baseOffset;
      const octets = Math.ceil(bits / 8);
      this.buffer = env.createBuffer(octets);
      const dataLength = this.itemWindowWidth * numItems;
      const byteLength = dataLength / 8 | 0;
      const remainingBits = dataLength % 8;
      env.writeUInt32BE(this.buffer, byteLength, 0);
      env.writeUInt8(this.buffer, remainingBits, 4);
    }
  }
  class ExistencePack extends Pack {
    static {
      __name(this, "ExistencePack");
    }
    static KEEP = 0;
    static SKIP = 1;
    static RUN = 2;
    lastGuid;
    runCounter;
    bitpusher;
    outputBuffers;
    controlCodes;
    output;
    constructor() {
      super("existence", ["existence"], 1);
      this.encoding = "existence";
      this.lastGuid = 0;
      this.runCounter = 0;
      this.bitpusher = new Bitpusher();
      this.outputBuffers = [];
      this.controlCodes = [];
    }
    initializePack(_maxGuid, _numItems) {
    }
    encode(guid) {
      let guidDiff = guid - this.lastGuid;
      if (this.bitpusher.isEmpty() && !this.output && guid > 0) {
        guidDiff += 1;
      }
      if (guidDiff === 1 || guid === 0) {
        this.bitpusher.push(1);
        this.runCounter += 1;
      } else if (guidDiff <= 0) {
        throw new Error(
          `Error: data was not sorted by GUID (got ${this.lastGuid}, then ${guid})!`
        );
      } else if (guidDiff > 40) {
        this.dumpKeep(this.bitpusher, this.runCounter);
        this.controlCodes.push({ type: "skip", offset: guidDiff - 1 });
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
    finalizePack() {
      this.dumpKeep(this.bitpusher, this.runCounter);
      let totalSize = 0;
      for (const cc of this.controlCodes) {
        if (cc.type === "keep") {
          totalSize += 6;
          totalSize += cc.buffer?.length || 0;
        } else {
          totalSize += 5;
        }
      }
      this.buffer = env.createBuffer(totalSize);
      let offset = 0;
      for (const cc of this.controlCodes) {
        if (cc.type === "keep") {
          const bytesToKeep = Math.floor(cc.offset / 8);
          const remainingBits = cc.offset % 8;
          env.writeUInt8(this.buffer, ExistencePack.KEEP, offset);
          env.writeUInt32BE(this.buffer, bytesToKeep, offset + 1);
          env.writeUInt8(this.buffer, remainingBits, offset + 5);
          offset += 6;
          if (cc.buffer) {
            for (let i = 0; i < cc.buffer.length; i++) {
              this.buffer[offset++] = cc.buffer[i];
            }
          }
        } else if (cc.type === "skip") {
          env.writeUInt8(this.buffer, ExistencePack.SKIP, offset);
          env.writeUInt32BE(this.buffer, cc.offset, offset + 1);
          offset += 5;
        } else if (cc.type === "run") {
          env.writeUInt8(this.buffer, ExistencePack.RUN, offset);
          env.writeUInt32BE(this.buffer, cc.offset, offset + 1);
          offset += 5;
        }
      }
    }
    toPlainObject() {
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
        max_guid: this.maxGuid ?? 0
      };
    }
    dumpKeep(bitpusher, runLen) {
      if (runLen >= 40) {
        const length = bitpusher.length - runLen;
        if (length > 0) {
          const keepBuffer = bitpusher.bitset.slice(0, length).getBuffer();
          this.controlCodes.push({
            type: "keep",
            offset: length,
            buffer: keepBuffer
          });
        }
        this.controlCodes.push({ type: "run", offset: runLen });
      } else if (bitpusher.length > 0) {
        this.controlCodes.push({
          type: "keep",
          offset: bitpusher.length,
          buffer: bitpusher.getBuffer()
        });
      }
    }
    controlCode(cmd, offset = 0) {
      let buffer;
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
    static {
      __name(this, "PackSet");
    }
    static DEFAULT_GUID_ATTR = "id";
    meta;
    existencePack;
    attrPacks;
    bufferedAttrs;
    constructor(opts = {}) {
      this.meta = {};
      this.existencePack = new ExistencePack();
      this.attrPacks = {};
      this.bufferedAttrs = {};
      this.meta = opts;
    }
    addAttribute(opts) {
      ["attrName", "possibilities", "maxChoices"].forEach((requiredOpt) => {
        if (opts[requiredOpt] === void 0) {
          throw new Error(
            `${requiredOpt} is required when adding an attribute!`
          );
        }
      });
      const localOpts = clone(opts);
      const name = localOpts.attrName;
      delete localOpts.attrName;
      const possibilities = localOpts.possibilities;
      delete localOpts.possibilities;
      const maxChoices = localOpts.maxChoices;
      delete localOpts.maxChoices;
      const pack = createPack(
        name,
        possibilities,
        maxChoices
      );
      pack.meta = localOpts;
      this.attrPacks[name] = pack;
      return pack;
    }
    addBufferedAttribute(opts) {
      const localOpts = clone(opts);
      const attrName = localOpts.attrName ?? localOpts.attr_name;
      if (attrName === void 0) {
        throw new Error(
          "attrName or attr_name is required when adding a buffered attribute!"
        );
      }
      delete localOpts.attrName;
      delete localOpts.attr_name;
      this.bufferedAttrs[attrName] = merge({ attrName }, localOpts);
    }
    attributes() {
      return Object.keys(this.attrPacks);
    }
    packFor(attr) {
      return this.attrPacks[attr];
    }
    pack(data, opts = {}) {
      const localOpts = clone(opts) || {};
      if (localOpts.guidAttr == null) {
        localOpts.guidAttr = PackSet.DEFAULT_GUID_ATTR;
      }
      const guidAttr = localOpts.guidAttr;
      if (localOpts.maxGuid == null) {
        localOpts.maxGuid = last(data)[guidAttr];
      }
      if (localOpts.numItems == null) {
        localOpts.numItems = data.length;
      }
      this.buildPack(localOpts, data);
    }
    buildPack(opts = {}, items) {
      ["numItems", "maxGuid"].forEach((requiredOpt) => {
        if (opts[requiredOpt] === void 0) {
          throw new Error(
            `You must specify ${requiredOpt} to start building a pack!`
          );
        }
      });
      const existencePack = this.existencePack;
      const numItems = opts.numItems;
      const maxGuid = opts.maxGuid;
      const guidAttr = opts.guidAttr || PackSet.DEFAULT_GUID_ATTR;
      const packs = values(this.attrPacks);
      existencePack.initializePack(maxGuid, numItems);
      existencePack.maxGuid = 0;
      packs.forEach((pack) => {
        pack.initializePack(maxGuid, numItems);
        pack.maxGuid = 0;
      });
      let idx = 0;
      items.forEach((item) => {
        const guid = item[guidAttr];
        existencePack.encode(guid);
        packs.forEach((pack) => {
          pack.encode(idx, item);
        });
        idx += 1;
      });
      existencePack.finalizePack();
      packs.forEach((pack) => pack.finalizePack());
    }
    buildUnorderedPack(opts, items) {
      const guidAttr = opts.guidAttr || "id";
      const data = {};
      items.forEach((item) => {
        const guid = item[guidAttr];
        data[String(guid)] = item;
      });
      const sortedData = sortBy(data, (d, key) => key);
      this.pack(sortedData, opts);
    }
    toPlainObject(opts = {}) {
      const attributes = values(this.attrPacks).map((pack) => pack.toPlainObject());
      const buffered = values(this.bufferedAttrs);
      const output = {
        existence: this.existencePack.toPlainObject(),
        attributes: attributes.concat(buffered)
      };
      return merge(output, this.meta);
    }
    toJSON() {
      return JSON.stringify(this.toPlainObject());
    }
  }
  function createPack(attrName, possibilities, maxChoices) {
    let PackConstructor;
    if (maxChoices * log2(possibilities.length) < possibilities.length) {
      PackConstructor = IntegerPack;
    } else {
      PackConstructor = BitmapPack;
    }
    return new PackConstructor(attrName, possibilities, maxChoices);
  }
  __name(createPack, "createPack");
  function createPackSet() {
    return new PackSet();
  }
  __name(createPackSet, "createPackSet");
  return {
    Bitpusher,
    createPackSet,
    PackSet,
    createPack,
    Pack,
    IntegerPack,
    BitmapPack,
    ExistencePack
  };
}
__name(createEncoder, "createEncoder");

export { createEncoder as default };
//# sourceMappingURL=createEncoder.js.map
//# sourceMappingURL=createEncoder.js.map