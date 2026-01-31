import ExistencePack from './ExistencePack.js';
import createPack from './createPack.js';
import { clone, merge, values, last, sortBy } from './utils.js';

export default class PackSet {
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
