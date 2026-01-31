import setBit from './setBit.js';
import { clone, merge, values, last, sortBy } from './utils.js';

function log2(x) {
  return Math.log(x) / Math.LN2;
}

export default function createEncoder(env) {
  class Bitpusher {
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
      this.bitset = env.createBitset(8);
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

  class Pack {
    constructor(attrName, possibilities, maxChoices) {
      if (!possibilities) throw new Error(`Possibilities are empty for ${attrName}`);

      this.possibilities = possibilities.map((a) => `${a}`);
      this.attrName = attrName;
      this.maxChoices = maxChoices;
      this.meta = {};

      this.encoding = null;
      this.bitWindowWidth = null;
      this.itemWindowWidth = null;
      this.buffer = null;
      this.bitCounter = 0;
      this.maxGuid = 0;
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

    finalizePack() {}

    encodedBitset() {
      if (this.buffer && this.buffer.length) {
        return env.toBase64(this.buffer);
      }
      return undefined;
    }
  }

  class IntegerPack extends Pack {
    constructor(attrName, possibilities, maxChoices) {
      super(attrName, possibilities, maxChoices);
      this.encoding = 'integer';
    }

    encode(idx, data) {
      let choices = data[this.attrName];
      if (!Array.isArray(choices)) choices = [choices];

      for (let i = 0; i < this.maxChoices; i += 1) {
        const choiceOffset = (this.itemWindowWidth) * idx + (this.bitWindowWidth * i);
        const value = choices[i];

        const possibilityIndex = this.possibilities.indexOf(`${value}`);
        if (possibilityIndex === -1) continue;

        const possibilityId = possibilityIndex + 1;
        const bitOffset = this.baseOffset + choiceOffset;

        for (let bitPos = 0; bitPos < this.bitWindowWidth; bitPos += 1) {
          const bitValue = (possibilityId >> (this.bitWindowWidth - 1 - bitPos)) & 1;
          this.bitCounter += 1;
          setBit(this.buffer, bitOffset + bitPos, bitValue === 1);
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
      const byteLength = (dataLength / 8) | 0;
      const remainingBits = dataLength % 8;

      env.writeUInt32BE(this.buffer, byteLength, 0);
      env.writeUInt8(this.buffer, remainingBits, 4);
    }
  }

  IntegerPack.HEADER_OCTETS = 5;

  class BitmapPack extends Pack {
    constructor(attrName, possibilities, maxChoices) {
      super(attrName, possibilities, maxChoices);
      this.encoding = 'bitmap';
    }

    encode(idx, data) {
      let choices = data[this.attrName];
      if (!Array.isArray(choices)) choices = [choices];

      const itemOffset = idx * this.itemWindowWidth;

      choices.forEach((choice) => {
        const choiceOffset = this.possibilities.indexOf(`${choice}`);
        if (choiceOffset !== -1) {
          setBit(this.buffer, this.baseOffset + itemOffset + choiceOffset, true);
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
      const byteLength = (dataLength / 8) | 0;
      const remainingBits = dataLength % 8;

      env.writeUInt32BE(this.buffer, byteLength, 0);
      env.writeUInt8(this.buffer, remainingBits, 4);
    }
  }

  BitmapPack.HEADER_OCTETS = 5;

  class ExistencePack extends Pack {
    constructor() {
      super('existence', ['existence'], 1);
      this.encoding = 'existence';
      this.lastGuid = 0;
      this.runCounter = 0;
      this.bitpusher = new Bitpusher();
      this.outputBuffers = [];
    }

    initializePack() {}

    encode(guid) {
      let guidDiff = guid - this.lastGuid;

      if (this.bitpusher.isEmpty() && !this.output && guid > 0) {
        guidDiff += 1;
      }

      if (guidDiff === 1 || guid === 0) {
        this.bitpusher.push(1);
        this.runCounter += 1;
      } else if (guidDiff <= 0) {
        throw new Error(`Error: data was not sorted by GUID (got ${this.lastGuid}, then ${guid})!`);
      } else if (guidDiff > 40) {
        this.dumpKeep(this.bitpusher, this.runCounter);

        this.outputBuffers.push(this.controlCode('skip', guidDiff - 1));

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
      this.buffer = env.concatBuffers(this.outputBuffers);
    }

    toPlainObject() {
      return {
        attr_name: 'existence',
        display_name: '',
        max_choices: 0,
        possibilities: null,
        filter_type: '',
        display_type: '',
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
        this.dumpKeep(bitpusher.slice(0, length), 0);
        this.outputBuffers.push(this.controlCode('run', runLen));
      } else if (bitpusher.length > 0) {
        this.outputBuffers.push(this.controlCode('keep', bitpusher.length));
        this.outputBuffers.push(bitpusher.getBuffer());
      }
    }

    controlCode(cmd, offset = 0) {
      let buffer;

      switch (cmd) {
        case 'keep': {
          const bytesToKeep = Math.floor(offset / 8);
          const remainingBits = offset % 8;

          buffer = env.createBuffer(6);
          env.writeUInt8(buffer, ExistencePack.KEEP, 0);
          env.writeUInt32BE(buffer, bytesToKeep, 1);
          env.writeUInt8(buffer, remainingBits, 5);
          break;
        }
        case 'skip':
          buffer = env.createBuffer(5);
          env.writeUInt8(buffer, ExistencePack.SKIP, 0);
          env.writeUInt32BE(buffer, offset, 1);
          break;
        case 'run':
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

  ExistencePack.KEEP = 0x00;
  ExistencePack.SKIP = 0x01;
  ExistencePack.RUN = 0x02;

  class PackSet {
    constructor(opts = {}) {
      this.meta = {};
      this.existencePack = new ExistencePack();
      this.attrPacks = {};
      this.bufferedAttrs = {};
      this.meta = opts;
    }

    addAttribute(opts) {
      ['attrName', 'possibilities', 'maxChoices'].forEach((requiredOpt) => {
        if (opts[requiredOpt] === undefined) {
          throw new Error(`${requiredOpt} is required when adding an attribute!`);
        }
      });

      const localOpts = clone(opts);
      const name = localOpts.attrName;
      delete localOpts.attrName;

      const possibilities = localOpts.possibilities;
      delete localOpts.possibilities;

      const maxChoices = localOpts.maxChoices;
      delete localOpts.maxChoices;

      const pack = createPack(name, possibilities, maxChoices);
      pack.meta = localOpts;

      this.attrPacks[name] = pack;

      return pack;
    }

    addBufferedAttribute(opts) {
      if (opts.attr_name === undefined) {
        throw new Error('attr_name is required when adding a buffered attribute!');
      }

      const localOpts = clone(opts);
      const attrName = localOpts.attrName;
      delete localOpts.attrName;

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

      localOpts.guidAttr || (localOpts.guidAttr = PackSet.DEFAULT_GUID_ATTR);
      localOpts.maxGuid || (localOpts.maxGuid = last(data)[localOpts.guidAttr]);
      localOpts.numItems || (localOpts.numItems = data.length);

      this.buildPack(localOpts, data);
    }

    buildPack(opts = {}, items) {
      ['numItems', 'maxGuid'].forEach((requiredOpt) => {
        if (opts[requiredOpt] === undefined) {
          throw new Error(`You must specify ${requiredOpt} to start building a pack!`);
        }
      });

      const existencePack = this.existencePack;
      const numItems = opts.numItems;
      const maxGuid = opts.maxGuid;
      const guidAttr = opts.guidAttr || PackSet.DEFAULT_GUID_ATTR;
      const packs = values(this.attrPacks);

      existencePack.initializePack(maxGuid, numItems);
      existencePack.maxGuid = 0;
      packs.forEach((pack) => pack.initializePack(maxGuid, numItems));
      packs.forEach((pack) => {
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
      const guidAttr = opts.guidAttr || 'id';
      const data = {};

      items.forEach((item) => {
        const guid = item[guidAttr];
        data[guid] = item;
      });

      const sortedData = sortBy(data, (d, key) => key);
      this.pack(sortedData, opts);
    }

    toPlainObject(opts = {}) {
      const output = {
        existence: this.existencePack.toPlainObject(),
        attributes: values(this.attrPacks).map((pack) => pack.toPlainObject())
      };

      merge(output.attributes, values(this.bufferedAttrs));

      return merge(output, this.meta);
    }

    toJSON() {
      return JSON.stringify(this.toPlainObject());
    }
  }

  PackSet.DEFAULT_GUID_ATTR = 'id';

  function createPack(attrName, possibilities, maxChoices) {
    let PackConstructor;

    if ((maxChoices * log2(possibilities.length)) < possibilities.length) {
      PackConstructor = IntegerPack;
    } else {
      PackConstructor = BitmapPack;
    }

    return new PackConstructor(attrName, possibilities, maxChoices);
  }

  function createPackSet() {
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
    ExistencePack
  };
}
