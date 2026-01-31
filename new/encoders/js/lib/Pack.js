import { merge } from './utils.js';

export default class Pack {
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
      return this.buffer.toString('base64');
    }
    return undefined;
  }
}
