import IntegerPack from './IntegerPack.js';
import BitmapPack from './BitmapPack.js';

function log2(x) {
  return Math.log(x) / Math.LN2;
}

export default function createPack(attrName, possibilities, maxChoices) {
  let PackConstructor;

  if ((maxChoices * log2(possibilities.length)) < possibilities.length) {
    PackConstructor = IntegerPack;
  } else {
    PackConstructor = BitmapPack;
  }

  return new PackConstructor(attrName, possibilities, maxChoices);
}
