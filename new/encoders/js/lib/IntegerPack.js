import Pack from './Pack.js';
import setBit from './setBit.js';

function log2(x) {
  return Math.log(x) / Math.LN2;
}

export default class IntegerPack extends Pack {
  constructor(attrName, possibilities, maxChoices) {
    super(attrName, possibilities, maxChoices);
    this.encoding = 'integer';
  }

  encode(idx, data) {
    const buffer = this.buffer;
    let choices = data[this.attrName];
    if (!Array.isArray(choices)) choices = [choices];

    for (let i = 0; i < this.maxChoices; i += 1) {
      const choiceOffset = (this.itemWindowWidth) * idx + (this.bitWindowWidth * i);
      const value = choices[i];

      const possibilityIndex = this.possibilities.indexOf(`${value}`);
      if (possibilityIndex === -1) continue;

      const possibilityId = possibilityIndex + 1;
      const bitCode = possibilityId.toString(2).split('');
      const bitCodeLengthPad = this.bitWindowWidth - bitCode.length;

      const bitOffset = this.baseOffset + choiceOffset + bitCodeLengthPad;

      bitCode.forEach((bit, index) => {
        const offset = bitOffset + index;
        this.bitCounter += 1;
        setBit(buffer, offset, bit === '1');
      });
    }
  }

  initializePack(maxGuid, numItems) {
    this.baseOffset = IntegerPack.HEADER_OCTETS * 8;

    this.bitWindowWidth = Math.ceil(log2(this.possibilities.length + 1)) || 1;
    this.itemWindowWidth = this.bitWindowWidth * this.maxChoices;

    const bits = this.itemWindowWidth * numItems + this.baseOffset;
    const octets = Math.ceil(bits / 8);
    this.numItems = numItems;
    this.buffer = Buffer.alloc(octets);

    const dataLength = this.itemWindowWidth * numItems;
    const byteLength = (dataLength / 8) | 0;
    const remainingBits = dataLength % 8;

    this.buffer.writeUInt32BE(byteLength, 0);
    this.buffer.writeUInt8(remainingBits, 4);
  }
}

IntegerPack.HEADER_OCTETS = 5;
