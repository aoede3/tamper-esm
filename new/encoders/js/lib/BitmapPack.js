import Pack from './Pack.js';
import setBit from './setBit.js';

export default class BitmapPack extends Pack {
  constructor(attrName, possibilities, maxChoices) {
    super(attrName, possibilities, maxChoices);
    this.encoding = 'bitmap';
  }

  encode(idx, data) {
    const buffer = this.buffer;
    let choices = data[this.attrName];
    if (!Array.isArray(choices)) choices = [choices];

    const itemOffset = idx * this.itemWindowWidth;

    choices.forEach((choice) => {
      const choiceOffset = this.possibilities.indexOf(`${choice}`);
      if (choiceOffset !== -1) {
        setBit(buffer, this.baseOffset + itemOffset + choiceOffset, true);
      }
    });
  }

  initializePack(maxGuid, numItems) {
    this.baseOffset = BitmapPack.HEADER_OCTETS * 8;
    this.bitWindowWidth = 1;
    this.itemWindowWidth = this.possibilities.length;

    const bits = this.itemWindowWidth * numItems + this.baseOffset;
    const octets = Math.ceil(bits / 8);

    this.buffer = Buffer.alloc(octets);

    const dataLength = this.itemWindowWidth * numItems;
    const byteLength = (dataLength / 8) | 0;
    const remainingBits = dataLength % 8;

    this.buffer.writeUInt32BE(byteLength, 0);
    this.buffer.writeUInt8(remainingBits, 4);
  }
}

BitmapPack.HEADER_OCTETS = 5;
